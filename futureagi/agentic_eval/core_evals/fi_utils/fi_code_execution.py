import json
import os
import subprocess
import tempfile
from typing import Any

import structlog

from agentic_eval.core_evals.fi_utils.fi_code_base import Step

logger = structlog.get_logger(__name__)


class CodeExecution(Step):
    """
    Step that executes user-provided code in a sandboxed environment.

    Python: Uses RestrictedPython with process-level isolation.
    JavaScript: Uses Node.js subprocess with timeout.

    Attributes:
        code: The code to execute.
        language: The programming language ('python' or 'javascript').
    """

    code: str
    language: str = "python"
    name: str | None = None

    def detect_language(self, code: str) -> str:
        """Detect the programming language based on code content."""
        if any(
            keyword in code.lower()
            for keyword in [
                "function",
                "var ",
                "let ",
                "const ",
                "console.log",
                "=>",
            ]
        ):
            return "javascript"
        elif any(
            keyword in code.lower()
            for keyword in ["def ", "import ", "from ", "class ", "if __name__"]
        ):
            return "python"
        return "python"

    def execute_python(self, input_data: dict[str, Any]) -> dict[str, Any] | None:
        """Execute Python code in a production-grade sandbox.

        Uses multi-layer isolation:
        1. RestrictedPython v8 (AST-level)
        2. Subprocess isolation
        3. rlimits (memory, CPU, no files, no fork)
        4. Minimal environment
        """
        from agentic_eval.core_evals.fi_utils.sandbox import (
            execute_sandboxed_python,
        )

        try:
            return execute_sandboxed_python(
                code=self.code,
                input_data=input_data,
                timeout=30,
            )
        except Exception as e:
            logger.error("Sandboxed Python execution failed", error=str(e))
            return {
                "status": "error",
                "data": f"Failed to execute Python code: {e}",
            }

    def execute_javascript(self, input_data: dict[str, Any]) -> dict[str, Any] | None:
        """Execute JavaScript code in a production-grade sandbox.

        Uses multi-layer isolation:
        1. Module blocking (40+ dangerous modules)
        2. Process freezing (exit, kill, binding, env)
        3. rlimits (memory, CPU, no fork)
        4. 64MB heap, 1MB stack
        5. Timeout enforcement
        """
        from agentic_eval.core_evals.fi_utils.sandbox import (
            execute_sandboxed_javascript,
        )

        try:
            return execute_sandboxed_javascript(
                code=self.code,
                input_data=input_data,
                timeout=30,
            )
        except Exception as e:
            logger.error("Sandboxed JS execution failed", error=str(e))
            return {
                "status": "error",
                "data": f"Failed to execute JavaScript code: {e}",
            }

    def execute(self, input_data: Any) -> dict[str, Any] | None:
        """Execute the code with the input data."""
        if input_data is None:
            input_data = {}

        if not isinstance(input_data, dict):
            raise TypeError("Input data must be a dictionary.")

        # Auto-detect language if not explicitly set
        if not hasattr(self, "language") or self.language == "python":
            self.language = self.detect_language(self.code)

        if self.language == "javascript":
            return self.execute_javascript(input_data)
        else:
            return self.execute_python(input_data)
