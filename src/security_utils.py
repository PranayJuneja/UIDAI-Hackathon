"""
Security Utilities
==================
Centralized security functions for input sanitization and validation.
Critical for preventing prompt injection and ensuring safe data handling.
"""

import re
import unicodedata
from typing import Any, Dict, List, Union

# Global input limit
MAX_INPUT_LENGTH = 1000

def sanitize_for_prompt(text: str, max_length: int = MAX_INPUT_LENGTH) -> str:
    """
    Sanitize user input to prevent prompt injection and ensure safe LLM inputs.

    Features:
    - Limits length
    - Normalizes Unicode (NFKC)
    - Removes control characters (except newlines)
    - Converts tabs to spaces
    - Collapses multiple spaces
    - Strips leading/trailing whitespace

    Args:
        text: The input string to sanitize
        max_length: Maximum allowed length (default: 1000)

    Returns:
        Sanitized string safe for LLM consumption
    """
    if not isinstance(text, str):
        return ""

    if not text:
        return ""

    # 1. Limit length
    text = text[:max_length]

    # 2. Normalize Unicode (NFKC) to canonicalize characters
    text = unicodedata.normalize('NFKC', text)

    # 3. Convert tabs to spaces
    text = text.replace('\t', ' ')

    # 4. Remove control characters (category 'Cc') except newlines
    # We allow newlines for structure, but remove everything else
    text = ''.join(
        char for char in text
        if unicodedata.category(char) != 'Cc' or char == '\n'
    )

    # 5. Collapse multiple spaces into one
    # This cleans up "word   word" -> "word word"
    text = re.sub(r' +', ' ', text)

    # 6. Strip leading/trailing whitespace
    return text.strip()

def sanitize_context_data(data: Any) -> Any:
    """
    Recursively sanitize dictionary and list structures.
    Useful for ensuring JSON payloads are safe.

    Args:
        data: Input data (dict, list, str, or primitive)

    Returns:
        Sanitized data structure
    """
    if isinstance(data, str):
        return sanitize_for_prompt(data)
    elif isinstance(data, dict):
        return {k: sanitize_context_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_context_data(item) for item in data]
    else:
        # Pass through numbers, booleans, None
        return data
