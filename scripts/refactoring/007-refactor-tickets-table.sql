-- =====================================================
-- REFACTOR TICKETS TABLE
-- =====================================================
-- Purpose: Clean up tickets table by removing bloated/redundant columns
-- Prerequisites: Run scripts 001-006 first to create new entity tables
-- =====================================================

-- Step 1: Add new foreign key columns for master data entities
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS status_id INTEGER REFERENCES ticket_statuses(id),
  ADD COLUMN IF NOT EXISTS priority_id INTEGER REFERENCES ticket_priorities(id),
  ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES ticket_types(id);

-- Step 2: Create indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_tickets_status_id ON tickets(status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_priority_id ON tickets(priority_id);
CREATE INDEX IF NOT EXISTS idx_tickets_type_id ON tickets(type_id);

-- Step 3: Migrate data from VARCHAR columns to FK columns (will be done in data migration script)
-- This is just the schema change

-- Step 4: Drop redundant VARCHAR columns (AFTER data migration is complete)
-- IMPORTANT: Run data migration script BEFORE executing these DROP statements!

-- Uncomment these after data migration is complete:
/*
ALTER TABLE tickets DROP COLUMN IF EXISTS category CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS subcategory CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS initiator_group CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS priority CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS ticket_type CASCADE;
*/

-- Step 5: Drop audit-related columns (moved to ticket_audit_events)
-- Uncomment after data migration:
/*
ALTER TABLE tickets DROP COLUMN IF EXISTS closed_by CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS closed_at CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS hold_by CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS hold_at CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS deleted_at CASCADE;
*/

-- Step 6: Drop redirection columns (moved to ticket_redirections)
-- Uncomment after data migration:
/*
ALTER TABLE tickets DROP COLUMN IF EXISTS redirected_from_business_unit_group_id CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS redirected_from_spoc_user_id CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS redirection_remarks CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS redirected_at CASCADE;
*/

-- Step 7: Drop project-related columns (moved to ticket_projects)
-- Uncomment after data migration:
/*
ALTER TABLE tickets DROP COLUMN IF EXISTS project_name CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS product_release_name CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS project_id CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS estimated_release_date CASCADE;
*/

-- Step 8: Drop parent_ticket_id (moved to ticket_hierarchy)
-- Uncomment after data migration:
/*
ALTER TABLE tickets DROP COLUMN IF EXISTS parent_ticket_id CASCADE;
*/

-- Step 9: Drop assignee_group_id (can be derived from assigned_to user's business_unit_group_id)
-- Uncomment after data migration:
/*
ALTER TABLE tickets DROP COLUMN IF EXISTS assignee_group_id CASCADE;
*/

-- =====================================================
-- FINAL CLEAN TICKETS TABLE STRUCTURE
-- =====================================================
-- After all migrations, tickets table will have:
--
-- Core Identity:
--   - id, ticket_id, ticket_number
--
-- Basic Information:
--   - title, description
--   - type_id (FK to ticket_types)
--   - status_id (FK to ticket_statuses)
--   - priority_id (FK to ticket_priorities)
--
-- Classification:
--   - business_unit_group_id (initiator's group)
--   - target_business_group_id (target group)
--   - category_id (FK to categories)
--   - subcategory_id (FK to subcategories)
--
-- Assignment:
--   - assigned_to (FK to users)
--   - created_by (FK to users)
--   - spoc_user_id (FK to users)
--
-- Timing:
--   - estimated_duration (INTEGER hours)
--   - created_at, updated_at, resolved_at
--
-- Flags:
--   - is_internal (BOOLEAN)
--   - is_deleted (BOOLEAN)
--   - has_attachments (BOOLEAN)
--
-- Result: Clean, normalized table with ~20 columns instead of 40+
-- =====================================================

COMMENT ON TABLE tickets IS 'Core ticket entity - cleaned and normalized';
