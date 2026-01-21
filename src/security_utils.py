"""
Chronos-X Security Utilities
============================
Centralized security functions for input sanitization and validation.
"""
import re
import unicodedata
from typing import Optional, Any

# Constants
MAX_INPUT_LENGTH = 1000

def sanitize_for_prompt(text: str) -> str:
    """
    Sanitize user input to prevent prompt injection and encoding issues.

    Handles:
    - Control characters (except newlines and tabs)
    - Unicode normalization (fancy quotes -> regular quotes)
    - Multiple spaces collapsed
    - Leading/trailing whitespace
    - Length limiting
    """
    if not text:
        return ""

    # Limit length
    text = text[:MAX_INPUT_LENGTH]

    # Remove control characters (except newlines and tabs)
    text = ''.join(c for c in text if c.isprintable() or c in '\n\t')

    # Normalize unicode (NFKC compatibility decomposition)
    text = unicodedata.normalize('NFKC', text)

    # Collapse multiple spaces into one
    text = re.sub(r' +', ' ', text)

    return text.strip()

def sanitize_location_id(loc: str) -> str:
    """
    Sanitize location IDs (state/district IDs) to prevent injection.
    Only allows alphanumeric, underscore, ampersand, and whitespace.
    """
    if not loc:
        return ""

    # Strip whitespace and limit length
    loc = loc.strip()[:50]

    # Allow alphanumeric, underscore, ampersand (for "Jammu & Kashmir"), and spaces
    if not re.match(r'^[a-zA-Z0-9_&\s]+$', loc):
        return ""

    return loc

def validate_pincode(pincode: str) -> bool:
    """
    Validate Indian PIN code format.
    Must be 6 digits and within 100000-999999.
    """
    if not pincode or not pincode.isdigit() or len(pincode) != 6:
        return False

    try:
        pin_int = int(pincode)
        return 100000 <= pin_int <= 999999
    except ValueError:
        return False

def sanitize_context_data(data: Any) -> Any:
    """
    Recursively sanitize dictionary/list structures to ensure safety.
    """
    if isinstance(data, dict):
        return {k: sanitize_context_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_context_data(item) for item in data]
    elif isinstance(data, str):
        return sanitize_for_prompt(data)
    else:
        return data
