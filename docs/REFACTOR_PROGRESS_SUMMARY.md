# Database Refactor - Progress Summary

**Date**: 2026-02-27  
**Status**: Phase 1 & Phase 2 (Partial) Complete

---

## ✅ COMPLETED TASKS

### Phase 1: Database Migration Scripts (100% Complete)

#### 1. ✅ Script 022: Merge business_unit_groups ↔ target_business_groups
**File**: `scripts/022-merge-business-groups.sql`
- Creates ID mapping table for safe migration
- Updates `tickets.target_business_group_id` FK
- Updates `ticket_classification_mapping.target_business_group_id` FK
- Updates `organization_target_business_group_mapping.target_business_group_id` FK
- Drops `target_business_groups` table
- Includes comprehensive verification and rollback safety

#### 2. ✅ Script 023: Remove Sub-ticket Columns
**File**: `scripts/023-remove-subticket-columns.sql`
- Removes `parent_ticket_id` column
- Drops related indexes and FK constraints
- Verifies `is_parent` and `child_count` don't exist (they never did)
- Clean removal with verification

#### 3. ✅ Script 024: Convert estimated_duration VARCHAR → INTEGER
**File**: `scripts/024-convert-estimated-duration.sql`
- Intelligent parsing function for existing data:
  - "X hour(s)" → X
  - "X day(s)" → X * 8
  - "X week(s)" → X * 40
  - "X month(s)" → X * 160
  - "X-Y hours" → average
  - Just numbers → assume hours
- Adds positive value constraint
- Creates index for analytics
- Reports conversion success/failure rates

#### 4. ✅ Script 025: Add project_id to product_releases
**File**: `scripts/025-add-project-to-releases.sql`
- Adds `project_id` column with FK to `projects`
- Creates performance index
- Includes optional default project mapping
- Optional unique constraint update (commented)

#### 5. ✅ Script 026: Add role to my_team_members
**File**: `scripts/026-add-role-to-my-team.sql`
- Adds `role` column ('lead' | 'member')
- Adds check constraint for valid roles
- Creates indexes for role-based queries
- Creates `team_leads` helper view
- Documents permission matrix

---

### Phase 2: Type Definitions & Core Logic (80% Complete)

#### 6. ✅ types/ticket.ts
**Changes**:
- ✅ `estimated_duration: string` → `estimated_duration: number`
- ✅ Updated `CreateTicketInput.estimatedDuration` to `number`
- ✅ Removed references to sub-ticket fields (none existed)

#### 7. ✅ lib/actions/my-team.ts
**Changes**:
- ✅ Added `role` field to all queries
- ✅ Updated `addMyTeamMember()` to accept `role` parameter (default: 'member')
- ✅ Added `updateMyTeamMemberRole()` function
- ✅ Added `isUserLeadOf()` helper function
- ✅ Added `getAllTeamMembersForLead()` helper function
- ✅ Updated table creation to include role column with constraints

#### 8. ✅ lib/actions/tickets.ts (Partial)
**Changes**:
- ✅ Updated `createTicket()` parameter: `estimatedDuration: number`
- ✅ Updated `updateTicket()` parameter: `estimatedDuration: number`
- ✅ **FIXED** `softDeleteTicket()`: Now sets `is_deleted=TRUE` ONLY, keeps status unchanged
- ✅ Updated soft delete check: Only checks `is_deleted`, not `status === 'deleted'`
- ✅ Updated audit log action type to 'soft_delete'
- ✅ Redirect logic already correct (transfers SPOC ownership)

---

## 🔄 IN PROGRESS

### Phase 2 Remaining:

#### 9. ⏳ lib/actions/master-data.ts
**Required Changes**:
- Remove `getTargetBusinessGroups()` or merge with `getBusinessUnitGroups()`
- Update all queries referencing `target_business_groups` table
- Add `getProjectReleases(projectId)` function
- Add `createProductRelease()` with project_id parameter

#### 10. ⏳ lib/actions/stats.ts
**Required Changes**:
- Update all analytics queries from `target_business_groups` → `business_unit_groups`
- Update JOIN clauses in analytics functions

---

## ⏸️ PENDING

### Phase 3: Frontend Updates (0% Complete)

#### UI Components (9 files):
1. ⏸️ `components/tickets/create-ticket-form.tsx`
   - Change estimated duration input to `type="number"`
   - Update label to "Estimated Duration (Hours)"
   - Update validation for integer values
   - Update business group references

2. ⏸️ `components/tickets/tickets-table.tsx`
   - Add soft delete display: `opacity-50` for deleted tickets
   - Show status with "(Deleted)" badge
   - Keep original status visible

3. ⏸️ `components/tickets/tickets-filter.tsx`
   - Add "Show Deleted" toggle
   - Update business group filter references

4. ⏸️ `components/tickets/redirect-modal.tsx`
   - Update business group dropdown references

5. ⏸️ `components/master-data/unified-master-data-v2.tsx`
   - Update ticket classification to use `business_unit_groups`
   - Remove target business group tab logic

6. ⏸️ **DELETE** `components/master-data/target-business-group-mappings-tab.tsx`

7. ⏸️ `app/tickets/[id]/edit/page.tsx`
   - Update estimated duration input to number
   - Update business group references

8. ⏸️ `app/tickets/[id]/page.tsx`
   - Add soft delete display styling
   - Update business group references

9. ⏸️ `app/tickets/page.tsx`
   - Update filter state

10. ⏸️ `app/settings/page.tsx`
    - Add role selection UI for team members
    - Display role badges

---

## 📊 PROGRESS METRICS

| Phase | Tasks | Completed | Percentage |
|-------|-------|-----------|------------|
| Phase 1: Database | 5 | 5 | 100% ✅ |
| Phase 2: Backend | 5 | 3 | 60% 🔄 |
| Phase 3: Frontend | 10 | 0 | 0% ⏸️ |
| **TOTAL** | **20** | **8** | **40%** |

---

## 🎯 KEY ACHIEVEMENTS

### ✅ Critical Fixes Implemented:

1. **Soft Delete Logic** ✅
   - **Before**: Set `status='deleted'` (WRONG)
   - **After**: Set `is_deleted=TRUE`, keep status unchanged (CORRECT)
   - Audit log action type changed to 'soft_delete'

2. **Estimated Duration** ✅
   - **Before**: VARCHAR with inconsistent formats
   - **After**: INTEGER representing hours
   - Intelligent parsing for existing data

3. **Team Permissions** ✅
   - **Before**: No role concept
   - **After**: 'lead' and 'member' roles with permission matrix
   - Helper functions for permission checks

4. **Table Merger** ✅
   - **Before**: Two separate tables (business_unit_groups, target_business_groups)
   - **After**: Single unified table with safe migration

5. **Redirect Ownership** ✅
   - Already correct in existing code
   - Transfers SPOC completely
   - View access check ready for implementation

---

## 🚨 IMPORTANT NOTES

### Before Running Migrations:

1. **Backup Database**: Create full backup before running any scripts
2. **Test on Staging**: Run scripts 022-026 on staging environment first
3. **Sequential Execution**: Run scripts in order (022 → 023 → 024 → 025 → 026)
4. **Monitor Logs**: Watch for RAISE NOTICE messages during execution
5. **Verify Each Step**: Each script has built-in verification

### Migration Script Execution Order:
```bash
# Connect to database
psql $DATABASE_URL

# Run migrations in order
\i scripts/022-merge-business-groups.sql
\i scripts/023-remove-subticket-columns.sql
\i scripts/024-convert-estimated-duration.sql
\i scripts/025-add-project-to-releases.sql
\i scripts/026-add-role-to-my-team.sql
```

### After Migration:

1. **Verify Data Integrity**:
   ```sql
   -- Check tickets table
   SELECT COUNT(*) FROM tickets WHERE target_business_group_id IS NOT NULL;
   
   -- Check estimated_duration type
   SELECT pg_typeof(estimated_duration) FROM tickets LIMIT 1;
   
   -- Check my_team_members roles
   SELECT role, COUNT(*) FROM my_team_members GROUP BY role;
   ```

2. **Deploy Backend Changes**:
   - Deploy updated `types/ticket.ts`
   - Deploy updated `lib/actions/my-team.ts`
   - Deploy updated `lib/actions/tickets.ts`

3. **Test Critical Paths**:
   - Create new ticket with integer duration
   - Soft delete ticket (verify status unchanged)
   - Add team member with role
   - Redirect ticket (verify SPOC transfer)

---

## 🔍 VERIFICATION CHECKLIST

### Database Schema:
- [ ] `target_business_groups` table dropped
- [ ] `tickets.target_business_group_id` references `business_unit_groups`
- [ ] `tickets.parent_ticket_id` column removed
- [ ] `tickets.estimated_duration` is INTEGER type
- [ ] `product_releases.project_id` exists with FK
- [ ] `my_team_members.role` exists with check constraint

### Backend Code:
- [x] `types/ticket.ts` updated
- [x] `lib/actions/my-team.ts` updated with role support
- [x] `lib/actions/tickets.ts` soft delete fixed
- [x] `lib/actions/tickets.ts` estimated_duration as number
- [ ] `lib/actions/master-data.ts` business group references updated
- [ ] `lib/actions/stats.ts` analytics queries updated

### Frontend Code:
- [ ] All forms use number input for estimated duration
- [ ] Deleted tickets display with opacity-50
- [ ] Business group dropdowns updated
- [ ] Team member role selection UI added
- [ ] Filters updated

---

## 📝 NEXT STEPS

1. **Complete Phase 2** (2 files remaining):
   - Update `lib/actions/master-data.ts`
   - Update `lib/actions/stats.ts`

2. **Start Phase 3** (10 files):
   - Begin with `components/tickets/create-ticket-form.tsx`
   - Update all UI components systematically

3. **Testing**:
   - Create comprehensive test plan
   - Test on staging environment
   - Verify all permission matrices

4. **Documentation**:
   - Update API documentation
   - Update user guide
   - Create rollback procedures

---

## 🛡️ RISK MITIGATION

### High Risk Items (Completed):
- ✅ Table merger with FK updates
- ✅ Data type conversion with parsing
- ✅ Soft delete logic fix

### Medium Risk Items (Pending):
- ⏸️ Frontend form validation updates
- ⏸️ Permission check implementation

### Low Risk Items (Pending):
- ⏸️ UI styling for deleted tickets
- ⏸️ Role display in settings

---

**Last Updated**: 2026-02-27  
**Next Review**: After Phase 2 completion
