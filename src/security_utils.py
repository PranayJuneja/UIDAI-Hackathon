"""
Security Utilities for Chronos-X
================================
Shared security functions for sanitization and validation.
"""

import re

def sanitize_for_prompt(text: str, max_length: int = 100) -> str:
    """
    Sanitize input text for inclusion in LLM prompts.

    Prevents prompt injection by:
    1. Truncating to max_length
    2. Removing newlines and tabs (flattening)
    3. Stripping control characters

    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length (default 100)

    Returns:
        Sanitized text safe for prompt interpolation
    """
    if text is None:
        return "Unknown"

    # Ensure string
    text = str(text)

    # 1. Flatten (replace newlines/tabs with space)
    # This is critical to prevent injecting new sections into the prompt
    # (e.g., "\n\n## System Override:\n")
    text = re.sub(r'[\r\n\t]+', ' ', text)

    # 2. Strip control characters (keep printable)
    text = "".join(ch for ch in text if ch.isprintable())

    # 3. Truncate
    if len(text) > max_length:
        text = text[:max_length]

    return text.strip() or "Unknown"
