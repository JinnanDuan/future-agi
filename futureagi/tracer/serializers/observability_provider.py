from rest_framework import serializers

from tracer.models.observability_provider import ObservabilityProvider


class ObservabilityProviderSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Name of the project. If it doesn't exist, it will be created.",
    )

    class Meta:
        model = ObservabilityProvider
        fields = [
            "id",
            "project",
            "project_name",
            "provider",
            "enabled",
            "organization",
            "workspace",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["organization", "workspace", "project"]

    def create(self, validated_data):
        """
        Custom create method to handle the `project_name` field.
        """
        validated_data.pop("project_name", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Custom update method to prevent changing the project.
        """
        if "project_name" in self.initial_data or "project" in self.initial_data:
            raise serializers.ValidationError(
                {"project": "Project cannot be changed after creation."}
            )
        return super().update(instance, validated_data)
