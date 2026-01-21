## 2025-05-22 - Ghost Security Control Discovered
**Vulnerability:** The documentation and memory referenced `src/security_utils.py` for input sanitization, but the file did not exist in the codebase.
**Learning:** Reliance on documented but unverified security controls ("Ghost Controls") creates a false sense of security, leaving critical components (like `terminal_bot.py`) vulnerable to prompt injection.
**Prevention:** Always verify the existence and implementation of security modules referenced in documentation. Implemented `src/security_utils.py` as a centralized source of truth for sanitization logic.
