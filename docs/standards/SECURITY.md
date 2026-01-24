# UGOKI Security Standards

Security requirements and best practices.

---

## Overview

UGOKI handles sensitive health data. Security is a core requirement, not an afterthought.

---

## Authentication

### JWT Tokens

- Access tokens expire in 7 days (configurable via `JWT_EXPIRE_MINUTES`)
- Refresh tokens expire in 30 days
- Tokens include JTI (JWT ID) for revocation support
- Never store tokens in localStorage (use secure storage)

```python
# Token structure (src/modules/identity/service.py)
payload = {
    "sub": identity_id,      # User identity
    "exp": expires_at,       # Expiration time
    "type": "access",        # Token type (access/refresh)
    "jti": str(uuid4()),     # JWT ID for revocation
    "iat": datetime.now(),   # Issued at
}
```

### JWT Validation

All protected endpoints use the `get_current_identity` dependency:

```python
from src.core.auth import get_current_identity

@router.get("/protected")
async def protected_endpoint(
    identity_id: str = Depends(get_current_identity),  # Validates JWT
):
    ...
```

The auth module (`src/core/auth.py`) validates:
- Token signature (using JWT_SECRET)
- Token expiration
- Token type (must be "access" for API calls)
- Returns 401 for invalid/expired/missing tokens

### Token Revocation

Logout invalidates tokens via a blacklist:

```python
# Revoked tokens stored in revoked_tokens table
class RevokedTokenORM(Base):
    jti: str           # JWT ID
    identity_id: str   # User who logged out
    expires_at: datetime  # When token would have expired
```

### Anonymous Mode

- Device IDs are hashed before storage
- Anonymous users have limited capabilities
- Account upgrade preserves data with consent

---

## Data Protection

### PII Isolation

Personal data is isolated in the PROFILE module:

```
┌─────────────────┐     ┌─────────────────┐
│    IDENTITY     │     │     PROFILE     │
│  (No PII)       │────▶│  (Contains PII) │
│  - id           │     │  - name         │
│  - type         │     │  - email        │
│  - capabilities │     │  - height       │
└─────────────────┘     │  - goals        │
                        └─────────────────┘
```

**Rules:**
- Only PROFILE module queries PII
- Other modules use identity_id reference
- PROFILE can be deleted without breaking other data

### GDPR Compliance

| Right | Implementation |
|-------|----------------|
| Access | GET /profile endpoint |
| Rectification | PATCH /profile endpoint |
| Erasure | DELETE /profile (cascades PII only) |
| Portability | GET /profile/export (JSON download) |

### Sensitive Data Handling

```python
# Never log PII
logger.info(f"User {identity_id} logged in")  # Good
logger.info(f"User {email} logged in")         # Bad

# Never expose in errors
raise HTTPException(401, "Invalid credentials")  # Good
raise HTTPException(401, f"User {email} not found")  # Bad
```

### Health Data Protection (PHI - Protected Health Information)

Device-synced health metrics from Apple HealthKit and Google Health Connect are treated as Protected Health Information (PHI):

**Rules:**
- All health metrics stored with `source=DEVICE_SYNC` are encrypted in transit
- Health data in METRICS table marked with `metric_type` prefixed with `health_*`
- Health permission requests require explicit user consent
- Users can revoke health sync permission without losing other data
- Health data is never logged or exposed in errors
- Health data deletion must be instantaneous (GDPR right to be forgotten)

**Implementation:**
```python
# When storing health metrics from device
await metrics.record(
    identity_id=identity_id,
    metric_type="health_heart_rate",  # Prefixed with health_
    value=72.0,
    source=MetricSource.DEVICE_SYNC,  # Marked as device source
    timestamp=datetime.now(timezone.utc)
)

# Health data access requires audit logging
async def record_audit_event(
    identity_id=identity_id,
    action="health_data_accessed",
    details={"metric_type": "health_heart_rate"}
)
```

**User Permissions:**
- iOS: Health app permission dialog (Apple requirement)
- Android: Health Connect permission dialog (Google requirement)
- Permission state checked before syncing
- Revocation removes access without data breach

---

## API Security

### HTTPS Only

All production traffic must use HTTPS:

```python
# Redirect HTTP to HTTPS
@app.middleware("http")
async def https_redirect(request, call_next):
    if request.url.scheme == "http":
        return RedirectResponse(
            request.url.replace(scheme="https"),
            status_code=301
        )
    return await call_next(request)
```

### Rate Limiting

Implemented using slowapi (`src/core/rate_limit.py`):

```python
from src.core.rate_limit import limiter, RateLimits

@router.post("/chat")
@limiter.limit(RateLimits.AI_CHAT)
async def chat(request: Request, ...):
    ...
```

Rate limits are keyed by identity (authenticated) or IP (unauthenticated).

| Category | Limit | Endpoints |
|----------|-------|-----------|
| AUTH | 5/minute; 20/hour | authenticate, refresh |
| AI_CHAT | 30/minute; 200/hour | /coach/chat |
| AI_INSIGHT | 60/minute | /coach/insight |
| UPLOAD | 10/minute; 50/hour | bloodwork, avatar uploads |
| SEARCH | 30/minute; 300/hour | /research/search |
| GDPR | 5/hour | export, delete, anonymize |
| Default | 200/minute | All other endpoints |

### Input Validation

All inputs validated with Pydantic:

```python
class StartFastRequest(BaseModel):
    protocol: str = Field(pattern=r"^\d{1,2}:\d{1,2}$")

    @validator("protocol")
    def validate_protocol(cls, v):
        hours = [int(x) for x in v.split(":")]
        if sum(hours) != 24:
            raise ValueError("Protocol must sum to 24 hours")
        return v
```

### Authorization

Check ownership on every request:

```python
@router.get("/fasting/{id}")
async def get_fast(
    id: str,
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_service)
):
    window = await service.get(id)
    if not window:
        raise HTTPException(404, "Not found")
    if window.identity_id != identity_id:
        raise HTTPException(403, "Forbidden")  # Don't reveal existence
    return window
```

---

## Secrets Management

### Environment Variables

```python
# Good: Load from environment
import os
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# Bad: Hardcoded
ANTHROPIC_API_KEY = "sk-ant-..."
```

### .env Files

```bash
# .env (never commit)
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=...
ANTHROPIC_API_KEY=...
```

```bash
# .gitignore
.env
.env.local
*.pem
*.key
```

### Production Secrets

Use Fly.io secrets:

```bash
fly secrets set DATABASE_URL="..."
fly secrets set JWT_SECRET="..."
fly secrets set ANTHROPIC_API_KEY="..."
```

---

## AI Safety

### Content Filtering

Pre-filter user messages:

```python
BLOCKED_TOPICS = [
    "diabetes", "heart disease", "cancer",
    "eating disorder", "anorexia", "bulimia",
    "medication", "prescription", "drug interaction"
]

EMERGENCY_KEYWORDS = [
    "chest pain", "can't breathe", "heart attack",
    "overdose", "suicidal"
]

def check_message_safety(message: str) -> SafetyResult:
    lower = message.lower()

    for keyword in EMERGENCY_KEYWORDS:
        if keyword in lower:
            return SafetyResult(
                safe=False,
                redirect="emergency",
                message="If this is an emergency, please call 911"
            )

    for topic in BLOCKED_TOPICS:
        if topic in lower:
            return SafetyResult(
                safe=False,
                reason="medical_advice",
                message="I can't provide medical advice. Please consult a healthcare provider."
            )

    return SafetyResult(safe=True)
```

### Post-Filter AI Responses

```python
def filter_ai_response(response: str) -> str:
    # Remove any medical advice that slipped through
    # Add standard disclaimers
    return response + "\n\n" + HEALTH_DISCLAIMER
```

---

## Mobile Security

### Secure Storage

```typescript
import * as SecureStore from 'expo-secure-store';

// Store tokens securely
await SecureStore.setItemAsync('accessToken', token);

// Never use AsyncStorage for sensitive data
// AsyncStorage is unencrypted
```

### Certificate Pinning

**Status:** Planned for Phase 2 Deployment (Post-MVP)

Certificate pinning adds an additional layer of security by validating the server's SSL certificate against a known set of certificates. This prevents man-in-the-middle attacks even if a Certificate Authority is compromised.

**Implementation Timeline:**
- **MVP (Current):** Not required - relies on standard HTTPS certificate validation
- **Phase 2 (Post-MVP):** To be implemented during production hardening phase before public App Store release
- **Implementation Target:** 2-3 weeks into Phase 2 deployment cycle

**Planned Approach:**
```typescript
// For Phase 2+ production builds with certificate pinning
import { createHttpClient } from 'react-native-http-bridge';

const api = axios.create({
  baseURL: API_URL,
  httpAgent: createHttpClient({
    certificates: ['path/to/api.ugoki.app.pem']
  }),
});
```

**Configuration:**
- Generate certificate pin hashes during EAS build process
- Store pins securely in app bundle
- Implement pin update strategy for certificate renewal
- Add pin validation to all API requests
- Test on physical devices before release

**Notes:**
- MVP relies on standard TLS verification through Expo SDK
- Defer to Phase 2 to allow rapid MVP deployment without certificate management overhead
- Required before public store submission for security-conscious users

---

## Audit Logging

All sensitive operations are logged:

```python
async def record_audit_event(
    identity_id: str,
    action: str,
    details: dict
):
    await event_journal.record(
        identity_id=identity_id,
        event_type=f"audit_{action}",
        data={
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ip_address": request.client.host,  # Hashed
            "user_agent": request.headers.get("user-agent"),
            **details
        }
    )
```

Logged actions:
- Authentication attempts
- Profile changes
- Data exports
- Account deletion

---

## Vulnerability Response

### Reporting

Security issues should be reported to: security@ugoki.app

### Response Process

1. Acknowledge within 24 hours
2. Assess severity and impact
3. Develop fix in private branch
4. Deploy fix before disclosure
5. Notify affected users if needed

---

## Checklist

Before deploying:

- [x] No hardcoded secrets (environment variables)
- [x] All inputs validated (Pydantic models)
- [x] Authorization on every endpoint (get_current_identity dependency)
- [x] HTTPS enforced (Fly.io)
- [x] Rate limiting configured (slowapi)
- [x] Audit logging enabled (EVENT_JOURNAL module)
- [x] Error messages don't leak info
- [x] PII properly isolated (PROFILE module)
- [x] JWT validation implemented (src/core/auth.py)
- [x] Token revocation (logout blacklist)
- [x] Resource ownership verification (verify_resource_ownership)

---

## References

- **GDPR:** https://gdpr.eu/
- **OWASP:** https://owasp.org/
- **Coding Standards:** [CODING_STANDARDS.md](CODING_STANDARDS.md)
