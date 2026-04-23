import math

from django.db import models
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from model_hub.models.prompt_base_template import PromptBaseTemplate
from model_hub.serializers.prompt_base_template import PromptBaseTemplateSerializer
from tfc.utils.base_viewset import BaseModelViewSetMixin
from tfc.utils.general_methods import GeneralMethods


class PromptBaseTemplateViewSet(BaseModelViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing PromptBaseTemplate operations.
    Provides CRUD operations with organization-level isolation.
    """

    serializer_class = PromptBaseTemplateSerializer
    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def create(self, request, *args, **kwargs):
        """Create a new prompt base template"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return self._gm.create_response(serializer.data)

        except Exception as e:
            if "unique_prompt_base_template_name_organization_workspace" in str(e):
                return self._gm.bad_request(
                    "A prompt base template with this name already exists in your organization."
                )
            return self._gm.bad_request(
                f"Failed to create prompt base template: {str(e)}"
            )

    def perform_create(self, serializer):
        """Automatically set the organization when creating a prompt base template"""
        serializer.save(
            organization=getattr(self.request, "organization", None)
            or self.request.user.organization,
            created_by=self.request.user,
            workspace=self.request.workspace,
        )

    def list(self, request, *args, **kwargs):
        """List all prompt base templates for the user's organization"""
        try:
            name = request.query_params.get("name")
            category = request.query_params.get("category")
            page_size = int(request.query_params.get("page_size", 10))
            page_number = int(request.query_params.get("page_number", 0))
            start = page_number * page_size
            end = start + page_size
            sort_by = request.query_params.get("sort_by", "created_at")
            sort_direction = request.query_params.get("sort_order", "desc")

            if category:
                base_templates = PromptBaseTemplate.no_workspace_objects.filter(
                    (
                        models.Q(workspace=self.request.workspace)
                        & models.Q(
                            organization=getattr(self.request, "organization", None)
                            or self.request.user.organization
                        )
                    )
                    | models.Q(is_sample=True),
                    deleted=False,
                    category=category,
                ).select_related("organization", "created_by")
            else:
                base_templates = PromptBaseTemplate.objects.filter(
                    organization=getattr(self.request, "organization", None)
                    or self.request.user.organization,
                    deleted=False,
                ).select_related("organization", "created_by")

            if name:
                base_templates = base_templates.filter(name__icontains=name)

            # Get total count before pagination
            total_count = base_templates.count()
            sort_condition = (
                "-" + sort_by if sort_direction.lower() == "desc" else sort_by
            )

            base_templates_paginated = base_templates.order_by(sort_condition)[
                start:end
            ]

            response = PromptBaseTemplateSerializer(
                base_templates_paginated, many=True
            ).data

            total_pages = math.ceil(total_count / page_size)
            return self._gm.success_response(
                {
                    "data": response,
                    "total_count": total_count,
                    "total_pages": total_pages,
                }
            )
        except Exception as e:
            return self._gm.internal_server_error_response(
                f"Failed to list prompt base templates: {str(e)}"
            )

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific prompt base template"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return self._gm.success_response(serializer.data)
        except Exception as e:
            return self._gm.bad_request(f"Prompt base template not found: {str(e)}")

    def update(self, request, *args, **kwargs):
        """Update a prompt base template"""
        try:
            partial = kwargs.pop("partial", False)
            instance = self.get_object()
            serializer = self.get_serializer(
                instance, data=request.data, partial=partial
            )
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return self._gm.success_response(serializer.data)
        except Exception as e:
            return self._gm.bad_request(
                f"Failed to update prompt base template: {str(e)}"
            )

    def perform_update(self, serializer):
        """Ensure organization is maintained when updating a prompt base template"""
        serializer.save(
            organization=getattr(self.request, "organization", None)
            or self.request.user.organization,
            workspace=self.request.workspace,
        )

    def partial_update(self, request, *args, **kwargs):
        """Partially update a prompt base template"""
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a prompt base template (soft delete)"""
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self._gm.success_response(
                "Prompt base template deleted successfully"
            )
        except Exception as e:
            return self._gm.bad_request(
                f"Failed to delete prompt base template: {str(e)}"
            )

    def perform_destroy(self, instance):
        """Override destroy to implement soft delete"""
        instance.deleted = True
        instance.save()

    @action(detail=False, methods=["get"], url_path="get-all-categories")
    def get_all_categories(self, request):
        """Get all categories for the user's organization"""
        try:
            categories = (
                PromptBaseTemplate.no_workspace_objects.filter(
                    (
                        models.Q(workspace=self.request.workspace)
                        & models.Q(
                            organization=getattr(self.request, "organization", None)
                            or self.request.user.organization
                        )
                    )
                    | models.Q(is_sample=True),
                    deleted=False,
                )
                .values_list("category", flat=True)
                .distinct()
            )

            return self._gm.success_response(list(set(categories)))
        except Exception as e:
            return self._gm.bad_request(f"Failed to get all categories: {str(e)}")
