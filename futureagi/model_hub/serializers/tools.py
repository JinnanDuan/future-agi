from rest_framework import serializers

from model_hub.models.openai_tools import Tools


class ToolsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tools
        fields = ["id", "name", "description", "config", "config_type", "organization"]
        read_only_fields = ["organization"]
