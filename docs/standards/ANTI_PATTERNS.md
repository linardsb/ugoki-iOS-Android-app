# UGOKI Anti-Patterns

What NOT to do. Common mistakes and how to avoid them.

---

## Architecture Anti-Patterns

### Cross-Module Database Access

**Don't:**
```python
# In time_keeper service
from src.modules.metrics.orm import MetricORM

async def get_weight_with_fast(identity_id: str):
    # Directly querying another module's table
    result = await db.execute(
        select(MetricORM).where(MetricORM.identity_id == identity_id)
    )
```

**Do:**
```python
# Use the interface
async def get_weight_with_fast(identity_id: str):
    weight = await self.metrics.get_latest(identity_id, "weight_kg")
```

**Why:** Black box modules must not know each other's internals.

---

### Parsing IDs from Other Modules

**Don't:**
```python
# Assuming ID format
def extract_user_from_window(window_id: str):
    parts = window_id.split("-")
    user_id = parts[0]  # Assuming format: user_id-timestamp-random
```

**Do:**
```python
# Treat IDs as opaque
def get_user_from_window(window: TimeWindow):
    return window.identity_id  # Use the explicit reference
```

**Why:** ID formats may change. Treat them as opaque strings.

---

### Leaky Abstractions

**Don't:**
```python
# Interface that exposes implementation
class MetricsInterface:
    async def get_with_sql(self, query: str) -> list:
        """Execute raw SQL query."""
        pass
```

**Do:**
```python
# Interface that hides implementation
class MetricsInterface:
    async def get_latest(self, identity_id: str, metric_type: str) -> Metric | None:
        """Get the most recent metric of given type."""
        pass
```

**Why:** If changing implementation requires changing interface, it's a leaky abstraction.

---

## Code Anti-Patterns

### Hardcoded API Keys

**Don't:**
```python
ANTHROPIC_API_KEY = "sk-ant-api03-..."
```

**Do:**
```python
import os
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
```

**Why:** Secrets in code end up in git history.

---

### Truncating LLM Input

**Don't:**
```python
# Limiting context
message = user_message[:500]  # Truncate to 500 chars
response = await agent.run(message)
```

**Do:**
```python
# Let the model handle full context
response = await agent.run(user_message)
```

**Why:** Truncation loses important context. Let Claude manage its context window.

---

### Defensive JSON Parsing Fallbacks

**Don't:**
```python
try:
    data = json.loads(response)
except:
    data = {"error": "parse failed"}  # Silent failure
```

**Do:**
```python
data = json.loads(response)  # Let it fail loudly
```

**Why:** Silent failures hide bugs. Fail fast to find issues early.

---

### Mixing Concerns

**Don't:**
```python
# Route handler doing everything
@router.post("/start")
async def start_fast(request: Request, db: AsyncSession = Depends(get_db)):
    # Validation
    if not request.protocol:
        raise HTTPException(400, "Protocol required")

    # Business logic
    hours = [int(x) for x in request.protocol.split(":")]
    if sum(hours) != 24:
        raise HTTPException(400, "Invalid protocol")

    # Database operations
    orm = TimeWindowORM(...)
    db.add(orm)
    await db.commit()

    # Response formatting
    return {"id": str(orm.id), ...}
```

**Do:**
```python
# Route handler delegates to service
@router.post("/start")
async def start_fast(
    request: StartFastRequest,
    service: TimeKeeperService = Depends(get_service)
):
    return await service.open_window(request)
```

**Why:** Single responsibility. Routes handle HTTP, services handle business logic.

---

### Over-Engineering

**Don't:**
```python
# Factory pattern for simple object
class TimeWindowFactory:
    def create_fast_window(self, config: dict):
        return FastWindowBuilder().with_protocol(...).build()

class FastWindowBuilder:
    def with_protocol(self, protocol):
        ...
```

**Do:**
```python
# Simple function
def create_fast_window(identity_id: str, protocol: str) -> TimeWindowORM:
    return TimeWindowORM(
        identity_id=identity_id,
        window_type="fast",
        protocol=protocol
    )
```

**Why:** Don't add abstraction until you need it. YAGNI.

---

## Mobile Anti-Patterns

### Using AsyncStorage for Sensitive Data

**Don't:**
```typescript
// AsyncStorage is unencrypted
await AsyncStorage.setItem('accessToken', token);
```

**Do:**
```typescript
// Use SecureStore for sensitive data
await SecureStore.setItemAsync('accessToken', token);
```

**Why:** AsyncStorage is plaintext on device.

---

### Prop Drilling State

**Don't:**
```typescript
// Passing through many levels
<Parent settings={settings}>
  <Child settings={settings}>
    <GrandChild settings={settings}>
      <DeepChild settings={settings} />
```

**Do:**
```typescript
// Use Zustand store
const settings = useSettingsStore();
```

**Why:** Prop drilling makes refactoring painful.

---

### Inline Styles Everywhere

**Don't:**
```typescript
<View style={{ padding: 16, margin: 8, backgroundColor: '#fff' }}>
```

**Do:**
```typescript
<YStack padding="$4" margin="$2" backgroundColor="$background">
```

**Why:** Tamagui tokens enable theming and consistency.

---

## Database Anti-Patterns

### N+1 Queries

**Don't:**
```python
users = await db.execute(select(UserORM))
for user in users:
    metrics = await db.execute(
        select(MetricORM).where(MetricORM.identity_id == user.id)
    )  # Query per user!
```

**Do:**
```python
# Single query with join or batch
result = await db.execute(
    select(UserORM, MetricORM)
    .join(MetricORM, MetricORM.identity_id == UserORM.id)
)
```

**Why:** N+1 queries destroy performance.

---

### Timezone-Naive Timestamps

**Don't:**
```python
created_at = Column(DateTime)  # No timezone
```

**Do:**
```python
created_at = Column(DateTime(timezone=True))
```

**Why:** Timezone mismatches cause subtle bugs.

---

### Health Data Without source Column

**Don't:**
```python
# Storing health metrics without tracking source
await metrics.record(
    identity_id=identity_id,
    metric_type="health_heart_rate",
    value=72.0,
    # Missing source - where did this come from?
)
```

**Do:**
```python
# Always track the source (device sync, user input, calculated)
await metrics.record(
    identity_id=identity_id,
    metric_type="health_heart_rate",
    value=72.0,
    source=MetricSource.DEVICE_SYNC,  # From HealthKit/Health Connect
    timestamp=datetime.now(timezone.utc)
)
```

**Why:** Health data source determines trust level and audit requirements. Device data needs different handling than manual entry.

---

### Logging Health Data

**Don't:**
```python
# Never log raw health metrics
logger.info(f"User {identity_id} heart rate: {hr} bpm")
logger.debug(f"Synced health data: {health_payload}")
```

**Do:**
```python
# Log only metadata, never the actual values
logger.info(f"Health data synced for user {identity_id}")
logger.debug(f"Synced {len(metrics)} health metrics")
```

**Why:** Health data is PHI (Protected Health Information) - logging it violates HIPAA/GDPR and creates security vulnerabilities.

---

### Missing Health Permissions Check

**Don't:**
```typescript
// Assuming user granted permission
const healthData = await getHealthData();
syncToBackend(healthData);
```

**Do:**
```typescript
// Always check permission first
const permission = await checkHealthPermission();
if (!permission.granted) {
    showPermissionDialog();
    return;
}
const healthData = await getHealthData();
syncToBackend(healthData);
```

**Why:** Permission can be revoked at any time. Sync must fail gracefully without data loss.

---

### Missing Indexes

**Don't:**
```python
identity_id = Column(UUID(as_uuid=True), nullable=False)
# No index on frequently queried column
```

**Do:**
```python
identity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
```

**Why:** Unindexed queries slow down with scale.

---

## API Anti-Patterns

### Exposing Internal Errors

**Don't:**
```python
except Exception as e:
    raise HTTPException(500, str(e))  # Leaks internals
```

**Do:**
```python
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(500, "Internal server error")
```

**Why:** Error details help attackers.

---

### Inconsistent Response Formats

**Don't:**
```python
# Different formats for different endpoints
return {"user": user}           # Endpoint A
return {"data": {"user": user}} # Endpoint B
return user                      # Endpoint C
```

**Do:**
```python
# Consistent format
return {"data": user, "meta": {"timestamp": ...}}
```

**Why:** Inconsistency makes client code complex.

---

## Documentation Anti-Patterns

### Commented-Out Code

**Don't:**
```python
# Old implementation
# def get_fast(self):
#     return self.db.query(...)
#     if result:
#         return result
#     return None
```

**Do:**
```python
# Delete it. Git has history.
```

**Why:** Commented code is never updated and confuses readers.

---

### Obvious Comments

**Don't:**
```python
# Increment counter
counter += 1
```

**Do:**
```python
# Count failed retries for circuit breaker threshold
retry_count += 1
```

**Why:** Comment WHY, not WHAT.

---

## Summary Checklist

Before committing, check:

- [ ] No cross-module database access
- [ ] No hardcoded secrets
- [ ] No truncated LLM inputs
- [ ] No silent failures
- [ ] No mixed concerns in handlers
- [ ] No unnecessary abstractions
- [ ] No N+1 queries
- [ ] No timezone-naive timestamps
- [ ] No commented-out code

---

## References

- **Coding Standards:** [CODING_STANDARDS.md](CODING_STANDARDS.md)
- **Security:** [SECURITY.md](SECURITY.md)
- **Patterns:** [architecture/PATTERNS.md](../architecture/PATTERNS.md)
