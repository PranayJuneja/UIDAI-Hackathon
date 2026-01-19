"""
Security Utilities for Chronos-X
================================
Common security functions for input sanitization and validation.
Used across API endpoints and Chatbots to prevent injection attacks.
"""

import re
import unicodedata
from typing import Any, Dict, List, Union

# Maximum allowed input length for LLM prompts to prevent token exhaustion
MAX_PROMPT_INPUT_LENGTH = 1000

def sanitize_for_prompt(text: str, max_length: int = MAX_PROMPT_INPUT_LENGTH) -> str:
    """
    Sanitize text input for use in LLM prompts.

    Protects against:
    - Prompt Injection (partial mitigation by cleaning control chars)
    - Token Exhaustion (via length limit)
    - Encoding Attacks (via unicode normalization)

    Args:
        text: The input string to sanitize.
        max_length: Maximum allowed characters (default: 1000).

    Returns:
        Sanitized string safe for prompt injection.
    """
    if not isinstance(text, str):
        return str(text) if text is not None else ""

    if not text:
        return ""

    # 1. Truncate to maximum length
    text = text[:max_length]

    # 2. Normalize Unicode (NFKC)
    # This converts "fancy" characters to their standard equivalents
    # e.g., 𝔖𝔢𝔠𝔯𝔢𝔱 -> Secret, ½ -> 1/2
    text = unicodedata.normalize('NFKC', text)

    # 3. Remove control characters (Category Cc) but preserve newlines and tabs
    # This removes null bytes, bell characters, escape sequences, etc.
    text = ''.join(
        char for char in text
        if unicodedata.category(char) != 'Cc' or char in '\n\r\t'
    )

    # 4. Collapse multiple whitespace to single space (except newlines)
    # This helps normalize the input structure
    text = re.sub(r'[ \t]+', ' ', text)

    # 5. Remove potential prompt injection delimiters if deemed dangerous?
    # For now, we trust the LLM's system prompt robustness, but ensuring
    # the input is just plain text is the main goal.

    return text.strip()

def sanitize_context_data(data: Any) -> Any:
    """
    Recursively sanitize a dictionary or list for use in context injection.

    Args:
        data: The dict, list, or primitive to sanitize.

    Returns:
        Sanitized data structure.
    """
    if isinstance(data, dict):
        return {
            sanitize_for_prompt(str(k), max_length=100): sanitize_context_data(v)
            for k, v in data.items()
        }
    elif isinstance(data, list):
        return [sanitize_context_data(item) for item in data]
    elif isinstance(data, str):
        return sanitize_for_prompt(data)
    else:
        # Numbers, booleans, None are safe
        return data
