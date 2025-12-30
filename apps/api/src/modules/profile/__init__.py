"""PROFILE module - User PII, preferences, and GDPR compliance."""

from src.modules.profile.interface import ProfileInterface
from src.modules.profile.service import ProfileService

__all__ = ["ProfileInterface", "ProfileService"]
