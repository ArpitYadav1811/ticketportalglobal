-- ============================================================================
-- Migration Script 023: Remove Sub-ticket Columns
-- ============================================================================
-- Description: Removes parent_ticket_id column as sub-tickets are no longer required
-- Date: 2026-02-27
-- Author: Database Architect
-- Risk Level: LOW - Clean removal of unused feature
-- Rollback: See 023-rollback-remove-subticket-columns.sql
-- ============================================================================

-- STEP 1: Verify column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'parent_ticket_id'
  ) THEN
    RAISE NOTICE 'parent_ticket_id column found, proceeding with removal';
  ELSE
    RAISE NOTICE 'parent_ticket_id column does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Check for existing parent-child relationships
-- ============================================================================
DO $$
DECLARE
  parent_ticket_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'parent_ticket_id'
  ) THEN
    SELECT COUNT(*) INTO parent_ticket_count 
    FROM tickets 
    WHERE parent_ticket_id IS NOT NULL;
    
    IF parent_ticket_count > 0 THEN
      RAISE WARNING 'Found % tickets with parent_ticket_id set. These relationships will be removed.', parent_ticket_count;
    ELSE
      RAISE NOTICE 'No parent-child ticket relationships found';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop indexes related to parent_ticket_id
-- ============================================================================
RAISE NOTICE 'Dropping indexes...';

DROP INDEX IF EXISTS idx_tickets_parent_ticket_id;
DROP INDEX IF EXISTS idx_tickets_has_children;

RAISE NOTICE 'Indexes dropped';

-- ============================================================================
-- STEP 4: Drop foreign key constraint
-- ============================================================================
RAISE NOTICE 'Dropping foreign key constraint...';

ALTER TABLE tickets 
DROP CONSTRAINT IF EXISTS tickets_parent_ticket_id_fkey;

RAISE NOTICE 'Foreign key constraint dropped';

-- ============================================================================
-- STEP 5: Drop parent_ticket_id column
-- ============================================================================
RAISE NOTICE 'Dropping parent_ticket_id column...';

ALTER TABLE tickets 
DROP COLUMN IF EXISTS parent_ticket_id;

RAISE NOTICE 'parent_ticket_id column dropped';

-- ============================================================================
-- STEP 6: Verify columns is_parent and child_count don't exist
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'is_parent'
  ) THEN
    RAISE NOTICE 'Found is_parent column, dropping...';
    ALTER TABLE tickets DROP COLUMN IF EXISTS is_parent;
  ELSE
    RAISE NOTICE 'is_parent column does not exist (expected)';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'child_count'
  ) THEN
    RAISE NOTICE 'Found child_count column, dropping...';
    ALTER TABLE tickets DROP COLUMN IF EXISTS child_count;
  ELSE
    RAISE NOTICE 'child_count column does not exist (expected)';
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
DO $$
DECLARE
  parent_col_exists BOOLEAN;
  is_parent_col_exists BOOLEAN;
  child_count_col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'parent_ticket_id'
  ) INTO parent_col_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'is_parent'
  ) INTO is_parent_col_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'child_count'
  ) INTO child_count_col_exists;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 023 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'parent_ticket_id exists: %', parent_col_exists;
  RAISE NOTICE 'is_parent exists: %', is_parent_col_exists;
  RAISE NOTICE 'child_count exists: %', child_count_col_exists;
  
  IF NOT parent_col_exists AND NOT is_parent_col_exists AND NOT child_count_col_exists THEN
    RAISE NOTICE 'SUCCESS: All sub-ticket columns removed';
  ELSE
    RAISE EXCEPTION 'FAILED: Some columns still exist';
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;
