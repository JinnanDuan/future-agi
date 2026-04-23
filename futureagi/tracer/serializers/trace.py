from rest_framework import serializers

from tracer.models.project import Project
from tracer.models.project_version import ProjectVersion
from tracer.models.trace import Trace
from tracer.models.trace_session import TraceSession
from tracer.utils.helper import validate_filters_helper


class TraceSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), many=False
    )
    project_version = serializers.PrimaryKeyRelatedField(
        queryset=ProjectVersion.objects.all(), many=False, required=False
    )
    session = serializers.PrimaryKeyRelatedField(
        queryset=TraceSession.objects.all(), many=False, required=False
    )

    class Meta:
        model = Trace
        fields = [
            "id",
            "project",
            "project_version",
            "name",
            "metadata",
            "input",
            "output",
            "error",
            "session",
            "external_id",
            "tags",
        ]


class TraceExportSerializer(serializers.Serializer):
    filters = serializers.ListField(
        required=False, default=[], child=serializers.JSONField()
    )

    def validate_filters(self, value):
        return validate_filters_helper(value)
