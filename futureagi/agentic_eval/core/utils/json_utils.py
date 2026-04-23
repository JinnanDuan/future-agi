import json
import re
from typing import Any

from agentic_eval.core_evals.fi_utils.json import JsonHelper


def extract_dict_from_string(input_str: str) -> dict[str, Any]:
    """Extract the first JSON object from text and return it as a dictionary."""
    match = re.search(r"\{.*\}", input_str, re.DOTALL)
    if not match:
        raise ValueError(
            "Unable to generate a response at this time. Please check your input for accuracy."
        )

    json_str = (
        match.group(0)
        .strip()
        .replace("\n", "")
        .replace("\r", "")
        .replace("\t", "")
        .replace("\\r", "")
        .replace("\\t", "")
    )

    try:
        value = json.loads(json_str)
    except json.JSONDecodeError:
        try:
            value = json.loads(json_str.replace("'", '"'))
        except json.JSONDecodeError:
            value = JsonHelper.extract_json_from_text(json_str)

    if not isinstance(value, dict):
        raise ValueError("Extracted string is not valid Response.")
    return value
