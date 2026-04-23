from rest_framework import serializers

from agentcc.models.custom_property import AgentccCustomPropertySchema
from agentcc.validators import validate_safe_agentcc_name


class AgentccCustomPropertySchemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentccCustomPropertySchema
        fields = [
            "id",
            "organization",
            "project",
            "name",
            "description",
            "property_type",
            "required",
            "allowed_values",
            "default_value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "created_at",
            "updated_at",
        ]

    def validate_allowed_values(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("allowed_values must be a JSON array")
        return value

    def validate_name(self, value):
        try:
            return validate_safe_agentcc_name(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))
