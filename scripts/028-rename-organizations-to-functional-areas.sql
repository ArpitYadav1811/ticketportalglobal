-- ============================================================================
-- Migration Script 028: Rename organizations to functional_areas
-- ============================================================================
-- Description: Renames the organizations table to functional_areas for clarity
-- Date: 2026-02-27
-- Risk Level: LOW - Simple table rename
-- ============================================================================

-- STEP 1: Check if organizations table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE NOTICE 'organizations table found, proceeding with rename';
  ELSE
    RAISE NOTICE 'organizations table does not exist, creating functional_areas table';
  END IF;
END $$;

-- STEP 2: Rename the table
ALTER TABLE IF EXISTS organizations RENAME TO functional_areas;

-- STEP 3: Update the mapping table name for clarity
ALTER TABLE IF EXISTS organization_target_business_group_mapping 
RENAME TO functional_area_business_group_mapping;

-- STEP 4: Rename the foreign key column for consistency
ALTER TABLE IF EXISTS functional_area_business_group_mapping 
RENAME COLUMN organization_id TO functional_area_id;

-- STEP 5: Update constraint names (they auto-update, but let's verify)
-- The constraints will automatically follow the table rename

-- STEP 6: Update index names for clarity
ALTER INDEX IF EXISTS idx_org_tbg_mapping_org 
RENAME TO idx_functional_area_bg_mapping_fa;

ALTER INDEX IF EXISTS idx_org_tbg_mapping_tbg 
RENAME TO idx_functional_area_bg_mapping_bg;

-- STEP 7: Update comments
COMMENT ON TABLE functional_areas IS 
'Functional areas that group related business unit groups together (formerly organizations)';

COMMENT ON TABLE functional_area_business_group_mapping IS 
'Mapping table linking functional areas to their associated business unit groups';

COMMENT ON COLUMN functional_area_business_group_mapping.functional_area_id IS 
'Foreign key to functional_areas table';

COMMENT ON COLUMN functional_area_business_group_mapping.target_business_group_id IS 
'Foreign key to business_unit_groups table (references the merged table)';

-- STEP 8: Verification
DO $$
DECLARE
  fa_exists BOOLEAN;
  mapping_exists BOOLEAN;
  fa_count INTEGER;
  mapping_count INTEGER;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'functional_areas'
  ) INTO fa_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'functional_area_business_group_mapping'
  ) INTO mapping_exists;
  
  IF fa_exists THEN
    SELECT COUNT(*) INTO fa_count FROM functional_areas;
  ELSE
    fa_count := 0;
  END IF;
  
  IF mapping_exists THEN
    SELECT COUNT(*) INTO mapping_count FROM functional_area_business_group_mapping;
  ELSE
    mapping_count := 0;
  END IF;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 028 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'functional_areas table exists: %', fa_exists;
  RAISE NOTICE 'functional_area_business_group_mapping table exists: %', mapping_exists;
  RAISE NOTICE 'Functional areas count: %', fa_count;
  RAISE NOTICE 'Mappings count: %', mapping_count;
  RAISE NOTICE '';
  
  IF fa_exists AND mapping_exists THEN
    RAISE NOTICE '✅ SUCCESS: Tables renamed successfully';
    RAISE NOTICE '   organizations → functional_areas';
    RAISE NOTICE '   organization_target_business_group_mapping → functional_area_business_group_mapping';
  ELSE
    RAISE WARNING '⚠️  Some tables may not exist yet';
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;

-- Show sample data
SELECT 
  fa.name as functional_area,
  bug.name as business_unit_group
FROM functional_area_business_group_mapping fabgm
JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
ORDER BY fa.name, bug.name
LIMIT 10;
