"""
Security Utilities for Chronos-X
================================
Centralized security functions for input sanitization and validation.
"""

import re
import unicodedata

def sanitize_for_prompt(text: str, max_length: int = 1000) -> str:
    """
    Sanitize input text to be safe for LLM prompts.

    - Normalizes Unicode (NFKC)
    - Removes control characters (keeping newlines)
    - Collapses whitespace (spaces only, preserves newlines)
    - Limits length to prevent context exhaustion
    """
    if not isinstance(text, str):
        return ""

    # Normalize unicode to NFKC form
    text = unicodedata.normalize("NFKC", text)

    # Remove control characters but keep newlines
    # Categories starting with 'C' are control characters (Cc, Cf, Cs, Co, Cn)
    cleaned = []
    for ch in text:
        if ch in ("\n", "\t") or not unicodedata.category(ch).startswith("C"):
            cleaned.append(ch)
    text = "".join(cleaned)

    # Replace tabs with spaces
    text = text.replace("\t", " ")

    # Collapse multiple spaces (but not newlines)
    text = re.sub(r' +', ' ', text)

    # Strip whitespace
    text = text.strip()

    # Limit length
    return text[:max_length]

def sanitize_location_id(loc: str) -> str:
    """
    Strict sanitization for location IDs.
    Allowed: Alphanumeric, underscores, ampersands, spaces (limited).
    """
    if not isinstance(loc, str):
        return ""

    # Strip whitespace and limit length
    loc = loc.strip()[:50]

    # Only allow safe characters
    # A-Z, a-z, 0-9, _, &, space
    if not re.match(r'^[a-zA-Z0-9_&\s]+$', loc):
        return ""

    return loc
