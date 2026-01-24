# UGOKI User Roles Implementation Plan

> **Status**: Future Feature - Not Yet Implemented
> **Created**: 2026-01-20
> **Updated**: 2026-01-24
> **Priority**: Post-MVP (currently not implemented in codebase)
> **Reference**: Compared with AI Agent Mastery Course (`5_Agent_Application`)

## Source Directories

| Project | Path |
|---------|------|
| **UGOKI** | `/Users/Berzins/Desktop/AI/UGOKI/ugoki_1_0` |
| **AI Agent Mastery Course** | `/Users/Berzins/Desktop/AI/AI_Agent_Mastery_Course/ai-agent-mastery/5_Agent_Application` |

## Overview
Add admin and non-admin user roles to the existing UGOKI application, leveraging insights from the AI Agent Mastery Course implementation while respecting UGOKI's existing architecture.

### Decisions Made
- **Approach**: Hybrid (is_admin boolean + capabilities for granular permissions)
- **Admin Access**: Mobile app only (admin screens within existing app)
- **Role Tiers**: Simple admin + user (two-tier)
- **Initial Setup**: CLI command (future-proof for Supabase migration)
- **Future State**: UGOKI will adopt Supabase auth from `5_Agent_Application`

---

## Current State Analysis

### UGOKI (ugoki_1_0)
| Component | Implementation |
|-----------|----------------|
| Auth | JWT-based with refresh tokens |
| Identity Types | `AUTHENTICATED`, `ANONYMOUS`, `SYSTEM` |
| Authorization | Capability-based (features, not roles) |
| User Storage | `identities` table + separate profile tables |
| PII Handling | Isolated in profile module (GDPR-compliant) |

### AI Agent Mastery Course (5_Agent_Application)
| Component | Implementation |
|-----------|----------------|
| Auth | Supabase (email/password + OAuth) |
| Role System | Boolean `is_admin` field |
| Authorization | Database RLS with `is_admin()` function |
| Admin Features | User management dashboard, view all data |

---

## Admin Purpose in UGOKI

Based on UGOKI's existing user capabilities, admin users would manage:

| Domain | Admin Capability |
|--------|------------------|
| **User Management** | View all users, grant/revoke capabilities, toggle admin status |
| **Content Management** | Manage workouts, fasting plans, achievement definitions |
| **Analytics** | View aggregate user metrics, engagement stats |
| **AI Coach** | Monitor conversations, review AI responses |
| **System Config** | Rate limits, feature flags, maintenance mode |
| **Support** | View user data for support tickets (respecting PII isolation) |

---

## Implementation Approach: Hybrid

Combine boolean `is_admin` for core admin check with capabilities for granular permissions:

```
identities table:
├── is_admin: bool (core admin flag)
└── identity_type: AUTHENTICATED | ANONYMOUS | SYSTEM

capabilities table (for granular admin features):
├── "admin:users" - User management
├── "admin:content" - Content management
├── "admin:analytics" - View analytics
├── "admin:support" - Support access
└── "admin:system" - System configuration
```

**Why this approach:**
1. Fast `is_admin` check for admin routes
2. Granular capability checks for specific features
3. Future-proof for Supabase migration (same pattern as `5_Agent_Application`)
4. Capabilities allow time-bound or partial admin access later

---

## Implementation Steps

### Phase 1: Database Schema
1. Add `is_admin` column to `identities` table
2. Create migration file
3. Add database-level `is_admin()` function for RLS

### Phase 2: Backend Authorization
1. Create `get_admin_identity()` dependency in `auth.py`
2. Add `verify_admin()` helper function
3. Update identity service with `set_admin()` method
4. Add admin capability types to capabilities system

### Phase 3: Admin API Endpoints
1. `GET /api/v1/admin/users` - List all users
2. `GET /api/v1/admin/users/{id}` - Get user details
3. `PATCH /api/v1/admin/users/{id}` - Update user (including admin status)
4. `GET /api/v1/admin/analytics` - View system analytics
5. `GET /api/v1/admin/capabilities` - Manage user capabilities

### Phase 4: Mobile Admin Screens
1. Create `(admin)` route group in mobile app
2. Add admin route guard (check `is_admin`)
3. Build user management screen (list users, toggle admin)
4. Add capability management UI
5. Create simple analytics view

### Phase 5: Testing & Documentation
1. Unit tests for admin authorization
2. Integration tests for admin endpoints
3. Update SECURITY.md with admin guidelines
4. Document admin procedures

---

## Files to Modify

### Backend
- `/apps/api/src/modules/identity/orm.py` - Add `is_admin` field
- `/apps/api/src/modules/identity/models.py` - Add admin Pydantic models
- `/apps/api/src/modules/identity/service.py` - Add admin methods
- `/apps/api/src/modules/identity/interface.py` - Define admin interface
- `/apps/api/src/core/auth.py` - Add admin dependency
- `/apps/api/alembic/versions/` - New migration file

### New Files
- `/apps/api/src/modules/admin/` - Admin module (routes, service, interface)
- `/apps/api/src/cli/make_admin.py` - CLI tool for promoting users to admin
- `/apps/mobile/app/(admin)/` - Admin screens in mobile app
- `/apps/mobile/app/(admin)/_layout.tsx` - Admin layout with guard
- `/apps/mobile/app/(admin)/users.tsx` - User management screen
- `/apps/mobile/app/(admin)/analytics.tsx` - Analytics dashboard
- `/apps/mobile/shared/hooks/useAdmin.ts` - Admin status hook

### Documentation
- `/docs/standards/SECURITY.md` - Admin security guidelines
- `/docs/architecture/MODULES.md` - Admin module spec

---

## Security Considerations

1. **Principle of Least Privilege**: Default `is_admin = false` for all new users
2. **Audit Trail**: Log all admin actions to EVENT_JOURNAL
3. **No Self-Demotion Prevention**: Admins can demote themselves (recoverable via DB)
4. **Rate Limiting**: Stricter limits on admin endpoints
5. **PII Access Logging**: Track when admins view user PII

---

## Migration Strategy

### Database Migration (Alembic)
```python
# alembic/versions/xxxx_add_is_admin_column.py
def upgrade():
    op.add_column('identities', sa.Column('is_admin', sa.Boolean(), server_default='false'))

def downgrade():
    op.drop_column('identities', 'is_admin')
```

### CLI Tool for Admin Management
```python
# /apps/api/src/cli/make_admin.py
"""
Usage:
  python -m src.cli.make_admin --email user@example.com
  python -m src.cli.make_admin --identity-id <uuid>
  python -m src.cli.make_admin --list  # Show all admins
"""
```

This CLI approach:
- Works with current JWT auth
- Easily adaptable when migrating to Supabase
- Can be integrated into CI/CD for environment setup
- Provides audit trail via logging

---

## Verification Plan

1. **Unit Tests**: Test `is_admin` checks in auth dependencies
2. **Integration Tests**: Test admin endpoints return 403 for non-admins
3. **Manual Testing**:
   - Create user → verify `is_admin=false`
   - Run CLI → verify `is_admin=true`
   - Access admin screens → verify proper authorization
   - Test admin cannot demote themselves to avoid lockout

---

## Supabase Migration Notes

When UGOKI adopts Supabase auth from `5_Agent_Application`:

1. `is_admin` field moves to `user_profiles` table (Supabase pattern)
2. CLI tool replaced with Supabase RLS `is_admin()` function
3. Mobile admin screens remain unchanged (just API calls change)
4. Same two-tier admin/user model preserved

---

## Current Status (January 2026)

**NOT CURRENTLY IMPLEMENTED** - This plan is scheduled for post-MVP development.

### Current User System
The UGOKI app (MVP) uses a simpler identity model:
- **Identity Types:** AUTHENTICATED, ANONYMOUS, SYSTEM
- **No Admin Roles:** All authenticated users are equal
- **Authorization:** Capability-based (features), not role-based

### When Admin Roles Will Be Needed
- User management dashboard
- Content management workflows
- Analytics and reporting
- Support/customer service features

### Next Steps for Implementation
1. Complete MVP launch and gather user feedback
2. Determine admin feature prioritization
3. Review this plan against evolved architecture
4. Implement after MVP validation

### Known Considerations for Future Implementation
- [ ] Review integration with existing `IdentityType.SYSTEM`
- [ ] Determine if `is_admin` should be on `identities` or `user_profiles` table
- [ ] Consider using existing capabilities table exclusively vs hybrid approach
- [ ] Align with planned Supabase migration timeline when applicable
- [ ] Consider authorization patterns from recent AI Coach session management improvements
