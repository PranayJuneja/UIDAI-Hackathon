
## 2025-05-27 - Missing Input Sanitization
**Vulnerability:** The memory and architecture required `src/security_utils.py` for LLM input sanitization, but the file was missing and bots were passing raw user input to the LLM.
**Learning:** Architecture requirements in memory/docs must be verified against actual code presence. Missing security components can go unnoticed if functional tests don't cover security cases.
**Prevention:** Automated checks for required security modules.
