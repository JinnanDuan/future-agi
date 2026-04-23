"""
Response formatting utilities for model handlers.

This module standardizes response formatting for LLM handlers:
- LLM completion responses
- Streaming responses with tool call accumulation
- Metadata building from streaming chunks

All formatters return consistent metadata and value_info structures.
"""

import json
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import structlog

from agentic_eval.core_evals.fi_utils.token_count_helper import calculate_total_cost

logger = structlog.get_logger(__name__)


@dataclass
class UsageInfo:
    """
    Token usage information for LLM responses.

    Tracks prompt tokens, completion tokens, and total tokens
    for cost calculation and usage reporting.
    """

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
        }

    def to_cost_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format expected by calculate_total_cost."""
        return {
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
        }


class ResponseFormatter:
    """
    Formats LLM model responses into standardized structures.

    Used by LLMHandler for:
    - Standard completion responses
    - Streaming response metadata
    - Tool call accumulation during streaming
    """

    @staticmethod
    def _build_value_info(
        response_content: Any,
        runtime: float,
        model: str,
        metadata: Optional[Dict[str, Any]] = None,
        failure: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Build a standardized value_info dictionary.

        This is the single source of truth for value_info structure,
        ensuring consistency across all response formatters.

        Args:
            response_content: The response data to include
            runtime: Execution time in milliseconds
            model: Model name used
            metadata: Optional metadata dict (usage, cost, etc.)
            failure: Optional error message if request failed

        Returns:
            Standardized value_info dictionary
        """
        return {
            "name": None,
            "data": {"response": response_content},
            "failure": failure,
            "runtime": runtime,
            "model": model,
            "metrics": [],
            "metadata": metadata or {},
            "output": None,
        }

    @staticmethod
    def extract_reasoning_content(
        response, show_reasoning_process: bool
    ) -> Optional[str]:
        """Extract reasoning/thinking content and prepend to response if enabled."""
        if not show_reasoning_process:
            return None

        message = response.choices[0].message
        reasoning_text = None

        # Try reasoning_content (o1/o3 models)
        if hasattr(message, "reasoning_content") and message.reasoning_content:
            reasoning_text = message.reasoning_content
        # Try thinking_blocks (Anthropic)
        elif hasattr(message, "thinking_blocks") and message.thinking_blocks:
            reasoning_text = "\n\n".join(
                block.get("thinking", "") for block in message.thinking_blocks
            )

        return reasoning_text

    @staticmethod
    def format_llm_response(
        response: Any,
        model: str,
        start_time: float,
        tools: Optional[List[Dict]] = None,
        output_format: Optional[str] = None,
        show_reasoning_process: bool = False,
    ) -> Tuple[Any, Dict[str, Any]]:
        """
        Format a standard LLM completion response.

        Args:
            response: LiteLLM ModelResponse object
            model: Model name used for the completion
            start_time: Request start time (time.time())
            tools: Optional list of tools if tool calling was used
            output_format: Optional output format specification

        Returns:
            Tuple of (formatted_response, value_info dict)
        """
        end_time = time.time()
        completion_time = (end_time - start_time) * 1000

        # Extract response content
        response_content = response.choices[0].message.content
        response_model = response.model

        # Extract usage information
        usage = UsageInfo(
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            total_tokens=response.usage.total_tokens,
        )

        # Build metadata
        metadata = {
            "usage": usage.to_dict(),
            "cost": calculate_total_cost(response_model, usage.to_cost_dict()),
            "response_time": completion_time,
        }

        # Handle tool calls
        formatted_response = response_content
        if tools and response.choices[0].message.tool_calls:
            tool_calls_list = ResponseFormatter._format_tool_calls(
                response.choices[0].message.tool_calls
            )
            formatted_response = json.dumps(tool_calls_list)
        elif output_format:
            # Apply output format transformation if specified
            formatted_response = ResponseFormatter._apply_output_format(
                response, output_format
            )
        else:
            formatted_response = response_content

        # Extract reasoning content for value_info (old behavior: thinking goes to value_info, not main response)
        reasoning_text = ResponseFormatter.extract_reasoning_content(
            response, show_reasoning_process
        )
        response_content_with_thinking = response_content
        if reasoning_text:
            response_content_with_thinking = (
                f"<thinking>\n{reasoning_text}\n</thinking>\n\n{response_content}"
            )

        value_info = ResponseFormatter._build_value_info(
            response_content=response_content_with_thinking,
            runtime=completion_time,
            model=response_model,
            metadata=metadata,
        )

        return formatted_response, value_info

    @staticmethod
    def _format_tool_calls(tool_calls: List[Any]) -> List[Dict[str, Any]]:
        """
        Format tool calls from LiteLLM response to list of dicts.

        Args:
            tool_calls: List of tool call objects from response

        Returns:
            List of tool call dictionaries
        """
        return [
            {
                "id": tool_call.id,
                "type": tool_call.type,
                "function": {
                    "name": tool_call.function.name,
                    "arguments": tool_call.function.arguments,
                },
            }
            for tool_call in tool_calls
        ]

    @staticmethod
    def _apply_output_format(response: Any, output_format: str) -> Any:
        """
        Apply output format transformation to response.

        Currently returns raw content - output format handling is done
        at the handler level via get_formatted_output().

        Args:
            response: LiteLLM response object
            output_format: Output format specification

        Returns:
            Formatted response content
        """
        # Output format transformations are currently handled by
        # RunPrompt.get_formatted_output() - this is a placeholder
        # for future centralization
        return response.choices[0].message.content

    @staticmethod
    def build_streaming_metadata(
        chunk: Any,
        start_time: float,
    ) -> Dict[str, Any]:
        """
        Build metadata from the final streaming chunk.

        Args:
            chunk: Final chunk from streaming response with usage info
            start_time: Request start time

        Returns:
            Metadata dictionary
        """
        end_time = time.time()
        completion_time = end_time - start_time

        if not hasattr(chunk, "usage") or chunk.usage is None:
            return {
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
                "cost": {"total_cost": 0, "prompt_cost": 0, "completion_cost": 0},
                "response_time": completion_time,
            }

        usage_dict = {
            "prompt_tokens": chunk.usage.prompt_tokens,
            "completion_tokens": chunk.usage.completion_tokens,
            "total_tokens": chunk.usage.total_tokens,
        }

        return {
            "usage": usage_dict,
            "cost": calculate_total_cost(chunk.model, dict(chunk.usage)),
            "response_time": completion_time,
        }

    @staticmethod
    def accumulate_tool_calls(
        existing_tool_calls: List[Dict[str, Any]],
        chunk_tool_calls: List[Any],
    ) -> List[Dict[str, Any]]:
        """
        Accumulate tool calls from streaming chunks.

        Tool calls come in incrementally during streaming - this method
        accumulates them into complete tool call objects.

        Args:
            existing_tool_calls: Previously accumulated tool calls
            chunk_tool_calls: Tool calls from current chunk

        Returns:
            Updated list of tool calls
        """
        tool_calls = existing_tool_calls.copy()

        for tool_call in chunk_tool_calls:
            # Extend list if needed
            while len(tool_calls) <= tool_call.index:
                tool_calls.append(
                    {
                        "id": "",
                        "type": "function",
                        "function": {"name": "", "arguments": ""},
                    }
                )

            tc = tool_calls[tool_call.index]

            if tool_call.id:
                tc["id"] += tool_call.id
            if tool_call.function.name:
                tc["function"]["name"] += tool_call.function.name
            if tool_call.function.arguments:
                tc["function"]["arguments"] += tool_call.function.arguments

        return tool_calls
