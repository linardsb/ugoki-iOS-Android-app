"""FastAPI routes for SOCIAL module."""

from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.modules.social.models import (
    FriendshipStatus,
    ChallengeType,
    LeaderboardType,
    LeaderboardPeriod,
    Friendship,
    FriendRequest,
    Follow,
    Challenge,
    ChallengeParticipant,
    Leaderboard,
    PublicUserProfile,
    ShareContent,
    SendFriendRequestRequest,
    RespondFriendRequestRequest,
    CreateChallengeRequest,
    GenerateShareContentRequest,
)
from src.modules.social.service import SocialService
from src.modules.profile.service import ProfileService
from src.modules.progression.service import ProgressionService
from src.modules.event_journal.service import EventJournalService

router = APIRouter(tags=["social"])


# =========================================================================
# Dependencies
# =========================================================================

def get_event_journal_service(db: AsyncSession = Depends(get_db)) -> EventJournalService:
    return EventJournalService(db)


def get_profile_service(db: AsyncSession = Depends(get_db)) -> ProfileService:
    return ProfileService(db)


def get_progression_service(db: AsyncSession = Depends(get_db)) -> ProgressionService:
    return ProgressionService(db)


def get_social_service(
    db: AsyncSession = Depends(get_db),
    profile_service: ProfileService = Depends(get_profile_service),
    progression_service: ProgressionService = Depends(get_progression_service),
    event_journal: EventJournalService = Depends(get_event_journal_service),
) -> SocialService:
    return SocialService(
        db,
        profile_service=profile_service,
        progression_service=progression_service,
        event_journal=event_journal,
    )


# =========================================================================
# Friends
# =========================================================================

@router.post("/friends/request", response_model=Friendship, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    identity_id: str,  # TODO: Extract from JWT
    request: SendFriendRequestRequest,
    service: SocialService = Depends(get_social_service),
) -> Friendship:
    """
    Send a friend request to another user.

    Provide either:
    - friend_code: The user's unique friend code
    - username: The user's username

    If the target user has already sent a request to you, this will accept it.
    """
    try:
        return await service.send_friend_request(
            identity_id,
            friend_code=request.friend_code,
            username=request.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/friends/requests/incoming", response_model=list[FriendRequest])
async def get_incoming_friend_requests(
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> list[FriendRequest]:
    """Get pending friend requests received by the user."""
    return await service.get_incoming_friend_requests(identity_id)


@router.get("/friends/requests/outgoing", response_model=list[FriendRequest])
async def get_outgoing_friend_requests(
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> list[FriendRequest]:
    """Get pending friend requests sent by the user."""
    return await service.get_outgoing_friend_requests(identity_id)


@router.post("/friends/requests/{request_id}/respond", response_model=Friendship | None)
async def respond_to_friend_request(
    request_id: str,
    identity_id: str,  # TODO: Extract from JWT
    request: RespondFriendRequestRequest,
    service: SocialService = Depends(get_social_service),
) -> Friendship | None:
    """
    Accept or decline a friend request.

    Returns the new friendship if accepted, None if declined.
    """
    try:
        return await service.respond_to_friend_request(identity_id, request_id, request.accept)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/friends", response_model=list[Friendship])
async def get_friends(
    identity_id: str,  # TODO: Extract from JWT
    status: FriendshipStatus | None = None,
    service: SocialService = Depends(get_social_service),
) -> list[Friendship]:
    """
    Get user's friends.

    By default returns accepted friends only.
    Use status parameter to filter by status.
    """
    return await service.get_friends(identity_id, status)


@router.delete("/friends/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(
    friend_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> None:
    """Remove a friend."""
    try:
        await service.remove_friend(identity_id, friend_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/friends/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def block_user(
    user_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> None:
    """
    Block a user.

    This will:
    - Remove any existing friendship
    - Remove any follows in both directions
    - Prevent future friend requests and follows
    """
    await service.block_user(identity_id, user_id)


@router.delete("/friends/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(
    user_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> None:
    """Unblock a user."""
    try:
        await service.unblock_user(identity_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# Follows
# =========================================================================

@router.post("/follow/{user_id}", response_model=Follow, status_code=status.HTTP_201_CREATED)
async def follow_user(
    user_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> Follow:
    """
    Follow a user.

    Requirements:
    - Target user must have a public profile (or be a friend)
    - Cannot follow blocked users
    """
    try:
        return await service.follow_user(identity_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/follow/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> None:
    """Unfollow a user."""
    try:
        await service.unfollow_user(identity_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/followers", response_model=list[Follow])
async def get_followers(
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: SocialService = Depends(get_social_service),
) -> list[Follow]:
    """Get users who follow this user."""
    return await service.get_followers(identity_id, limit, offset)


@router.get("/following", response_model=list[Follow])
async def get_following(
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: SocialService = Depends(get_social_service),
) -> list[Follow]:
    """Get users this user follows."""
    return await service.get_following(identity_id, limit, offset)


# =========================================================================
# Public Profiles
# =========================================================================

@router.get("/users/{user_id}", response_model=PublicUserProfile)
async def get_public_profile(
    user_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> PublicUserProfile:
    """
    Get a user's public profile.

    Profile data is filtered based on:
    - Privacy settings (profile_public, show_level, etc.)
    - Relationship (friends see more data)
    """
    return await service.get_public_profile(identity_id, user_id)


@router.get("/users/search", response_model=list[PublicUserProfile])
async def search_users(
    query: str,
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(20, ge=1, le=50),
    service: SocialService = Depends(get_social_service),
) -> list[PublicUserProfile]:
    """
    Search for users by username or display name.

    Only returns users with public profiles.
    Minimum query length: 2 characters.
    """
    return await service.search_users(identity_id, query, limit)


# =========================================================================
# Leaderboards
# =========================================================================

@router.get("/leaderboards/{leaderboard_type}", response_model=Leaderboard)
async def get_leaderboard(
    leaderboard_type: LeaderboardType,
    identity_id: str,  # TODO: Extract from JWT
    period: LeaderboardPeriod = LeaderboardPeriod.WEEK,
    limit: int = Query(100, ge=1, le=200),
    service: SocialService = Depends(get_social_service),
) -> Leaderboard:
    """
    Get a leaderboard.

    Types:
    - global_xp: All public profiles by total XP
    - global_streaks: All public profiles by fasting streak
    - friends_xp: Friends by total XP
    - friends_streaks: Friends by fasting streak

    Periods:
    - week: This week's data
    - month: This month's data
    - all_time: All-time data
    """
    return await service.get_leaderboard(identity_id, leaderboard_type, period, limit)


# =========================================================================
# Challenges
# =========================================================================

@router.post("/challenges", response_model=Challenge, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    identity_id: str,  # TODO: Extract from JWT
    request: CreateChallengeRequest,
    service: SocialService = Depends(get_social_service),
) -> Challenge:
    """
    Create a new challenge.

    Challenge types:
    - fasting_streak: Longest fasting streak
    - workout_count: Most workouts completed
    - total_xp: Most XP earned
    - consistency: Most days logged in

    The creator automatically joins the challenge.
    A unique join code is generated for inviting others.
    """
    try:
        return await service.create_challenge(
            identity_id,
            name=request.name,
            challenge_type=request.challenge_type,
            goal_value=request.goal_value,
            start_date=request.start_date,
            end_date=request.end_date,
            description=request.description,
            goal_unit=request.goal_unit,
            is_public=request.is_public,
            max_participants=request.max_participants,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/challenges", response_model=list[Challenge])
async def list_challenges(
    identity_id: str,  # TODO: Extract from JWT
    include_public: bool = True,
    active_only: bool = True,
    service: SocialService = Depends(get_social_service),
) -> list[Challenge]:
    """
    List available challenges.

    Returns:
    - Public challenges (if include_public=true)
    - Challenges user is participating in
    - Challenges created by user
    - Challenges from friends
    """
    return await service.list_challenges(identity_id, include_public, active_only)


@router.get("/challenges/mine", response_model=list[Challenge])
async def get_my_challenges(
    identity_id: str,  # TODO: Extract from JWT
    active_only: bool = True,
    service: SocialService = Depends(get_social_service),
) -> list[Challenge]:
    """Get challenges the user is participating in."""
    return await service.get_my_challenges(identity_id, active_only)


@router.get("/challenges/{challenge_id}", response_model=Challenge)
async def get_challenge(
    challenge_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> Challenge:
    """Get a specific challenge."""
    challenge = await service.get_challenge(identity_id, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


@router.post("/challenges/{challenge_id}/join", response_model=ChallengeParticipant, status_code=status.HTTP_201_CREATED)
async def join_challenge(
    challenge_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> ChallengeParticipant:
    """Join a challenge by ID."""
    try:
        return await service.join_challenge(identity_id, challenge_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/challenges/join/{code}", response_model=ChallengeParticipant, status_code=status.HTTP_201_CREATED)
async def join_challenge_by_code(
    code: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> ChallengeParticipant:
    """Join a challenge using its join code."""
    try:
        return await service.join_challenge_by_code(identity_id, code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/challenges/{challenge_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_challenge(
    challenge_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> None:
    """Leave a challenge. Challenge creators cannot leave their own challenge."""
    try:
        await service.leave_challenge(identity_id, challenge_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/challenges/{challenge_id}/leaderboard", response_model=list[ChallengeParticipant])
async def get_challenge_leaderboard(
    challenge_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> list[ChallengeParticipant]:
    """Get the leaderboard for a challenge."""
    return await service.get_challenge_leaderboard(identity_id, challenge_id)


@router.post("/challenges/update-progress", status_code=status.HTTP_204_NO_CONTENT)
async def update_challenge_progress(
    identity_id: str,  # TODO: Extract from JWT
    service: SocialService = Depends(get_social_service),
) -> None:
    """
    Update user's progress in all active challenges.

    This should be called after completing activities that affect challenge progress
    (workouts, fasts, etc.).
    """
    await service.update_challenge_progress(identity_id)


# =========================================================================
# Sharing
# =========================================================================

@router.post("/share/generate", response_model=ShareContent)
async def generate_share_content(
    identity_id: str,  # TODO: Extract from JWT
    request: GenerateShareContentRequest,
    service: SocialService = Depends(get_social_service),
) -> ShareContent:
    """
    Generate shareable content for social media.

    Share types:
    - achievement: Share an unlocked achievement (requires related_id)
    - streak: Share current fasting streak
    - level_up: Share level up milestone
    - workout: Share completed workout
    - challenge_win: Share challenge victory (requires related_id)

    Returns title, message, and optional image URL for sharing.
    """
    return await service.generate_share_content(
        identity_id,
        share_type=request.share_type,
        related_id=request.related_id,
        custom_message=request.custom_message,
    )
