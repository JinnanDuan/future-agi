from rest_framework import serializers

from tracer.models.project import Project
from tracer.models.project_version import ProjectVersion


class ProjectVersionSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), many=False
    )

    class Meta:
        model = ProjectVersion
        fields = [
            "id",
            "project",
            "name",
            "metadata",
            "start_time",
            "end_time",
            "error",
            "eval_tags",
            "avg_eval_score",
            "version",
            "annotations",
        ]
        read_only_fields = ["version"]
