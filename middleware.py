"""
Security Middleware for Chronos-X API
======================================
Adds HTTP security headers, rate limiting, and connection management.

All settings are configurable via environment variables for flexibility
between development and production environments.

Author: Chronos-X Team
"""

import os
import time
import logging
from collections import defaultdict
from typing import Callable, Dict, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("SecurityMiddleware")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION (Environment Variables)
# ═══════════════════════════════════════════════════════════════════════════════

# Security headers - can be disabled in development if needed
ENABLE_SECURITY_HEADERS = os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"

# Rate limiting configuration
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
RATE_LIMIT_BURST = int(os.getenv("RATE_LIMIT_BURST", "10"))  # Extra requests allowed in burst

# Content Security Policy (can be customized for different environments)
CSP_POLICY = os.getenv(
    "CSP_POLICY",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss: http: https:;"
)

# HSTS settings (only enable in production with HTTPS)
HSTS_ENABLED = os.getenv("HSTS_ENABLED", "false").lower() == "true"
HSTS_MAX_AGE = int(os.getenv("HSTS_MAX_AGE", "31536000"))  # 1 year default


# ═══════════════════════════════════════════════════════════════════════════════
# RATE LIMITER
# ═══════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window.
    
    Note: For production with multiple workers, use Redis-based solution.
    This implementation is suitable for single-process deployments.
    """
    
    def __init__(self, requests_per_minute: int = 60, burst: int = 10):
        self.requests_per_minute = requests_per_minute
        self.burst = burst
        self.window_seconds = 60
        # {client_ip: [(timestamp, count), ...]}
        self._requests: Dict[str, list] = defaultdict(list)
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # Cleanup every 5 minutes
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies."""
        # Check for forwarded headers (reverse proxy)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Take first IP (original client)
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to direct client
        if request.client:
            return request.client.host
        return "unknown"
    
    def _cleanup_old_requests(self):
        """Remove old request records to prevent memory bloat."""
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        
        cutoff = now - self.window_seconds
        for ip in list(self._requests.keys()):
            self._requests[ip] = [
                (ts, count) for ts, count in self._requests[ip]
                if ts > cutoff
            ]
            if not self._requests[ip]:
                del self._requests[ip]
        
        self._last_cleanup = now
    
    def is_allowed(self, request: Request) -> Tuple[bool, int]:
        """
        Check if request is allowed under rate limit.
        
        Returns:
            (allowed: bool, remaining: int)
        """
        if not RATE_LIMIT_ENABLED:
            return True, self.requests_per_minute
        
        self._cleanup_old_requests()
        
        client_ip = self._get_client_ip(request)
        now = time.time()
        cutoff = now - self.window_seconds
        
        # Count requests in current window
        current_requests = sum(
            count for ts, count in self._requests[client_ip]
            if ts > cutoff
        )
        
        limit = self.requests_per_minute + self.burst
        remaining = max(0, limit - current_requests - 1)
        
        if current_requests >= limit:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return False, 0
        
        # Record this request
        self._requests[client_ip].append((now, 1))
        return True, remaining


# Global rate limiter instance
_rate_limiter = RateLimiter(RATE_LIMIT_PER_MINUTE, RATE_LIMIT_BURST)


# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY HEADERS MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════════

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all HTTP responses.
    
    Headers added:
    - X-Content-Type-Options: Prevents MIME sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Legacy XSS protection (for older browsers)
    - Referrer-Policy: Controls referrer information
    - Content-Security-Policy: Controls resource loading
    - Strict-Transport-Security: Forces HTTPS (when enabled)
    - Permissions-Policy: Restricts browser features
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Process the request
        response = await call_next(request)
        
        # Add security headers if enabled
        if ENABLE_SECURITY_HEADERS:
            # Prevent MIME type sniffing
            response.headers["X-Content-Type-Options"] = "nosniff"
            
            # Prevent clickjacking - allow same origin framing
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
            
            # XSS protection for legacy browsers
            response.headers["X-XSS-Protection"] = "1; mode=block"
            
            # Control referrer information
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            
            # Content Security Policy
            response.headers["Content-Security-Policy"] = CSP_POLICY
            
            # Permissions Policy (formerly Feature-Policy)
            response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
            
            # HSTS - only when explicitly enabled (production with HTTPS)
            if HSTS_ENABLED:
                response.headers["Strict-Transport-Security"] = f"max-age={HSTS_MAX_AGE}; includeSubDomains"
        
        return response


# ═══════════════════════════════════════════════════════════════════════════════
# RATE LIMITING MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════════

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Applies rate limiting to all requests.
    
    Returns 429 Too Many Requests when limit exceeded.
    Adds X-RateLimit-* headers to responses.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for WebSocket upgrade requests
        # (WebSockets have their own connection limits)
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)
        
        # Check rate limit
        allowed, remaining = _rate_limiter.is_allowed(request)
        
        if not allowed:
            return Response(
                content='{"detail": "Rate limit exceeded. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "X-RateLimit-Limit": str(RATE_LIMIT_PER_MINUTE),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": "60"
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTION TO REGISTER MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════════

def add_security_middleware(app):
    """
    Register all security middleware on a FastAPI app.
    
    Call this AFTER adding CORS middleware (order matters).
    
    Usage:
        from middleware import add_security_middleware
        add_security_middleware(app)
    """
    # Add rate limiting first (it may reject requests early)
    if RATE_LIMIT_ENABLED:
        app.add_middleware(RateLimitMiddleware)
        logger.info(f"Rate limiting enabled: {RATE_LIMIT_PER_MINUTE}/min + {RATE_LIMIT_BURST} burst")
    
    # Add security headers
    if ENABLE_SECURITY_HEADERS:
        app.add_middleware(SecurityHeadersMiddleware)
        logger.info("Security headers middleware enabled")
    else:
        logger.warning("Security headers DISABLED (set ENABLE_SECURITY_HEADERS=true to enable)")
