from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin
from src.modules.identity.models import IdentityType, AuthProvider


class IdentityORM(Base, TimestampMixin):
    """Database model for Identity - hidden from interface consumers."""

    __tablename__ = "identities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_type: Mapped[IdentityType] = mapped_column(
        SQLEnum(IdentityType), nullable=False
    )
    provider: Mapped[AuthProvider] = mapped_column(
        SQLEnum(AuthProvider), nullable=False
    )
    external_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    capabilities: Mapped[list["CapabilityORM"]] = relationship(
        back_populates="identity", cascade="all, delete-orphan"
    )


class CapabilityORM(Base):
    """Database model for user capabilities."""

    __tablename__ = "capabilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identities.id", ondelete="CASCADE"), index=True
    )
    capability: Mapped[str] = mapped_column(String(100), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    identity: Mapped[IdentityORM] = relationship(back_populates="capabilities")
