from rest_framework import serializers

from tracer.models.project import Project


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "id",
            "model_type",
            "name",
            "trace_type",
            "metadata",
            "organization",
            "workspace",
            "created_at",
            "updated_at",
            "config",
            "source",
            "session_config",
            "tags",
        ]
        read_only_fields = ["organization", "workspace"]


class ProjectNameUpdateSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=True)
    name = serializers.CharField(required=True)
    sampling_rate = serializers.FloatField(required=False, min_value=0.0, max_value=1.0)


class ProjectVersionExportSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=True)
    runs_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_null=True
    )
