from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
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
async def authenticate(
    request: AuthenticateRequest,
    service: IdentityService = Depends(get_identity_service),
) -> AuthResult:
    """
    Authenticate via OAuth provider or anonymous mode.

    - **provider**: google, apple, or anonymous
    - **token**: OAuth token or device ID for anonymous
    """
    try:
        return await service.authenticate(request.provider, request.token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/refresh", response_model=AuthResult)
async def refresh_session(
    request: RefreshRequest,
    service: IdentityService = Depends(get_identity_service),
) -> AuthResult:
    """Refresh an expired access token using a refresh token."""
    # TODO: Validate refresh token and extract identity_id
    # For now, this is a placeholder
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Refresh token validation not yet implemented",
    )


@router.post("/logout")
async def logout(
    identity_id: str,
    service: IdentityService = Depends(get_identity_service),
) -> dict[str, str]:
    """Invalidate all sessions for an identity."""
    await service.logout(identity_id)
    return {"status": "logged_out"}


@router.get("/me", response_model=Identity)
async def get_current_identity(
    identity_id: str,  # TODO: Extract from JWT in auth middleware
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
