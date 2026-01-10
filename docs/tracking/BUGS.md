# Known Issues & Bugs

Tracking of bugs and issues with code references.

---

## Format

Each bug follows this pattern:
- **ID:** BUG-XXX
- **Status:** Open / In Progress / Resolved
- **Severity:** Critical / High / Medium / Low
- **File(s):** Exact path with line numbers
- **Reported:** Date
- **Resolved:** Date (if applicable)

---

## Status Legend

| Status | Meaning |
|--------|---------|
| Open | Not yet addressed |
| In Progress | Being worked on |
| Resolved | Fixed and verified |
| Won't Fix | Intentional or not worth fixing |

---

## Severity Legend

| Severity | Meaning |
|----------|---------|
| Critical | App unusable, data loss |
| High | Major feature broken |
| Medium | Feature works but has issues |
| Low | Minor inconvenience |

---

## Open Issues

*No open issues currently tracked.*

---

## Resolved Issues

### BUG-001: Timezone-naive datetime mismatch in Research ORM

**Status:** Resolved | **Severity:** High | **Reported:** 2026-01-10 | **Resolved:** 2026-01-10

**Description:**
Research module datetime columns were using `DateTime` without timezone awareness, causing PostgreSQL "can't compare timezone-naive and timezone-aware datetime" errors.

**Error Message:**
```
can't compare timezone-naive and timezone-aware datetime
```

**Files Affected:**
- `apps/api/src/modules/research/orm.py:25-35`

**Root Cause:**
SQLAlchemy `DateTime` columns default to timezone-naive, but PostgreSQL TIMESTAMP WITH TIME ZONE requires timezone-aware datetimes.

**Fix:**
Changed all datetime columns to use `DateTime(timezone=True)`:
```python
# Before
ai_processed_at = Column(DateTime, nullable=True)

# After
ai_processed_at = Column(DateTime(timezone=True), nullable=True)
```

**Columns Fixed:**
- `ResearchPaperORM.ai_processed_at`
- `UserSavedResearchORM.saved_at`
- `UserSearchQuotaORM.last_search_at`
- `UserSearchQuotaORM.quota_resets_at`

**Commit:** `0ce18294`

**Related:** [DECISIONS.md#DEC-021](../product/DECISIONS.md#dec-021-timezone-aware-timestamps)

---

### BUG-002: Weight logging crash with invalid source

**Status:** Resolved | **Severity:** Medium | **Reported:** 2025-12-28 | **Resolved:** 2025-12-28

**Description:**
Mobile app crashed when saving weight because it sent `source: 'manual'` but backend only accepts `user_input`, `calculated`, or `device_sync`.

**Files Affected:**
- `apps/mobile/features/dashboard/hooks/useMetrics.ts:45`

**Fix:**
Changed source value from `'manual'` to `'user_input'`.

**Related:** [SESSIONS.md#december-28-2025](SESSIONS.md#december-28-2025---settings--weight-logging-fixes)

---

### BUG-003: PostgreSQL enum type missing for research module

**Status:** Resolved | **Severity:** High | **Reported:** 2026-01-10 | **Resolved:** 2026-01-10

**Description:**
Research endpoint returned 500 error because PostgreSQL enum types were not created by migration.

**Error Message:**
```
type "researchtopic" does not exist
```

**Root Cause:**
Migration defined enums inline but PostgreSQL required explicit CREATE TYPE.

**Fix:**
Created migration to add missing enum types:
```sql
CREATE TYPE researchtopic AS ENUM ('intermittent_fasting', 'hiit', 'nutrition', 'sleep');
```

---

## Reporting a Bug

When adding a new bug, include:

1. **Clear title** describing the issue
2. **Steps to reproduce** (if known)
3. **Error message** (exact text)
4. **Files affected** with line numbers
5. **Expected vs actual behavior**
6. **Screenshots** (if applicable)

### Template

```markdown
### BUG-XXX: [Title]

**Status:** Open | **Severity:** [Level] | **Reported:** [Date]

**Description:**
[What's happening]

**Steps to Reproduce:**
1. Step one
2. Step two

**Error Message:**
\```
[Error text]
\```

**Files Affected:**
- `path/to/file.py:line`

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]
```

---

## References

- **Feature Docs:** [features/](../features/)
- **Session Logs:** [SESSIONS.md](SESSIONS.md)
