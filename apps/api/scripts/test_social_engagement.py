"""
Comprehensive E2E test script for Sprint 1-3 Social Engagement Features.

Tests cover:
- Sprint 1: Duo Streaks, Activity Feed, Challenge Templates
- Sprint 2: Weekly Leaderboard Periods, Achievement Celebrations
- Sprint 3: Team Challenges, Team Join/Leave, Team Leaderboards
"""

import requests
import json
from datetime import datetime, timedelta
from uuid import uuid4
import base64

BASE_URL = 'http://localhost:8000'
API = '/api/v1'
results = {'passed': [], 'failed': [], 'bugs': []}

# Test users
user1 = {}
user2 = {}


def decode_identity_from_token(token: str) -> str:
    """Decode identity_id from JWT token."""
    token_parts = token.split('.')
    if len(token_parts) >= 2:
        payload = token_parts[1]
        payload += '=' * (4 - len(payload) % 4)
        decoded = base64.b64decode(payload)
        token_data = json.loads(decoded)
        return token_data.get('sub')
    return None


def test(name, response, expected_status=None, bug_description=None):
    """Record test result."""
    if expected_status is None:
        success = response.status_code in [200, 201, 204]
    else:
        success = response.status_code == expected_status

    if success:
        results['passed'].append(name)
        print(f'✅ {name}')
        return True
    else:
        results['failed'].append(f'{name}: {response.status_code} - {response.text[:200]}')
        print(f'❌ {name}: {response.status_code} - {response.text[:100]}')
        if bug_description:
            results['bugs'].append({'test': name, 'description': bug_description, 'response': response.text[:500]})
        return False


def create_test_user(username_prefix: str) -> dict:
    """Create a test user with profile."""
    device_id = f'test-device-{uuid4().hex[:8]}'
    r = requests.post(f'{BASE_URL}{API}/identity/authenticate', json={
        'provider': 'anonymous',
        'token': device_id
    })
    if r.status_code not in [200, 201]:
        raise Exception(f'Failed to create identity: {r.text}')

    data = r.json()
    token = data['access_token']
    identity_id = decode_identity_from_token(token)

    # Create profile with username
    username = f'{username_prefix}_{uuid4().hex[:6]}'
    requests.post(f'{BASE_URL}{API}/profile',
        headers={'Authorization': f'Bearer {token}'},
        json={'display_name': f'Test {username}', 'bio': 'Test user'})

    # Set username via social profile
    requests.patch(f'{BASE_URL}{API}/profile/social',
        headers={'Authorization': f'Bearer {token}'},
        json={'username': username, 'profile_public': True})

    return {
        'token': token,
        'identity_id': identity_id,
        'username': username,
        'headers': {'Authorization': f'Bearer {token}'}
    }


def get_friend_code(user: dict) -> str:
    """Get user's friend code."""
    r = requests.get(f'{BASE_URL}{API}/profile/social', headers=user['headers'])
    if r.status_code == 200:
        return r.json().get('friend_code')
    return None


def make_friends(user1: dict, user2: dict) -> bool:
    """Make two users friends."""
    # Get user2's friend code
    friend_code = get_friend_code(user2)
    if not friend_code:
        print(f'  Could not get friend code for {user2["username"]}')
        return False

    # Send friend request
    r = requests.post(f'{BASE_URL}{API}/social/friends/request',
        headers=user1['headers'],
        json={'friend_code': friend_code})

    if r.status_code not in [200, 201]:
        print(f'  Could not send friend request: {r.status_code} - {r.text}')
        return False

    request_id = r.json()['id']

    # Accept friend request
    r = requests.post(f'{BASE_URL}{API}/social/friends/requests/{request_id}/respond',
        headers=user2['headers'],
        json={'accept': True})

    return r.status_code == 200


print('=' * 70)
print('UGOKI SOCIAL ENGAGEMENT FEATURES - COMPREHENSIVE E2E TEST')
print('Sprint 1: Duo Streaks, Activity Feed, Challenge Templates')
print('Sprint 2: Weekly Leaderboards, Achievement Celebrations')
print('Sprint 3: Team Challenges')
print('=' * 70)

# ===========================================
# SETUP: Create two test users and make them friends
# ===========================================
print('\n=== SETUP ===')
try:
    user1 = create_test_user('user1')
    print(f'✅ Created user1: {user1["username"]}')
    user2 = create_test_user('user2')
    print(f'✅ Created user2: {user2["username"]}')

    if make_friends(user1, user2):
        print('✅ Made user1 and user2 friends')
    else:
        print('⚠️  Could not make users friends - some tests may fail')
except Exception as e:
    print(f'❌ Setup failed: {e}')
    exit(1)

# ===========================================
# SPRINT 1: DUO STREAKS
# ===========================================
print('\n=== SPRINT 1: DUO STREAKS ===')

duo_streak_id = None

# Create duo streak invite
r = requests.post(f'{BASE_URL}{API}/social/duo-streaks',
    headers=user1['headers'],
    json={'partner_id': user2['identity_id'], 'streak_type': 'fasting'})
if test('Create duo streak invite (fasting)', r):
    invite_data = r.json()
    duo_streak_id = invite_data.get('id')
    print(f'   Invite ID: {duo_streak_id}')
    print(f'   Status: {invite_data.get("status")}')

# Get duo streak invites (incoming for user2)
r = requests.get(f'{BASE_URL}{API}/social/duo-streaks/invites',
    headers=user2['headers'],
    params={'direction': 'incoming'})
test('Get incoming duo streak invites', r)

# Accept duo streak invite
if duo_streak_id:
    r = requests.post(f'{BASE_URL}{API}/social/duo-streaks/invites/{duo_streak_id}/respond',
        headers=user2['headers'],
        json={'accept': True})
    if test('Accept duo streak invite', r):
        streak_data = r.json()
        duo_streak_id = streak_data.get('id')
        print(f'   Streak ID: {duo_streak_id}')
        print(f'   Current count: {streak_data.get("current_count")}')

# Get active duo streaks
r = requests.get(f'{BASE_URL}{API}/social/duo-streaks',
    headers=user1['headers'],
    params={'active_only': 'true'})
if test('Get active duo streaks', r):
    streaks = r.json()
    print(f'   Active streaks: {len(streaks)}')

# Get specific duo streak
if duo_streak_id:
    r = requests.get(f'{BASE_URL}{API}/social/duo-streaks/{duo_streak_id}',
        headers=user1['headers'])
    if test('Get specific duo streak', r):
        streak = r.json()
        print(f'   Type: {streak.get("streak_type")}')
        print(f'   Partner completed today: {streak.get("partner_completed_today")}')
        print(f'   At risk: {streak.get("at_risk")}')

# Get at-risk duo streaks
r = requests.get(f'{BASE_URL}{API}/social/duo-streaks/at-risk',
    headers=user1['headers'])
if test('Get at-risk duo streaks', r):
    at_risk = r.json()
    print(f'   At-risk count: {len(at_risk)}')

# Note: duo-streaks/counts endpoint doesn't exist - count tracked on active streaks list

# Test workout type duo streak
r = requests.post(f'{BASE_URL}{API}/social/duo-streaks',
    headers=user1['headers'],
    json={'partner_id': user2['identity_id'], 'streak_type': 'workout'})
if test('Create workout duo streak', r):
    workout_invite = r.json()
    workout_invite_id = workout_invite.get('id')
    # Accept it
    requests.post(f'{BASE_URL}{API}/social/duo-streaks/invites/{workout_invite_id}/respond',
        headers=user2['headers'],
        json={'accept': True})

# ===========================================
# SPRINT 1: ACTIVITY FEED
# ===========================================
print('\n=== SPRINT 1: ACTIVITY FEED ===')

# Get friends feed (should be empty or have recent activity)
r = requests.get(f'{BASE_URL}{API}/social/feed',
    headers=user1['headers'])
if test('Get friends activity feed', r):
    feed = r.json()
    print(f'   Feed items: {len(feed)}')

# Get my activity
r = requests.get(f'{BASE_URL}{API}/social/feed/my-activity',
    headers=user1['headers'])
if test('Get my activity', r):
    activity = r.json()
    print(f'   My activity items: {len(activity)}')

# Get feed preferences
r = requests.get(f'{BASE_URL}{API}/social/feed/preferences',
    headers=user1['headers'])
if test('Get feed preferences', r):
    prefs = r.json()
    print(f'   Share fasts: {prefs.get("share_fasts")}')
    print(f'   Share workouts: {prefs.get("share_workouts")}')
    print(f'   Share achievements: {prefs.get("share_achievements")}')

# Update feed preferences
r = requests.patch(f'{BASE_URL}{API}/social/feed/preferences',
    headers=user1['headers'],
    json={'share_fasts': False})
if test('Update feed preferences', r):
    prefs = r.json()
    print(f'   Share fasts (updated): {prefs.get("share_fasts")}')

# Reset share_fasts back to true
requests.patch(f'{BASE_URL}{API}/social/feed/preferences',
    headers=user1['headers'],
    json={'share_fasts': True})

# ===========================================
# SPRINT 1: CHALLENGE TEMPLATES
# ===========================================
print('\n=== SPRINT 1: CHALLENGE TEMPLATES ===')

# Get challenge templates
templates = []
r = requests.get(f'{BASE_URL}{API}/social/challenges/templates',
    headers=user1['headers'])
if test('Get challenge templates', r):
    templates = r.json()
    print(f'   Available templates: {len(templates)}')
    if templates:
        for t in templates[:3]:
            print(f'   - {t.get("name")}: {t.get("challenge_type")} ({t.get("duration_days")} days)')

# Create challenge from template (if templates exist)
template_challenge_id = None
if templates:
    template_id = templates[0]['id']
    r = requests.post(f'{BASE_URL}{API}/social/challenges/from-template',
        headers=user1['headers'],
        json={'template_id': template_id})
    if test('Create challenge from template', r):
        challenge = r.json()
        template_challenge_id = challenge.get('id')
        print(f'   Challenge ID: {template_challenge_id}')
        print(f'   Name: {challenge.get("name")}')
        print(f'   Goal: {challenge.get("goal_value")}')

# Test invalid template ID
r = requests.post(f'{BASE_URL}{API}/social/challenges/from-template',
    headers=user1['headers'],
    json={'template_id': 'invalid-template-id'})
test('Invalid template returns error', r, expected_status=400)

# ===========================================
# SPRINT 2: WEEKLY LEADERBOARD PERIODS
# ===========================================
print('\n=== SPRINT 2: WEEKLY LEADERBOARD PERIODS ===')

# Test XP leaderboard with different periods
for period in ['week', 'month', 'all_time']:
    r = requests.get(f'{BASE_URL}{API}/social/leaderboards/global_xp',
        headers=user1['headers'],
        params={'period': period})
    if test(f'Global XP leaderboard (period={period})', r):
        lb = r.json()
        print(f'   Period: {lb.get("period")}')
        print(f'   Entries: {len(lb.get("entries", []))}')

# Test workout count leaderboard with periods
for period in ['week', 'month']:
    r = requests.get(f'{BASE_URL}{API}/social/leaderboards/global_workouts',
        headers=user1['headers'],
        params={'period': period})
    test(f'Global workouts leaderboard (period={period})', r)

# Test fasts count leaderboard with periods
for period in ['week', 'all_time']:
    r = requests.get(f'{BASE_URL}{API}/social/leaderboards/global_fasts',
        headers=user1['headers'],
        params={'period': period})
    test(f'Global fasts leaderboard (period={period})', r)

# Test friends leaderboards with periods
r = requests.get(f'{BASE_URL}{API}/social/leaderboards/friends_xp',
    headers=user1['headers'],
    params={'period': 'week'})
test('Friends XP leaderboard (period=week)', r)

r = requests.get(f'{BASE_URL}{API}/social/leaderboards/friends_workouts',
    headers=user1['headers'],
    params={'period': 'month'})
test('Friends workouts leaderboard (period=month)', r)

r = requests.get(f'{BASE_URL}{API}/social/leaderboards/friends_fasts',
    headers=user1['headers'],
    params={'period': 'all_time'})
test('Friends fasts leaderboard (period=all_time)', r)

# ===========================================
# SPRINT 2: ACHIEVEMENT CELEBRATIONS
# ===========================================
print('\n=== SPRINT 2: ACHIEVEMENT CELEBRATIONS ===')

# Note: These need actual achievements to be unlocked first
# Test the endpoints exist and return proper errors

# Try to celebrate non-existent achievement
r = requests.post(f'{BASE_URL}{API}/social/achievements/nonexistent-id/celebrate',
    headers=user1['headers'])
test('Celebrate non-existent achievement returns error', r, expected_status=400)

# Try to get celebrations for non-existent achievement
r = requests.get(f'{BASE_URL}{API}/social/achievements/nonexistent-id/celebrations',
    headers=user1['headers'])
test('Get celebrations for non-existent achievement returns 404', r, expected_status=404)

# ===========================================
# SPRINT 3: TEAM CHALLENGES
# ===========================================
print('\n=== SPRINT 3: TEAM CHALLENGES ===')

team_challenge_id = None
team_id = None
team_join_code = None

# Create a team challenge
start_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
end_date = (datetime.now() + timedelta(days=8)).strftime('%Y-%m-%d')

r = requests.post(f'{BASE_URL}{API}/social/challenges',
    headers=user1['headers'],
    json={
        'name': 'Team XP Race',
        'description': 'Earn the most XP as a team!',
        'challenge_type': 'total_xp',
        'goal_value': 5000,
        'start_date': start_date,
        'end_date': end_date,
        'is_public': True,
        'is_team_challenge': True,
        'team_size_min': 2,
        'team_size_max': 5
    })
if test('Create team challenge', r):
    challenge = r.json()
    team_challenge_id = challenge.get('id')
    print(f'   Challenge ID: {team_challenge_id}')
    print(f'   Is team challenge: {challenge.get("is_team_challenge")}')
    print(f'   Team size: {challenge.get("team_size_min")}-{challenge.get("team_size_max")}')

# Create a team within the challenge
if team_challenge_id:
    r = requests.post(f'{BASE_URL}{API}/social/challenges/{team_challenge_id}/teams',
        headers=user1['headers'],
        json={'name': 'Alpha Squad'})
    if test('Create team within challenge', r):
        team = r.json()
        team_id = team.get('id')
        team_join_code = team.get('join_code')
        print(f'   Team ID: {team_id}')
        print(f'   Team name: {team.get("name")}')
        print(f'   Join code: {team_join_code}')
        print(f'   Member count: {team.get("member_count")}')

# List teams in challenge
if team_challenge_id:
    r = requests.get(f'{BASE_URL}{API}/social/challenges/{team_challenge_id}/teams',
        headers=user1['headers'])
    if test('List teams in challenge', r):
        teams = r.json()
        print(f'   Total teams: {len(teams)}')

# User2 joins team by code
if team_join_code:
    r = requests.post(f'{BASE_URL}{API}/social/challenges/teams/join',
        headers=user2['headers'],
        json={'join_code': team_join_code})
    if test('User2 joins team by code', r):
        result = r.json()
        print(f'   Message: {result.get("message")}')
        team_data = result.get('team', {})
        print(f'   Team member count: {team_data.get("member_count")}')

# Get team details
if team_id:
    r = requests.get(f'{BASE_URL}{API}/social/challenges/teams/{team_id}',
        headers=user1['headers'])
    if test('Get team details', r):
        team = r.json()
        print(f'   Team name: {team.get("name")}')
        print(f'   Total progress: {team.get("total_progress")}')
        print(f'   Members: {team.get("member_count")}')

# Get team leaderboard
if team_challenge_id:
    r = requests.get(f'{BASE_URL}{API}/social/challenges/{team_challenge_id}/teams/leaderboard',
        headers=user1['headers'])
    if test('Get team leaderboard', r):
        lb = r.json()
        print(f'   Challenge ID: {lb.get("challenge_id")}')
        print(f'   Total teams: {lb.get("total_teams")}')

# Create another team (by user2, who is already in a team - should fail)
if team_challenge_id:
    r = requests.post(f'{BASE_URL}{API}/social/challenges/{team_challenge_id}/teams',
        headers=user2['headers'],
        json={'name': 'Beta Team'})
    test('Cannot create team when already in one', r, expected_status=400)

# User2 leaves team
if team_id:
    r = requests.delete(f'{BASE_URL}{API}/social/challenges/teams/{team_id}/leave',
        headers=user2['headers'])
    test('User2 leaves team', r)

# Try to create team in non-team challenge
regular_challenge_id = None
r = requests.post(f'{BASE_URL}{API}/social/challenges',
    headers=user1['headers'],
    json={
        'name': 'Regular Challenge',
        'challenge_type': 'workout_count',
        'goal_value': 10,
        'start_date': start_date,
        'end_date': end_date,
        'is_team_challenge': False
    })
if r.status_code in [200, 201]:
    regular_challenge_id = r.json().get('id')

    r = requests.post(f'{BASE_URL}{API}/social/challenges/{regular_challenge_id}/teams',
        headers=user1['headers'],
        json={'name': 'Should Fail'})
    test('Cannot create team in non-team challenge', r, expected_status=400)

# ===========================================
# EDGE CASES & VALIDATION
# ===========================================
print('\n=== EDGE CASES & VALIDATION ===')

# Try to create duo streak with non-friend
user3 = create_test_user('user3')
r = requests.post(f'{BASE_URL}{API}/social/duo-streaks',
    headers=user1['headers'],
    json={'partner_id': user3['identity_id'], 'streak_type': 'fasting'})
test('Duo streak with non-friend fails', r, expected_status=400)

# Try to accept invite you didn't receive
r = requests.post(f'{BASE_URL}{API}/social/duo-streaks/invites/nonexistent-id/respond',
    headers=user2['headers'],
    json={'accept': True})
test('Accept non-existent invite fails', r, expected_status=400)  # Returns 400 "Invitation not found"

# Invalid streak type
r = requests.post(f'{BASE_URL}{API}/social/duo-streaks',
    headers=user1['headers'],
    json={'partner_id': user2['identity_id'], 'streak_type': 'invalid_type'})
test('Invalid streak type fails', r, expected_status=422)

# Invalid leaderboard type
r = requests.get(f'{BASE_URL}{API}/social/leaderboards/invalid_type',
    headers=user1['headers'])
test('Invalid leaderboard type fails', r, expected_status=422)  # FastAPI enum validation returns 422

# Invalid leaderboard period
r = requests.get(f'{BASE_URL}{API}/social/leaderboards/global_xp',
    headers=user1['headers'],
    params={'period': 'invalid_period'})
test('Invalid leaderboard period fails', r, expected_status=422)

# ===========================================
# CLEANUP: End duo streak
# ===========================================
print('\n=== CLEANUP ===')

if duo_streak_id:
    r = requests.delete(f'{BASE_URL}{API}/social/duo-streaks/{duo_streak_id}',
        headers=user1['headers'])
    test('End duo streak', r)

# ===========================================
# SUMMARY
# ===========================================
print('\n' + '=' * 70)
print('SOCIAL ENGAGEMENT TEST SUMMARY')
print('=' * 70)
print(f'✅ Passed: {len(results["passed"])}')
print(f'❌ Failed: {len(results["failed"])}')

if results['failed']:
    print('\nFailed tests:')
    for f in results['failed']:
        print(f'   ❌ {f}')

if results['bugs']:
    print('\n🐛 Potential Bugs Found:')
    for bug in results['bugs']:
        print(f'   - {bug["test"]}: {bug["description"]}')

print('=' * 70)
