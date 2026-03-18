# Database Refactoring Scripts

## Overview

This folder contains SQL scripts to refactor the database from a messy, denormalized structure to a clean, normalized entity-relationship model.

## Quick Start

### Prerequisites

1. Backup your database
2. Test on staging environment first
3. Ensure no active transactions

### Execution

Run scripts in numerical order:

```bash
# Navigate to project root
cd /path/to/ticketportalglobal

# Run all refactoring scripts in order
for script in scripts/refactoring/0*.sql; do
  echo "Running $script..."
  psql -d your_database -f "$script"
  if [ $? -ne 0 ]; then
    echo "Error in $script - stopping"
    exit 1
  fi
done
```

### Individual Script Execution

```bash
# Create new tables (scripts 001-006)
psql -d your_database -f scripts/refactoring/001-create-ticket-audit-events.sql
psql -d your_database -f scripts/refactoring/002-create-ticket-projects.sql
psql -d your_database -f scripts/refactoring/003-create-ticket-redirections.sql
psql -d your_database -f scripts/refactoring/004-create-ticket-hierarchy.sql
psql -d your_database -f scripts/refactoring/005-create-business-group-spocs.sql
psql -d your_database -f scripts/refactoring/006-create-master-data-entities.sql

# Add new columns to tickets (script 007)
psql -d your_database -f scripts/refactoring/007-refactor-tickets-table.sql

# Migrate data (scripts 008-013)
psql -d your_database -f scripts/refactoring/008-migrate-ticket-audit-data.sql
psql -d your_database -f scripts/refactoring/009-migrate-ticket-projects-data.sql
psql -d your_database -f scripts/refactoring/010-migrate-ticket-redirections-data.sql
psql -d your_database -f scripts/refactoring/011-migrate-ticket-hierarchy-data.sql
psql -d your_database -f scripts/refactoring/012-migrate-business-group-spocs-data.sql
psql -d your_database -f scripts/refactoring/013-migrate-master-data-references.sql
```

## Script Descriptions

| Script | Purpose | Creates | Migrates | Safe to Rerun |
|--------|---------|---------|----------|---------------|
| 001 | Create ticket audit events table | `ticket_audit_events` | No | Yes (idempotent) |
| 002 | Create ticket projects table | `ticket_projects` | No | Yes (idempotent) |
| 003 | Create ticket redirections table | `ticket_redirections` | No | Yes (idempotent) |
| 004 | Create ticket hierarchy table | `ticket_hierarchy` | No | Yes (idempotent) |
| 005 | Create business group SPOCs table | `business_group_spocs` | No | Yes (idempotent) |
| 006 | Create master data entities | `ticket_statuses`, `ticket_priorities`, `ticket_types`, `user_roles`, `user_role_assignments` | No | Yes (idempotent) |
| 007 | Add new FK columns to tickets | Columns: `status_id`, `priority_id`, `type_id` | No | Yes (IF NOT EXISTS) |
| 008 | Migrate audit data | No | `tickets` → `ticket_audit_events` | No (duplicates) |
| 009 | Migrate project data | No | `tickets` → `ticket_projects` | No (duplicates) |
| 010 | Migrate redirection data | No | `tickets` → `ticket_redirections` | No (duplicates) |
| 011 | Migrate hierarchy data | No | `tickets` → `ticket_hierarchy` | No (duplicates) |
| 012 | Migrate SPOC data | No | `business_unit_groups` → `business_group_spocs` | Yes (ON CONFLICT) |
| 013 | Migrate master data references | No | Updates `tickets.status_id`, `priority_id`, `type_id` | Yes (UPDATE) |

## Verification Queries

After running all scripts, verify data integrity:

```sql
-- Check all new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ticket_%' OR table_name LIKE '%_spocs'
ORDER BY table_name;

-- Check row counts
SELECT 'tickets' as table_name, COUNT(*) as row_count FROM tickets
UNION ALL
SELECT 'ticket_audit_events', COUNT(*) FROM ticket_audit_events
UNION ALL
SELECT 'ticket_projects', COUNT(*) FROM ticket_projects
UNION ALL
SELECT 'ticket_redirections', COUNT(*) FROM ticket_redirections
UNION ALL
SELECT 'ticket_hierarchy', COUNT(*) FROM ticket_hierarchy
UNION ALL
SELECT 'business_group_spocs', COUNT(*) FROM business_group_spocs
UNION ALL
SELECT 'ticket_statuses', COUNT(*) FROM ticket_statuses
UNION ALL
SELECT 'ticket_priorities', COUNT(*) FROM ticket_priorities
UNION ALL
SELECT 'ticket_types', COUNT(*) FROM ticket_types
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles;

-- Check for NULL values in critical FK columns
SELECT 'tickets.status_id' as column_name, COUNT(*) as null_count 
FROM tickets WHERE status_id IS NULL
UNION ALL
SELECT 'tickets.priority_id', COUNT(*) FROM tickets WHERE priority_id IS NULL
UNION ALL
SELECT 'tickets.type_id', COUNT(*) FROM tickets WHERE type_id IS NULL;

-- Check for orphaned records
SELECT 'ticket_audit_events' as table_name, COUNT(*) as orphaned_count
FROM ticket_audit_events tae
LEFT JOIN tickets t ON t.id = tae.ticket_id
WHERE t.id IS NULL
UNION ALL
SELECT 'ticket_projects', COUNT(*)
FROM ticket_projects tp
LEFT JOIN tickets t ON t.id = tp.ticket_id
WHERE t.id IS NULL;
```

## Rollback

If you need to rollback:

1. **Before data migration (scripts 001-007)**: Simply drop the new tables
2. **After data migration (scripts 008-013)**: More complex - requires restoring from backup

```sql
-- Rollback new tables (if no data migrated yet)
DROP TABLE IF EXISTS ticket_audit_events CASCADE;
DROP TABLE IF EXISTS ticket_projects CASCADE;
DROP TABLE IF EXISTS ticket_redirections CASCADE;
DROP TABLE IF EXISTS ticket_hierarchy CASCADE;
DROP TABLE IF EXISTS business_group_spocs CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS ticket_statuses CASCADE;
DROP TABLE IF EXISTS ticket_priorities CASCADE;
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TYPE IF EXISTS ticket_event_type CASCADE;
DROP TYPE IF EXISTS spoc_type CASCADE;

-- Rollback new columns from tickets
ALTER TABLE tickets DROP COLUMN IF EXISTS status_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS priority_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS type_id;
```

## Support

For issues or questions:
1. Check `DATABASE_REFACTORING_GUIDE.md` for detailed documentation
2. Review verification queries above
3. Check application logs for errors
4. Restore from backup if critical issues occur

## Status

- ✅ Scripts created
- ⏳ Tested on staging
- ⏳ Application code updated
- ⏳ Deployed to production
- ⏳ Legacy columns dropped
