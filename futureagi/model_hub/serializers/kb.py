from rest_framework import serializers

from model_hub.models.kb import KnowledgeBase


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = [
            "id",
            "name",
            "embedding_model",
            "chunk_size",
            "organization",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "created_at", "updated_at"]


class KnowledgeBaseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = [
            "id",
            "name",
            "embedding_model",
            "chunk_size",
            "organization",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["organization"] = user.organization
        return super().create(validated_data)
