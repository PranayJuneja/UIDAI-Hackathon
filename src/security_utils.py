"""
Security Utilities for Chronos-X
================================
Provides common security functions for input sanitization and validation.
"""

import unicodedata
import re
from typing import Optional

def sanitize_for_prompt(text: str) -> str:
    """
    Sanitize input for use in LLM prompts to prevent injection attacks.

    Performs the following:
    1. Unicode normalization (NFKC)
    2. Removes control characters (category 'Cc')
    3. Collapses whitespace
    4. Strips leading/trailing whitespace

    Args:
        text: The input string to sanitize

    Returns:
        Sanitized string safe for prompt injection
    """
    if text is None:
        return ""

    if not isinstance(text, str):
        text = str(text)

    # 1. Normalize Unicode (NFKC)
    # This converts compatibility characters to their canonical forms
    text = unicodedata.normalize('NFKC', text)

    # 2. Remove control characters
    # Keep newlines and tabs as they are often valid in text
    text = "".join(ch for ch in text if unicodedata.category(ch) != 'Cc' or ch in '\n\t\r')

    # 3. Collapse whitespace
    # Replaces multiple spaces/tabs/newlines with a single space
    # This prevents layout manipulation in prompts
    text = re.sub(r'\s+', ' ', text)

    return text.strip()
