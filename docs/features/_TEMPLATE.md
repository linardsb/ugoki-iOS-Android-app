# Feature: [Name]

Template for feature documentation.

---

## Overview

[One paragraph description of the feature]

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete / In Progress / Planned |
| Mobile | Complete / In Progress / Planned |
| Tests | Complete / Partial / Planned |

---

## User Stories

- As a user, I want to [action] so that [benefit]
- As a user, I want to [action] so that [benefit]

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/...` | Description | Yes |
| POST | `/api/v1/...` | Description | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/{module}/service.py` | Business logic |
| `apps/api/src/modules/{module}/routes.py` | API endpoints |
| `apps/api/src/modules/{module}/models.py` | Pydantic models |
| `apps/api/src/modules/{module}/orm.py` | Database models |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/{feature}/hooks/use{Feature}.ts` | React Query hooks |
| `apps/mobile/features/{feature}/components/{Component}.tsx` | UI components |
| `apps/mobile/app/(modals)/{screen}.tsx` | Screen |

---

## Data Models

### Request

```typescript
interface CreateRequest {
  field: string;
}
```

### Response

```typescript
interface Response {
  id: string;
  field: string;
  created_at: string;
}
```

---

## Database Schema

```sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL REFERENCES identities(id),
  field TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Business Logic

[Describe key business rules and logic]

---

## Known Issues

| ID | Description | Status |
|----|-------------|--------|
| [BUG-XXX](../tracking/BUGS.md#BUG-XXX) | Description | Open / Resolved |

---

## Future Enhancements

- [ ] Enhancement 1
- [ ] Enhancement 2

---

## References

- **PRD Section:** [PRD.md#section](../product/PRD.md#section)
- **Module Spec:** [MODULES.md#module](../architecture/MODULES.md#module)
