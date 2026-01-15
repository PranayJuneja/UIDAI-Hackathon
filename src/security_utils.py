import re
import unicodedata

def sanitize_for_prompt(text: str) -> str:
    """
    Sanitize user input before sending to LLM to prevent prompt injection
    and ensure clean output.

    Args:
        text (str): The raw input text.

    Returns:
        str: The sanitized text safe for LLM consumption.
    """
    if not text:
        return ""

    # Limit length to prevent DoS (LLM token limit exhaustion)
    text = text[:1000]

    # Remove control characters (except newlines and tabs)
    text = "".join(c for c in text if c.isprintable() or c in "\n\t")

    # Normalize unicode to NFKC form
    text = unicodedata.normalize("NFKC", text)

    # Collapse multiple whitespaces first to normalize for regex matching
    text = " ".join(text.split())

    # Remove potential prompt injection patterns (basic)
    injection_patterns = [
        r"(?i)ignore previous instructions",
        r"(?i)system prompt",
        r"(?i)you are now",
        r"(?i)forget all instructions",
    ]

    for pattern in injection_patterns:
        text = re.sub(pattern, "", text)

    # Collapse whitespace AGAIN to clean up any gaps left by removals
    text = " ".join(text.split())

    return text.strip()
