from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from model_hub.models.tts_voices import TTSVoice
from model_hub.queries.tts_voices import create_custom_voice
from model_hub.serializers.tts_voices import TTSVoiceSerializer
from tfc.utils.general_methods import GeneralMethods


class TTSVoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TTSVoiceSerializer
    _gm = GeneralMethods()

    def get_queryset(self):
        return TTSVoice.objects.filter(
            organization=getattr(self.request, "organization", None)
            or self.request.user.organization,
            deleted=False,
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            data = serializer.validated_data

            instance = create_custom_voice(
                organization=getattr(request, "organization", None)
                or request.user.organization,
                name=data.get("name"),
                voice_id=data.get("voice_id"),
                provider=data.get("provider"),
                model=data.get("model", ""),
                description=data.get("description", ""),
            )

            response_serializer = self.get_serializer(instance)
            return self._gm.success_response(response_serializer.data)
        except DjangoValidationError as e:
            return self._gm.bad_request(e.message if hasattr(e, "message") else str(e))
        except Exception as e:
            return self._gm.bad_request(str(e))

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.save()
