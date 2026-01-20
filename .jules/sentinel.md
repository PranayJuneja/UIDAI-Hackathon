## 2024-05-23 - Centralized Input Sanitization
**Vulnerability:** Inconsistent or missing input sanitization across multiple bots and API endpoints, leading to potential prompt injection and DoS risks.
**Learning:** Distributed security logic is hard to maintain and verify. `copilot_bot.py` had local logic, while `terminal_bot.py` had none.
**Prevention:** Created `src/security_utils.py` as a single source of truth for sanitization (`sanitize_for_prompt`, `sanitize_context_data`). Enforced its usage across all entry points (`api_server.py`, bots).
