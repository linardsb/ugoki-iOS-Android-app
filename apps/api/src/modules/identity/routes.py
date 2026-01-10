from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError

from src.db import get_db
from src.core.config import settings
from src.core.auth import get_current_identity
from src.core.rate_limit import limiter, RateLimits

# For logout, we need to get the raw token to extract JTI
http_bearer = HTTPBearer()
from src.modules.identity.models import (
    AuthenticateRequest,
    RefreshRequest,
    AuthResult,
    Identity,
)
from src.modules.identity.service import IdentityService

router = APIRouter(tags=["identity"])


def get_identity_service(db: AsyncSession = Depends(get_db)) -> IdentityService:
    return IdentityService(db)


@router.post("/authenticate", response_model=AuthResult)
@limiter.limit(RateLimits.AUTH)
async def authenticate(
    request: Request,
    auth_request: AuthenticateRequest,
    service: IdentityService = Depends(get_identity_service),
) -> AuthResult:
    """
    Authenticate via OAuth provider or anonymous mode.

    - **provider**: google, apple, or anonymous
    - **token**: OAuth token or device ID for anonymous
    """
    try:
        return await service.authenticate(auth_request.provider, auth_request.token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/refresh", response_model=AuthResult)
@limiter.limit(RateLimits.AUTH)
async def refresh_session(
    request: Request,
    refresh_request: RefreshRequest,
    service: IdentityService = Depends(get_identity_service),
) -> AuthResult:
    """
    Refresh an expired access token using a refresh token.

    The refresh token is validated and a new access token is issued.
    The refresh token itself is not rotated (can be used multiple times until expiry).
    """
    try:
        payload = jwt.decode(
            refresh_request.refresh_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )

        # Validate token type
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type - expected refresh token",
            )

        # Extract identity
        identity_id = payload.get("sub")
        if not identity_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token - missing identity",
            )

        # Generate new tokens
        return await service.refresh_session(identity_id)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired - please re-authenticate",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    identity_id: str = Depends(get_current_identity),
    service: IdentityService = Depends(get_identity_service),
) -> dict[str, str]:
    """
    Logout and invalidate the current access token.

    The token is added to a revocation list and will be rejected
    on future requests even before its natural expiration.
    """
    # Extract JTI and expiration from the token
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        jti = payload.get("jti")
        exp = payload.get("exp")

        # Convert exp to datetime if present (UTC timezone-aware)
        expires_at = datetime.fromtimestamp(exp, tz=UTC) if exp else None

        await service.logout(
            identity_id=identity_id,
            jti=jti,
            token_type="access",
            expires_at=expires_at,
        )
    except JWTError:
        # Token already validated by get_current_identity, just logout without JTI
        await service.logout(identity_id)

    return {"status": "logged_out"}


@router.get("/me", response_model=Identity)
async def get_me(
    identity_id: str = Depends(get_current_identity),
    service: IdentityService = Depends(get_identity_service),
) -> Identity:
    """Get the current authenticated identity."""
    identity = await service.get_identity(identity_id)
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity not found",
        )
    return identity
