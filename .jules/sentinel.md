## 2026-01-10 - Added Security Headers to FastAPI
**Vulnerability:** Missing HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Content-Security-Policy).
**Learning:** FastAPI does not add these headers by default. `BaseHTTPMiddleware` from `starlette.middleware.base` is required to inject them efficiently.
**Prevention:** Always check default headers in new frameworks. Use middleware to enforce security headers globally.
