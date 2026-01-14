## 2025-05-24 - System Prompt Injection via Context Data
**Vulnerability:** User-controlled "context" data (JSON payload) was directly formatted into the LLM system prompt in `TerminalBot`. A malicious user could inject instructions via the `location` or `type` fields in the WebSocket payload, overriding the system persona.
**Learning:** Even "structured" data like JSON context can be a vector for Prompt Injection if that data is used to construct the system prompt. Trust boundary must be enforced before prompt construction.
**Prevention:** Created `src/security_utils.py` with `sanitize_for_prompt()` to strip control characters and limit length. Applied this sanitization to all variables used in `system_prompt.format()`.
