"""FastAPI routes for SOCIAL module."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.core.auth import get_current_identity
from src.modules.social.models import (
    FriendshipStatus,
    ChallengeType,
    LeaderboardType,
    LeaderboardPeriod,
    DuoStreakType,
    Friendship,
    FriendRequest,
    Follow,
    Challenge,
    ChallengeParticipant,
    Leaderboard,
    PublicUserProfile,
    ShareContent,
    DuoStreak,
    DuoStreakInvite,
    FeedItem,
    FeedPreferences,
    ChallengeTemplate,
    ChallengeTeam,
    ChallengeTeamLeaderboard,
    SendFriendRequestRequest,
    RespondFriendRequestRequest,
    CreateChallengeRequest,
    GenerateShareContentRequest,
    CreateDuoStreakRequest,
    RespondDuoStreakInviteRequest,
    UpdateFeedPreferencesRequest,
    CreateChallengeFromTemplateRequest,
    CelebrateAchievementResponse,
    AchievementCelebrationList,
    CreateTeamRequest,
    JoinTeamRequest,
    JoinTeamResponse,
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
    request: SendFriendRequestRequest,
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[FriendRequest]:
    """Get pending friend requests received by the user."""
    return await service.get_incoming_friend_requests(identity_id)


@router.get("/friends/requests/outgoing", response_model=list[FriendRequest])
async def get_outgoing_friend_requests(
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[FriendRequest]:
    """Get pending friend requests sent by the user."""
    return await service.get_outgoing_friend_requests(identity_id)


@router.post("/friends/requests/{request_id}/respond", response_model=Friendship | None)
async def respond_to_friend_request(
    request_id: str,
    request: RespondFriendRequestRequest,
    identity_id: str = Depends(get_current_identity),
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
    status: FriendshipStatus | None = None,
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> None:
    """Unfollow a user."""
    try:
        await service.unfollow_user(identity_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/followers", response_model=list[Follow])
async def get_followers(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[Follow]:
    """Get users who follow this user."""
    return await service.get_followers(identity_id, limit, offset)


@router.get("/following", response_model=list[Follow])
async def get_following(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    limit: int = Query(20, ge=1, le=50),
    identity_id: str = Depends(get_current_identity),
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
    period: LeaderboardPeriod = LeaderboardPeriod.WEEK,
    limit: int = Query(100, ge=1, le=200),
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> Leaderboard:
    """
    Get a leaderboard.

    Types:
    - global_xp: All public profiles by total XP
    - global_streaks: All public profiles by current fasting streak
    - friends_xp: Friends by total XP
    - friends_streaks: Friends by current fasting streak
    - global_workouts: All public profiles by workout count
    - friends_workouts: Friends by workout count
    - global_fasts: All public profiles by completed fasts count
    - friends_fasts: Friends by completed fasts count

    Periods:
    - week: This week's data (Mon-Sun UTC)
    - month: This month's data
    - all_time: All-time data

    Note: Streak leaderboards show current streak values regardless of period.
    Workout and fasting count leaderboards properly filter by period.
    """
    return await service.get_leaderboard(identity_id, leaderboard_type, period, limit)


# =========================================================================
# Challenges
# =========================================================================

@router.post("/challenges", response_model=Challenge, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    request: CreateChallengeRequest,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> Challenge:
    """
    Create a new challenge.

    Challenge types:
    - fasting_streak: Longest fasting streak
    - workout_count: Most workouts completed
    - total_xp: Most XP earned
    - consistency: Most days logged in

    The creator automatically joins the challenge (unless it's a team challenge).
    A unique join code is generated for inviting others.

    For team challenges:
    - Set is_team_challenge=true
    - Set team_size_min (default: 3) and team_size_max (default: 10)
    - Creator must create/join a team to participate
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
            is_team_challenge=request.is_team_challenge,
            team_size_min=request.team_size_min,
            team_size_max=request.team_size_max,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/challenges", response_model=list[Challenge])
async def list_challenges(
    include_public: bool = True,
    active_only: bool = True,
    identity_id: str = Depends(get_current_identity),
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
    active_only: bool = True,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[Challenge]:
    """Get challenges the user is participating in."""
    return await service.get_my_challenges(identity_id, active_only)


# =========================================================================
# Challenge Templates (MUST be before /challenges/{challenge_id})
# =========================================================================

@router.get("/challenges/templates", response_model=list[ChallengeTemplate])
async def get_challenge_templates(
    active_only: bool = Query(True, description="Only return active templates"),
    service: SocialService = Depends(get_social_service),
) -> list[ChallengeTemplate]:
    """
    Get available challenge templates.

    Returns pre-built challenge templates that can be used to quickly
    create challenges with predefined settings. Templates include:
    - 7-Day Fast Challenge
    - Workout Week
    - XP Sprint
    - 30-Day Consistency
    - And more...

    Templates are sorted by display order.
    """
    return await service.get_challenge_templates(active_only)


@router.post("/challenges/from-template", response_model=Challenge, status_code=status.HTTP_201_CREATED)
async def create_challenge_from_template(
    request: CreateChallengeFromTemplateRequest,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> Challenge:
    """
    Create a challenge from a template.

    This provides a one-tap way to create challenges with predefined settings.

    Args:
        template_id: The ID of the template to use
        invite_friend_ids: Optional list of friend IDs to auto-invite
        custom_name: Optional custom name (defaults to template name)
        start_date: Optional start date (defaults to tomorrow)

    The creator automatically joins the challenge.
    Friends in invite_friend_ids will receive challenge invitations.
    """
    try:
        return await service.create_challenge_from_template(
            identity_id=identity_id,
            template_id=request.template_id,
            invite_friend_ids=request.invite_friend_ids,
            custom_name=request.custom_name,
            start_date=request.start_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# Team Routes (static /challenges/teams/... MUST be before /challenges/{challenge_id})
# =========================================================================

@router.get("/challenges/teams/{team_id}", response_model=ChallengeTeam)
async def get_challenge_team(
    team_id: str,
    include_members: bool = Query(False, description="Include team members in response"),
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> ChallengeTeam:
    """Get details of a specific team."""
    team = await service.get_challenge_team(identity_id, team_id, include_members)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("/challenges/teams/join", response_model=JoinTeamResponse, status_code=status.HTTP_201_CREATED)
async def join_team(
    request: JoinTeamRequest,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> JoinTeamResponse:
    """
    Join a team using its join code.

    This also joins the user to the parent challenge if not already participating.
    """
    try:
        return await service.join_team(identity_id, request.join_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/challenges/teams/{team_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_team(
    team_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> None:
    """
    Leave a team.

    For team challenges, leaving the team also leaves the challenge.
    Team creators cannot leave while other members remain.
    """
    try:
        await service.leave_team(identity_id, team_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# Challenge by ID routes (dynamic {challenge_id} MUST come after static routes)
# =========================================================================

@router.get("/challenges/{challenge_id}", response_model=Challenge)
async def get_challenge(
    challenge_id: str,
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
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
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[ChallengeParticipant]:
    """Get the leaderboard for a challenge."""
    return await service.get_challenge_leaderboard(identity_id, challenge_id)


@router.post("/challenges/update-progress", status_code=status.HTTP_204_NO_CONTENT)
async def update_challenge_progress(
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> None:
    """
    Update user's progress in all active challenges.

    This should be called after completing activities that affect challenge progress
    (workouts, fasts, etc.).
    """
    await service.update_challenge_progress(identity_id)


# =========================================================================
# Team Challenges (Sprint 3)
# =========================================================================

@router.post("/challenges/{challenge_id}/teams", response_model=ChallengeTeam, status_code=status.HTTP_201_CREATED)
async def create_challenge_team(
    challenge_id: str,
    request: CreateTeamRequest,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> ChallengeTeam:
    """
    Create a team within a team challenge.

    Only available for challenges where is_team_challenge=true.
    The creator automatically joins their team.
    A unique join code is generated for others to join the team.
    """
    try:
        return await service.create_challenge_team(
            identity_id,
            challenge_id,
            name=request.name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/challenges/{challenge_id}/teams", response_model=list[ChallengeTeam])
async def list_challenge_teams(
    challenge_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[ChallengeTeam]:
    """List all teams in a challenge, sorted by progress."""
    return await service.list_challenge_teams(identity_id, challenge_id)


@router.get("/challenges/{challenge_id}/teams/leaderboard", response_model=ChallengeTeamLeaderboard)
async def get_team_leaderboard(
    challenge_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> ChallengeTeamLeaderboard:
    """Get the team leaderboard for a challenge."""
    return await service.get_team_leaderboard(identity_id, challenge_id)


# =========================================================================
# Sharing
# =========================================================================

@router.post("/share/generate", response_model=ShareContent)
async def generate_share_content(
    request: GenerateShareContentRequest,
    identity_id: str = Depends(get_current_identity),
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


# =========================================================================
# Duo Streaks
# =========================================================================

@router.post("/duo-streaks", response_model=DuoStreakInvite, status_code=status.HTTP_201_CREATED)
async def create_duo_streak_invite(
    request: CreateDuoStreakRequest,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> DuoStreakInvite:
    """
    Invite a friend to start a duo streak.

    Duo streaks require BOTH users to complete the activity each day
    to maintain the streak. If either user misses a day, the streak resets.

    Streak types:
    - fasting: Both must complete a fast
    - workout: Both must complete a workout
    - any_activity: Both must complete any activity (fast or workout)

    If the friend has already sent you an invite, this will auto-accept it
    and create the duo streak immediately.
    """
    try:
        return await service.create_duo_streak_invite(
            identity_id,
            partner_id=request.partner_id,
            streak_type=request.streak_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/duo-streaks", response_model=list[DuoStreak])
async def get_duo_streaks(
    active_only: bool = True,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[DuoStreak]:
    """
    Get user's duo streaks.

    By default returns only active duo streaks.
    Set active_only=false to include ended streaks.
    """
    return await service.get_duo_streaks(identity_id, active_only)


@router.get("/duo-streaks/invites", response_model=list[DuoStreakInvite])
async def get_duo_streak_invites(
    direction: str = Query("incoming", pattern="^(incoming|outgoing)$"),
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[DuoStreakInvite]:
    """
    Get pending duo streak invitations.

    Direction:
    - incoming: Invitations received from others
    - outgoing: Invitations sent to others
    """
    return await service.get_duo_streak_invites(identity_id, direction)


@router.post("/duo-streaks/invites/{invite_id}/respond", response_model=DuoStreak | None)
async def respond_to_duo_streak_invite(
    invite_id: str,
    request: RespondDuoStreakInviteRequest,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> DuoStreak | None:
    """
    Accept or decline a duo streak invitation.

    Returns the new duo streak if accepted, None if declined.
    """
    try:
        return await service.respond_to_duo_streak_invite(
            identity_id,
            invite_id,
            request.accept,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/duo-streaks/at-risk", response_model=list[DuoStreak])
async def get_duo_streaks_at_risk(
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[DuoStreak]:
    """
    Get duo streaks at risk of breaking today.

    Returns duo streaks where one person has completed their activity
    today but the other hasn't. Use this to prompt users to complete
    their activity or remind their partner.
    """
    return await service.get_duo_streaks_at_risk(identity_id)


@router.get("/duo-streaks/{duo_streak_id}", response_model=DuoStreak)
async def get_duo_streak(
    duo_streak_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> DuoStreak:
    """Get a specific duo streak."""
    try:
        streak = await service.get_duo_streak(identity_id, duo_streak_id)
        if not streak:
            raise HTTPException(status_code=404, detail="Duo streak not found")
        return streak
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/duo-streaks/{duo_streak_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_duo_streak(
    duo_streak_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> None:
    """
    End a duo streak.

    Either participant can end the duo streak at any time.
    The partner will be notified.
    """
    try:
        await service.end_duo_streak(identity_id, duo_streak_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# Activity Feed
# =========================================================================

@router.get("/feed", response_model=list[FeedItem])
async def get_friends_feed(
    limit: int = Query(20, ge=1, le=50),
    before: datetime | None = Query(None, description="Cursor for pagination - fetch items before this timestamp"),
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[FeedItem]:
    """
    Get activity feed from friends.

    Returns feed items from friends ordered by most recent.
    Use the `before` parameter with the `created_at` timestamp of the last item
    to fetch the next page.
    """
    return await service.get_friends_feed(identity_id, limit, before)


@router.get("/feed/my-activity", response_model=list[FeedItem])
async def get_my_activity(
    limit: int = Query(20, ge=1, le=50),
    before: datetime | None = Query(None),
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> list[FeedItem]:
    """
    Get user's own recent activity.

    Returns feed items created by the current user.
    """
    return await service.get_my_activity(identity_id, limit, before)


@router.post("/feed/{feed_item_id}/cheer", response_model=FeedItem, status_code=status.HTTP_201_CREATED)
async def cheer_feed_item(
    feed_item_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> FeedItem:
    """
    Cheer a feed item.

    Shows support for a friend's activity. Each user can cheer an item once.
    """
    try:
        return await service.cheer_feed_item(identity_id, feed_item_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/feed/{feed_item_id}/cheer", status_code=status.HTTP_204_NO_CONTENT)
async def uncheer_feed_item(
    feed_item_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> None:
    """Remove a cheer from a feed item."""
    try:
        await service.uncheer_feed_item(identity_id, feed_item_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/feed/preferences", response_model=FeedPreferences)
async def get_feed_preferences(
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> FeedPreferences:
    """
    Get user's feed sharing preferences.

    Controls which activities are shared to friends' feeds.
    """
    return await service.get_feed_preferences(identity_id)


@router.patch("/feed/preferences", response_model=FeedPreferences)
async def update_feed_preferences(
    request: UpdateFeedPreferencesRequest,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> FeedPreferences:
    """
    Update feed sharing preferences.

    Control which of your activities are shared to friends' feeds.
    Only provided fields will be updated.
    """
    return await service.update_feed_preferences(
        identity_id,
        share_fasts=request.share_fasts,
        share_workouts=request.share_workouts,
        share_achievements=request.share_achievements,
        share_level_ups=request.share_level_ups,
        share_streaks=request.share_streaks,
        share_duo_streaks=request.share_duo_streaks,
    )


# =========================================================================
# Achievement Celebrations (Sprint 2)
# =========================================================================

@router.post("/achievements/{user_achievement_id}/celebrate", response_model=CelebrateAchievementResponse, status_code=status.HTTP_201_CREATED)
async def celebrate_achievement(
    user_achievement_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> CelebrateAchievementResponse:
    """
    Celebrate a friend's achievement.

    This is a one-time action per achievement. Both the celebrator and the
    achievement owner receive 5 XP as a reward for social engagement.

    Requirements:
    - Must be friends with the achievement owner
    - Cannot celebrate your own achievements
    - Can only celebrate once per achievement

    The achievement owner will receive a push notification.
    """
    try:
        return await service.celebrate_achievement(identity_id, user_achievement_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/achievements/{user_achievement_id}/celebrations", response_model=AchievementCelebrationList)
async def get_achievement_celebrations(
    user_achievement_id: str,
    identity_id: str = Depends(get_current_identity),
    service: SocialService = Depends(get_social_service),
) -> AchievementCelebrationList:
    """
    Get all celebrations for an achievement.

    Returns a list of users who have celebrated this achievement,
    ordered by most recent first.
    """
    try:
        return await service.get_achievement_celebrations(user_achievement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
