from abc import ABC, abstractmethod
from datetime import datetime

from src.modules.identity.models import (
    Identity,
    AuthResult,
    AuthProvider,
)


class IdentityInterface(ABC):
    """
    IDENTITY Module Interface (v1)

    Purpose: Authenticate users and authorize actions. Nothing else.

    This interface hides:
    - How tokens are validated (JWT, opaque, etc.)
    - Where sessions are stored (Redis, database, memory)
    - OAuth flow details
    - Password hashing (if ever added)
    - Rate limiting implementation

    Consumers never know:
    - Internal user_id format
    - Session token structure
    - Database schema
    - Which OAuth library is used
    """

    # =========================================================================
    # Authentication
    # =========================================================================

    @abstractmethod
    async def authenticate(
        self,
        provider: AuthProvider,
        token: str,
    ) -> AuthResult:
        """
        Authenticate a user via OAuth provider or anonymous token.

        Args:
            provider: The authentication provider (google, apple, anonymous)
            token: OAuth token or device ID for anonymous auth

        Returns:
            AuthResult containing Identity and access tokens

        Raises:
            AuthenticationError: If authentication fails
        """
        pass

    @abstractmethod
    async def refresh_session(self, identity_id: str) -> AuthResult:
        """
        Refresh an existing session to extend validity.

        Args:
            identity_id: Opaque identity reference

        Returns:
            New AuthResult with fresh tokens

        Raises:
            AuthenticationError: If session is invalid or expired
        """
        pass

    @abstractmethod
    async def logout(self, identity_id: str) -> None:
        """
        Invalidate all sessions for an identity.

        Args:
            identity_id: Opaque identity reference
        """
        pass

    # =========================================================================
    # Authorization
    # =========================================================================

    @abstractmethod
    async def has_capability(self, identity_id: str, capability: str) -> bool:
        """
        Check if an identity has a specific capability.

        Args:
            identity_id: Opaque identity reference
            capability: Capability to check (e.g., "premium_features")

        Returns:
            True if identity has the capability
        """
        pass

    @abstractmethod
    async def grant_capability(
        self,
        identity_id: str,
        capability: str,
        expires_at: datetime | None = None,
    ) -> None:
        """
        Grant a capability to an identity.

        Args:
            identity_id: Opaque identity reference
            capability: Capability to grant
            expires_at: Optional expiration timestamp
        """
        pass

    @abstractmethod
    async def revoke_capability(self, identity_id: str, capability: str) -> None:
        """
        Revoke a capability from an identity.

        Args:
            identity_id: Opaque identity reference
            capability: Capability to revoke
        """
        pass

    # =========================================================================
    # Session Queries
    # =========================================================================

    @abstractmethod
    async def get_identity(self, identity_id: str) -> Identity | None:
        """
        Retrieve an identity by ID.

        Args:
            identity_id: Opaque identity reference

        Returns:
            Identity if found, None otherwise
        """
        pass

    @abstractmethod
    async def is_valid(self, identity_id: str) -> bool:
        """
        Check if an identity reference is valid and active.

        Args:
            identity_id: Opaque identity reference

        Returns:
            True if identity is valid and active
        """
        pass
