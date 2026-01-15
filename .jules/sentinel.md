## 2024-05-23 - [Prompt Injection Defense]
**Vulnerability:** Missing input sanitization for LLM prompts in `chronos_chatbot.py` and `api_server.py`.
**Learning:** Even internal chatbots need strict input sanitization to prevent prompt injection attacks where users might override system instructions.
**Prevention:** Implemented `sanitize_for_prompt` in `src/security_utils.py` which strips control characters, normalizes unicode, and removes known injection patterns like "ignore previous instructions".
