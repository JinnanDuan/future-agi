from rest_framework import serializers

from model_hub.models.choices import DataTypeChoices
from model_hub.models.develop_dataset import Column, Dataset, Row
from simulate.models import Scenarios
from simulate.models.scenario_graph import ScenarioGraph


class ScenariosSerializer(serializers.ModelSerializer):
    """Serializer for the Scenarios model"""

    scenario_type_display = serializers.CharField(
        source="get_scenario_type_display", read_only=True
    )
    source_type_display = serializers.CharField(
        source="get_source_type_display", read_only=True
    )

    dataset_rows = serializers.SerializerMethodField()
    dataset_column_config = serializers.SerializerMethodField()
    graph = serializers.SerializerMethodField()
    agent = serializers.SerializerMethodField()
    prompt_template_detail = serializers.SerializerMethodField()
    prompt_version_detail = serializers.SerializerMethodField()
    agent_type = serializers.SerializerMethodField()

    class Meta:
        model = Scenarios
        fields = [
            "id",
            "name",
            "description",
            "source",
            "scenario_type",
            "scenario_type_display",
            "source_type",
            "source_type_display",
            "organization",
            "dataset",
            "dataset_rows",
            "dataset_column_config",
            "graph",
            "agent",
            "prompt_template",
            "prompt_template_detail",
            "prompt_version",
            "prompt_version_detail",
            "created_at",
            "updated_at",
            "deleted",
            "status",
            "deleted_at",
            "agent_type",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "deleted",
            "deleted_at",
            "organization",
        ]

    def get_dataset_rows(self, obj):
        """Get the number of rows in the dataset if this is a dataset-type scenario"""
        # Use annotated field if available (from view's Subquery optimization)
        if hasattr(obj, "_dataset_row_count") and obj._dataset_row_count is not None:
            return obj._dataset_row_count
        # Fallback for non-optimized querysets
        if obj.dataset:
            return Row.objects.filter(dataset=obj.dataset, deleted=False).count()
        return 0

    def get_dataset_column_config(self, obj):
        """Get the column config of the scenario"""
        if obj.dataset:
            column_order = obj.dataset.column_order
            columns = Column.objects.filter(deleted=False, id__in=column_order)
            column_config = {}
            for column in columns:
                column_config[f"{column.id}"] = {
                    "name": column.name,
                    "type": column.data_type,
                }
            return column_config

        return []

    def get_graph(self, obj):
        """Get graph data for graph-type scenarios"""

        # Get the most recent active graph for this scenario
        graph = (
            ScenarioGraph.objects.filter(scenario=obj, is_active=True)
            .order_by("-created_at")
            .first()
        )

        if graph and graph.graph_config:
            return graph.graph_config.get("graph_data", {})
        return {}

    def get_agent(self, obj):
        """Get simulator agent data for the scenario"""
        if obj.simulator_agent:
            return {
                "id": str(obj.simulator_agent.id),
                "name": obj.simulator_agent.name,
                "prompt": obj.simulator_agent.prompt,
                "voice_provider": obj.simulator_agent.voice_provider,
                "voice_name": obj.simulator_agent.voice_name,
                "model": obj.simulator_agent.model,
                # "llm_temperature": obj.simulator_agent.llm_temperature,
                "initial_message": obj.simulator_agent.initial_message,
                # "max_call_duration_in_minutes": obj.simulator_agent.max_call_duration_in_minutes,
                # "interrupt_sensitivity": obj.simulator_agent.interrupt_sensitivity,
                # "conversation_speed": obj.simulator_agent.conversation_speed,
                # "finished_speaking_sensitivity": obj.simulator_agent.finished_speaking_sensitivity,
                # "initial_message_delay": obj.simulator_agent.initial_message_delay,
                # "created_at": obj.simulator_agent.created_at,
                # "updated_at": obj.simulator_agent.updated_at
            }
        return None

    def get_agent_type(self, obj):
        """Determine the agent type for the scenario"""
        if obj.agent_definition:
            if obj.agent_definition.agent_type == "voice":
                return "inbound" if obj.agent_definition.inbound else "outbound"
            if obj.agent_definition.agent_type == "text":
                return "chat"
        if obj.prompt_version_id:
            return "prompt"
        return None

    def get_prompt_template_detail(self, obj):
        """Get prompt template data for the scenario (only for prompt source type)"""
        if obj.prompt_template:
            return {
                "id": str(obj.prompt_template.id),
                "name": obj.prompt_template.name,
                "description": obj.prompt_template.description,
                "variable_names": obj.prompt_template.variable_names,
            }
        return None

    def get_prompt_version_detail(self, obj):
        """Get prompt version data for the scenario (only for prompt source type)"""
        if obj.prompt_version:
            return {
                "id": str(obj.prompt_version.id),
                "template_version": obj.prompt_version.template_version,
                "is_default": obj.prompt_version.is_default,
                "commit_message": obj.prompt_version.commit_message,
            }
        return None

    def validate_name(self, value):
        """Validate that name is not empty or just whitespace"""
        if not value.strip():
            raise serializers.ValidationError(
                "Name cannot be empty or just whitespace."
            )
        return value.strip()

    def validate_source(self, value):
        """Validate that source is not empty or just whitespace"""
        if not value.strip():
            raise serializers.ValidationError(
                "Source cannot be empty or just whitespace."
            )
        return value.strip()


class CreateScenarioSerializer(serializers.Serializer):
    """Serializer for creating a new scenario from a dataset"""

    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    dataset_id = serializers.UUIDField(required=False)
    kind = serializers.CharField(max_length=20, required=False, default="dataset")
    script_url = serializers.URLField(required=False, allow_null=True)
    agent_definition_id = serializers.UUIDField(required=False)
    agent_definition_version_id = serializers.UUIDField(required=False, allow_null=True)
    custom_instruction = serializers.CharField(required=False, allow_blank=True)
    no_of_rows = serializers.IntegerField(
        required=False, default=20, min_value=10, max_value=20000
    )
    generate_graph = serializers.BooleanField(required=False, default=False)
    graph = serializers.JSONField(required=False, allow_null=True)

    # Prompt simulation fields
    source_type = serializers.ChoiceField(
        choices=[("agent_definition", "Agent Definition"), ("prompt", "Prompt")],
        required=False,
        default="agent_definition",
        help_text="Source type for the scenario: agent_definition or prompt",
    )
    prompt_template_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Prompt template ID (required for prompt source type)",
    )
    prompt_version_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Prompt version ID (required for prompt source type)",
    )

    # Persona-related fields
    add_persona_automatically = serializers.BooleanField(required=False, default=False)
    personas = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        help_text="List of persona IDs to use in the scenario",
    )

    # Custom columns for scenario generation
    custom_columns = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        max_length=10,
        help_text="List of custom columns to add to the scenario dataset (max 10 columns)",
    )

    # Simulator Agent fields
    agent_name = serializers.CharField(max_length=255, required=False)
    agent_prompt = serializers.CharField(required=False, allow_blank=True)
    voice_provider = serializers.CharField(
        max_length=100, required=False, default="elevenlabs"
    )
    voice_name = serializers.CharField(
        max_length=100, required=False, default="marissa"
    )
    model = serializers.CharField(max_length=100, required=False, default="gpt-4")
    llm_temperature = serializers.FloatField(required=False, default=0.7)
    initial_message = serializers.CharField(required=False, allow_blank=True)
    max_call_duration_in_minutes = serializers.IntegerField(required=False, default=30)
    interrupt_sensitivity = serializers.FloatField(required=False, default=0.5)
    conversation_speed = serializers.FloatField(required=False, default=1.0)
    finished_speaking_sensitivity = serializers.FloatField(required=False, default=0.5)
    initial_message_delay = serializers.IntegerField(required=False, default=0)

    def validate_name(self, value):
        """Validate that name is not empty or just whitespace"""
        if not value.strip():
            raise serializers.ValidationError(
                "Name cannot be empty or just whitespace."
            )
        return value.strip()

    def validate_kind(self, value):
        """Validate that kind is a valid scenario type"""
        valid_kinds = ["dataset", "script", "graph"]
        if value.lower() not in valid_kinds:
            raise serializers.ValidationError(
                f"Invalid kind. Must be one of: {', '.join(valid_kinds)}"
            )
        return value.lower()

    def validate_dataset_id(self, value):
        """Validate that the dataset exists and belongs to the user's organization"""
        if not value:
            return value

        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context is required.")

        try:
            Dataset.objects.get(
                id=value,
                deleted=False,
                organization=getattr(request, "organization", None)
                or request.user.organization,
            )
            return value
        except Dataset.DoesNotExist as e:
            raise serializers.ValidationError(
                "Dataset not found or not accessible."
            ) from e

    def validate_custom_columns(self, value):
        """Validate custom columns structure and data types"""
        if not value:
            return value

        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 custom columns are allowed.")

        valid_data_types = [choice.value for choice in DataTypeChoices]

        for i, column in enumerate(value):
            # Check required fields
            if not isinstance(column, dict):
                raise serializers.ValidationError(
                    f"Column at index {i} must be a dictionary."
                )

            if "name" not in column or not column["name"]:
                raise serializers.ValidationError(
                    f"Column at index {i} must have a 'name' field."
                )

            if "data_type" not in column or not column["data_type"]:
                raise serializers.ValidationError(
                    f"Column at index {i} must have a 'data_type' field."
                )

            if "description" not in column or not column["description"]:
                raise serializers.ValidationError(
                    f"Column at index {i} must have a 'description' field."
                )

            # Validate data type
            if column["data_type"] not in valid_data_types:
                raise serializers.ValidationError(
                    f"Column '{column['name']}' has invalid data_type '{column['data_type']}'. "
                    f"Valid types are: {', '.join(valid_data_types)}"
                )

            # Validate name is not empty or just whitespace
            if not column["name"].strip():
                raise serializers.ValidationError(
                    f"Column at index {i} name cannot be empty or just whitespace."
                )

            # Validate name length
            if len(column["name"].strip()) > 50:
                raise serializers.ValidationError(
                    f"Column at index {i} name cannot exceed 50 characters."
                )

            # Validate description length
            if len(column["description"].strip()) > 200:
                raise serializers.ValidationError(
                    f"Column at index {i} description cannot exceed 200 characters."
                )

        return value

    def validate_prompt_template_id(self, value):
        """Validate that the prompt template exists and belongs to the user's organization and workspace"""
        if not value:
            return value

        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context is required.")

        from model_hub.models.run_prompt import PromptTemplate

        try:
            filters = {
                "id": value,
                "deleted": False,
                "organization": getattr(request, "organization", None)
                or request.user.organization,
            }
            if hasattr(request.user, "workspace") and request.user.workspace:
                filters["workspace"] = request.user.workspace
            PromptTemplate.objects.get(**filters)
            return value
        except PromptTemplate.DoesNotExist as e:
            raise serializers.ValidationError(
                "Prompt template not found or not accessible."
            ) from e

    def validate_prompt_version_id(self, value):
        """Validate that the prompt version exists and belongs to the user's organization and workspace"""
        if not value:
            return value

        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context is required.")

        from model_hub.models.run_prompt import PromptVersion

        try:
            filters = {
                "id": value,
                "deleted": False,
                "original_template__organization": getattr(
                    request, "organization", None
                )
                or request.user.organization,
            }
            if hasattr(request.user, "workspace") and request.user.workspace:
                filters["original_template__workspace"] = request.user.workspace
            PromptVersion.objects.get(**filters)
            return value
        except PromptVersion.DoesNotExist as e:
            raise serializers.ValidationError(
                "Prompt version not found or not accessible."
            ) from e

    def validate(self, data):
        """Cross-field validation"""
        kind = data.get("kind", "dataset")
        source_type = data.get("source_type", "agent_definition")

        # For dataset kind, dataset_id is required
        if kind == "dataset" and not data.get("dataset_id"):
            raise serializers.ValidationError(
                "dataset_id is required for dataset kind."
            )

        # For script kind, script_url is required
        if kind == "script" and not data.get("script_url"):
            raise serializers.ValidationError("script_url is required for script kind.")

        # For graph kind, either generate_graph=True with agent_definition_id or graph data is required
        if kind == "graph":
            if not data.get("generate_graph") and not data.get("graph"):
                raise serializers.ValidationError(
                    "Either generate_graph=True with agent_definition_id or graph data is required for graph kind."
                )

            if data.get("generate_graph"):
                # For prompt source type, graph is generated from prompt_template
                if source_type != "prompt" and not data.get("agent_definition_id"):
                    raise serializers.ValidationError(
                        "agent_definition_id or prompt_template_id is required when generate_graph=True."
                    )

        # Validate prompt source type requirements
        if source_type == "prompt":
            if not data.get("prompt_template_id"):
                raise serializers.ValidationError(
                    "prompt_template_id is required for prompt source type."
                )
            if not data.get("prompt_version_id"):
                raise serializers.ValidationError(
                    "prompt_version_id is required for prompt source type."
                )

            # Validate that prompt_version belongs to prompt_template
            from model_hub.models.run_prompt import PromptVersion

            try:
                prompt_version = PromptVersion.objects.get(
                    id=data.get("prompt_version_id"), deleted=False
                )
                if prompt_version.original_template_id != data.get(
                    "prompt_template_id"
                ):
                    raise serializers.ValidationError(
                        "Prompt version does not belong to the specified prompt template."
                    )
            except PromptVersion.DoesNotExist:
                pass  # Already validated in validate_prompt_version_id

        return data


class EditScenarioSerializer(serializers.Serializer):
    """Serializer for editing scenario name and description"""

    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    graph = serializers.JSONField(required=False, allow_null=True)
    prompt = serializers.CharField(required=False, allow_blank=True)

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Name cannot be empty or just whitespace."
            )
        return value.strip()


class EditScenarioPromptsSerializer(serializers.Serializer):
    """Serializer for editing scenario prompts"""

    prompts = serializers.CharField(max_length=10000)

    # def validate_prompts(self, value):
    #     """Validate prompts structure"""
    #     if not isinstance(value, list):
    #         raise serializers.ValidationError("Prompts must be a list.")

    #     for i, prompt in enumerate(value):
    #         if not isinstance(prompt, dict):
    #             raise serializers.ValidationError(f"Prompt {i} must be a dictionary.")

    #         if 'role' not in prompt:
    #             raise serializers.ValidationError(f"Prompt {i} must have a 'role' field.")

    #         if 'content' not in prompt:
    #             raise serializers.ValidationError(f"Prompt {i} must have a 'content' field.")

    #         if prompt['role'] not in ['user', 'assistant', 'system']:
    #             raise serializers.ValidationError(f"Prompt {i} role must be 'user', 'assistant', or 'system'.")

    #     return value


class AddScenarioRowsSerializer(serializers.Serializer):
    """Serializer for adding rows to scenario datasets"""

    num_rows = serializers.IntegerField(min_value=10, max_value=20000)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_num_rows(self, value):
        """Validate that num_rows is within acceptable range"""
        if value < 10:
            raise serializers.ValidationError("Number of rows must be at least 10.")
        if value > 20000:
            raise serializers.ValidationError("Number of rows cannot exceed 20000.")
        return value


class AddScenarioColumnsSerializer(serializers.Serializer):
    """Serializer for adding columns to scenario datasets"""

    columns = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        allow_empty=False,
        max_length=10,
        help_text="List of column definitions to add (max 10 columns)",
    )

    def validate_columns(self, value):
        """Validate columns structure and data types"""
        if not value:
            raise serializers.ValidationError("At least one column is required.")

        if len(value) > 10:
            raise serializers.ValidationError(
                "Maximum 10 columns can be added at once."
            )

        valid_data_types = [choice.value for choice in DataTypeChoices]

        for i, column in enumerate(value):
            # Check required fields
            if not isinstance(column, dict):
                raise serializers.ValidationError(
                    f"Column at index {i} must be a dictionary."
                )

            if "name" not in column or not column["name"]:
                raise serializers.ValidationError(
                    f"Column at index {i} must have a 'name' field."
                )

            if "data_type" not in column or not column["data_type"]:
                raise serializers.ValidationError(
                    f"Column at index {i} must have a 'data_type' field."
                )

            if "description" not in column or not column["description"]:
                raise serializers.ValidationError(
                    f"Column at index {i} must have a 'description' field."
                )

            # Validate data type
            if column["data_type"] not in valid_data_types:
                raise serializers.ValidationError(
                    f"Column '{column['name']}' has invalid data_type '{column['data_type']}'. "
                    f"Valid types are: {', '.join(valid_data_types)}"
                )

            # Validate name is not empty or just whitespace
            if not column["name"].strip():
                raise serializers.ValidationError(
                    f"Column at index {i} name cannot be empty or just whitespace."
                )

            # Validate name length
            if len(column["name"].strip()) > 50:
                raise serializers.ValidationError(
                    f"Column at index {i} name cannot exceed 50 characters."
                )

            # Validate description length
            if len(column.get("description", "").strip()) > 200:
                raise serializers.ValidationError(
                    f"Column at index {i} description cannot exceed 200 characters."
                )

        return value
