## 2025-05-15 - Missing Critical Security Utility
**Vulnerability:** The critical input sanitization module `src/security_utils.py` was referenced in project memory/documentation but was completely missing from the codebase.
**Learning:** Documentation/Memory drift is a real security risk. "Ghost" security controls (controls that exist in docs but not code) create a false sense of safety.
**Prevention:** Always verify the existence of security modules referenced in documentation. If a module is "known" to exist but missing, treat it as a critical breach and restore/reimplement it immediately.
