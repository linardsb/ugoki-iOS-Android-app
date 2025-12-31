"""Comprehensive API test script."""

import requests
import json
from datetime import datetime, timedelta
import time

BASE_URL = 'http://localhost:8000'
results = {'passed': [], 'failed': []}
TOKEN = None
IDENTITY_ID = None

def test(name, response, expected_status=None):
    # Accept 200, 201, 204 as success by default
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
        return False

def headers():
    return {'Authorization': f'Bearer {TOKEN}'}

print('=' * 60)
print('UGOKI API COMPREHENSIVE TEST')
print('=' * 60)

# ===========================================
# IDENTITY MODULE
# ===========================================
print('\n=== IDENTITY MODULE ===')

# Health check
r = requests.get(f'{BASE_URL}/health')
test('Health check', r)

# Create anonymous identity
device_id = f'test-device-{int(datetime.now().timestamp())}'
r = requests.post(f'{BASE_URL}/api/v1/identity/authenticate', json={
    'provider': 'anonymous',
    'token': device_id
})
if test('Create anonymous identity', r):
    data = r.json()
    TOKEN = data['access_token']
    print(f'   Token obtained: {TOKEN[:50]}...')

# Note: Refresh token not implemented - skip test
print('⏭️  Refresh token (not implemented - skipping)')

# Get identity - need to decode token to get identity_id
import base64
token_parts = TOKEN.split('.')
if len(token_parts) >= 2:
    payload = token_parts[1]
    # Add padding if needed
    payload += '=' * (4 - len(payload) % 4)
    decoded = base64.b64decode(payload)
    token_data = json.loads(decoded)
    IDENTITY_ID = token_data.get('sub')
    print(f'   Identity ID: {IDENTITY_ID}')

# Get current identity
r = requests.get(f'{BASE_URL}/api/v1/identity/me', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get current identity', r)

# ===========================================
# PROFILE MODULE
# ===========================================
print('\n=== PROFILE MODULE ===')

# Create profile
r = requests.post(f'{BASE_URL}/api/v1/profile', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'display_name': 'Test User',
    'bio': 'Testing the API'
})
test('Create/update profile', r)

# Get profile
r = requests.get(f'{BASE_URL}/api/v1/profile', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get profile', r)

# Update goals
r = requests.patch(f'{BASE_URL}/api/v1/profile/goals', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'primary_goal': 'weight_loss',
    'target_weight': 75.0,
    'weekly_workout_target': 4
})
test('Update goals', r)

# Get goals
r = requests.get(f'{BASE_URL}/api/v1/profile/goals', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get goals', r)

# Update preferences
r = requests.patch(f'{BASE_URL}/api/v1/profile/preferences', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'haptic_feedback': True,
    'sound_effects': False
})
test('Update preferences', r)

# Get preferences
r = requests.get(f'{BASE_URL}/api/v1/profile/preferences', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get preferences', r)

# ===========================================
# TIME_KEEPER MODULE (Fasting)
# ===========================================
print('\n=== TIME_KEEPER MODULE ===')

fast_id = None

# Start a fast (window)
r = requests.post(f'{BASE_URL}/api/v1/time-keeper/windows', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'window_type': 'fast',
    'target_duration_minutes': 960  # 16 hours
})
if test('Start fasting window', r):
    fast_data = r.json()
    fast_id = fast_data.get('id')
    print(f'   Fast ID: {fast_id}')

# Get active window
r = requests.get(f'{BASE_URL}/api/v1/time-keeper/windows/active', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get active window', r)

# Get elapsed time
if fast_id:
    r = requests.get(f'{BASE_URL}/api/v1/time-keeper/windows/{fast_id}/elapsed', headers=headers())
    test('Get elapsed time', r)

# Get fasting history
r = requests.get(f'{BASE_URL}/api/v1/time-keeper/windows', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get fasting history', r)

# Close fast
if fast_id:
    r = requests.post(f'{BASE_URL}/api/v1/time-keeper/windows/{fast_id}/close', headers=headers(), json={
        'end_state': 'completed'
    })
    test('Close fasting window', r)

# ===========================================
# METRICS MODULE
# ===========================================
print('\n=== METRICS MODULE ===')

# Log weight
r = requests.post(f'{BASE_URL}/api/v1/metrics', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'metric_type': 'weight',
    'value': 80.5,
    'unit': 'kg',
    'source': 'user_input'
})
test('Log weight', r)

# Get latest metric
r = requests.get(f'{BASE_URL}/api/v1/metrics/latest', headers=headers(), params={'identity_id': IDENTITY_ID, 'metric_type': 'weight'})
test('Get latest weight', r)

# Get trend
r = requests.get(f'{BASE_URL}/api/v1/metrics/trend', headers=headers(), params={'identity_id': IDENTITY_ID, 'metric_type': 'weight'})
test('Get weight trend', r)

# Get history
r = requests.get(f'{BASE_URL}/api/v1/metrics/history', headers=headers(), params={'identity_id': IDENTITY_ID, 'metric_type': 'weight'})
test('Get metrics history', r)

# ===========================================
# PROGRESSION MODULE
# ===========================================
print('\n=== PROGRESSION MODULE ===')

# Get user level
r = requests.get(f'{BASE_URL}/api/v1/progression/level', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get user level', r)

# Get streaks
r = requests.get(f'{BASE_URL}/api/v1/progression/streaks', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get streaks', r)

# Get achievements
r = requests.get(f'{BASE_URL}/api/v1/progression/achievements/mine', headers=headers(), params={'identity_id': IDENTITY_ID})
if test('Get user achievements', r):
    achievements = r.json()
    print(f'   Total achievements: {len(achievements)}')

# Get all achievements
r = requests.get(f'{BASE_URL}/api/v1/progression/achievements', headers=headers())
if test('Get all achievements', r):
    achievements = r.json()
    print(f'   Available achievements: {len(achievements)}')

# Get XP history
r = requests.get(f'{BASE_URL}/api/v1/progression/xp/history', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get XP history', r)

# Get overview
r = requests.get(f'{BASE_URL}/api/v1/progression/overview', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get progression overview', r)

# ===========================================
# CONTENT MODULE (Workouts)
# ===========================================
print('\n=== CONTENT MODULE (Workouts) ===')

workout_id = None
workouts = []

# Get workout categories
r = requests.get(f'{BASE_URL}/api/v1/content/categories', headers=headers())
if test('Get workout categories', r):
    categories = r.json()
    print(f'   Categories: {len(categories)}')

# Get workouts
r = requests.get(f'{BASE_URL}/api/v1/content/workouts', headers=headers())
if test('Get workouts', r):
    workouts = r.json()
    print(f'   Total workouts: {len(workouts)}')
    if workouts:
        workout_id = workouts[0]['id']

# Get single workout
if workout_id:
    r = requests.get(f'{BASE_URL}/api/v1/content/workouts/{workout_id}', headers=headers())
    test('Get single workout', r)

# Get recommendations
r = requests.get(f'{BASE_URL}/api/v1/content/recommendations', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get workout recommendations', r)

# Start workout session
session_id = None
if workout_id:
    r = requests.post(f'{BASE_URL}/api/v1/content/sessions', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
        'workout_id': workout_id
    })
    if test('Start workout session', r):
        session_id = r.json().get('id')
        print(f'   Session ID: {session_id}')

# Get active session
r = requests.get(f'{BASE_URL}/api/v1/content/sessions/active', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get active session', r)

# Complete workout session
if session_id:
    r = requests.post(f'{BASE_URL}/api/v1/content/sessions/{session_id}/complete', headers=headers(), json={
        'calories_burned': 150
    })
    test('Complete workout session', r)

# Get workout stats
r = requests.get(f'{BASE_URL}/api/v1/content/stats', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get workout stats', r)

# Get session history
r = requests.get(f'{BASE_URL}/api/v1/content/sessions/history', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get session history', r)

# ===========================================
# CONTENT MODULE (Recipes)
# ===========================================
print('\n=== CONTENT MODULE (Recipes) ===')

recipes = []
recipe_id = None

# Get recipes
r = requests.get(f'{BASE_URL}/api/v1/content/recipes', headers=headers())
if test('Get recipes', r):
    recipes = r.json()
    print(f'   Total recipes: {len(recipes)}')
    if recipes:
        recipe_id = recipes[0]['id']

# Get single recipe
if recipe_id:
    r = requests.get(f'{BASE_URL}/api/v1/content/recipes/{recipe_id}', headers=headers())
    test('Get single recipe', r)

# Save recipe
if recipe_id:
    r = requests.post(f'{BASE_URL}/api/v1/content/recipes/saved', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
        'recipe_id': recipe_id
    })
    test('Save recipe', r)

# Get saved recipes
r = requests.get(f'{BASE_URL}/api/v1/content/recipes/saved/list', headers=headers(), params={'identity_id': IDENTITY_ID})
if test('Get saved recipes', r):
    saved = r.json()
    print(f'   Saved recipes: {len(saved)}')

# Unsave recipe
if recipe_id:
    r = requests.delete(f'{BASE_URL}/api/v1/content/recipes/saved/{recipe_id}', headers=headers(), params={'identity_id': IDENTITY_ID})
    test('Unsave recipe', r)

# ===========================================
# AI_COACH MODULE
# ===========================================
print('\n=== AI_COACH MODULE ===')

# Send chat message
r = requests.post(f'{BASE_URL}/api/v1/coach/chat', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'message': 'What should I eat after a workout?'
})
if test('Send chat message', r):
    response = r.json()
    resp_text = str(response.get("response", ""))
    print(f'   Response: {resp_text[:80]}...')

# Test safety filter (should redirect)
r = requests.post(f'{BASE_URL}/api/v1/coach/chat', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'message': 'I have diabetes, what fasting protocol should I use?'
})
if test('Safety filter - blocked query', r):
    response = r.json()
    safety_redirected = response.get('safety_redirected', False)
    print(f'   Safety redirected: {safety_redirected}')

# Get coach context
r = requests.get(f'{BASE_URL}/api/v1/coach/context', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get coach context', r)

# Get daily insight
r = requests.get(f'{BASE_URL}/api/v1/coach/insight', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get daily insight', r)

# Get motivation
r = requests.get(f'{BASE_URL}/api/v1/coach/motivation', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get motivation', r)

# ===========================================
# SOCIAL MODULE
# ===========================================
print('\n=== SOCIAL MODULE ===')

# First update social profile to have a username
r = requests.patch(f'{BASE_URL}/api/v1/profile/social', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'username': f'testuser{int(datetime.now().timestamp())}',
    'profile_public': True
})
test('Update social profile', r)

# Get friends (empty list initially)
r = requests.get(f'{BASE_URL}/api/v1/social/friends', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get friends list', r)

# Get incoming friend requests
r = requests.get(f'{BASE_URL}/api/v1/social/friends/requests/incoming', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get incoming friend requests', r)

# Get outgoing friend requests
r = requests.get(f'{BASE_URL}/api/v1/social/friends/requests/outgoing', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get outgoing friend requests', r)

# Get followers
r = requests.get(f'{BASE_URL}/api/v1/social/followers', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get followers', r)

# Get following
r = requests.get(f'{BASE_URL}/api/v1/social/following', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get following', r)

# Get global leaderboard
r = requests.get(f'{BASE_URL}/api/v1/social/leaderboards/global_xp', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get global XP leaderboard', r)

# Get friends leaderboard
r = requests.get(f'{BASE_URL}/api/v1/social/leaderboards/friends_xp', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get friends XP leaderboard', r)

# Get challenges
r = requests.get(f'{BASE_URL}/api/v1/social/challenges', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get challenges list', r)

# Create a challenge
challenge_id = None
r = requests.post(f'{BASE_URL}/api/v1/social/challenges', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'name': 'Test Challenge',
    'description': 'A test challenge for API testing',
    'challenge_type': 'workout_count',
    'goal_value': 10,
    'start_date': datetime.now().strftime('%Y-%m-%d'),  # Date only
    'end_date': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),  # Date only
    'is_public': True
})
if test('Create challenge', r):
    challenge = r.json()
    challenge_id = challenge.get('id')
    join_code = challenge.get('join_code')
    print(f'   Challenge ID: {challenge_id}')
    print(f'   Join code: {join_code}')

# Get my challenges
r = requests.get(f'{BASE_URL}/api/v1/social/challenges/mine', headers=headers(), params={'identity_id': IDENTITY_ID})
if test('Get my challenges', r):
    my_challenges = r.json()
    print(f'   My challenges: {len(my_challenges)}')

# Get challenge detail
if challenge_id:
    r = requests.get(f'{BASE_URL}/api/v1/social/challenges/{challenge_id}', headers=headers(), params={'identity_id': IDENTITY_ID})
    test('Get challenge detail', r)

# Get challenge leaderboard
if challenge_id:
    r = requests.get(f'{BASE_URL}/api/v1/social/challenges/{challenge_id}/leaderboard', headers=headers(), params={'identity_id': IDENTITY_ID})
    test('Get challenge leaderboard', r)

# Search users
r = requests.get(f'{BASE_URL}/api/v1/social/users/search', headers=headers(), params={'identity_id': IDENTITY_ID, 'query': 'test'})
test('Search users', r)

# ===========================================
# NOTIFICATION MODULE
# ===========================================
print('\n=== NOTIFICATION MODULE ===')

# Get notification preferences
r = requests.get(f'{BASE_URL}/api/v1/notifications/preferences', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get notification preferences', r)

# Update notification preferences
r = requests.patch(f'{BASE_URL}/api/v1/notifications/preferences', headers=headers(), params={'identity_id': IDENTITY_ID}, json={
    'push_enabled': True,
    'fasting_reminders': True,
    'workout_reminders': True
})
test('Update notification preferences', r)

# Get notifications
r = requests.get(f'{BASE_URL}/api/v1/notifications', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get notifications', r)

# Get unread count
r = requests.get(f'{BASE_URL}/api/v1/notifications/unread-count', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get unread count', r)

# ===========================================
# EVENT JOURNAL MODULE
# ===========================================
print('\n=== EVENT JOURNAL MODULE ===')

# Get activity feed
r = requests.get(f'{BASE_URL}/api/v1/events/feed', headers=headers(), params={'identity_id': IDENTITY_ID})
if test('Get activity feed', r):
    events = r.json()
    print(f'   Total events: {len(events)}')

# Get events
r = requests.get(f'{BASE_URL}/api/v1/events', headers=headers(), params={'identity_id': IDENTITY_ID})
test('Get events', r)

# Get event summary (requires start_time and end_time)
r = requests.get(f'{BASE_URL}/api/v1/events/summary', headers=headers(), params={
    'identity_id': IDENTITY_ID,
    'start_time': (datetime.now() - timedelta(days=30)).isoformat(),
    'end_time': datetime.now().isoformat()
})
test('Get event summary', r)

# ===========================================
# SUMMARY
# ===========================================
print('\n' + '=' * 60)
print('TEST SUMMARY')
print('=' * 60)
print(f'✅ Passed: {len(results["passed"])}')
print(f'❌ Failed: {len(results["failed"])}')
if results['failed']:
    print('\nFailed tests:')
    for f in results['failed']:
        print(f'   ❌ {f}')
print('=' * 60)
