from __future__ import annotations

import structlog
from django.utils import timezone

from agent_playground.models import (
    Edge,
    ExecutionData,
    Graph,
    GraphExecution,
    GraphVersion,
    Node,
    NodeConnection,
    NodeExecution,
    Port,
)
from tfc.temporal.agent_playground.client import cancel_graph_execution

logger = structlog.get_logger(__name__)


def cascade_soft_delete_graph(graph: Graph) -> None:
    """
    Cascade soft-delete a graph and all related objects.

    Soft-deletes in order:
    1. Execution data for each node execution
    2. Node executions for each graph execution
    3. Graph executions for each version
    4. Ports for each node
    5. Nodes for each version
    6. Edges for each version
    7. Graph versions
    8. The graph itself

    Args:
        graph: The Graph instance to soft-delete.
    """
    versions = GraphVersion.no_workspace_objects.filter(graph=graph)
    for version in versions:
        cascade_soft_delete_version_content(version)

    graph.delete()


def _cancel_executions(version: GraphVersion) -> None:
    """
    Cancel all Temporal workflows for a graph version's executions.

    Args:
        version: The GraphVersion whose executions should be cancelled.
    """
    executions = GraphExecution.no_workspace_objects.filter(graph_version=version)

    for execution in executions:
        try:
            cancel_graph_execution(str(execution.id))
        except Exception:
            logger.error(
                "Failed to cancel Temporal workflow for execution",
                execution_id=str(execution.id),
            )


def cascade_soft_delete_version_content(version: GraphVersion) -> None:
    """
    Soft-delete a graph version and all its content
    (executions, node executions, execution data, nodes, ports, edges).

    Cancels any active Temporal workflows before soft-deleting.

    Args:
        version: The GraphVersion instance to soft-delete.
    """
    _cancel_executions(version)

    now = timezone.now()

    executions = GraphExecution.no_workspace_objects.filter(graph_version=version)
    node_executions = NodeExecution.no_workspace_objects.filter(
        graph_execution__in=executions
    )

    ExecutionData.no_workspace_objects.filter(
        node_execution__in=node_executions
    ).update(deleted=True, deleted_at=now)

    node_executions.update(deleted=True, deleted_at=now)
    executions.update(deleted=True, deleted_at=now)

    Edge.no_workspace_objects.filter(graph_version=version).update(
        deleted=True, deleted_at=now
    )
    NodeConnection.no_workspace_objects.filter(graph_version=version).update(
        deleted=True, deleted_at=now
    )

    nodes = Node.no_workspace_objects.filter(graph_version=version)

    Port.no_workspace_objects.filter(node__in=nodes).update(
        deleted=True, deleted_at=now
    )
    nodes.update(deleted=True, deleted_at=now)

    version.delete()
