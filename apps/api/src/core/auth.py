"""
Authentication dependencies for UGOKI API.

This module provides FastAPI dependencies for JWT-based authentication:
- get_current_identity: Validates JWT and returns identity_id (required auth)
- get_optional_identity: Returns identity_id if valid token, None otherwise
- verify_resource_ownership: Ensures user owns a resource before access

Usage:
    from src.core.auth import get_current_identity, verify_resource_ownership

    @router.get("/protected")
    async def protected_endpoint(
        identity_id: str = Depends(get_current_identity),
    ):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from src.core.config import settings


# HTTPBearer extracts token from "Authorization: Bearer <token>" header
http_bearer = HTTPBearer(
    auto_error=True,
    description="JWT access token from /identity/authenticate",
)
http_bearer_optional = HTTPBearer(
    auto_error=False,
    description="Optional JWT access token",
)


class AuthenticationError(HTTPException):
    """Raised when authentication fails (invalid/expired/missing token)."""

    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthorizationError(HTTPException):
    """Raised when user lacks permission to access a resource."""

    def __init__(self, detail: str = "Access denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


async def get_current_identity(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> str:
    """
    Validate JWT token and return identity_id.

    Extracts identity from the 'sub' claim of a valid access token.
    Raises 401 if token is missing, invalid, or expired.

    Args:
        credentials: HTTP Bearer credentials extracted by FastAPI

    Returns:
        identity_id (str): The user's identity UUID

    Raises:
        AuthenticationError: If token is missing, invalid, expired, or wrong type
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )

        identity_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if identity_id is None:
            raise AuthenticationError("Token missing identity claim")

        if token_type != "access":
            raise AuthenticationError("Invalid token type - expected access token")

        return identity_id

    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")


async def get_optional_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer_optional),
) -> str | None:
    """
    Optional authentication - returns identity_id if valid token, None otherwise.

    Use for endpoints that work both authenticated and anonymously.
    For example, recipe listing shows "saved" status only when authenticated.

    Args:
        credentials: Optional HTTP Bearer credentials

    Returns:
        identity_id (str | None): User's identity UUID if authenticated, None otherwise
    """
    if credentials is None:
        return None

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )

        identity_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if identity_id and token_type == "access":
            return identity_id
        return None

    except JWTError:
        # Invalid token treated as unauthenticated for optional auth
        return None


def verify_resource_ownership(
    resource_identity_id: str | None,
    current_identity_id: str,
    resource_name: str = "Resource",
) -> None:
    """
    Verify that a resource belongs to the current user.

    Call this after fetching a resource by ID to ensure the requesting
    user owns it before returning or modifying.

    Args:
        resource_identity_id: The identity_id that owns the resource (from DB)
        current_identity_id: The requesting user's identity_id (from JWT)
        resource_name: Human-readable name for error messages (e.g., "Metric")

    Raises:
        HTTPException 404: If resource_identity_id is None (resource not found)
        AuthorizationError 403: If user doesn't own the resource
    """
    if resource_identity_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found",
        )

    if resource_identity_id != current_identity_id:
        raise AuthorizationError(
            f"You do not have access to this {resource_name.lower()}"
        )
