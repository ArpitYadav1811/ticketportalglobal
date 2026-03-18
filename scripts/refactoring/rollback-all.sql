-- =====================================================
-- ROLLBACK ALL REFACTORING CHANGES
-- =====================================================
-- Purpose: Rollback all refactoring migrations
-- WARNING: This will delete all data in new tables!
-- Only use if migration failed or you need to start over
-- =====================================================

-- Step 1: Drop helper functions
DROP FUNCTION IF EXISTS get_primary_spoc(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_all_spocs(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS is_user_spoc(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS is_user_primary_spoc(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_ticket_audit_timeline(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_ticket_redirection_chain(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_ticket_children(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_highest_role_level(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS create_ticket_audit_event CASCADE;
DROP FUNCTION IF EXISTS log_ticket_event CASCADE;
DROP FUNCTION IF EXISTS trigger_ticket_status_audit() CASCADE;

-- Step 2: Drop triggers
DROP TRIGGER IF EXISTS ticket_status_change_audit ON tickets;

-- Step 3: Drop views
DROP VIEW IF EXISTS tickets_with_full_details CASCADE;
DROP VIEW IF EXISTS business_groups_with_spocs CASCADE;

-- Step 4: Drop new entity tables
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

-- Step 5: Drop custom types
DROP TYPE IF EXISTS ticket_event_type CASCADE;
DROP TYPE IF EXISTS spoc_type CASCADE;

-- Step 6: Drop new columns from tickets table
ALTER TABLE tickets DROP COLUMN IF EXISTS status_id CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS priority_id CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS type_id CASCADE;

-- Verification
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'ticket_audit_events', 'ticket_projects', 'ticket_redirections', 
  'ticket_hierarchy', 'business_group_spocs', 'ticket_statuses', 
  'ticket_priorities', 'ticket_types', 'user_roles', 'user_role_assignments'
);

-- If above query returns no rows, rollback was successful

SELECT 'Rollback completed - all refactoring changes have been removed' as status;
