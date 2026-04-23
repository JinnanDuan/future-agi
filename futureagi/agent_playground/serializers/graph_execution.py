from rest_framework import serializers

from agent_playground.models.graph_execution import GraphExecution
from agent_playground.models.node_execution import NodeExecution


class NodeExecutionBriefSerializer(serializers.ModelSerializer):
    """Brief node execution status to attach to each node."""

    class Meta:
        model = NodeExecution
        fields = [
            "id",
            "status",
            "started_at",
            "completed_at",
            "error_message",
        ]
        read_only_fields = fields


class GraphExecutionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing graph executions."""

    class Meta:
        model = GraphExecution
        fields = [
            "id",
            "status",
            "started_at",
            "completed_at",
            "graph_version",
            "created_at",
        ]
        read_only_fields = fields


class GraphExecutionSerializer(serializers.ModelSerializer):
    """Basic graph execution details (without nested detail data)."""

    class Meta:
        model = GraphExecution
        fields = [
            "id",
            "status",
            "input_payload",
            "output_payload",
            "started_at",
            "completed_at",
            "error_message",
        ]
        read_only_fields = fields
