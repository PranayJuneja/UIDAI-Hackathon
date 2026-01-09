"""
Security utilities for Chronos-X.
"""
import unicodedata
import html

def sanitize_input(text: str, escape_html: bool = False) -> str:
    """
    Sanitize user input to prevent issues.

    Args:
        text: Input text
        escape_html: Whether to escape HTML characters (prevents XSS)

    Handles:
    - Control characters (except newlines and tabs)
    - Unicode normalization (fancy quotes → regular quotes)
    - Multiple spaces collapsed
    - Leading/trailing whitespace
    """
    if not text:
        return ""

    # Remove control characters (except newlines and tabs)
    # This prevents invisible characters that can be used for obfuscation
    text = ''.join(c for c in text if c.isprintable() or c in '\n\t')

    # Normalize unicode (handle fancy quotes, etc.)
    text = unicodedata.normalize('NFKC', text)

    # Collapse multiple spaces into one
    # Note: this will also collapse tabs into spaces if they are adjacent or just convert them to spaces
    text = ' '.join(text.split())

    text = text.strip()

    if escape_html:
        text = html.escape(text)

    return text
