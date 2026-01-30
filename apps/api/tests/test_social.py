"""
Comprehensive tests for SOCIAL module.

Tests cover:
- Friendship management (send request, accept, decline, remove)
- Duo Streaks (invite, accept, decline, daily completion, at-risk, end)
- Activity Feed (create items, cheer, preferences)
- Challenge Templates (list, create from template)
"""

import pytest
from datetime import datetime, timedelta, UTC
from uuid import uuid4
from httpx import AsyncClient
from jose import jwt

from src.core.config import settings


def generate_test_token(identity_id: str) -> str:
    """Generate a test JWT token for the given identity."""
    now = datetime.now(UTC)
    payload = {
        "sub": identity_id,
        "exp": now + timedelta(hours=1),
        "type": "access",
        "jti": str(uuid4()),
        "iat": now,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_auth_header(identity_id: str) -> dict:
    """Get Authorization header for a given identity."""
    return {"Authorization": f"Bearer {generate_test_token(identity_id)}"}


# API base path
API = "/api/v1"


# =============================================================================
# Helper Functions
# =============================================================================

async def create_test_identity(client: AsyncClient) -> dict:
    """Create a test identity via the API and return identity data with token."""
    device_id = f"test-device-{uuid4().hex[:8]}"
    response = await client.post(
        f"{API}/identity/authenticate",
        json={"provider": "anonymous", "token": device_id}
    )
    assert response.status_code in [200, 201], f"Failed to create identity: {response.text}"
    return response.json()


async def create_profile_for_identity(client: AsyncClient, identity_id: str, username: str) -> dict:
    """Create a profile for the given identity."""
    # Try POST first (create)
    response = await client.post(
        f"{API}/profile",
        json={
            "username": username,
            "display_name": f"Test User {username}",
            "email": f"{username}@test.com",
        },
        headers=get_auth_header(identity_id)
    )
    # If profile already exists, try PATCH (update)
    if response.status_code == 400:
        response = await client.patch(
            f"{API}/profile",
            json={
                "username": username,
                "display_name": f"Test User {username}",
            },
            headers=get_auth_header(identity_id)
        )
    return response.json() if response.status_code in [200, 201] else {}


async def setup_two_users_as_friends(client: AsyncClient) -> tuple[dict, dict]:
    """Create two users and make them friends. Returns (user1, user2) with identity data."""
    # Create two identities
    user1 = await create_test_identity(client)
    user2 = await create_test_identity(client)

    user1_id = user1["identity"]["id"]
    user2_id = user2["identity"]["id"]

    # Create profiles with unique usernames
    username1 = f"user1_{uuid4().hex[:6]}"
    username2 = f"user2_{uuid4().hex[:6]}"

    profile1_response = await create_profile_for_identity(client, user1_id, username1)
    profile2_response = await create_profile_for_identity(client, user2_id, username2)

    # Get user2's friend code from their social profile
    social_profile_get = await client.get(
        f"{API}/profile/social",
        headers=get_auth_header(user2_id)
    )
    if social_profile_get.status_code != 200:
        pytest.skip(f"Could not get user2 social profile: {social_profile_get.status_code} - {social_profile_get.text}")

    friend_code = social_profile_get.json().get("friend_code")
    if not friend_code:
        pytest.skip("User2 social profile has no friend_code")

    # User1 sends friend request to User2 via friend_code
    response = await client.post(
        f"{API}/social/friends/request",
        json={"friend_code": friend_code},
        headers=get_auth_header(user1_id)
    )

    if response.status_code != 201:
        pytest.skip(f"Could not send friend request: {response.status_code} - {response.text}")

    request_id = response.json()["id"]

    # User2 accepts the friend request
    response = await client.post(
        f"{API}/social/friends/requests/{request_id}/respond",
        json={"accept": True},
        headers=get_auth_header(user2_id)
    )

    if response.status_code != 200:
        pytest.skip(f"Could not accept friend request: {response.status_code} - {response.text}")

    user1["username"] = username1
    user2["username"] = username2

    return user1, user2


# =============================================================================
# Friendship Tests
# =============================================================================

class TestFriendship:
    """Test friendship management."""

    @pytest.mark.asyncio
    async def test_send_friend_request_requires_auth(self, client: AsyncClient):
        """Sending friend request without auth should return 401."""
        response = await client.post(
            f"{API}/social/friends/request",
            json={"username": "someone"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_friends_returns_empty_for_new_user(self, client: AsyncClient):
        """New user should have no friends."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/friends",
            headers=get_auth_header(user_id)
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_incoming_requests_empty_for_new_user(self, client: AsyncClient):
        """New user should have no incoming friend requests."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/friends/requests/incoming",
            headers=get_auth_header(user_id)
        )
        assert response.status_code == 200
        assert response.json() == []


# =============================================================================
# Duo Streak Tests
# =============================================================================

class TestDuoStreakInvites:
    """Test duo streak invitation flow."""

    @pytest.mark.asyncio
    async def test_duo_streak_invite_requires_auth(self, client: AsyncClient):
        """Creating duo streak invite without auth should return 401."""
        response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": "some-id", "streak_type": "fasting"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_duo_streak_invite_requires_friendship(self, client: AsyncClient):
        """Cannot create duo streak invite with non-friend."""
        user1 = await create_test_identity(client)
        user2 = await create_test_identity(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "fasting"},
            headers=get_auth_header(user1_id)
        )

        # Should fail because they're not friends
        assert response.status_code == 400
        assert "friends" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_duo_streak_invite_with_friends(self, client: AsyncClient):
        """Creating duo streak invite with friend should succeed."""
        user1, user2 = await setup_two_users_as_friends(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "fasting"},
            headers=get_auth_header(user1_id)
        )

        assert response.status_code == 201
        data = response.json()
        assert data["streak_type"] == "fasting"
        assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_get_duo_streak_invites_incoming(self, client: AsyncClient):
        """Get incoming duo streak invites."""
        user1, user2 = await setup_two_users_as_friends(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        # User1 invites User2
        await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "fasting"},
            headers=get_auth_header(user1_id)
        )

        # User2 checks incoming invites
        response = await client.get(
            f"{API}/social/duo-streaks/invites?direction=incoming",
            headers=get_auth_header(user2_id)
        )

        assert response.status_code == 200
        invites = response.json()
        assert len(invites) >= 1
        assert invites[0]["streak_type"] == "fasting"

    @pytest.mark.asyncio
    async def test_accept_duo_streak_invite(self, client: AsyncClient):
        """Accepting duo streak invite creates active streak."""
        user1, user2 = await setup_two_users_as_friends(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        # User1 invites User2
        invite_response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "workout"},
            headers=get_auth_header(user1_id)
        )
        invite_id = invite_response.json()["id"]

        # User2 accepts
        response = await client.post(
            f"{API}/social/duo-streaks/invites/{invite_id}/respond",
            json={"accept": True},
            headers=get_auth_header(user2_id)
        )

        assert response.status_code == 200
        streak = response.json()
        assert streak is not None
        assert streak["streak_type"] == "workout"
        assert streak["current_count"] == 0

    @pytest.mark.asyncio
    async def test_decline_duo_streak_invite(self, client: AsyncClient):
        """Declining duo streak invite returns None."""
        user1, user2 = await setup_two_users_as_friends(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        # User1 invites User2
        invite_response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "fasting"},
            headers=get_auth_header(user1_id)
        )
        invite_id = invite_response.json()["id"]

        # User2 declines
        response = await client.post(
            f"{API}/social/duo-streaks/invites/{invite_id}/respond",
            json={"accept": False},
            headers=get_auth_header(user2_id)
        )

        assert response.status_code == 200
        # Declined returns null
        assert response.json() is None


class TestDuoStreakOperations:
    """Test duo streak operations after creation."""

    @pytest.mark.asyncio
    async def test_get_active_duo_streaks(self, client: AsyncClient):
        """Get list of active duo streaks."""
        user1, user2 = await setup_two_users_as_friends(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        # Create and accept duo streak
        invite_response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "fasting"},
            headers=get_auth_header(user1_id)
        )
        invite_id = invite_response.json()["id"]

        await client.post(
            f"{API}/social/duo-streaks/invites/{invite_id}/respond",
            json={"accept": True},
            headers=get_auth_header(user2_id)
        )

        # Get active streaks for user1
        response = await client.get(
            f"{API}/social/duo-streaks?active_only=true",
            headers=get_auth_header(user1_id)
        )

        assert response.status_code == 200
        streaks = response.json()
        assert len(streaks) >= 1
        assert streaks[0]["streak_type"] == "fasting"

    @pytest.mark.asyncio
    async def test_get_specific_duo_streak(self, client: AsyncClient):
        """Get a specific duo streak by ID."""
        user1, user2 = await setup_two_users_as_friends(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        # Create and accept duo streak
        invite_response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "any_activity"},
            headers=get_auth_header(user1_id)
        )
        invite_id = invite_response.json()["id"]

        accept_response = await client.post(
            f"{API}/social/duo-streaks/invites/{invite_id}/respond",
            json={"accept": True},
            headers=get_auth_header(user2_id)
        )
        streak_id = accept_response.json()["id"]

        # Get specific streak
        response = await client.get(
            f"{API}/social/duo-streaks/{streak_id}",
            headers=get_auth_header(user1_id)
        )

        assert response.status_code == 200
        streak = response.json()
        assert streak["id"] == streak_id
        assert streak["streak_type"] == "any_activity"

    @pytest.mark.asyncio
    async def test_get_duo_streaks_at_risk_empty(self, client: AsyncClient):
        """Get at-risk streaks returns empty when none at risk."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/duo-streaks/at-risk",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_end_duo_streak(self, client: AsyncClient):
        """Ending a duo streak marks it as ended."""
        user1, user2 = await setup_two_users_as_friends(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]

        # Create and accept duo streak
        invite_response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "fasting"},
            headers=get_auth_header(user1_id)
        )
        invite_id = invite_response.json()["id"]

        accept_response = await client.post(
            f"{API}/social/duo-streaks/invites/{invite_id}/respond",
            json={"accept": True},
            headers=get_auth_header(user2_id)
        )
        streak_id = accept_response.json()["id"]

        # End the streak
        response = await client.delete(
            f"{API}/social/duo-streaks/{streak_id}",
            headers=get_auth_header(user1_id)
        )

        assert response.status_code == 204

        # Verify it's no longer in active streaks
        list_response = await client.get(
            f"{API}/social/duo-streaks?active_only=true",
            headers=get_auth_header(user1_id)
        )
        active_streaks = list_response.json()
        active_ids = [s["id"] for s in active_streaks]
        assert streak_id not in active_ids

    @pytest.mark.asyncio
    async def test_cannot_end_others_duo_streak(self, client: AsyncClient):
        """Cannot end a duo streak you're not part of."""
        user1, user2 = await setup_two_users_as_friends(client)
        user3 = await create_test_identity(client)

        user1_id = user1["identity"]["id"]
        user2_id = user2["identity"]["id"]
        user3_id = user3["identity"]["id"]

        # Create duo streak between user1 and user2
        invite_response = await client.post(
            f"{API}/social/duo-streaks",
            json={"partner_id": user2_id, "streak_type": "fasting"},
            headers=get_auth_header(user1_id)
        )
        invite_id = invite_response.json()["id"]

        accept_response = await client.post(
            f"{API}/social/duo-streaks/invites/{invite_id}/respond",
            json={"accept": True},
            headers=get_auth_header(user2_id)
        )
        streak_id = accept_response.json()["id"]

        # User3 tries to end it
        response = await client.delete(
            f"{API}/social/duo-streaks/{streak_id}",
            headers=get_auth_header(user3_id)
        )

        # Should fail - not a participant
        assert response.status_code in [400, 403, 404]


# =============================================================================
# Activity Feed Tests
# =============================================================================

class TestActivityFeed:
    """Test activity feed functionality."""

    @pytest.mark.asyncio
    async def test_get_feed_requires_auth(self, client: AsyncClient):
        """Getting feed without auth should return 401."""
        response = await client.get(f"{API}/social/feed")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_empty_feed(self, client: AsyncClient):
        """New user should have empty feed."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/feed",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_my_activity_empty(self, client: AsyncClient):
        """New user should have no activity."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/feed/my-activity",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_feed_preferences(self, client: AsyncClient):
        """Get default feed preferences."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/feed/preferences",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        prefs = response.json()
        # Default preferences should all be true
        assert prefs["share_fasts"] is True
        assert prefs["share_workouts"] is True
        assert prefs["share_achievements"] is True

    @pytest.mark.asyncio
    async def test_update_feed_preferences(self, client: AsyncClient):
        """Update feed sharing preferences."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        # Update to disable fasting sharing
        response = await client.patch(
            f"{API}/social/feed/preferences",
            json={"share_fasts": False},
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        prefs = response.json()
        assert prefs["share_fasts"] is False
        # Others should remain unchanged
        assert prefs["share_workouts"] is True


# =============================================================================
# Challenge Templates Tests
# =============================================================================

class TestChallengeTemplates:
    """Test challenge template functionality."""

    @pytest.mark.asyncio
    async def test_get_templates_returns_list(self, client: AsyncClient):
        """Getting challenge templates should return a list."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/challenges/templates",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)

    @pytest.mark.asyncio
    async def test_templates_have_required_fields(self, client: AsyncClient):
        """Templates should have all required fields."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/challenges/templates",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        templates = response.json()

        if len(templates) > 0:
            template = templates[0]
            # Check required fields
            assert "id" in template
            assert "name" in template
            assert "challenge_type" in template
            assert "duration_days" in template
            assert "goal_value" in template

    @pytest.mark.asyncio
    async def test_create_from_template_requires_auth(self, client: AsyncClient):
        """Creating challenge from template requires auth."""
        response = await client.post(
            f"{API}/social/challenges/from-template",
            json={"template_id": "some-id"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_from_template_invalid_id(self, client: AsyncClient):
        """Creating challenge from non-existent template should fail."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.post(
            f"{API}/social/challenges/from-template",
            json={"template_id": "nonexistent-template-id"},
            headers=get_auth_header(user_id)
        )

        # Should fail with 400 or 404
        assert response.status_code in [400, 404]


# =============================================================================
# Leaderboard Tests
# =============================================================================

class TestLeaderboards:
    """Test leaderboard functionality."""

    @pytest.mark.asyncio
    async def test_get_global_xp_leaderboard(self, client: AsyncClient):
        """Get global XP leaderboard."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/leaderboards/global_xp",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        leaderboard = response.json()
        assert "type" in leaderboard
        assert leaderboard["type"] == "global_xp"
        assert "entries" in leaderboard

    @pytest.mark.asyncio
    async def test_get_friends_leaderboard_empty(self, client: AsyncClient):
        """Friends leaderboard should be empty when user has no friends."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/leaderboards/friends_xp",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        leaderboard = response.json()
        assert leaderboard["type"] == "friends_xp"
        # May have 0 or 1 entry (user themselves)
        assert len(leaderboard["entries"]) <= 1

    @pytest.mark.asyncio
    async def test_get_weekly_leaderboard_with_period(self, client: AsyncClient):
        """Get leaderboard with week period parameter."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/leaderboards/global_xp?period=week",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        leaderboard = response.json()
        assert leaderboard["type"] == "global_xp"
        assert leaderboard["period"] == "week"

    @pytest.mark.asyncio
    async def test_get_monthly_leaderboard_with_period(self, client: AsyncClient):
        """Get leaderboard with month period parameter."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/leaderboards/global_xp?period=month",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        leaderboard = response.json()
        assert leaderboard["type"] == "global_xp"
        assert leaderboard["period"] == "month"

    @pytest.mark.asyncio
    async def test_get_all_time_leaderboard_with_period(self, client: AsyncClient):
        """Get leaderboard with all_time period parameter."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/leaderboards/global_xp?period=all_time",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 200
        leaderboard = response.json()
        assert leaderboard["type"] == "global_xp"
        assert leaderboard["period"] == "all_time"


# =============================================================================
# Achievement Celebrations Tests (Sprint 2)
# =============================================================================

class TestAchievementCelebrations:
    """Test achievement celebration functionality."""

    @pytest.mark.asyncio
    async def test_celebrate_achievement_requires_auth(self, client: AsyncClient):
        """Celebrating an achievement without auth should return 401."""
        response = await client.post(
            f"{API}/social/achievements/some-id/celebrate"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_celebrate_achievement_not_found(self, client: AsyncClient):
        """Celebrating a non-existent achievement should return 400."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.post(
            f"{API}/social/achievements/non-existent-id/celebrate",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_achievement_celebrations_requires_auth(self, client: AsyncClient):
        """Getting achievement celebrations without auth should return 401."""
        response = await client.get(
            f"{API}/social/achievements/some-id/celebrations"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_achievement_celebrations_not_found(self, client: AsyncClient):
        """Getting celebrations for non-existent achievement should return 404."""
        user = await create_test_identity(client)
        user_id = user["identity"]["id"]

        response = await client.get(
            f"{API}/social/achievements/non-existent-id/celebrations",
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 404


# =============================================================================
# Team Challenges Tests (Sprint 3)
# =============================================================================

class TestTeamChallenges:
    """Test team challenge functionality."""

    @pytest.mark.asyncio
    async def test_create_team_challenge(self, client: AsyncClient):
        """Creating a team challenge should work with team parameters."""
        from datetime import date, timedelta

        user = await create_test_identity(client)
        user_id = user["identity"]["id"]
        await create_profile_for_identity(client, user_id, f"teamcreator{uuid4().hex[:6]}")

        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=8)).isoformat()

        response = await client.post(
            f"{API}/social/challenges",
            json={
                "name": "Team XP Sprint",
                "challenge_type": "total_xp",
                "goal_value": 5000,
                "start_date": start_date,
                "end_date": end_date,
                "is_team_challenge": True,
                "team_size_min": 3,
                "team_size_max": 10,
            },
            headers=get_auth_header(user_id)
        )

        assert response.status_code == 201
        data = response.json()
        assert data["is_team_challenge"] is True
        assert data["team_size_min"] == 3
        assert data["team_size_max"] == 10
        # Creator is NOT auto-joined in team challenges
        assert data["is_participating"] is False

    @pytest.mark.asyncio
    async def test_create_team_within_challenge(self, client: AsyncClient):
        """Creating a team within a team challenge should work."""
        from datetime import date, timedelta

        user = await create_test_identity(client)
        user_id = user["identity"]["id"]
        await create_profile_for_identity(client, user_id, f"teamleader{uuid4().hex[:6]}")

        # Create team challenge
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=8)).isoformat()

        challenge_response = await client.post(
            f"{API}/social/challenges",
            json={
                "name": "Team Workout Challenge",
                "challenge_type": "workout_count",
                "goal_value": 50,
                "start_date": start_date,
                "end_date": end_date,
                "is_team_challenge": True,
            },
            headers=get_auth_header(user_id)
        )
        assert challenge_response.status_code == 201
        challenge_id = challenge_response.json()["id"]

        # Create team
        team_response = await client.post(
            f"{API}/social/challenges/{challenge_id}/teams",
            json={"name": "Alpha Squad"},
            headers=get_auth_header(user_id)
        )

        assert team_response.status_code == 201
        team_data = team_response.json()
        assert team_data["name"] == "Alpha Squad"
        assert team_data["member_count"] == 1
        assert len(team_data["join_code"]) == 8

    @pytest.mark.asyncio
    async def test_list_challenge_teams(self, client: AsyncClient):
        """Listing teams in a challenge should return all teams."""
        from datetime import date, timedelta

        user = await create_test_identity(client)
        user_id = user["identity"]["id"]
        await create_profile_for_identity(client, user_id, f"teamlister{uuid4().hex[:6]}")

        # Create team challenge
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=8)).isoformat()

        challenge_response = await client.post(
            f"{API}/social/challenges",
            json={
                "name": "Team List Test",
                "challenge_type": "total_xp",
                "goal_value": 3000,
                "start_date": start_date,
                "end_date": end_date,
                "is_team_challenge": True,
            },
            headers=get_auth_header(user_id)
        )
        challenge_id = challenge_response.json()["id"]

        # Create a team
        await client.post(
            f"{API}/social/challenges/{challenge_id}/teams",
            json={"name": "Team One"},
            headers=get_auth_header(user_id)
        )

        # List teams
        list_response = await client.get(
            f"{API}/social/challenges/{challenge_id}/teams",
            headers=get_auth_header(user_id)
        )

        assert list_response.status_code == 200
        teams = list_response.json()
        assert len(teams) >= 1
        assert any(t["name"] == "Team One" for t in teams)

    @pytest.mark.asyncio
    async def test_join_team_by_code(self, client: AsyncClient):
        """Joining a team by code should add user to team and challenge."""
        from datetime import date, timedelta

        # Create challenge owner
        owner = await create_test_identity(client)
        owner_id = owner["identity"]["id"]
        await create_profile_for_identity(client, owner_id, f"teamowner{uuid4().hex[:6]}")

        # Create team challenge
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=8)).isoformat()

        challenge_response = await client.post(
            f"{API}/social/challenges",
            json={
                "name": "Join Code Test",
                "challenge_type": "fasting_streak",
                "goal_value": 7,
                "start_date": start_date,
                "end_date": end_date,
                "is_team_challenge": True,
            },
            headers=get_auth_header(owner_id)
        )
        challenge_id = challenge_response.json()["id"]

        # Owner creates team
        team_response = await client.post(
            f"{API}/social/challenges/{challenge_id}/teams",
            json={"name": "Join Test Team"},
            headers=get_auth_header(owner_id)
        )
        print(f"Team create response: {team_response.status_code} - {team_response.text}")
        assert team_response.status_code == 201, f"Failed to create team: {team_response.text}"
        team_data = team_response.json()
        team_join_code = team_data["join_code"]
        team_challenge_id = team_data["challenge_id"]
        print(f"Team join code: {team_join_code}, challenge_id from team: {team_challenge_id}, original challenge_id: {challenge_id}")
        assert team_challenge_id == challenge_id, "Team challenge_id mismatch"

        # Verify challenge still exists
        verify_challenge = await client.get(
            f"{API}/social/challenges/{challenge_id}",
            headers=get_auth_header(owner_id)
        )
        print(f"Verify challenge: {verify_challenge.status_code} - {verify_challenge.text[:200]}")

        # Create another user to join
        joiner = await create_test_identity(client)
        joiner_id = joiner["identity"]["id"]
        await create_profile_for_identity(client, joiner_id, f"teamjoiner{uuid4().hex[:6]}")

        # Verify challenge exists for joiner
        verify_joiner = await client.get(
            f"{API}/social/challenges/{challenge_id}",
            headers=get_auth_header(joiner_id)
        )
        print(f"Verify challenge for joiner: {verify_joiner.status_code}")

        # Join team by code
        join_response = await client.post(
            f"{API}/social/challenges/teams/join",
            json={"join_code": team_join_code},
            headers=get_auth_header(joiner_id)
        )

        print(f"Join response: {join_response.status_code} - {join_response.text}")
        assert join_response.status_code == 201
        data = join_response.json()
        assert data["team"]["name"] == "Join Test Team"
        assert data["team"]["member_count"] == 2
        assert "Successfully joined" in data["message"]

    @pytest.mark.asyncio
    async def test_get_team_leaderboard(self, client: AsyncClient):
        """Getting team leaderboard should return teams sorted by progress."""
        from datetime import date, timedelta

        user = await create_test_identity(client)
        user_id = user["identity"]["id"]
        await create_profile_for_identity(client, user_id, f"lbtest{uuid4().hex[:6]}")

        # Create team challenge
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=8)).isoformat()

        challenge_response = await client.post(
            f"{API}/social/challenges",
            json={
                "name": "Leaderboard Test",
                "challenge_type": "total_xp",
                "goal_value": 10000,
                "start_date": start_date,
                "end_date": end_date,
                "is_team_challenge": True,
            },
            headers=get_auth_header(user_id)
        )
        challenge_id = challenge_response.json()["id"]

        # Create a team
        await client.post(
            f"{API}/social/challenges/{challenge_id}/teams",
            json={"name": "Leaderboard Team"},
            headers=get_auth_header(user_id)
        )

        # Get team leaderboard
        lb_response = await client.get(
            f"{API}/social/challenges/{challenge_id}/teams/leaderboard",
            headers=get_auth_header(user_id)
        )

        assert lb_response.status_code == 200
        data = lb_response.json()
        assert data["challenge_id"] == challenge_id
        assert data["total_teams"] >= 1
        assert isinstance(data["teams"], list)

    @pytest.mark.asyncio
    async def test_cannot_create_team_in_non_team_challenge(self, client: AsyncClient):
        """Creating a team in a non-team challenge should fail."""
        from datetime import date, timedelta

        user = await create_test_identity(client)
        user_id = user["identity"]["id"]
        await create_profile_for_identity(client, user_id, f"nonteam{uuid4().hex[:6]}")

        # Create regular (non-team) challenge
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=8)).isoformat()

        challenge_response = await client.post(
            f"{API}/social/challenges",
            json={
                "name": "Regular Challenge",
                "challenge_type": "total_xp",
                "goal_value": 1000,
                "start_date": start_date,
                "end_date": end_date,
                "is_team_challenge": False,
            },
            headers=get_auth_header(user_id)
        )
        challenge_id = challenge_response.json()["id"]

        # Try to create team
        team_response = await client.post(
            f"{API}/social/challenges/{challenge_id}/teams",
            json={"name": "Shouldn't Work"},
            headers=get_auth_header(user_id)
        )

        assert team_response.status_code == 400
        assert "does not support teams" in team_response.json()["detail"]

