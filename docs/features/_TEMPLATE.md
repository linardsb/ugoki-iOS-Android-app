# Feature: [Feature Name]

[One-liner description: Technology/integration/system being documented.]

---

## Overview

[1-2 paragraph description of the feature, including:]
- What user problem does it solve?
- How does it fit into UGOKI's ecosystem?
- Key integrations or dependencies?

---

## Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend | Complete / In Progress / Planned | [Implementation notes] |
| Mobile | Complete / In Progress / Planned | [Implementation notes] |
| Tests | Complete / Partial / Planned | [Test coverage details] |
| Documentation | Complete / In Progress | [Doc status] |

**Last Updated:** YYYY-MM-DD | **Implemented:** YYYY-MM-DD

---

## User Stories

- As a user, I want to [action] so that [benefit]
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

### Request Models

```typescript
interface CreateRequest {
  field: string;
  optional_field?: string;
}

interface UpdateRequest {
  id: string;
  field?: string;
}

interface QueryParams {
  limit?: number;
  offset?: number;
  sort_by?: string;
}
```

### Response Models

```typescript
interface Response {
  id: string;
  field: string;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  items: Response[];
  total_count: number;
  offset: number;
  limit: number;
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}
```

---

## API Response Examples

### Success Response

```json
{
  "id": "uuid-123",
  "field": "value",
  "created_at": "2026-01-24T10:30:00Z",
  "updated_at": "2026-01-24T10:30:00Z"
}
```

### List Response

```json
{
  "items": [
    {
      "id": "uuid-1",
      "field": "value-1",
      "created_at": "2026-01-24T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "field": "value-2",
      "created_at": "2026-01-23T09:15:00Z"
    }
  ],
  "total_count": 2,
  "offset": 0,
  "limit": 20
}
```

### Error Response

```json
{
  "error": "Resource not found",
  "code": "NOT_FOUND",
  "details": {
    "resource_id": "uuid-123"
  }
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

[Describe key business rules and logic, including:]
- Validation rules and constraints
- State transitions
- Edge cases
- Error handling

Example:
```python
# Example business logic
def validate_request(request):
    if not request.field:
        raise ValueError("field is required")
    if len(request.field) > 100:
        raise ValueError("field max length is 100")
    return True
```

---

## Mobile Integration

[Describe how this feature integrates with mobile app:]
- UI components and screens
- State management (Zustand)
- Data fetching (TanStack Query)
- Error handling and edge cases
- Offline support (if applicable)

---

## Security & Privacy

[If handling sensitive data, document:]
- PHI handling (if health data)
- GDPR compliance
- Data encryption
- Authorization checks
- Audit logging
- Sensitive field masking in logs

Reference: [SECURITY.md](../standards/SECURITY.md)

---

## Testing

### Unit Tests
- Service layer logic
- Validation rules
- Edge cases

### Integration Tests
- Full feature workflows
- API endpoint responses
- Database transactions

### Mobile Tests
- Component rendering
- Hook behavior
- State updates

---

## Known Issues

| ID | Description | Status |
|----|-------------|--------|
| [BUG-XXX](../tracking/BUGS.md#BUG-XXX) | Description | Open / Resolved |

---

## Future Enhancements

- [ ] Enhancement 1
- [ ] Enhancement 2
- [ ] Enhancement 3

---

## Cost Considerations

| Operation | Cost | Notes |
|-----------|------|-------|
| [Operation] | $X | [Details] |

---

## References

- **PRD Section:** [PRD.md#section](../product/PRD.md#section)
- **Module Spec:** [MODULES.md#module](../architecture/MODULES.md#module)
- **Architecture:** [OVERVIEW.md](../architecture/OVERVIEW.md)
- **Patterns:** [PATTERNS.md](../architecture/PATTERNS.md)
