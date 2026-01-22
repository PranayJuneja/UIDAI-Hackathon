"""
Chronos-X Security Utilities
============================
Centralized security module for input sanitization and validation.
Prevents prompt injection, XSS, and other input-based attacks.
"""

import re
import unicodedata
from typing import Any, Dict, List, Union

def sanitize_for_prompt(text: str) -> str:
    """
    Sanitize text for inclusion in LLM prompts to prevent injection attacks.

    Performs:
    1. Unicode normalization (NFKC)
    2. Control character removal (preserving newlines)
    3. Tab to space conversion
    4. Whitespace collapsing
    """
    if not isinstance(text, str):
        return str(text)

    # 1. Unicode normalization
    text = unicodedata.normalize('NFKC', text)

    # 2. Convert tabs to spaces
    text = text.replace('\t', ' ')

    # 3. Remove control characters (except newlines)
    # Categories: Cc (Control), Cf (Format), Cs (Surrogate), Co (Private Use), Cn (Not Assigned)
    # We keep \n and \r
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != 'C' or ch in '\n\r')

    # 4. Collapse multiple spaces (but preserve newline structure)
    # This is a bit tricky if we want to preserve paragraph structure.
    # Simple approach: collapse spaces within lines, preserve newlines.
    lines = text.splitlines()
    cleaned_lines = [re.sub(r'\s+', ' ', line).strip() for line in lines]
    # Remove empty lines that might be created by strip() if they were just whitespace
    cleaned_lines = [line for line in cleaned_lines if line]
    return "\n".join(cleaned_lines)

def sanitize_location_id(loc: str) -> str:
    """
    Sanitize location ID to prevent path traversal or injection.
    Allows alphanumeric, underscore, and ampersand (for State names).
    """
    if not loc:
        return ""

    # Strip whitespace and limit length
    loc = loc.strip()[:50]

    # Only allow alphanumeric, underscore, and ampersand
    if not re.match(r'^[a-zA-Z0-9_&\s]+$', loc):
        return ""

    return loc

def validate_pincode(pincode: str) -> bool:
    """Validate 6-digit Indian PIN code."""
    if not pincode or not isinstance(pincode, str):
        return False
    return bool(re.match(r'^[1-9][0-9]{5}$', pincode))

def sanitize_context_data(data: Union[Dict, List, str, int, float, bool, None]) -> Union[Dict, List, str, int, float, bool, None]:
    """
    Recursively sanitize context data structures (JSON-like) for safe inclusion in logs/prompts.
    """
    if isinstance(data, dict):
        return {k: sanitize_context_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_context_data(v) for v in data]
    elif isinstance(data, str):
        return sanitize_for_prompt(data)
    else:
        return data
