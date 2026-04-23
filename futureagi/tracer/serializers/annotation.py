from rest_framework import serializers

from model_hub.models.develop_annotations import AnnotationsLabels
from tracer.models.span_notes import SpanNotes
from tracer.models.trace import Trace
from tracer.models.trace_annotation import TraceAnnotation


class TraceAnnotationSerializer(serializers.ModelSerializer):
    trace = serializers.PrimaryKeyRelatedField(queryset=Trace.objects.all())
    annotation_label = serializers.PrimaryKeyRelatedField(
        queryset=AnnotationsLabels.objects.all()
    )

    class Meta:
        model = TraceAnnotation
        fields = [
            "id",
            "trace",
            "annotation_label",
            "annotation_value",
            "observation_span",
            "user",
            "annotation_value_bool",
            "annotation_value_float",
            "annotation_value_str_list",
        ]


class GetTraceAnnotationSerializer(serializers.Serializer):
    observation_span_id = serializers.CharField(
        required=False, max_length=255, allow_null=True
    )
    trace_id = serializers.UUIDField(required=False, allow_null=True)
    annotators = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_null=True
    )
    exclude_annotators = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_null=True
    )


class SpanNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpanNotes
        fields = [
            "id",
            "span",
            "notes",
            "created_by_user",
            "created_by_annotator",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# Simple bulk annotation serializer
class BulkAnnotationSerializer(serializers.Serializer):
    records = serializers.ListField(child=serializers.DictField())
