## 2025-05-24 - Prompt Injection via WebSocket Inputs
**Vulnerability:** `api_server.py` and `terminal_bot.py` were directly injecting user input (location names, context data) into LLM system prompts without sanitization.
**Learning:** Even internal "context" objects passed from frontend can be manipulated by malicious users to inject prompts. Trusting "internal" messages from client-side is a common fallacy.
**Prevention:** Centralized `sanitize_for_prompt` function applied to ALL user-derived inputs (including JSON objects) before prompt construction.
