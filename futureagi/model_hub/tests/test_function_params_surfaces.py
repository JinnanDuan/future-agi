import pytest
from rest_framework import status

from model_hub.models.choices import (
    DatasetSourceChoices,
    DataTypeChoices,
    ModelTypes,
    OwnerChoices,
    SourceChoices,
)
from model_hub.models.develop_dataset import Column, Dataset
from model_hub.models.eval_groups import EvalGroup
from model_hub.models.evals_metric import EvalTemplate, UserEvalMetric
from model_hub.models.run_prompt import PromptEvalConfig, PromptTemplate


@pytest.fixture
def rag_function_template(user, workspace):
    return EvalTemplate.objects.create(
        name="recall_at_k_test_template",
        description="Recall@K test template",
        owner=OwnerChoices.SYSTEM.value,
        eval_tags=["FUNCTION", "RAG"],
        config={
            "required_keys": ["hypothesis", "reference"],
            "output": "score",
            "eval_type_id": "RecallAtK",
            "function_eval": True,
            "function_params_schema": {
                "k": {
                    "type": "integer",
                    "default": None,
                    "nullable": True,
                    "minimum": 1,
                }
            },
            "config_params_desc": {
                "hypothesis": "Retrieved chunks",
                "reference": "Ground-truth chunks",
                "k": "Top K",
            },
        },
    )


@pytest.fixture
def dataset_for_eval(user, workspace):
    dataset = Dataset.objects.create(
        name="Function Param Dataset",
        organization=user.organization,
        workspace=workspace,
        user=user,
        source=DatasetSourceChoices.BUILD.value,
        model_type=ModelTypes.GENERATIVE_LLM.value,
        column_order=[],
    )

    hypothesis_col = Column.objects.create(
        dataset=dataset,
        name="hypothesis_col",
        data_type=DataTypeChoices.TEXT.value,
        source=SourceChoices.OTHERS.value,
    )
    reference_col = Column.objects.create(
        dataset=dataset,
        name="reference_col",
        data_type=DataTypeChoices.TEXT.value,
        source=SourceChoices.OTHERS.value,
    )
    dataset.column_order = [str(hypothesis_col.id), str(reference_col.id)]
    dataset.save(update_fields=["column_order"])

    return dataset, hypothesis_col, reference_col


@pytest.fixture
def prompt_template(user, workspace):
    return PromptTemplate.objects.create(
        name="Prompt Template Params",
        organization=user.organization,
        workspace=workspace,
        created_by=user,
    )


@pytest.mark.django_db
def test_prompt_eval_config_update_and_get_uses_config_params(
    auth_client, prompt_template, rag_function_template
):
    payload = {
        "id": str(rag_function_template.id),
        "name": "prompt_recall_k",
        "mapping": {
            "hypothesis": "retrieved_contexts",
            "reference": "ground_truth_contexts",
        },
        "config": {"params": {"k": 7}},
    }

    response = auth_client.post(
        f"/model-hub/prompt-templates/{prompt_template.id}/update-evaluation-configs/",
        payload,
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK

    stored = PromptEvalConfig.objects.get(
        prompt_template=prompt_template, name="prompt_recall_k", deleted=False
    )
    assert stored.config.get("params", {}).get("k") == 7
    assert stored.mapping == {
        "hypothesis": "retrieved_contexts",
        "reference": "ground_truth_contexts",
    }

    get_response = auth_client.get(
        f"/model-hub/prompt-templates/{prompt_template.id}/evaluation-configs/"
    )
    assert get_response.status_code == status.HTTP_200_OK
    result = get_response.json().get("result", {})
    evals = result.get("evaluation_configs", [])
    target = next(item for item in evals if item.get("name") == "prompt_recall_k")
    assert target.get("params", {}).get("k") == 7
    assert "k" in (target.get("function_params_schema") or {})


@pytest.mark.django_db
def test_apply_eval_group_dataset_propagates_shared_params(
    auth_client, user, workspace, rag_function_template, dataset_for_eval
):
    dataset, hypothesis_col, reference_col = dataset_for_eval
    eval_group = EvalGroup.objects.create(
        name="dataset_param_group",
        organization=user.organization,
        workspace=workspace,
        created_by=user,
    )
    eval_group.eval_templates.add(rag_function_template)

    payload = {
        "eval_group_id": str(eval_group.id),
        "page_id": "DATASET",
        "filters": {"dataset_id": str(dataset.id), "model": "turing_small"},
        "mapping": {
            "hypothesis": str(hypothesis_col.id),
            "reference": str(reference_col.id),
        },
        "params": {"k": 3},
    }

    response = auth_client.post(
        "/model-hub/eval-groups/apply-eval-group/", payload, format="json"
    )
    assert response.status_code == status.HTTP_200_OK

    metric = UserEvalMetric.objects.get(
        eval_group=eval_group,
        dataset=dataset,
        template=rag_function_template,
        deleted=False,
    )
    assert metric.config.get("params", {}).get("k") == 3


@pytest.mark.django_db
def test_apply_eval_group_prompt_propagates_shared_params(
    auth_client, user, workspace, rag_function_template, prompt_template
):
    eval_group = EvalGroup.objects.create(
        name="prompt_param_group",
        organization=user.organization,
        workspace=workspace,
        created_by=user,
    )
    eval_group.eval_templates.add(rag_function_template)

    payload = {
        "eval_group_id": str(eval_group.id),
        "page_id": "PROMPT",
        "filters": {"prompt_template_id": str(prompt_template.id)},
        "mapping": {
            "hypothesis": "retrieved_contexts",
            "reference": "ground_truth_contexts",
        },
        "params": {"k": 11},
    }

    response = auth_client.post(
        "/model-hub/eval-groups/apply-eval-group/", payload, format="json"
    )
    assert response.status_code == status.HTTP_200_OK

    prompt_eval = PromptEvalConfig.objects.get(
        eval_group=eval_group,
        prompt_template=prompt_template,
        eval_template=rag_function_template,
        deleted=False,
    )
    assert prompt_eval.config.get("params", {}).get("k") == 11


@pytest.mark.django_db
def test_fetch_eval_group_details_contains_function_param_requirements(
    auth_client, user, workspace, rag_function_template
):
    eval_group = EvalGroup.objects.create(
        name="group_requirements_check",
        organization=user.organization,
        workspace=workspace,
        created_by=user,
    )
    eval_group.eval_templates.add(rag_function_template)

    response = auth_client.get(f"/model-hub/eval-groups/{eval_group.id}/")
    assert response.status_code == status.HTTP_200_OK

    result = response.json().get("result", {})
    requirements = result.get("function_params_requirements", {})
    assert "k" in requirements
    assert requirements["k"].get("schema", {}).get("type") == "integer"
    supported_by = requirements["k"].get("supported_by", [])
    assert any(
        item.get("eval_template_id") == str(rag_function_template.id)
        for item in supported_by
    )
