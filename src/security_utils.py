"""
Chronos-X Security Utilities
============================
Shared security functions for input sanitization and validation.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger("SecurityUtils")

def sanitize_for_prompt(text: str, max_length: int = 200) -> str:
    """
    Sanitize input text to prevent prompt injection attacks when inserting into LLM prompts.

    Strategies:
    1. Truncate to safe length to prevent context window exhaustion.
    2. Normalize whitespace (remove newlines that could break prompt structure).
    3. Remove known prompt injection separators (like '---', '###').
    4. Strip potentially dangerous characters.

    Args:
        text: The input text to sanitize.
        max_length: Maximum allowed length (default 200).

    Returns:
        Sanitized string.
    """
    if not text or not isinstance(text, str):
        return ""

    # 1. Truncate
    # Allow slightly more than max_length initially to avoid cutting off mid-word if possible,
    # but hard limit is essential.
    sanitized = text[:max_length]

    # 2. Normalize whitespace
    # Replace newlines and tabs with spaces to prevent structure injection
    sanitized = re.sub(r'[\r\n\t]+', ' ', sanitized)

    # 3. Remove common prompt separators that might confuse the model
    # (e.g., trying to start a new section)
    sanitized = re.sub(r'#{3,}', '', sanitized) # Remove ###
    sanitized = re.sub(r'-{3,}', '', sanitized) # Remove ---

    # 4. Remove other potential control characters (keep printable only)
    # This regex allows alphanumeric, spaces, and standard punctuation.
    # It removes things that aren't typically needed in location names or simple queries.
    # Allowing: letters, numbers, spaces, common punctuation .,!?-()&
    # Depending on strictness, we might want to be more permissive for chat messages
    # but stricter for 'context' variables.

    # For now, we'll just ensure it's printable and single-line.
    # Filter out non-printable characters
    sanitized = "".join(ch for ch in sanitized if ch.isprintable())

    # Collapse multiple spaces
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()

    return sanitized
