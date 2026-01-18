"""
Security Utilities
==================
Shared security functions for input sanitization and validation.
"""

import re
import unicodedata

# Maximum input length to prevent resource exhaustion
MAX_INPUT_LENGTH = 1000

def sanitize_for_prompt(text: str) -> str:
    """
    Sanitize user input before it is used in LLM prompts.

    Performs the following operations:
    1. Limits length to MAX_INPUT_LENGTH
    2. Normalizes Unicode (NFKC)
    3. Removes control characters (preserving newline/tab)
    4. Collapses multiple spaces

    Args:
        text: The raw user input

    Returns:
        Sanitized string safe for prompt injection
    """
    if not text:
        return ""

    # Ensure input is string
    if not isinstance(text, str):
        text = str(text)

    # Limit length
    text = text[:MAX_INPUT_LENGTH]

    # Normalize unicode (e.g., fancy quotes -> regular quotes)
    text = unicodedata.normalize('NFKC', text)

    # Remove control characters except newlines and tabs
    text = ''.join(
        char for char in text
        if unicodedata.category(char) != 'Cc' or char in '\n\r\t'
    )

    # Collapse multiple spaces
    text = re.sub(r' +', ' ', text)

    return text.strip()
