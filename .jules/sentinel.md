## 2025-05-20 - Prompt Injection in Websocket Comparison

**Vulnerability:** The `websocket_compare` endpoint in `api_server.py` was taking user-provided location names and types directly from the JSON payload and formatting them into the system prompt using `COMPARISON_SYSTEM_PROMPT.format()`. This allowed for prompt injection if a malicious user provided a crafted location name containing system instructions.

**Learning:** When using LLMs, any data that originates from a user (even indirectly like location names if they can be manipulated) must be treated as untrusted and sanitized before being placed into a prompt template. Simply placing variables into a prompt string is dangerous.

**Prevention:** Always use a sanitization function (like the newly created `sanitize_for_prompt`) that normalizes Unicode, removes control characters, and collapses whitespace before inserting text into prompts. Ideally, use parameterized prompt templates provided by LLM frameworks if available, but sanitization is a necessary defense-in-depth layer.
