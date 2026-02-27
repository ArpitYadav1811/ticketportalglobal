# Database Refactor Analysis & Implementation Plan

## Executive Summary
This document provides a comprehensive analysis of the database schema refactor based on finalized client requirements. The refactor includes table mergers, column removals, data type changes, and logic updates.

---

## Current Database Schema Analysis

### Core Tables
1. **tickets** - Main ticket tracking table
2. **users** - User management
3. **business_unit_groups** - Business unit groups (initiator groups)
4. **target_business_groups** - Target business groups (assignee groups) **[TO BE MERGED]**
5. **projects** - Project master data
6. **product_releases** - Product release planning
7. **my_team_members** - Personal team management
8. **categories** - Ticket categories
9. **subcategories** - Ticket subcategories
10. **ticket_classification_mapping** - Maps categories to business groups
11. **organizations** - Functional areas
12. **organization_target_business_group_mapping** - Org to TBG mapping
13. **comments** - Ticket comments
14. **attachments** - Ticket attachments
15. **ticket_audit_log** - Audit trail

### Current Tickets Table Structure
```sql
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(50) UNIQUE NOT NULL,
  ticket_number INTEGER,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  ticket_type VARCHAR(50) NOT NULL DEFAULT 'support',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  
  -- Category fields
  category_id INTEGER REFERENCES categories(id),
  subcategory_id INTEGER REFERENCES subcategories(id),
  
  -- User assignments
  created_by INTEGER NOT NULL REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  spoc_user_id INTEGER REFERENCES users(id),
  closed_by INTEGER REFERENCES users(id),
  hold_by INTEGER REFERENCES users(id),
  
  -- Business group fields
  business_unit_group_id INTEGER REFERENCES business_unit_groups(id), -- Initiator group
  target_business_group_id INTEGER REFERENCES target_business_groups(id), -- Target group
  assignee_group_id INTEGER REFERENCES business_unit_groups(id), -- Assignee's group
  
  -- Project and release fields
  project_name VARCHAR(255),
  project_id INTEGER REFERENCES projects(id),
  product_release_name VARCHAR(255),
  estimated_release_date DATE,
  estimated_duration VARCHAR(50), -- **TO BE CHANGED TO INTEGER**
  
  -- Redirection fields
  redirected_from_business_unit_group_id INTEGER REFERENCES business_unit_groups(id),
  redirected_from_spoc_user_id INTEGER REFERENCES users(id),
  redirection_remarks TEXT,
  redirected_at TIMESTAMP,
  
  -- Sub-ticket fields **TO BE REMOVED**
  parent_ticket_id INTEGER REFERENCES tickets(id),
  is_internal BOOLEAN DEFAULT FALSE,
  
  -- Soft delete fields
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  hold_at TIMESTAMP
);
```

---

## Required Changes

### 1. Table Merger: business_unit_groups ↔ target_business_groups

**Problem**: Two separate tables exist for the same concept.

**Solution**: Merge `target_business_groups` into `business_unit_groups`.

**Impact**:
- ✅ **tickets.target_business_group_id** → FK to `business_unit_groups`
- ✅ **ticket_classification_mapping.target_business_group_id** → FK to `business_unit_groups`
- ✅ **organization_target_business_group_mapping.target_business_group_id** → FK to `business_unit_groups`
- ✅ **users.business_unit_group_id** → Already references `business_unit_groups`
- ❌ **DROP TABLE target_business_groups** after migration

**Migration Steps**:
1. Ensure all `business_unit_groups` exist in `target_business_groups` (already done via script 017)
2. Update FK constraints in `tickets` table
3. Update FK constraints in `ticket_classification_mapping` table
4. Update FK constraints in `organization_target_business_group_mapping` table
5. Drop `target_business_groups` table
6. Rename column `target_business_group_id` → `target_business_unit_group_id` (optional for clarity)

---

### 2. Schema Cleanup: Remove Sub-ticket Columns

**Columns to Remove**:
- `parent_ticket_id`
- Any related indexes

**Note**: `is_parent` and `child_count` were never added to the schema (confirmed via grep search).

**Impact**:
- Remove from tickets table
- Remove from TypeScript types
- Remove from UI components
- Remove from API logic

---

### 3. Data Standardization: estimated_duration VARCHAR → INTEGER

**Current**: `estimated_duration VARCHAR(50)` (stores values like "2 hours", "1 day", etc.)

**New**: `estimated_duration INTEGER` (stores hours as integer)

**Migration Strategy**:
1. Add new column `estimated_duration_hours INTEGER`
2. Parse existing VARCHAR data and convert to hours:
   - "1 hour" → 1
   - "2 hours" → 2
   - "1 day" → 8
   - "2 days" → 16
   - NULL or unparseable → NULL
3. Drop old `estimated_duration` column
4. Rename `estimated_duration_hours` → `estimated_duration`

**UI Changes**:
- Update form labels to "Estimated Duration (Hours)"
- Change input type to number
- Update validation to accept integers only

---

### 4. Project-Release Mapping

**Current**: `product_releases` table has no FK to `projects`

**Required**: Link releases to specific projects

**New Schema**:
```sql
ALTER TABLE product_releases
ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
```

**UI Changes**:
- Project creation/edit: Allow adding releases
- Ticket form: Filter releases by selected project

---

### 5. Soft Delete Logic Update

**Current Implementation**:
```sql
UPDATE tickets
SET is_deleted = TRUE, 
    status = 'deleted',
    deleted_at = CURRENT_TIMESTAMP
WHERE id = ${ticketId}
```

**Required Implementation**:
```sql
UPDATE tickets
SET is_deleted = TRUE,
    deleted_at = CURRENT_TIMESTAMP
WHERE id = ${ticketId}
-- DO NOT change status field
```

**UI Changes**:
- Deleted tickets: Display with `opacity-50` and `disabled` state
- Keep original status visible (e.g., "Open (Deleted)")
- Filter: Add "Show Deleted" toggle

---

### 6. Redirection Ownership Transfer

**Current Logic**:
```typescript
// Updates SPOC but keeps old SPOC in redirected_from_spoc_user_id
UPDATE tickets
SET spoc_user_id = ${newSpocId},
    redirected_from_spoc_user_id = ${oldSpocId}
```

**Required Logic**:
- **Complete ownership transfer**: New SPOC gets full control
- **View access for old SPOC**: Only if they are in `my_team_members` with the new SPOC

**Permission Matrix**:
| Action | Old SPOC (not in team) | Old SPOC (in team) | New SPOC |
|--------|------------------------|-------------------|----------|
| View | ❌ | ✅ | ✅ |
| Edit | ❌ | ❌ | ✅ |
| Comment | ❌ | ✅ | ✅ |
| Redirect | ❌ | ❌ | ✅ |

**Implementation**:
- Update `redirectTicket()` function (already transfers SPOC correctly)
- Update permission checks in `getTickets()` to filter by team membership
- Update `canUserEditTicket()` helper function

---

### 7. my_team_members Permissions

**Current**: `my_team_members` table has no "Lead" role concept

**Required**: Add role-based permissions

**New Schema**:
```sql
ALTER TABLE my_team_members
ADD COLUMN role VARCHAR(50) DEFAULT 'member';
-- Possible values: 'lead', 'member'
```

**Permission Matrix**:
| Action | Lead (not SPOC) | Lead (is SPOC) | Member |
|--------|----------------|----------------|--------|
| View tickets | ✅ | ✅ | ❌ |
| Add comments | ✅ | ✅ | ❌ |
| Add attachments | ✅ | ✅ | ❌ |
| Edit ticket fields | ❌ | ✅ | ❌ |
| Change status | ❌ | ✅ | ❌ |

---

### 8. Data Integrity: project_name vs project_id

**Current**: Both `project_name` and `project_id` exist in tickets table

**Required**: Keep both for backward compatibility and filtering

**Strategy**:
- **Primary source**: `project_id` for joins
- **Denormalized field**: `project_name` for quick filtering and display
- **On ticket creation**: Set both fields
- **On project name change**: Update `project_name` in tickets (optional background job)

---

## Files Requiring Changes

### Migration Scripts (New)
1. ✅ **`scripts/022-merge-business-groups.sql`** - Merge target_business_groups into business_unit_groups
2. ✅ **`scripts/023-remove-subticket-columns.sql`** - Remove parent_ticket_id
3. ✅ **`scripts/024-convert-estimated-duration.sql`** - Change VARCHAR to INTEGER
4. ✅ **`scripts/025-add-project-to-releases.sql`** - Add project_id to product_releases
5. ✅ **`scripts/026-add-role-to-my-team.sql`** - Add role column to my_team_members

### Action Files (lib/actions/)
6. ✅ **`lib/actions/tickets.ts`**
   - Update `getTickets()` - Remove target_business_groups references
   - Update `getTicketById()` - Update joins
   - Update `createTicket()` - Use business_unit_groups, handle estimated_duration as INTEGER
   - Update `updateTicket()` - Handle estimated_duration as INTEGER
   - Update `softDeleteTicket()` - Remove status='deleted' logic
   - Update `redirectTicket()` - Already correct, but add team membership check
   - Add `canUserViewTicket()` helper for team-based permissions
   - Add `canUserEditTicket()` helper for SPOC/Lead permissions

7. ✅ **`lib/actions/master-data.ts`**
   - Update `getTargetBusinessGroups()` → Rename to `getBusinessUnitGroups()` or merge logic
   - Update `getTicketClassificationMapping()` - Update joins
   - Update `createTicketClassificationMapping()` - Use business_unit_groups
   - Update `getOrganizationMappings()` - Update joins
   - Add `getProjectReleases(projectId)` - Filter releases by project
   - Add `createProductRelease()` - Include project_id

8. ✅ **`lib/actions/my-team.ts`**
   - Update `getMyTeamMembers()` - Include role
   - Update `addMyTeamMember()` - Accept role parameter
   - Add `updateMyTeamMemberRole()` - Change member role
   - Add `isUserLeadOf()` helper - Check if user is lead of another user

9. ✅ **`lib/actions/stats.ts`**
   - Update `getAnalyticsData()` - Update joins from target_business_groups to business_unit_groups
   - Update `getTicketsByBusinessUnit()` - Update table references

### UI Components (components/)
10. ✅ **`components/tickets/create-ticket-form.tsx`**
    - Update Target Business Group dropdown to use `business_unit_groups`
    - Change estimated duration to number input with "Hours" label
    - Add project-filtered release dropdown

11. ✅ **`components/tickets/tickets-table.tsx`**
    - Update soft delete display (opacity-50, show status)
    - Update column references

12. ✅ **`components/tickets/tickets-filter.tsx`**
    - Update Target Business Group filter
    - Add "Show Deleted" toggle

13. ✅ **`components/tickets/redirect-modal.tsx`**
    - Update Target Business Group dropdown

14. ✅ **`components/master-data/unified-master-data-v2.tsx`**
    - Update ticket classification mapping to use business_unit_groups
    - Remove target business group tab references

15. ✅ **`components/master-data/target-business-group-mappings-tab.tsx`**
    - **DELETE THIS FILE** (no longer needed)

### Page Files (app/)
16. ✅ **`app/tickets/[id]/edit/page.tsx`**
    - Update estimated duration input to number type
    - Update business group references

17. ✅ **`app/tickets/[id]/page.tsx`**
    - Update soft delete display
    - Update business group references
    - Add team-based permission checks

18. ✅ **`app/tickets/page.tsx`**
    - Update filter state for business groups

19. ✅ **`app/settings/page.tsx`**
    - Add role selection for my_team_members
    - Update team member display to show role

### Type Definitions (types/)
20. ✅ **`types/ticket.ts`**
    - Remove `parent_ticket_id`, `parent_id`, `is_parent`, `child_count`
    - Change `estimated_duration: string` → `estimated_duration: number`
    - Update `target_business_group_id` references

21. ✅ **`types/master-data.ts`** (if exists)
    - Merge TargetBusinessGroup type into BusinessUnitGroup

### Database Utility (lib/)
22. ✅ **`lib/db.ts`**
    - No changes required (connection logic)

---

## Migration Execution Order

### Phase 1: Schema Changes (Database)
```bash
# Run in order:
1. scripts/022-merge-business-groups.sql
2. scripts/023-remove-subticket-columns.sql
3. scripts/024-convert-estimated-duration.sql
4. scripts/025-add-project-to-releases.sql
5. scripts/026-add-role-to-my-team.sql
```

### Phase 2: Backend Updates (API/Actions)
```bash
# Update in order:
1. types/ticket.ts (type definitions first)
2. lib/actions/my-team.ts (permissions foundation)
3. lib/actions/tickets.ts (core ticket logic)
4. lib/actions/master-data.ts (master data)
5. lib/actions/stats.ts (analytics)
```

### Phase 3: Frontend Updates (UI)
```bash
# Update in order:
1. components/tickets/create-ticket-form.tsx
2. components/tickets/tickets-table.tsx
3. components/tickets/tickets-filter.tsx
4. components/tickets/redirect-modal.tsx
5. components/master-data/unified-master-data-v2.tsx
6. app/tickets/[id]/edit/page.tsx
7. app/tickets/[id]/page.tsx
8. app/tickets/page.tsx
9. app/settings/page.tsx
```

### Phase 4: Cleanup
```bash
# Delete obsolete files:
1. components/master-data/target-business-group-mappings-tab.tsx
2. Any other target_business_groups references
```

---

## Risk Assessment

### High Risk
- ❗ **Table merger**: FK constraint updates could fail if data integrity issues exist
- ❗ **estimated_duration conversion**: Data loss if VARCHAR contains unparseable values

### Medium Risk
- ⚠️ **Soft delete logic**: Existing queries may filter by status='deleted'
- ⚠️ **Permission changes**: Could break existing access patterns

### Low Risk
- ✅ **Project-release mapping**: Additive change, no data loss
- ✅ **my_team_members role**: Additive change, defaults to 'member'

---

## Rollback Strategy

### Database Rollback Scripts
Create inverse migrations for each script:
- `022-rollback-merge-business-groups.sql`
- `023-rollback-remove-subticket-columns.sql`
- `024-rollback-convert-estimated-duration.sql`
- `025-rollback-add-project-to-releases.sql`
- `026-rollback-add-role-to-my-team.sql`

### Code Rollback
- Use Git to revert commits
- Feature flags for gradual rollout

---

## Testing Checklist

### Database Tests
- [ ] Verify all FKs point to correct tables
- [ ] Verify data integrity after merger
- [ ] Verify estimated_duration conversion accuracy
- [ ] Verify no orphaned records

### API Tests
- [ ] Test ticket creation with new schema
- [ ] Test ticket update with INTEGER estimated_duration
- [ ] Test soft delete (is_deleted=true, status unchanged)
- [ ] Test redirect with team membership checks
- [ ] Test my_team_members with Lead role

### UI Tests
- [ ] Test business group dropdowns
- [ ] Test estimated duration input (numbers only)
- [ ] Test soft deleted ticket display (opacity-50)
- [ ] Test project-filtered release dropdown
- [ ] Test team member role selection

### Permission Tests
- [ ] Test Lead can comment on team member tickets
- [ ] Test Lead cannot edit ticket fields (unless SPOC)
- [ ] Test old SPOC loses access after redirect (unless in team)
- [ ] Test new SPOC gains full control after redirect

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Schema | 2 hours | Database backup |
| Phase 2: Backend | 4 hours | Phase 1 complete |
| Phase 3: Frontend | 6 hours | Phase 2 complete |
| Phase 4: Testing | 4 hours | Phase 3 complete |
| **Total** | **16 hours** | Sequential |

---

## Success Criteria

✅ All migration scripts run without errors
✅ No linter errors in updated files
✅ All existing tickets display correctly
✅ New tickets can be created with INTEGER estimated_duration
✅ Soft deleted tickets display with opacity-50
✅ Redirected tickets transfer SPOC ownership correctly
✅ Lead role permissions work as specified
✅ Project-release filtering works
✅ All tests pass

---

## Next Steps

1. ✅ Review this analysis document
2. ⏳ Create migration scripts (Phase 1)
3. ⏳ Update backend code (Phase 2)
4. ⏳ Update frontend code (Phase 3)
5. ⏳ Test thoroughly (Phase 4)
6. ⏳ Deploy to production

---

**Document Version**: 1.0
**Created**: 2026-02-27
**Author**: Senior Full-Stack Developer & Database Architect
