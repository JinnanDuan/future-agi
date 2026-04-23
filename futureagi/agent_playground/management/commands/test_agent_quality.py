"""
Management command to test agent execution quality by running graphs with real LLM calls.

Creates graphs from scratch via Django ORM (PromptTemplate, PromptVersion, Graph, Nodes,
Ports, Edges, PromptTemplateNode bridge), triggers execution via Temporal, and validates results.
"""

import time
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Organization, User, Workspace
from agent_playground.models.choices import (
    GraphExecutionStatus,
    GraphVersionStatus,
    NodeType,
    PortDirection,
)
from agent_playground.models.edge import Edge
from agent_playground.models.execution_data import ExecutionData
from agent_playground.models.graph import Graph
from agent_playground.models.graph_dataset import GraphDataset
from agent_playground.models.graph_execution import GraphExecution
from agent_playground.models.graph_version import GraphVersion
from agent_playground.models.node import Node
from agent_playground.models.node_connection import NodeConnection
from agent_playground.models.node_execution import NodeExecution
from agent_playground.models.node_template import NodeTemplate
from agent_playground.models.port import Port
from agent_playground.models.prompt_template_node import PromptTemplateNode
from agent_playground.services.dataset_bridge import activate_version_and_sync
from model_hub.models.choices import DatasetSourceChoices
from model_hub.models.develop_dataset import Dataset
from model_hub.models.run_prompt import PromptTemplate, PromptVersion
from tfc.temporal.agent_playground.client import start_graph_execution

TERMINAL_STATUSES = {
    GraphExecutionStatus.SUCCESS,
    GraphExecutionStatus.FAILED,
    GraphExecutionStatus.CANCELLED,
}


# ═══════════════════════════════════════════════════════════════════
# Data classes
# ═══════════════════════════════════════════════════════════════════


@dataclass
class TestResult:
    name: str
    success: bool
    duration: float
    outputs: dict = field(default_factory=dict)
    error: str | None = None


# ═══════════════════════════════════════════════════════════════════
# Builder helpers
# ═══════════════════════════════════════════════════════════════════


def create_prompt(
    org: Organization,
    workspace: Workspace,
    user: User,
    *,
    name: str,
    model: str,
    messages: list[dict],
    **config_overrides: Any,
) -> tuple[PromptTemplate, PromptVersion]:
    """Create a PromptTemplate + PromptVersion with full prompt_config_snapshot."""
    configuration = {
        "model": model,
        "temperature": 0.7,
        "max_tokens": 2000,
        "output_format": "string",
        "response_format": "text",
        "model_detail": {"type": "chat"},
    }
    configuration.update(config_overrides)

    # Extract variable names from messages
    import re

    variable_names = []
    for msg in messages:
        for content_block in msg.get("content", []):
            if isinstance(content_block, dict):
                text = content_block.get("text", "")
            else:
                text = str(content_block)
            variable_names.extend(re.findall(r"\{\{(\w+)\}\}", text))
    variable_names = list(dict.fromkeys(variable_names))  # dedupe, preserve order

    prompt_template = PromptTemplate.no_workspace_objects.create(
        name=name,
        organization=org,
        workspace=workspace,
        created_by=user,
        variable_names=variable_names,
    )

    prompt_config_snapshot = {
        "messages": messages,
        "configuration": configuration,
    }

    prompt_version = PromptVersion.no_workspace_objects.create(
        original_template=prompt_template,
        template_version="v1",
        prompt_config_snapshot=prompt_config_snapshot,
        is_default=True,
        variable_names={v: "" for v in variable_names},
    )

    return prompt_template, prompt_version


def create_graph(
    org: Organization,
    workspace: Workspace,
    user: User,
    *,
    name: str,
    description: str = "",
) -> tuple[Graph, GraphVersion]:
    """Create Graph + empty draft GraphVersion + auto-linked Dataset."""
    graph = Graph.no_workspace_objects.create(
        name=name,
        description=description,
        organization=org,
        workspace=workspace,
        created_by=user,
    )

    graph_version = GraphVersion.no_workspace_objects.create(
        graph=graph,
        version_number=1,
        status=GraphVersionStatus.DRAFT,
    )

    dataset = Dataset.no_workspace_objects.create(
        name=name,
        source=DatasetSourceChoices.GRAPH.value,
        organization=org,
        workspace=workspace,
        user=user,
    )
    GraphDataset.no_workspace_objects.create(graph=graph, dataset=dataset)

    return graph, graph_version


def add_llm_node(
    graph_version: GraphVersion,
    *,
    name: str,
    prompt_template: PromptTemplate,
    prompt_version: PromptVersion,
    input_ports: list[str],
    output_port_name: str = "response",
    position: dict | None = None,
) -> Node:
    """
    Create an atomic LLM node with input ports (DYNAMIC mode) and output port.

    Also creates the PromptTemplateNode bridge record.
    """
    llm_template = NodeTemplate.no_workspace_objects.get(name="llm_prompt")

    node = Node.no_workspace_objects.create(
        graph_version=graph_version,
        node_template=llm_template,
        type=NodeType.ATOMIC,
        name=name,
        config={},
        position=position or {"x": 0, "y": 0},
    )

    # Create dynamic input ports (one per template variable)
    for port_name in input_ports:
        Port.no_workspace_objects.create(
            node=node,
            key="custom",
            display_name=port_name,
            direction=PortDirection.INPUT,
            data_schema={"type": "string"},
        )

    # Create fixed output port
    Port.no_workspace_objects.create(
        node=node,
        key="response",
        display_name=output_port_name,
        direction=PortDirection.OUTPUT,
        data_schema={},
    )

    # Create PromptTemplateNode bridge
    PromptTemplateNode.no_workspace_objects.create(
        node=node,
        prompt_template=prompt_template,
        prompt_version=prompt_version,
    )

    return node


def add_edge(
    graph_version: GraphVersion,
    source_node: Node,
    source_port_key: str,
    target_node: Node,
    target_port_display_name: str,
) -> Edge:
    """
    Create an edge between output port of source_node → input port of target_node.

    Also creates the required NodeConnection if it doesn't exist.
    """
    source_port = Port.no_workspace_objects.get(
        node=source_node,
        key=source_port_key,
        direction=PortDirection.OUTPUT,
    )
    target_port = Port.no_workspace_objects.get(
        node=target_node,
        display_name=target_port_display_name,
        direction=PortDirection.INPUT,
    )

    # Ensure NodeConnection exists (required by Edge validation)
    NodeConnection.no_workspace_objects.get_or_create(
        graph_version=graph_version,
        source_node=source_node,
        target_node=target_node,
    )

    return Edge.no_workspace_objects.create(
        graph_version=graph_version,
        source_port=source_port,
        target_port=target_port,
    )


def activate_graph(graph: Graph, graph_version: GraphVersion) -> None:
    """Activate the version and sync dataset columns."""
    activate_version_and_sync(graph, graph_version)


def execute_graph(graph_version: GraphVersion, input_payload: dict) -> str:
    """Start execution via Temporal client. Returns graph_execution_id."""
    return start_graph_execution(
        graph_version_id=str(graph_version.id),
        input_payload=input_payload,
    )


def poll_execution(
    graph_execution_id: str,
    poll_interval: int = 5,
    timeout: int = 600,
) -> GraphExecution:
    """Poll GraphExecution status via ORM until terminal state."""
    from django.db import close_old_connections

    start = time.time()
    while True:
        close_old_connections()
        execution = GraphExecution.no_workspace_objects.get(id=graph_execution_id)
        if execution.status in TERMINAL_STATUSES:
            return execution
        elapsed = time.time() - start
        if elapsed > timeout:
            raise TimeoutError(
                f"Execution {graph_execution_id} did not complete within {timeout}s "
                f"(current status: {execution.status})"
            )
        time.sleep(poll_interval)


def collect_results(graph_execution: GraphExecution) -> dict:
    """Fetch per-node execution results: inputs, outputs, timing, errors."""
    node_executions = NodeExecution.no_workspace_objects.filter(
        graph_execution=graph_execution,
    ).select_related("node")

    results = {}
    for ne in node_executions:
        exec_data = ExecutionData.no_workspace_objects.filter(
            node_execution=ne,
        ).select_related("port")

        inputs = {}
        outputs = {}
        for ed in exec_data:
            if ed.port.direction == PortDirection.INPUT:
                inputs[ed.port.routing_key] = ed.payload
            else:
                outputs[ed.port.routing_key] = ed.payload

        results[ne.node.name] = {
            "status": ne.status,
            "inputs": inputs,
            "outputs": outputs,
            "started_at": str(ne.started_at) if ne.started_at else None,
            "completed_at": str(ne.completed_at) if ne.completed_at else None,
            "error": ne.error_message,
        }

    return results


# ═══════════════════════════════════════════════════════════════════
# Test cases
# ═══════════════════════════════════════════════════════════════════


def test_single_node_text(
    org, workspace, user, model, poll_interval, timeout
) -> TestResult:
    """Single LLM node, text response, simple prompt."""
    t0 = time.time()
    try:
        pt, pv = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: Simple Text",
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": [
                        {"type": "text", "text": "You are a helpful assistant."}
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What is the capital of France? Answer in one sentence.",
                        }
                    ],
                },
            ],
        )

        graph, gv = create_graph(
            org, workspace, user, name="QualityTest: Single Node Text"
        )
        node = add_llm_node(
            gv, name="Answerer", prompt_template=pt, prompt_version=pv, input_ports=[]
        )
        activate_graph(graph, gv)

        exec_id = execute_graph(gv, {})
        execution = poll_execution(exec_id, poll_interval, timeout)

        if execution.status != GraphExecutionStatus.SUCCESS:
            return TestResult(
                name="single_node_text",
                success=False,
                duration=time.time() - t0,
                error=f"Execution status: {execution.status}. Error: {execution.error_message}",
            )

        results = collect_results(execution)
        response = results.get("Answerer", {}).get("outputs", {}).get("response", "")

        if not response:
            return TestResult(
                name="single_node_text",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error="Empty response from LLM",
            )

        return TestResult(
            name="single_node_text",
            success=True,
            duration=time.time() - t0,
            outputs=results,
        )
    except Exception as e:
        return TestResult(
            name="single_node_text",
            success=False,
            duration=time.time() - t0,
            error=str(e),
        )


def test_single_node_json(
    org, workspace, user, model, poll_interval, timeout
) -> TestResult:
    """Single LLM node, JSON response_format."""
    t0 = time.time()
    try:
        pt, pv = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: JSON Output",
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": "You are a helpful assistant. Always respond with valid JSON.",
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": 'List 3 colors as a JSON object with key "colors" containing an array.',
                        }
                    ],
                },
            ],
            response_format="json",
            output_format="string",
        )

        graph, gv = create_graph(
            org, workspace, user, name="QualityTest: Single Node JSON"
        )
        node = add_llm_node(
            gv,
            name="JSONResponder",
            prompt_template=pt,
            prompt_version=pv,
            input_ports=[],
        )
        activate_graph(graph, gv)

        exec_id = execute_graph(gv, {})
        execution = poll_execution(exec_id, poll_interval, timeout)

        if execution.status != GraphExecutionStatus.SUCCESS:
            return TestResult(
                name="single_node_json",
                success=False,
                duration=time.time() - t0,
                error=f"Execution status: {execution.status}. Error: {execution.error_message}",
            )

        results = collect_results(execution)
        response = (
            results.get("JSONResponder", {}).get("outputs", {}).get("response", "")
        )

        if not response:
            return TestResult(
                name="single_node_json",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error="Empty response from LLM",
            )

        # Validate it's parseable JSON
        import json

        if isinstance(response, str):
            try:
                json.loads(response)
            except json.JSONDecodeError:
                return TestResult(
                    name="single_node_json",
                    success=False,
                    duration=time.time() - t0,
                    outputs=results,
                    error=f"Response is not valid JSON: {response[:200]}",
                )

        return TestResult(
            name="single_node_json",
            success=True,
            duration=time.time() - t0,
            outputs=results,
        )
    except Exception as e:
        return TestResult(
            name="single_node_json",
            success=False,
            duration=time.time() - t0,
            error=str(e),
        )


def test_chain_two_nodes(
    org, workspace, user, model, poll_interval, timeout
) -> TestResult:
    """Two LLM nodes chained (output of A → input of B)."""
    t0 = time.time()
    try:
        pt_extract, pv_extract = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: Extractor",
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract key facts from the following text: {{text}}",
                        }
                    ],
                },
            ],
        )

        pt_summarize, pv_summarize = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: Summarizer",
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Summarize these facts into one sentence: {{facts}}",
                        }
                    ],
                },
            ],
        )

        graph, gv = create_graph(
            org, workspace, user, name="QualityTest: Chain Two Nodes"
        )

        node_a = add_llm_node(
            gv,
            name="Extractor",
            prompt_template=pt_extract,
            prompt_version=pv_extract,
            input_ports=["text"],
            position={"x": 0, "y": 0},
        )
        node_b = add_llm_node(
            gv,
            name="Summarizer",
            prompt_template=pt_summarize,
            prompt_version=pv_summarize,
            input_ports=["facts"],
            position={"x": 400, "y": 0},
        )

        add_edge(
            gv,
            source_node=node_a,
            source_port_key="response",
            target_node=node_b,
            target_port_display_name="facts",
        )
        activate_graph(graph, gv)

        input_text = (
            "The Eiffel Tower is a wrought-iron lattice tower in Paris, France. "
            "It was constructed from 1887 to 1889 as the centerpiece of the 1889 World's Fair. "
            "The tower is 330 metres tall and was the tallest man-made structure in the world "
            "until the Chrysler Building was completed in New York in 1930."
        )
        exec_id = execute_graph(gv, {"text": input_text})
        execution = poll_execution(exec_id, poll_interval, timeout)

        if execution.status != GraphExecutionStatus.SUCCESS:
            return TestResult(
                name="chain_two_nodes",
                success=False,
                duration=time.time() - t0,
                error=f"Execution status: {execution.status}. Error: {execution.error_message}",
            )

        results = collect_results(execution)
        extractor_output = (
            results.get("Extractor", {}).get("outputs", {}).get("response", "")
        )
        summarizer_output = (
            results.get("Summarizer", {}).get("outputs", {}).get("response", "")
        )

        if not extractor_output or not summarizer_output:
            return TestResult(
                name="chain_two_nodes",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error=f"Missing outputs. Extractor: {'present' if extractor_output else 'EMPTY'}. Summarizer: {'present' if summarizer_output else 'EMPTY'}.",
            )

        return TestResult(
            name="chain_two_nodes",
            success=True,
            duration=time.time() - t0,
            outputs=results,
        )
    except Exception as e:
        return TestResult(
            name="chain_two_nodes",
            success=False,
            duration=time.time() - t0,
            error=str(e),
        )


def test_parallel_nodes(
    org, workspace, user, model, poll_interval, timeout
) -> TestResult:
    """Two independent LLM nodes with separate inputs."""
    t0 = time.time()
    try:
        pt_joke, pv_joke = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: Joke Teller",
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Tell a short joke about: {{topic}}"}
                    ],
                },
            ],
        )

        pt_fact, pv_fact = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: Fact Teller",
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Tell me an interesting fact about: {{subject}}",
                        }
                    ],
                },
            ],
        )

        graph, gv = create_graph(
            org, workspace, user, name="QualityTest: Parallel Nodes"
        )

        node_joke = add_llm_node(
            gv,
            name="JokeTeller",
            prompt_template=pt_joke,
            prompt_version=pv_joke,
            input_ports=["topic"],
            output_port_name="joke_response",
            position={"x": 0, "y": 0},
        )
        node_fact = add_llm_node(
            gv,
            name="FactTeller",
            prompt_template=pt_fact,
            prompt_version=pv_fact,
            input_ports=["subject"],
            output_port_name="fact_response",
            position={"x": 0, "y": 200},
        )

        activate_graph(graph, gv)

        exec_id = execute_graph(gv, {"topic": "programming", "subject": "octopuses"})
        execution = poll_execution(exec_id, poll_interval, timeout)

        if execution.status != GraphExecutionStatus.SUCCESS:
            return TestResult(
                name="parallel_nodes",
                success=False,
                duration=time.time() - t0,
                error=f"Execution status: {execution.status}. Error: {execution.error_message}",
            )

        results = collect_results(execution)
        joke_output = (
            results.get("JokeTeller", {}).get("outputs", {}).get("response", "")
        )
        fact_output = (
            results.get("FactTeller", {}).get("outputs", {}).get("response", "")
        )

        if not joke_output or not fact_output:
            return TestResult(
                name="parallel_nodes",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error=f"Missing outputs. Joke: {'present' if joke_output else 'EMPTY'}. Fact: {'present' if fact_output else 'EMPTY'}.",
            )

        return TestResult(
            name="parallel_nodes",
            success=True,
            duration=time.time() - t0,
            outputs=results,
        )
    except Exception as e:
        return TestResult(
            name="parallel_nodes",
            success=False,
            duration=time.time() - t0,
            error=str(e),
        )


def test_chain_json_dot_notation(
    org, workspace, user, model, poll_interval, timeout
) -> TestResult:
    """Two nodes chained: node A produces JSON, node B uses {{A.response.field}} dot notation."""
    t0 = time.time()
    try:
        # Node A: produce a JSON object with known keys
        pt_producer, pv_producer = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: JSON Producer",
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": "You always respond with valid JSON only. No markdown, no explanation.",
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Return a JSON object with exactly these keys: "
                                '"city" (set to "Paris"), '
                                '"country" (set to "France"), '
                                '"population" (set to 2161000).'
                            ),
                        }
                    ],
                },
            ],
            response_format="json",
            output_format="string",
        )

        # Node B: use dot notation to extract just the city from A's JSON response
        pt_consumer, pv_consumer = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: Dot Notation Consumer",
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Tell me one interesting fact about the city: "
                                "{{JsonProducer.response.city}}. "
                                "Answer in one sentence."
                            ),
                        }
                    ],
                },
            ],
        )

        graph, gv = create_graph(
            org, workspace, user, name="QualityTest: JSON Dot Notation Chain"
        )

        node_a = add_llm_node(
            gv,
            name="JsonProducer",
            prompt_template=pt_producer,
            prompt_version=pv_producer,
            input_ports=[],
            position={"x": 0, "y": 0},
        )
        node_b = add_llm_node(
            gv,
            name="DotNotationConsumer",
            prompt_template=pt_consumer,
            prompt_version=pv_consumer,
            input_ports=["JsonProducer.response.city"],
            position={"x": 400, "y": 0},
        )

        add_edge(
            gv,
            source_node=node_a,
            source_port_key="response",
            target_node=node_b,
            target_port_display_name="JsonProducer.response.city",
        )
        activate_graph(graph, gv)

        exec_id = execute_graph(gv, {})
        execution = poll_execution(exec_id, poll_interval, timeout)

        if execution.status != GraphExecutionStatus.SUCCESS:
            return TestResult(
                name="chain_json_dot_notation",
                success=False,
                duration=time.time() - t0,
                error=f"Execution status: {execution.status}. Error: {execution.error_message}",
            )

        results = collect_results(execution)
        producer_output = (
            results.get("JsonProducer", {}).get("outputs", {}).get("response", "")
        )
        consumer_output = (
            results.get("DotNotationConsumer", {})
            .get("outputs", {})
            .get("response", "")
        )

        # Validate producer output is a dict with the expected key
        if not isinstance(producer_output, dict):
            return TestResult(
                name="chain_json_dot_notation",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error=f"Producer output is not a dict: {type(producer_output).__name__}",
            )

        if "city" not in producer_output:
            return TestResult(
                name="chain_json_dot_notation",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error=f"Producer output missing 'city' key. Keys: {list(producer_output.keys())}",
            )

        if not consumer_output:
            return TestResult(
                name="chain_json_dot_notation",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error="Empty response from DotNotationConsumer — variable substitution may have failed",
            )

        return TestResult(
            name="chain_json_dot_notation",
            success=True,
            duration=time.time() - t0,
            outputs=results,
        )
    except Exception as e:
        return TestResult(
            name="chain_json_dot_notation",
            success=False,
            duration=time.time() - t0,
            error=str(e),
        )


def test_multi_variable(
    org, workspace, user, model, poll_interval, timeout
) -> TestResult:
    """Single node with multiple input variables."""
    t0 = time.time()
    try:
        pt, pv = create_prompt(
            org,
            workspace,
            user,
            name="QualityTest: Multi Variable",
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": "You are a creative writing assistant.",
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Write a haiku about {{topic}} in the style of {{style}}.",
                        }
                    ],
                },
            ],
        )

        graph, gv = create_graph(
            org, workspace, user, name="QualityTest: Multi Variable"
        )
        node = add_llm_node(
            gv,
            name="HaikuWriter",
            prompt_template=pt,
            prompt_version=pv,
            input_ports=["topic", "style"],
        )
        activate_graph(graph, gv)

        exec_id = execute_graph(gv, {"topic": "mountains", "style": "Matsuo Basho"})
        execution = poll_execution(exec_id, poll_interval, timeout)

        if execution.status != GraphExecutionStatus.SUCCESS:
            return TestResult(
                name="multi_variable",
                success=False,
                duration=time.time() - t0,
                error=f"Execution status: {execution.status}. Error: {execution.error_message}",
            )

        results = collect_results(execution)
        response = results.get("HaikuWriter", {}).get("outputs", {}).get("response", "")

        if not response:
            return TestResult(
                name="multi_variable",
                success=False,
                duration=time.time() - t0,
                outputs=results,
                error="Empty response from LLM",
            )

        return TestResult(
            name="multi_variable",
            success=True,
            duration=time.time() - t0,
            outputs=results,
        )
    except Exception as e:
        return TestResult(
            name="multi_variable",
            success=False,
            duration=time.time() - t0,
            error=str(e),
        )


# ═══════════════════════════════════════════════════════════════════
# Test registry
# ═══════════════════════════════════════════════════════════════════

ALL_TESTS = {
    "single_node_text": test_single_node_text,
    "single_node_json": test_single_node_json,
    "chain_two_nodes": test_chain_two_nodes,
    "chain_json_dot_notation": test_chain_json_dot_notation,
    "parallel_nodes": test_parallel_nodes,
    "multi_variable": test_multi_variable,
}


# ═══════════════════════════════════════════════════════════════════
# Management command
# ═══════════════════════════════════════════════════════════════════


class Command(BaseCommand):
    help = "Test agent execution quality by running graphs with real LLM calls."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org-id", type=str, required=True, help="Organization UUID"
        )
        parser.add_argument(
            "--workspace-id", type=str, required=True, help="Workspace UUID"
        )
        parser.add_argument(
            "--user-email", type=str, required=True, help="User email for created_by"
        )
        parser.add_argument(
            "--model", type=str, default="gpt-4o-mini", help="LLM model to use"
        )
        parser.add_argument(
            "--poll-interval", type=int, default=5, help="Poll interval in seconds"
        )
        parser.add_argument(
            "--timeout", type=int, default=600, help="Max wait per execution in seconds"
        )
        parser.add_argument("--verbose", action="store_true", help="Show full payloads")
        parser.add_argument(
            "--test",
            type=str,
            nargs="*",
            help="Specific test names to run (default: all)",
        )

    def handle(self, *args, **options):
        # 1. Resolve org, workspace, user
        try:
            org = Organization.objects.get(id=UUID(options["org_id"]))
        except Organization.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f"Organization not found: {options['org_id']}")
            )
            return

        try:
            workspace = Workspace.objects.get(id=UUID(options["workspace_id"]))
        except Workspace.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f"Workspace not found: {options['workspace_id']}")
            )
            return

        try:
            user = User.objects.get(email=options["user_email"])
        except User.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f"User not found: {options['user_email']}")
            )
            return

        # Verify llm_prompt NodeTemplate exists
        if not NodeTemplate.no_workspace_objects.filter(name="llm_prompt").exists():
            self.stderr.write(
                self.style.ERROR(
                    "NodeTemplate 'llm_prompt' not found. Run 'python manage.py seed_node_templates' first."
                )
            )
            return

        model = options["model"]
        poll_interval = options["poll_interval"]
        timeout = options["timeout"]
        verbose = options["verbose"]

        # 2. Determine which tests to run
        test_names = options.get("test") or list(ALL_TESTS.keys())
        for name in test_names:
            if name not in ALL_TESTS:
                self.stderr.write(
                    self.style.ERROR(
                        f"Unknown test: '{name}'. Available: {', '.join(ALL_TESTS.keys())}"
                    )
                )
                return

        self.stdout.write("")
        self.stdout.write(f"  Running {len(test_names)} test(s) with model: {model}")
        self.stdout.write("")

        # 3. Run tests
        results: list[TestResult] = []
        for name in test_names:
            self.stdout.write(f"  Running: {name} ...", ending="")
            self.stdout.flush()
            result = ALL_TESTS[name](
                org, workspace, user, model, poll_interval, timeout
            )
            results.append(result)

            if result.success:
                self.stdout.write(self.style.SUCCESS(f" PASS ({result.duration:.1f}s)"))
            else:
                self.stdout.write(self.style.ERROR(f" FAIL ({result.duration:.1f}s)"))
                if result.error:
                    self.stdout.write(self.style.ERROR(f"    Error: {result.error}"))

            if verbose and result.outputs:
                self._print_outputs(result.outputs)

        # 4. Summary
        passed = sum(1 for r in results if r.success)
        total = len(results)

        self.stdout.write("")
        self.stdout.write("=" * 55)
        self.stdout.write("  Agent Quality Test Results")
        self.stdout.write("=" * 55)
        self.stdout.write(f"  Model: {model}")
        self.stdout.write("")
        self.stdout.write(
            f"  {'#':<4} {'Test Name':<25} {'Status':<10} {'Duration':<10}"
        )
        for i, r in enumerate(results, 1):
            status = (
                self.style.SUCCESS("PASS") if r.success else self.style.ERROR("FAIL")
            )
            self.stdout.write(f"  {i:<4} {r.name:<25} {status:<10} {r.duration:.1f}s")
        self.stdout.write("")

        if passed == total:
            self.stdout.write(self.style.SUCCESS(f"  RESULT: {passed}/{total} PASSED"))
        else:
            self.stdout.write(self.style.ERROR(f"  RESULT: {passed}/{total} PASSED"))

        self.stdout.write("=" * 55)

    def _print_outputs(self, outputs: dict) -> None:
        """Print verbose node outputs."""
        import json

        for node_name, data in outputs.items():
            self.stdout.write(f"    --- {node_name} ({data.get('status', '?')}) ---")
            if data.get("inputs"):
                self.stdout.write(f"    Inputs:")
                for k, v in data["inputs"].items():
                    val_str = (
                        json.dumps(v, default=str) if not isinstance(v, str) else v
                    )
                    self.stdout.write(f"      {k}: {val_str[:200]}")
            if data.get("outputs"):
                self.stdout.write(f"    Outputs:")
                for k, v in data["outputs"].items():
                    val_str = (
                        json.dumps(v, default=str) if not isinstance(v, str) else v
                    )
                    self.stdout.write(f"      {k}: {val_str[:500]}")
            if data.get("error"):
                self.stdout.write(self.style.ERROR(f"    Error: {data['error']}"))
