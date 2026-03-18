# Database Refactoring Migration Checklist

Use this checklist to track your migration progress.

---

## Pre-Migration

- [ ] Read `DATABASE_REFACTORING_GUIDE.md` completely
- [ ] Review all SQL scripts in `scripts/refactoring/` folder
- [ ] Understand the new entity structure (`ENTITY_DIAGRAM.md`)
- [ ] Set up staging environment that mirrors production
- [ ] Create database backup:
  ```bash
  pg_dump -U postgres -d ticketportal > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup is valid:
  ```bash
  pg_restore --list backup_*.sql | head -20
  ```
- [ ] Notify team about upcoming migration
- [ ] Schedule maintenance window (if needed)

---

## Phase 1: Create New Entity Tables

Run scripts 001-006 to create new tables:

- [ ] `001-create-ticket-audit-events.sql`
  - Creates: `ticket_audit_events` table
  - Creates: `ticket_event_type` enum
  - Verify: `SELECT COUNT(*) FROM ticket_audit_events;` (should be 0)

- [ ] `002-create-ticket-projects.sql`
  - Creates: `ticket_projects` table
  - Verify: `SELECT COUNT(*) FROM ticket_projects;` (should be 0)

- [ ] `003-create-ticket-redirections.sql`
  - Creates: `ticket_redirections` table
  - Verify: `SELECT COUNT(*) FROM ticket_redirections;` (should be 0)

- [ ] `004-create-ticket-hierarchy.sql`
  - Creates: `ticket_hierarchy` table
  - Verify: `SELECT COUNT(*) FROM ticket_hierarchy;` (should be 0)

- [ ] `005-create-business-group-spocs.sql`
  - Creates: `business_group_spocs` table
  - Creates: `spoc_type` enum
  - Verify: `SELECT COUNT(*) FROM business_group_spocs;` (should be 0)

- [ ] `006-create-master-data-entities.sql`
  - Creates: `ticket_statuses`, `ticket_priorities`, `ticket_types`, `user_roles`, `user_role_assignments`
  - Seeds initial data
  - Verify: 
    ```sql
    SELECT 'statuses' as table_name, COUNT(*) FROM ticket_statuses
    UNION ALL SELECT 'priorities', COUNT(*) FROM ticket_priorities
    UNION ALL SELECT 'types', COUNT(*) FROM ticket_types
    UNION ALL SELECT 'roles', COUNT(*) FROM user_roles;
    ```
  - Expected: statuses=7, priorities=4, types=4, roles=5

**Phase 1 Verification**:
```sql
-- All new tables should exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
  'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
  'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
);
-- Expected: 10 rows
```

---

## Phase 2: Add New Columns to Tickets

- [ ] `007-refactor-tickets-table.sql`
  - Adds: `status_id`, `priority_id`, `type_id` columns to tickets
  - Creates indexes on new columns
  - Verify:
    ```sql
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name IN ('status_id', 'priority_id', 'type_id');
    ```
  - Expected: 3 rows

**Phase 2 Verification**:
```sql
-- New columns should exist and be NULL (not migrated yet)
SELECT 
  COUNT(*) as total_tickets,
  COUNT(status_id) as with_status_id,
  COUNT(priority_id) as with_priority_id,
  COUNT(type_id) as with_type_id
FROM tickets;
-- Expected: total_tickets > 0, others = 0
```

---

## Phase 3: Migrate Data to New Tables

Run scripts 008-013 to migrate data:

- [ ] `008-migrate-ticket-audit-data.sql`
  - Migrates: Audit events from tickets to ticket_audit_events
  - Verify:
    ```sql
    SELECT event_type::TEXT, COUNT(*) 
    FROM ticket_audit_events 
    GROUP BY event_type 
    ORDER BY COUNT(*) DESC;
    ```
  - Expected: Multiple event types with counts

- [ ] `009-migrate-ticket-projects-data.sql`
  - Migrates: Project data from tickets to ticket_projects
  - Verify:
    ```sql
    SELECT 
      COUNT(*) as total,
      COUNT(project_id) as with_project,
      COUNT(product_release_id) as with_release
    FROM ticket_projects;
    ```
  - Expected: Counts match tickets with project data

- [ ] `010-migrate-ticket-redirections-data.sql`
  - Migrates: Redirection history from tickets to ticket_redirections
  - Verify:
    ```sql
    SELECT COUNT(*) FROM ticket_redirections;
    ```
  - Expected: Count matches tickets with redirected_at IS NOT NULL

- [ ] `011-migrate-ticket-hierarchy-data.sql`
  - Migrates: Parent-child relationships to ticket_hierarchy
  - Verify:
    ```sql
    SELECT COUNT(*) FROM ticket_hierarchy;
    ```
  - Expected: Count matches tickets with parent_ticket_id IS NOT NULL

- [ ] `012-migrate-business-group-spocs-data.sql`
  - Migrates: SPOC assignments from strings to business_group_spocs
  - Verify:
    ```sql
    SELECT spoc_type::TEXT, COUNT(*) 
    FROM business_group_spocs 
    WHERE is_active = true
    GROUP BY spoc_type;
    ```
  - Expected: primary, secondary, functional_area with counts
  - Check for unmapped SPOCs:
    ```sql
    SELECT bg.name, bg.primary_spoc_name
    FROM business_unit_groups bg
    LEFT JOIN business_group_spocs bgs ON bgs.business_group_id = bg.id AND bgs.spoc_type = 'primary'
    WHERE bg.primary_spoc_name IS NOT NULL AND bgs.id IS NULL;
    ```
  - Expected: 0 rows (all SPOCs mapped)

- [ ] `013-migrate-master-data-references.sql`
  - Migrates: status, priority, type from VARCHAR to FK
  - Verify:
    ```sql
    SELECT 
      COUNT(*) as total_tickets,
      COUNT(status_id) as with_status_id,
      COUNT(priority_id) as with_priority_id,
      COUNT(type_id) as with_type_id
    FROM tickets;
    ```
  - Expected: All counts equal (all tickets have FKs)
  - Check for unmapped values:
    ```sql
    SELECT COUNT(*) FROM tickets WHERE status_id IS NULL;
    SELECT COUNT(*) FROM tickets WHERE priority_id IS NULL;
    SELECT COUNT(*) FROM tickets WHERE type_id IS NULL;
    ```
  - Expected: All 0

**Phase 3 Verification**:
```sql
-- Compare old and new data
SELECT 
  'Tickets' as entity,
  COUNT(*) as count
FROM tickets
UNION ALL
SELECT 'Audit Events', COUNT(*) FROM ticket_audit_events
UNION ALL
SELECT 'Projects', COUNT(*) FROM ticket_projects
UNION ALL
SELECT 'Redirections', COUNT(*) FROM ticket_redirections
UNION ALL
SELECT 'Hierarchy', COUNT(*) FROM ticket_hierarchy
UNION ALL
SELECT 'SPOCs', COUNT(*) FROM business_group_spocs
UNION ALL
SELECT 'Role Assignments', COUNT(*) FROM user_role_assignments;
```

---

## Phase 4: Create Helper Functions

- [ ] `014-helper-functions.sql`
  - Creates database functions and views
  - Verify:
    ```sql
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name LIKE '%spoc%' OR routine_name LIKE '%ticket%'
    ORDER BY routine_name;
    ```
  - Expected: Multiple functions listed

**Phase 4 Verification**:
```sql
-- Test helper functions
SELECT * FROM get_primary_spoc(1);
SELECT * FROM get_all_spocs(1);
SELECT is_user_spoc(1, 1);
SELECT * FROM tickets_with_full_details LIMIT 5;
SELECT * FROM business_groups_with_spocs LIMIT 5;
```

---

## Phase 5: Update Application Code

- [ ] Update TypeScript types
  - [ ] Import types from `types/entities.ts`
  - [ ] Update components to use new types
  - [ ] Remove references to legacy types where possible

- [ ] Update server actions
  - [ ] Import functions from `lib/actions/entities/`
  - [ ] Update `lib/actions/tickets.ts` to use entity functions
  - [ ] Update `lib/actions/stats.ts` for analytics
  - [ ] Update `lib/actions/master-data.ts` for SPOC functions
  - [ ] Update `lib/actions/permissions.ts`

- [ ] Update frontend components
  - [ ] Update ticket detail pages
  - [ ] Update ticket forms
  - [ ] Update analytics dashboards
  - [ ] Update SPOC management UI
  - [ ] Update master data management pages

- [ ] Update API endpoints
  - [ ] Update ticket CRUD endpoints
  - [ ] Update analytics endpoints
  - [ ] Update SPOC management endpoints

---

## Phase 6: Testing

### Unit Tests

- [ ] Test ticket audit event creation
- [ ] Test SPOC assignment functions
- [ ] Test ticket project linking
- [ ] Test ticket hierarchy operations
- [ ] Test master data queries

### Integration Tests

- [ ] Test ticket creation with audit event
- [ ] Test ticket redirection with history
- [ ] Test SPOC permissions (primary vs secondary)
- [ ] Test ticket with project association
- [ ] Test parent-child ticket relationships

### Data Integrity Tests

- [ ] Verify no NULL values in critical FK columns
- [ ] Verify no orphaned records in new tables
- [ ] Verify all SPOCs mapped correctly
- [ ] Verify all statuses/priorities/types mapped
- [ ] Verify audit events match ticket history

### Performance Tests

- [ ] Compare query performance before/after
- [ ] Test analytics queries with new structure
- [ ] Test ticket list queries
- [ ] Test SPOC lookup queries
- [ ] Monitor database CPU/memory usage

### End-to-End Tests

- [ ] Create new ticket (full flow)
- [ ] Update ticket status (check audit event)
- [ ] Redirect ticket (check redirection history)
- [ ] Assign SPOC (check SPOC table)
- [ ] Create subtask (check hierarchy)

---

## Phase 7: Deployment

### Staging Deployment

- [ ] Deploy database migrations to staging
- [ ] Deploy application code to staging
- [ ] Run all tests on staging
- [ ] Verify data integrity on staging
- [ ] Monitor staging for 24-48 hours
- [ ] Fix any issues found

### Production Deployment

- [ ] Schedule maintenance window
- [ ] Notify users of downtime (if applicable)
- [ ] Create production backup
- [ ] Deploy database migrations to production
- [ ] Verify migration success
- [ ] Deploy application code to production
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Verify user-facing features work

---

## Phase 8: Post-Deployment

### Monitoring (First 24 Hours)

- [ ] Monitor application error logs
- [ ] Monitor database performance
- [ ] Monitor user feedback
- [ ] Check for NULL values in new FK columns
- [ ] Check for missing data in new tables
- [ ] Verify analytics still work correctly

### Verification (First Week)

- [ ] Run data integrity checks daily
- [ ] Compare analytics results with pre-migration
- [ ] Verify SPOC permissions work correctly
- [ ] Verify ticket creation/updates work
- [ ] Verify audit trail is complete

### Cleanup (After 1-2 Weeks)

- [ ] Verify all features work with new structure
- [ ] Confirm no issues reported
- [ ] Create final backup before dropping columns
- [ ] Drop legacy columns from tickets:
  - [ ] Uncomment DROP statements in `007-refactor-tickets-table.sql`
  - [ ] Run the DROP statements
  - [ ] Verify application still works
- [ ] Drop legacy columns from business_unit_groups:
  ```sql
  ALTER TABLE business_unit_groups DROP COLUMN spoc_name CASCADE;
  ALTER TABLE business_unit_groups DROP COLUMN primary_spoc_name CASCADE;
  ALTER TABLE business_unit_groups DROP COLUMN secondary_spoc_name CASCADE;
  ```
- [ ] Drop legacy columns from functional_areas:
  ```sql
  ALTER TABLE functional_areas DROP COLUMN spoc_name CASCADE;
  ```
- [ ] Update documentation to reflect final state
- [ ] Archive old migration scripts

---

## Rollback Plan

If migration fails or critical issues occur:

### Immediate Rollback (Before Data Migration)

If failure occurs during Phase 1-2:

```bash
# Run rollback script
psql -d ticketportal -f scripts/refactoring/rollback-all.sql

# Restore from backup if needed
psql -d ticketportal < backup_YYYYMMDD_HHMMSS.sql
```

### Rollback After Data Migration

If failure occurs during/after Phase 3:

```bash
# Must restore from backup (data already migrated)
dropdb ticketportal
createdb ticketportal
psql -d ticketportal < backup_YYYYMMDD_HHMMSS.sql
```

### Rollback After Deployment

If issues found in production:

1. **Immediate**: Revert application code to previous version
2. **Database**: Keep new tables (they're not breaking anything)
3. **Fix**: Debug and fix issues
4. **Redeploy**: Deploy fixed version

---

## Success Criteria

Migration is considered successful when:

- ✅ All 14 migration scripts execute without errors
- ✅ All new tables have expected row counts
- ✅ No NULL values in critical FK columns
- ✅ No orphaned records in new tables
- ✅ All SPOCs mapped correctly (no unmapped SPOCs)
- ✅ All tickets have status_id, priority_id, type_id
- ✅ Application code updated and tested
- ✅ All tests pass (unit, integration, e2e)
- ✅ No errors in production logs
- ✅ Analytics still work correctly
- ✅ User-facing features work as expected
- ✅ Performance is same or better

---

## Troubleshooting

### Issue: SPOC name doesn't match any user

**Symptom**: Script 012 shows unmapped SPOCs

**Solution**:
```sql
-- Option 1: Update user's full_name to match
UPDATE users SET full_name = 'Exact Name' WHERE id = 123;

-- Option 2: Create missing user
INSERT INTO users (email, full_name, role, password_hash)
VALUES ('spoc@example.com', 'Exact Name', 'spoc', 'hash');

-- Then rerun script 012
```

### Issue: Invalid status/priority/type values

**Symptom**: Script 013 shows unmapped values

**Solution**:
```sql
-- Find invalid values
SELECT DISTINCT status FROM tickets 
WHERE status NOT IN (SELECT code FROM ticket_statuses);

-- Option 1: Add missing master data
INSERT INTO ticket_statuses (code, name, description)
VALUES ('custom_status', 'Custom Status', 'Description');

-- Option 2: Fix ticket values
UPDATE tickets SET status = 'open' WHERE status = 'custom_status';

-- Then rerun script 013
```

### Issue: Circular parent-child relationships

**Symptom**: Script 011 shows circular relationships

**Solution**:
```sql
-- Find circular relationships
WITH RECURSIVE ticket_tree AS (
  SELECT parent_ticket_id, child_ticket_id, 1 as depth
  FROM ticket_hierarchy
  UNION ALL
  SELECT th.parent_ticket_id, tt.child_ticket_id, tt.depth + 1
  FROM ticket_hierarchy th
  JOIN ticket_tree tt ON th.child_ticket_id = tt.parent_ticket_id
  WHERE tt.depth < 10
)
SELECT * FROM ticket_tree WHERE parent_ticket_id = child_ticket_id;

-- Fix: Remove circular relationships from source data
UPDATE tickets SET parent_ticket_id = NULL WHERE id = 123;

-- Then rerun script 011
```

---

## Notes

- Each script is idempotent where possible (uses `IF NOT EXISTS`, `ON CONFLICT`)
- Scripts 008-013 are NOT idempotent (will create duplicates if rerun)
- If you need to rerun data migration scripts, first delete data from new tables:
  ```sql
  DELETE FROM ticket_audit_events;
  DELETE FROM ticket_projects;
  DELETE FROM ticket_redirections;
  DELETE FROM ticket_hierarchy;
  DELETE FROM business_group_spocs;
  DELETE FROM user_role_assignments;
  ```
- Keep legacy columns until you're 100% confident migration is successful
- Monitor production for at least 1-2 weeks before dropping legacy columns

---

## Timeline

| Phase | Duration | Can Rollback? |
|-------|----------|---------------|
| Pre-Migration | 1-2 hours | N/A |
| Phase 1-2 (Create tables) | 5 minutes | Easy |
| Phase 3 (Migrate data) | 5-10 minutes | Medium |
| Phase 4 (Helper functions) | 1 minute | Easy |
| Phase 5 (Update code) | 4-8 hours | Easy |
| Phase 6 (Testing) | 2-4 hours | N/A |
| Phase 7 (Deployment) | 1-2 hours | Medium |
| Phase 8 (Monitoring) | 1-2 weeks | Difficult |

**Total**: 1-2 days for complete migration

---

## Sign-Off

- [ ] Database Administrator approval
- [ ] Technical Lead approval
- [ ] Product Manager notification
- [ ] Migration completed successfully
- [ ] Post-migration verification complete
- [ ] Legacy columns dropped
- [ ] Documentation updated
- [ ] Team trained on new structure

---

## Completion Date

**Migration Started**: _______________

**Migration Completed**: _______________

**Legacy Columns Dropped**: _______________

**Signed Off By**: _______________
