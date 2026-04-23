from rest_framework import serializers

from saml2_auth.models import SAMLMetadataModel


class SAMLSerializer(serializers.ModelSerializer):
    class Meta:
        model = SAMLMetadataModel
        fields = ("name", "id", "identity_type", "is_enabled")
        read_only_fields = (
            "id",
            "identity_type",
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        return attrs
