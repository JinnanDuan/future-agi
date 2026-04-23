"""Unit tests for tracer.utils.helper.update_column_config_based_on_eval_config.

Covers the reason-column behaviour added in TH-4136: every eval config must
yield one hidden reason FieldConfig keyed `<config_id>__reason`, regardless of
output_type.
"""

from types import SimpleNamespace

import pytest

from tracer.utils.helper import update_column_config_based_on_eval_config


def _make_eval_config(
    *,
    config_id="cfg-1",
    template_id="tpl-1",
    name="toxicity",
    output_type="score",
    choices=None,
    config=None,
):
    template = SimpleNamespace(
        id=template_id,
        name=name,
        choices=choices,
        config=config
        or {"output": output_type, "reverse_output": False, "choices_map": {}},
    )
    return SimpleNamespace(id=config_id, name=name, eval_template=template)


@pytest.mark.unit
def test_score_eval_emits_main_and_reason_column():
    evals = [_make_eval_config()]

    result = update_column_config_based_on_eval_config([], evals)

    ids = [c["id"] for c in result]
    assert "cfg-1" in ids
    assert "cfg-1__reason" in ids

    reason = next(c for c in result if c["id"] == "cfg-1__reason")
    assert reason["name"] == "toxicity - Reason"
    assert reason["group_by"] == "Evaluation Metrics"
    assert reason["is_visible"] is False
    assert reason["source_field"] == "reason"
    assert reason["parent_eval_id"] == "cfg-1"


@pytest.mark.unit
def test_choices_eval_emits_single_reason_not_per_choice():
    evals = [
        _make_eval_config(
            output_type="choices",
            choices=["positive", "negative", "neutral"],
            config={
                "output": "choices",
                "reverse_output": False,
                "choices_map": {"positive": 1, "negative": 0, "neutral": 0},
            },
        )
    ]

    result = update_column_config_based_on_eval_config([], evals)

    reason_entries = [c for c in result if c["id"].endswith("__reason")]
    assert len(reason_entries) == 1
    assert reason_entries[0]["id"] == "cfg-1__reason"
    # Choice sub-columns still exist.
    assert any(c["id"] == "cfg-1**positive" for c in result)


@pytest.mark.unit
def test_simulator_reason_column_has_no_avg_prefix():
    evals = [_make_eval_config(name="groundedness")]

    result = update_column_config_based_on_eval_config([], evals, is_simulator=True)

    reason = next(c for c in result if c["id"] == "cfg-1__reason")
    assert reason["name"] == "groundedness - Reason"


@pytest.mark.unit
def test_reason_column_is_idempotent():
    evals = [_make_eval_config()]

    first = update_column_config_based_on_eval_config([], evals)
    second = update_column_config_based_on_eval_config(list(first), evals)

    reason_ids = [c["id"] for c in second if c["id"].endswith("__reason")]
    assert reason_ids == ["cfg-1__reason"]
