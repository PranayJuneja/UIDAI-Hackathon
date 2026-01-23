## 2025-10-26 - Ghost Security Control & Prompt Injection
**Vulnerability:** Found a "Ghost Security Control" where `src/security_utils.py` was referenced in project memory but did not exist in the codebase. This led to `api_server.py` having a Prompt Injection vulnerability in the `websocket_compare` endpoint because the assumed sanitization functions were missing.
**Learning:** Reliance on documentation/memory without verification can lead to critical gaps. Missing security modules effectively disable defenses that developers assume are present.
**Prevention:** Always verify the existence of security utilities before using them. Implement CI/CD checks to ensure critical security files are present and tests pass.
