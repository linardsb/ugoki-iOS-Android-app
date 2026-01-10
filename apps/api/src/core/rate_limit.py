"""
Rate limiting configuration for UGOKI API.

Uses slowapi with Redis or in-memory storage for rate limiting.
Rate limits are applied per-user when authenticated, per-IP when not.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request


def get_rate_limit_key(request: Request) -> str:
    """
    Get rate limit key based on authentication status.

    - Authenticated users: rate limited by identity_id (extracted from JWT)
    - Anonymous users: rate limited by IP address

    This ensures authenticated users get consistent limits across IPs,
    while preventing IP-based abuse from unauthenticated requests.
    """
    auth_header = request.headers.get("Authorization", "")

    if auth_header.startswith("Bearer "):
        try:
            # Extract identity from token without full validation (for speed)
            # Full validation happens in the endpoint via get_current_identity
            import base64
            import json

            token = auth_header.split(" ")[1]
            # JWT is header.payload.signature - we want the payload
            payload_b64 = token.split(".")[1]
            # Add padding if needed for base64 decoding
            payload_b64 += "=" * (4 - len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64))

            if identity_id := payload.get("sub"):
                return f"user:{identity_id}"
        except Exception:
            # Fall through to IP-based limiting if token parsing fails
            pass

    return f"ip:{get_remote_address(request)}"


# Create the limiter instance with our custom key function
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["200/minute"],  # Default for all endpoints
)


# Rate limit presets for different endpoint categories
class RateLimits:
    """
    Rate limit presets for different endpoint types.

    Format: "X per Y" where Y can be: second, minute, hour, day
    Multiple limits can be combined: "5/minute;100/hour"
    """

    # Authentication endpoints - strict to prevent brute force
    AUTH = "5/minute;20/hour"

    # AI endpoints - moderate to control costs
    AI_CHAT = "30/minute;200/hour"
    AI_INSIGHT = "60/minute"

    # File uploads - moderate to prevent abuse
    UPLOAD = "10/minute;50/hour"

    # Search endpoints - moderate
    SEARCH = "30/minute;300/hour"

    # Write operations (create/update) - moderate
    WRITE = "60/minute"

    # Read operations - generous
    READ = "200/minute"

    # GDPR operations - very strict (sensitive + expensive)
    GDPR = "5/hour"
