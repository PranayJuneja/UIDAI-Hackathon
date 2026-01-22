## 2025-05-23 - Ghost Security Control & Prompt Injection
**Vulnerability:** The codebase referenced a non-existent `src/security_utils.py` module in its memory/docs (Ghost Security Control), leading to duplicated, inconsistent, and missing inline sanitization. Specifically, `api_server.py` had a prompt injection vulnerability in the `websocket_compare` endpoint where user JSON input was directly formatted into the system prompt.
**Learning:** Reliance on "planned" or "documented" security modules without verifying their physical existence creates a false sense of security. Inline sanitization is prone to being overlooked in complex endpoints (like WebSockets).
**Prevention:**
1. Always verify the existence of security modules before using them.
2. Centralize all sanitization logic in a verified `src/security_utils.py`.
3. Use `sanitize_for_prompt` for ALL user input destined for LLMs.
4. Use `sanitize_context_data` for recursive cleaning of JSON payloads.
