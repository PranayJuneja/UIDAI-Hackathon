"""
Chronos-X Security Utilities
============================
Shared security functions for input sanitization and validation.
"""

import unicodedata
import re
import logging

logger = logging.getLogger("SecurityUtils")

def sanitize_for_prompt(text: str, max_length: int = 1000) -> str:
    """
    Sanitize input text for safe inclusion in LLM prompts.

    Prevents Prompt Injection and other attacks by:
    1. Normalizing Unicode characters to NFKC form.
    2. Removing all Control, Format, Surrogate, Private Use, and Unassigned characters
       (Unicode categories starting with 'C'), while preserving newlines and tabs.
    3. Collapsing multiple whitespace characters to single spaces.
    4. Truncating to max_length.

    Args:
        text: The input text to sanitize.
        max_length: Maximum allowed length (default 1000).

    Returns:
        Sanitized string.
    """
    if not isinstance(text, str):
        return ""

    # 1. Normalize Unicode (NFKC)
    text = unicodedata.normalize("NFKC", text)

    # 2. Remove all 'C' category characters (Control, Format, etc.)
    # But preserve standard whitespace like newline and tab
    text = "".join(ch for ch in text if not unicodedata.category(ch).startswith("C") or ch in "\n\r\t")

    # 3. Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # 4. Truncate to max_length
    if len(text) > max_length:
        logger.warning(f"Input truncated from {len(text)} to {max_length} chars")
        text = text[:max_length]

    return text
