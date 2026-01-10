from datetime import datetime, timedelta, UTC
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from src.core.config import settings
from src.modules.identity.interface import IdentityInterface
from src.modules.identity.models import (
    Identity,
    IdentityType,
    AuthResult,
    AuthProvider,
)
from src.modules.identity.orm import IdentityORM, CapabilityORM, RevokedTokenORM


class IdentityService(IdentityInterface):
    """
    Implementation of the Identity module.

    This implementation uses:
    - SQLAlchemy for storage
    - JWT for access tokens
    - UUID for identity IDs

    But consumers don't know any of this - they only see the interface.
    """

    def __init__(self, db: AsyncSession):
        self._db = db

    async def authenticate(
        self,
        provider: AuthProvider,
        token: str,
    ) -> AuthResult:
        # For anonymous auth, token is device_id
        if provider == AuthProvider.ANONYMOUS:
            identity = await self._get_or_create_anonymous(token)
        else:
            # TODO: Implement OAuth validation for Google/Apple
            # For now, create a new identity
            identity = await self._create_identity(
                identity_type=IdentityType.AUTHENTICATED,
                provider=provider,
                external_id=token,
            )

        # Generate tokens
        access_token, expires_at = self._generate_access_token(identity.id)
        refresh_token = self._generate_refresh_token(identity.id)

        return AuthResult(
            identity=identity,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )

    async def refresh_session(self, identity_id: str) -> AuthResult:
        identity = await self.get_identity(identity_id)
        if not identity:
            raise ValueError("Invalid identity")

        access_token, expires_at = self._generate_access_token(identity_id)
        refresh_token = self._generate_refresh_token(identity_id)

        return AuthResult(
            identity=identity,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )

    async def logout(
        self,
        identity_id: str,
        jti: str | None = None,
        token_type: str = "access",
        expires_at: datetime | None = None,
    ) -> None:
        """
        Logout user by revoking their token.

        Args:
            identity_id: The user's identity ID
            jti: The JWT ID to revoke (if provided)
            token_type: "access" or "refresh"
            expires_at: When the token expires (for cleanup)
        """
        # Add token to revocation list if JTI provided
        if jti:
            # Default expiry if not provided (7 days from now)
            if expires_at is None:
                expires_at = datetime.now(UTC) + timedelta(days=7)

            revoked = RevokedTokenORM(
                id=str(uuid4()),
                jti=jti,
                identity_id=identity_id,
                token_type=token_type,
                expires_at=expires_at,
            )
            self._db.add(revoked)

        # Update last active
        result = await self._db.execute(
            select(IdentityORM).where(IdentityORM.id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if orm:
            orm.last_active_at = datetime.now(UTC)

        await self._db.flush()

    async def is_token_revoked(self, jti: str) -> bool:
        """Check if a token has been revoked."""
        result = await self._db.execute(
            select(RevokedTokenORM).where(RevokedTokenORM.jti == jti)
        )
        return result.scalar_one_or_none() is not None

    async def has_capability(self, identity_id: str, capability: str) -> bool:
        result = await self._db.execute(
            select(CapabilityORM).where(
                CapabilityORM.identity_id == identity_id,
                CapabilityORM.capability == capability,
            )
        )
        cap = result.scalar_one_or_none()
        if not cap:
            return False

        # Check expiration
        if cap.expires_at and cap.expires_at < datetime.now(UTC):
            return False

        return True

    async def grant_capability(
        self,
        identity_id: str,
        capability: str,
        expires_at: datetime | None = None,
    ) -> None:
        cap = CapabilityORM(
            id=str(uuid4()),
            identity_id=identity_id,
            capability=capability,
            expires_at=expires_at,
        )
        self._db.add(cap)
        await self._db.flush()

    async def revoke_capability(self, identity_id: str, capability: str) -> None:
        result = await self._db.execute(
            select(CapabilityORM).where(
                CapabilityORM.identity_id == identity_id,
                CapabilityORM.capability == capability,
            )
        )
        cap = result.scalar_one_or_none()
        if cap:
            await self._db.delete(cap)
            await self._db.flush()

    async def get_identity(self, identity_id: str) -> Identity | None:
        result = await self._db.execute(
            select(IdentityORM).where(IdentityORM.id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            return None

        # Get capabilities
        caps_result = await self._db.execute(
            select(CapabilityORM).where(CapabilityORM.identity_id == identity_id)
        )
        capabilities = {
            cap.capability
            for cap in caps_result.scalars()
            if not cap.expires_at or cap.expires_at > datetime.now(UTC)
        }

        return Identity(
            id=orm.id,
            type=orm.identity_type,
            capabilities=capabilities,
            created_at=orm.created_at,
            last_active_at=orm.last_active_at,
        )

    async def is_valid(self, identity_id: str) -> bool:
        identity = await self.get_identity(identity_id)
        return identity is not None

    # =========================================================================
    # Private Methods (hidden from interface)
    # =========================================================================

    async def _get_or_create_anonymous(self, device_id: str) -> Identity:
        # Check for existing identity with this device_id
        result = await self._db.execute(
            select(IdentityORM).where(IdentityORM.external_id == device_id)
        )
        orm = result.scalar_one_or_none()

        if orm:
            orm.last_active_at = datetime.now(UTC)
            await self._db.flush()
            return await self.get_identity(orm.id)  # type: ignore

        return await self._create_identity(
            identity_type=IdentityType.ANONYMOUS,
            provider=AuthProvider.ANONYMOUS,
            external_id=device_id,
        )

    async def _create_identity(
        self,
        identity_type: IdentityType,
        provider: AuthProvider,
        external_id: str,
    ) -> Identity:
        now = datetime.now(UTC)
        identity_id = str(uuid4())

        orm = IdentityORM(
            id=identity_id,
            identity_type=identity_type,
            provider=provider,
            external_id=external_id,
            created_at=now,
            last_active_at=now,
        )
        self._db.add(orm)
        await self._db.flush()

        return Identity(
            id=identity_id,
            type=identity_type,
            capabilities=set(),
            created_at=now,
            last_active_at=now,
        )

    def _generate_access_token(self, identity_id: str) -> tuple[str, datetime]:
        now = datetime.now(UTC)
        expires_at = now + timedelta(minutes=settings.jwt_expire_minutes)
        payload = {
            "sub": identity_id,
            "exp": expires_at,
            "type": "access",
            "jti": str(uuid4()),  # JWT ID for revocation
            "iat": now,  # Issued at
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return token, expires_at

    def _generate_refresh_token(self, identity_id: str) -> str:
        now = datetime.now(UTC)
        expires_at = now + timedelta(days=30)
        payload = {
            "sub": identity_id,
            "exp": expires_at,
            "type": "refresh",
            "jti": str(uuid4()),  # JWT ID for revocation
            "iat": now,  # Issued at
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
