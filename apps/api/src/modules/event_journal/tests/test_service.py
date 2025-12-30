"""
Tests for EventJournalService
"""

import pytest
from datetime import datetime, timedelta, UTC
from unittest.mock import AsyncMock, MagicMock

from src.modules.event_journal.service import EventJournalService
from src.modules.event_journal.models import (
    EventType,
    EventCategory,
    EventSource,
)


class TestEventJournalService:
    """Unit tests for EventJournalService."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.execute = AsyncMock()
        return db

    @pytest.fixture
    def service(self, mock_db):
        """Create a service instance with mock db."""
        return EventJournalService(mock_db)

    @pytest.mark.asyncio
    async def test_record_event_creates_event(self, service, mock_db):
        """Test that record_event creates an event with correct data."""
        # Arrange
        identity_id = "test-identity-123"
        event_type = EventType.FAST_COMPLETED
        metadata = {"duration_hours": 16.5}

        # Act
        event = await service.record_event(
            identity_id=identity_id,
            event_type=event_type,
            metadata=metadata,
            description="Completed 16 hour fast",
        )

        # Assert
        assert event.identity_id == identity_id
        assert event.event_type == event_type
        assert event.category == EventCategory.FASTING
        assert event.metadata == metadata
        assert event.description == "Completed 16 hour fast"
        assert mock_db.add.called
        assert mock_db.flush.called

    @pytest.mark.asyncio
    async def test_record_event_auto_categorizes(self, service, mock_db):
        """Test that events are automatically categorized."""
        test_cases = [
            (EventType.FAST_STARTED, EventCategory.FASTING),
            (EventType.WORKOUT_COMPLETED, EventCategory.WORKOUT),
            (EventType.XP_EARNED, EventCategory.PROGRESSION),
            (EventType.WEIGHT_LOGGED, EventCategory.METRICS),
            (EventType.PROFILE_UPDATED, EventCategory.PROFILE),
            (EventType.COACH_MESSAGE_SENT, EventCategory.COACH),
        ]

        for event_type, expected_category in test_cases:
            event = await service.record_event(
                identity_id="test-id",
                event_type=event_type,
            )
            assert event.category == expected_category, \
                f"Expected {event_type} to be categorized as {expected_category}"

    @pytest.mark.asyncio
    async def test_record_event_with_related_resource(self, service, mock_db):
        """Test recording event with related resource."""
        event = await service.record_event(
            identity_id="test-id",
            event_type=EventType.FAST_COMPLETED,
            related_id="window-123",
            related_type="time_window",
        )

        assert event.related_id == "window-123"
        assert event.related_type == "time_window"

    @pytest.mark.asyncio
    async def test_record_event_with_custom_timestamp(self, service, mock_db):
        """Test recording event with custom timestamp."""
        custom_time = datetime(2025, 1, 1, 12, 0, 0, tzinfo=UTC)

        event = await service.record_event(
            identity_id="test-id",
            event_type=EventType.FAST_STARTED,
            timestamp=custom_time,
        )

        assert event.timestamp == custom_time

    @pytest.mark.asyncio
    async def test_build_description_for_fast_completed(self, service, mock_db):
        """Test description building for fast completed events."""
        event = await service.record_event(
            identity_id="test-id",
            event_type=EventType.FAST_COMPLETED,
            metadata={"duration_hours": 16.5, "xp_earned": 50},
        )

        feed_item = service._to_feed_item(event)
        assert "16 hour fast" in feed_item.description
        assert "50 XP" in feed_item.description

    @pytest.mark.asyncio
    async def test_build_description_for_workout_completed(self, service, mock_db):
        """Test description building for workout completed events."""
        event = await service.record_event(
            identity_id="test-id",
            event_type=EventType.WORKOUT_COMPLETED,
            metadata={
                "workout_name": "Morning HIIT",
                "duration_minutes": 15,
                "xp_earned": 75,
            },
        )

        feed_item = service._to_feed_item(event)
        assert "Morning HIIT" in feed_item.description
        assert "15 min" in feed_item.description
        assert "75 XP" in feed_item.description
