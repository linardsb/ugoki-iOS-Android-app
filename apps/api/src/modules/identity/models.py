from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class AuthProvider(str, Enum):
    GOOGLE = "google"
    APPLE = "apple"
    ANONYMOUS = "anonymous"


class IdentityType(str, Enum):
    AUTHENTICATED = "authenticated"
    ANONYMOUS = "anonymous"
    SYSTEM = "system"


class Identity(BaseModel):
    """Core IDENTITY primitive - who is acting (opaque reference, no PII)"""

    id: str = Field(..., description="Opaque identity reference")
    type: IdentityType
    capabilities: set[str] = Field(default_factory=set)
    created_at: datetime
    last_active_at: datetime


class AuthResult(BaseModel):
    """Result of authentication attempt"""

    identity: Identity
    access_token: str
    refresh_token: str
    expires_at: datetime


class AuthError(BaseModel):
    """Authentication error response"""

    code: str
    message: str


# Request/Response models for API
class AuthenticateRequest(BaseModel):
    provider: AuthProvider
    token: str = Field(..., description="OAuth token or anonymous device ID")


class RefreshRequest(BaseModel):
    refresh_token: str


class CapabilityGrant(BaseModel):
    capability: str
    expires_at: datetime | None = None
