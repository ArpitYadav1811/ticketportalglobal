# Database Refactoring - Quick Start Guide

## TL;DR

Your database tables were messy with mixed concerns and poor structure. I've created a complete refactoring solution that separates everything into clean, focused entities.

---

## What's Been Created

### 📁 SQL Migration Scripts (14 files)

Located in `scripts/refactoring/`:

1. **001-006**: Create new entity tables
2. **007**: Add new FK columns to tickets
3. **008-013**: Migrate data from old to new structure
4. **014**: Helper functions and views

### 📝 TypeScript Types

- `types/entities.ts` - Clean entity types matching new schema

### 🔧 Server Actions

Located in `lib/actions/entities/`:

- `ticket-audit.ts` - Audit event operations
- `ticket-projects.ts` - Project associations
- `ticket-redirections.ts` - Redirection history
- `ticket-hierarchy.ts` - Parent-child relationships
- `business-group-spocs.ts` - SPOC management
- `master-data.ts` - Statuses, priorities, types, roles

### 📚 Documentation

- `DATABASE_REFACTORING_GUIDE.md` - Comprehensive guide (detailed)
- `DATABASE_REFACTORING_SUMMARY.md` - Executive summary
- `scripts/refactoring/ENTITY_DIAGRAM.md` - Visual diagrams
- `scripts/refactoring/MIGRATION_CHECKLIST.md` - Step-by-step checklist
- `scripts/refactoring/README.md` - Script execution guide

---

## The Problem (Before)

```
tickets table: 40+ columns
├─ Core ticket data (title, description)
├─ Audit fields (closed_by, hold_by, deleted_at)
├─ Project data (project_name, release_name)
├─ Redirection data (redirected_from_*, remarks)
├─ Hierarchy (parent_ticket_id)
└─ Denormalized duplicates (category + category_id)

business_unit_groups:
├─ spoc_name (VARCHAR - no FK!)
├─ primary_spoc_name (VARCHAR - no FK!)
└─ secondary_spoc_name (VARCHAR - no FK!)

Master data: All VARCHAR (status, priority, type, role)
```

**Issues**: Mixed concerns, no referential integrity, poor performance, hard to maintain.

---

## The Solution (After)

```
tickets: ~20 columns (clean, focused)
├─ Core data only
├─ All FKs (no VARCHAR duplicates)
└─ Proper relationships

New tables (separated concerns):
├─ ticket_audit_events (audit trail)
├─ ticket_projects (project associations)
├─ ticket_redirections (redirection history)
├─ ticket_hierarchy (parent-child)
├─ business_group_spocs (SPOC with FKs)
├─ ticket_statuses (master data)
├─ ticket_priorities (master data)
├─ ticket_types (master data)
├─ user_roles (master data)
└─ user_role_assignments (many-to-many)
```

**Benefits**: Clean separation, referential integrity, better performance, easy to maintain.

---

## How to Execute

### Option 1: Automated (Recommended)

```bash
# Linux/Mac
cd scripts/refactoring
chmod +x run-all-migrations.sh
./run-all-migrations.sh ticketportal

# Windows PowerShell
cd scripts\refactoring
.\run-all-migrations.ps1 -DatabaseName "ticketportal"
```

### Option 2: Manual

```bash
cd scripts/refactoring

# Phase 1: Create tables (001-006)
psql -d ticketportal -f 001-create-ticket-audit-events.sql
psql -d ticketportal -f 002-create-ticket-projects.sql
psql -d ticketportal -f 003-create-ticket-redirections.sql
psql -d ticketportal -f 004-create-ticket-hierarchy.sql
psql -d ticketportal -f 005-create-business-group-spocs.sql
psql -d ticketportal -f 006-create-master-data-entities.sql

# Phase 2: Add columns (007)
psql -d ticketportal -f 007-refactor-tickets-table.sql

# Phase 3: Migrate data (008-013)
psql -d ticketportal -f 008-migrate-ticket-audit-data.sql
psql -d ticketportal -f 009-migrate-ticket-projects-data.sql
psql -d ticketportal -f 010-migrate-ticket-redirections-data.sql
psql -d ticketportal -f 011-migrate-ticket-hierarchy-data.sql
psql -d ticketportal -f 012-migrate-business-group-spocs-data.sql
psql -d ticketportal -f 013-migrate-master-data-references.sql

# Phase 4: Helper functions (014)
psql -d ticketportal -f 014-helper-functions.sql
```

---

## Verification

After running migrations:

```sql
-- Check all new tables exist (should return 10 rows)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
  'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
  'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
);

-- Check row counts
SELECT 'tickets' as table_name, COUNT(*) FROM tickets
UNION ALL SELECT 'ticket_audit_events', COUNT(*) FROM ticket_audit_events
UNION ALL SELECT 'ticket_projects', COUNT(*) FROM ticket_projects
UNION ALL SELECT 'business_group_spocs', COUNT(*) FROM business_group_spocs;

-- Check for NULL values (should all be 0)
SELECT COUNT(*) FROM tickets WHERE status_id IS NULL;
SELECT COUNT(*) FROM tickets WHERE priority_id IS NULL;
SELECT COUNT(*) FROM tickets WHERE type_id IS NULL;
```

---

## Key Changes Summary

### Tickets Table

| Before | After |
|--------|-------|
| 40+ columns | ~20 columns |
| Mixed concerns | Single responsibility |
| VARCHAR status/priority/type | FK to master data tables |
| Inline audit fields | Separate audit_events table |
| String-based project names | FK to projects table |
| parent_ticket_id column | ticket_hierarchy table |

### SPOC Management

| Before | After |
|--------|-------|
| spoc_name VARCHAR | business_group_spocs table |
| primary_spoc_name VARCHAR | FK to users table |
| secondary_spoc_name VARCHAR | Supports multiple SPOCs |
| No history | Complete assignment history |
| String matching | Proper FK joins |

### Master Data

| Before | After |
|--------|-------|
| status VARCHAR | ticket_statuses table with metadata |
| priority VARCHAR | ticket_priorities table with SLA |
| ticket_type VARCHAR | ticket_types table with icons |
| role VARCHAR | user_roles table with levels |

---

## Files Created

### SQL Scripts (14)
- `scripts/refactoring/001-014-*.sql` - Migration scripts
- `scripts/refactoring/rollback-all.sql` - Rollback script
- `scripts/refactoring/run-all-migrations.sh` - Bash execution script
- `scripts/refactoring/run-all-migrations.ps1` - PowerShell execution script

### TypeScript (1)
- `types/entities.ts` - Clean entity type definitions

### Server Actions (6)
- `lib/actions/entities/ticket-audit.ts`
- `lib/actions/entities/ticket-projects.ts`
- `lib/actions/entities/ticket-redirections.ts`
- `lib/actions/entities/ticket-hierarchy.ts`
- `lib/actions/entities/business-group-spocs.ts`
- `lib/actions/entities/master-data.ts`

### Documentation (5)
- `DATABASE_REFACTORING_GUIDE.md` - Comprehensive guide
- `DATABASE_REFACTORING_SUMMARY.md` - Executive summary
- `scripts/refactoring/ENTITY_DIAGRAM.md` - Visual diagrams
- `scripts/refactoring/MIGRATION_CHECKLIST.md` - Checklist
- `scripts/refactoring/README.md` - Script guide
- `lib/actions/entities/README.md` - Usage guide
- `REFACTORING_QUICK_START.md` - This file

---

## Next Steps

1. **Backup database**:
   ```bash
   pg_dump -U postgres -d ticketportal > backup_$(date +%Y%m%d).sql
   ```

2. **Run migrations** (choose one):
   ```bash
   # Automated
   ./scripts/refactoring/run-all-migrations.sh ticketportal
   
   # Or manual (see above)
   ```

3. **Verify migration**:
   ```sql
   -- Run verification queries (see above)
   ```

4. **Update application code**:
   - Import types from `types/entities.ts`
   - Use server actions from `lib/actions/entities/`
   - Update queries to use new FK columns

5. **Test thoroughly**:
   - Unit tests
   - Integration tests
   - End-to-end tests

6. **Deploy**:
   - Staging first
   - Monitor for 24-48 hours
   - Then production

7. **Drop legacy columns** (after 1-2 weeks):
   - Uncomment DROP statements in `007-refactor-tickets-table.sql`
   - Run the script

---

## Quick Reference

### Database Functions

```sql
-- Get primary SPOC
SELECT * FROM get_primary_spoc(1);

-- Get all SPOCs
SELECT * FROM get_all_spocs(1);

-- Check if user is SPOC
SELECT is_user_spoc(5, 1);

-- Get ticket audit timeline
SELECT * FROM get_ticket_audit_timeline(123);

-- Get ticket children
SELECT * FROM get_ticket_children(123);
```

### Server Actions

```typescript
// Audit
import { createTicketAuditEvent } from '@/lib/actions/entities/ticket-audit'
await createTicketAuditEvent(ticketId, 'status_changed', userId, 'open', 'resolved')

// SPOCs
import { getPrimarySpoc, isUserPrimarySpoc } from '@/lib/actions/entities/business-group-spocs'
const spoc = await getPrimarySpoc(businessGroupId)
const isPrimary = await isUserPrimarySpoc(userId, businessGroupId)

// Projects
import { linkTicketToProject } from '@/lib/actions/entities/ticket-projects'
await linkTicketToProject(ticketId, projectId, releaseId, releaseDate, userId)

// Hierarchy
import { linkTickets, getTicketChildren } from '@/lib/actions/entities/ticket-hierarchy'
await linkTickets(parentId, childId, 'subtask', userId)
const children = await getTicketChildren(parentId)

// Master Data
import { getAllTicketStatuses, getMasterDataForTicketForm } from '@/lib/actions/entities/master-data'
const statuses = await getAllTicketStatuses()
const { statuses, priorities, types } = await getMasterDataForTicketForm()
```

---

## Need Help?

- **Detailed guide**: `DATABASE_REFACTORING_GUIDE.md`
- **Visual diagrams**: `scripts/refactoring/ENTITY_DIAGRAM.md`
- **Step-by-step**: `scripts/refactoring/MIGRATION_CHECKLIST.md`
- **Rollback**: `scripts/refactoring/rollback-all.sql`

---

## Status

✅ **Scripts Created**: All 14 migration scripts ready
✅ **Types Created**: TypeScript entity types ready
✅ **Actions Created**: Server actions for all entities ready
✅ **Documentation**: Comprehensive guides created
⏳ **Execution**: Ready to run on your database
⏳ **Testing**: After execution
⏳ **Deployment**: After testing

**You're ready to start the migration!**
