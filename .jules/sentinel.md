## 2024-05-23 - [Prompt Injection in WebSocket Handlers]
**Vulnerability:** User-controlled inputs (location names, types) were directly formatted into LLM system prompts in `terminal_bot.py` and `api_server.py`.
**Learning:** Even internal-looking APIs (like WebSocket handlers for specific UI components) are trusted boundaries. Trusting client-side context objects (`{"location": "..."}`) allows attackers to control the AI's system instructions.
**Prevention:** Always flatten (remove newlines) and truncate user input before inserting it into a prompt template. Implemented `sanitize_for_prompt` utility.
