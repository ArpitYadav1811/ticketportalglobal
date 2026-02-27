-- ============================================================================
-- Migration Script 022: Merge target_business_groups into business_unit_groups
-- ============================================================================
-- Description: Consolidates target_business_groups and business_unit_groups
--              into a single table as they represent the same concept.
-- Date: 2026-02-27
-- Author: Database Architect
-- Risk Level: HIGH - Involves FK constraint updates
-- Rollback: See 022-rollback-merge-business-groups.sql
-- ============================================================================

-- STEP 1: Verify data consistency
-- Ensure all target_business_groups exist in business_unit_groups
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM target_business_groups tbg
  WHERE NOT EXISTS (
    SELECT 1 FROM business_unit_groups bug
    WHERE bug.name = tbg.name
  );
  
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Found % target_business_groups not in business_unit_groups. Run data sync first.', missing_count;
  END IF;
  
  RAISE NOTICE 'Data consistency check passed. All target business groups exist in business unit groups.';
END $$;

-- ============================================================================
-- STEP 2: Create mapping table for ID translation
-- ============================================================================
CREATE TEMP TABLE tbg_to_bug_mapping AS
SELECT 
  tbg.id as old_tbg_id,
  bug.id as new_bug_id,
  tbg.name
FROM target_business_groups tbg
JOIN business_unit_groups bug ON tbg.name = bug.name;

-- Verify mapping
DO $$
DECLARE
  mapping_count INTEGER;
  tbg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM tbg_to_bug_mapping;
  SELECT COUNT(*) INTO tbg_count FROM target_business_groups;
  
  IF mapping_count != tbg_count THEN
    RAISE EXCEPTION 'Mapping incomplete: % mappings for % target groups', mapping_count, tbg_count;
  END IF;
  
  RAISE NOTICE 'ID mapping created: % records', mapping_count;
END $$;

-- ============================================================================
-- STEP 3: Update tickets.target_business_group_id
-- ============================================================================
RAISE NOTICE 'Updating tickets.target_business_group_id...';

-- Add temporary column
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS target_business_unit_group_id INTEGER;

-- Populate new column using mapping
UPDATE tickets t
SET target_business_unit_group_id = m.new_bug_id
FROM tbg_to_bug_mapping m
WHERE t.target_business_group_id = m.old_tbg_id;

-- Verify update
DO $$
DECLARE
  updated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM tickets 
  WHERE target_business_group_id IS NOT NULL 
  AND target_business_unit_group_id IS NOT NULL;
  
  SELECT COUNT(*) INTO total_count 
  FROM tickets 
  WHERE target_business_group_id IS NOT NULL;
  
  IF updated_count != total_count THEN
    RAISE EXCEPTION 'Ticket update incomplete: % of % updated', updated_count, total_count;
  END IF;
  
  RAISE NOTICE 'Updated % ticket records', updated_count;
END $$;

-- Drop old FK constraint
ALTER TABLE tickets 
DROP CONSTRAINT IF EXISTS tickets_target_business_group_id_fkey;

-- Drop old column
ALTER TABLE tickets 
DROP COLUMN IF EXISTS target_business_group_id;

-- Rename new column
ALTER TABLE tickets 
RENAME COLUMN target_business_unit_group_id TO target_business_group_id;

-- Add new FK constraint
ALTER TABLE tickets 
ADD CONSTRAINT tickets_target_business_group_id_fkey 
FOREIGN KEY (target_business_group_id) 
REFERENCES business_unit_groups(id) ON DELETE SET NULL;

RAISE NOTICE 'tickets.target_business_group_id migration complete';

-- ============================================================================
-- STEP 4: Update ticket_classification_mapping.target_business_group_id
-- ============================================================================
RAISE NOTICE 'Updating ticket_classification_mapping.target_business_group_id...';

-- Add temporary column
ALTER TABLE ticket_classification_mapping 
ADD COLUMN IF NOT EXISTS target_business_unit_group_id INTEGER;

-- Populate new column
UPDATE ticket_classification_mapping tcm
SET target_business_unit_group_id = m.new_bug_id
FROM tbg_to_bug_mapping m
WHERE tcm.target_business_group_id = m.old_tbg_id;

-- Verify update
DO $$
DECLARE
  updated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM ticket_classification_mapping 
  WHERE target_business_group_id IS NOT NULL 
  AND target_business_unit_group_id IS NOT NULL;
  
  SELECT COUNT(*) INTO total_count 
  FROM ticket_classification_mapping 
  WHERE target_business_group_id IS NOT NULL;
  
  IF updated_count != total_count THEN
    RAISE EXCEPTION 'Classification mapping update incomplete: % of % updated', updated_count, total_count;
  END IF;
  
  RAISE NOTICE 'Updated % classification mapping records', updated_count;
END $$;

-- Drop old unique constraint
ALTER TABLE ticket_classification_mapping 
DROP CONSTRAINT IF EXISTS ticket_classification_mapping_target_bg_cat_subcat_unique;

-- Drop old FK constraint
ALTER TABLE ticket_classification_mapping 
DROP CONSTRAINT IF EXISTS ticket_classification_mapping_target_business_group_id_fkey;

-- Drop old column
ALTER TABLE ticket_classification_mapping 
DROP COLUMN IF EXISTS target_business_group_id;

-- Rename new column
ALTER TABLE ticket_classification_mapping 
RENAME COLUMN target_business_unit_group_id TO target_business_group_id;

-- Add new FK constraint
ALTER TABLE ticket_classification_mapping 
ADD CONSTRAINT ticket_classification_mapping_target_business_group_id_fkey 
FOREIGN KEY (target_business_group_id) 
REFERENCES business_unit_groups(id) ON DELETE CASCADE;

-- Add new unique constraint
ALTER TABLE ticket_classification_mapping 
ADD CONSTRAINT ticket_classification_mapping_target_bg_cat_subcat_unique 
UNIQUE (target_business_group_id, category_id, subcategory_id);

RAISE NOTICE 'ticket_classification_mapping.target_business_group_id migration complete';

-- ============================================================================
-- STEP 5: Update organization_target_business_group_mapping
-- ============================================================================
RAISE NOTICE 'Updating organization_target_business_group_mapping.target_business_group_id...';

-- Check if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_target_business_group_mapping') THEN
    -- Add temporary column
    ALTER TABLE organization_target_business_group_mapping 
    ADD COLUMN IF NOT EXISTS target_business_unit_group_id INTEGER;
    
    -- Populate new column
    UPDATE organization_target_business_group_mapping otbgm
    SET target_business_unit_group_id = m.new_bug_id
    FROM tbg_to_bug_mapping m
    WHERE otbgm.target_business_group_id = m.old_tbg_id;
    
    -- Drop old unique constraint
    ALTER TABLE organization_target_business_group_mapping 
    DROP CONSTRAINT IF EXISTS organization_target_business_group_mapping_organization_id_targe;
    
    -- Drop old FK constraint
    ALTER TABLE organization_target_business_group_mapping 
    DROP CONSTRAINT IF EXISTS organization_target_business_group_mapping_target_business_gro;
    
    -- Drop old column
    ALTER TABLE organization_target_business_group_mapping 
    DROP COLUMN IF EXISTS target_business_group_id;
    
    -- Rename new column
    ALTER TABLE organization_target_business_group_mapping 
    RENAME COLUMN target_business_unit_group_id TO target_business_group_id;
    
    -- Add new FK constraint
    ALTER TABLE organization_target_business_group_mapping 
    ADD CONSTRAINT organization_target_business_group_mapping_target_business_group_id_fkey 
    FOREIGN KEY (target_business_group_id) 
    REFERENCES business_unit_groups(id) ON DELETE CASCADE;
    
    -- Add new unique constraint
    ALTER TABLE organization_target_business_group_mapping 
    ADD CONSTRAINT organization_target_business_group_mapping_org_tbg_unique 
    UNIQUE (organization_id, target_business_group_id);
    
    RAISE NOTICE 'organization_target_business_group_mapping migration complete';
  ELSE
    RAISE NOTICE 'organization_target_business_group_mapping table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Update redirected_from_business_unit_group_id (if exists)
-- ============================================================================
RAISE NOTICE 'Checking tickets.redirected_from_business_unit_group_id...';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' 
    AND column_name = 'redirected_from_business_unit_group_id'
  ) THEN
    -- This column already references business_unit_groups, no change needed
    RAISE NOTICE 'redirected_from_business_unit_group_id already references business_unit_groups';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Drop target_business_groups table
-- ============================================================================
RAISE NOTICE 'Dropping target_business_groups table...';

-- Drop indexes first
DROP INDEX IF EXISTS idx_target_business_groups_name;

-- Drop table
DROP TABLE IF EXISTS target_business_groups CASCADE;

RAISE NOTICE 'target_business_groups table dropped';

-- ============================================================================
-- STEP 8: Update indexes
-- ============================================================================
RAISE NOTICE 'Creating indexes...';

-- Ensure index exists on tickets.target_business_group_id
CREATE INDEX IF NOT EXISTS idx_tickets_target_business_group 
ON tickets(target_business_group_id);

-- Ensure index exists on ticket_classification_mapping.target_business_group_id
CREATE INDEX IF NOT EXISTS idx_ticket_classification_target_bg 
ON ticket_classification_mapping(target_business_group_id);

RAISE NOTICE 'Indexes created';

-- ============================================================================
-- STEP 9: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN tickets.target_business_group_id IS 
'Target business unit group (assignee group) - references business_unit_groups table';

COMMENT ON COLUMN ticket_classification_mapping.target_business_group_id IS 
'Target business unit group for this classification - references business_unit_groups table';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
DO $$
DECLARE
  tickets_count INTEGER;
  mapping_count INTEGER;
  org_mapping_count INTEGER;
BEGIN
  -- Count tickets with target business group
  SELECT COUNT(*) INTO tickets_count 
  FROM tickets 
  WHERE target_business_group_id IS NOT NULL;
  
  -- Count classification mappings
  SELECT COUNT(*) INTO mapping_count 
  FROM ticket_classification_mapping 
  WHERE target_business_group_id IS NOT NULL;
  
  -- Count org mappings (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_target_business_group_mapping') THEN
    SELECT COUNT(*) INTO org_mapping_count 
    FROM organization_target_business_group_mapping 
    WHERE target_business_group_id IS NOT NULL;
  ELSE
    org_mapping_count := 0;
  END IF;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 022 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tickets with target business group: %', tickets_count;
  RAISE NOTICE 'Classification mappings: %', mapping_count;
  RAISE NOTICE 'Organization mappings: %', org_mapping_count;
  RAISE NOTICE 'target_business_groups table: DROPPED';
  RAISE NOTICE 'All references now point to business_unit_groups';
  RAISE NOTICE '============================================================================';
END $$;
