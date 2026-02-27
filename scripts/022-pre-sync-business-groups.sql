-- ============================================================================
-- Pre-Migration Script: Sync business_unit_groups with target_business_groups
-- ============================================================================
-- Description: Ensures all target_business_groups exist in business_unit_groups
--              before running the merger script 022
-- Date: 2026-02-27
-- Author: Database Architect
-- Risk Level: LOW - Only inserts missing records
-- ============================================================================

-- STEP 1: Check current state
DO $$
DECLARE
  bug_count INTEGER;
  tbg_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bug_count FROM business_unit_groups;
  SELECT COUNT(*) INTO tbg_count FROM target_business_groups;
  
  SELECT COUNT(*) INTO missing_count
  FROM target_business_groups tbg
  WHERE NOT EXISTS (
    SELECT 1 FROM business_unit_groups bug
    WHERE bug.name = tbg.name
  );
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CURRENT STATE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'business_unit_groups count: %', bug_count;
  RAISE NOTICE 'target_business_groups count: %', tbg_count;
  RAISE NOTICE 'Missing in business_unit_groups: %', missing_count;
  RAISE NOTICE '============================================================================';
END $$;

-- STEP 2: Show which groups are missing
DO $$
DECLARE
  missing_group RECORD;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Groups that will be added to business_unit_groups:';
  RAISE NOTICE '------------------------------------------------------------';
  
  FOR missing_group IN 
    SELECT tbg.id, tbg.name, tbg.description
    FROM target_business_groups tbg
    WHERE NOT EXISTS (
      SELECT 1 FROM business_unit_groups bug
      WHERE bug.name = tbg.name
    )
    ORDER BY tbg.name
  LOOP
    counter := counter + 1;
    RAISE NOTICE '%: % (ID: %)', counter, missing_group.name, missing_group.id;
    IF missing_group.description IS NOT NULL THEN
      RAISE NOTICE '   Description: %', missing_group.description;
    END IF;
  END LOOP;
  
  IF counter = 0 THEN
    RAISE NOTICE 'None - all groups already exist!';
  END IF;
  
  RAISE NOTICE '------------------------------------------------------------';
END $$;

-- STEP 3: Insert missing groups into business_unit_groups
INSERT INTO business_unit_groups (name, description, created_at, updated_at)
SELECT 
  tbg.name,
  tbg.description,
  tbg.created_at,
  tbg.updated_at
FROM target_business_groups tbg
WHERE NOT EXISTS (
  SELECT 1 FROM business_unit_groups bug
  WHERE bug.name = tbg.name
)
ORDER BY tbg.name;

-- STEP 4: Report results
DO $$
DECLARE
  inserted_count INTEGER;
  bug_count INTEGER;
  tbg_count INTEGER;
  still_missing INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  SELECT COUNT(*) INTO bug_count FROM business_unit_groups;
  SELECT COUNT(*) INTO tbg_count FROM target_business_groups;
  
  SELECT COUNT(*) INTO still_missing
  FROM target_business_groups tbg
  WHERE NOT EXISTS (
    SELECT 1 FROM business_unit_groups bug
    WHERE bug.name = tbg.name
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SYNC COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Records inserted into business_unit_groups: %', inserted_count;
  RAISE NOTICE 'Total business_unit_groups now: %', bug_count;
  RAISE NOTICE 'Total target_business_groups: %', tbg_count;
  RAISE NOTICE 'Still missing: %', still_missing;
  
  IF still_missing = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: All target_business_groups now exist in business_unit_groups';
    RAISE NOTICE '✅ You can now run script 022-merge-business-groups.sql';
  ELSE
    RAISE WARNING '⚠️  WARNING: % groups still missing - check for name mismatches', still_missing;
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;

-- STEP 5: Verify by showing sample mappings
DO $$
DECLARE
  sample RECORD;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Sample name mappings (first 10):';
  RAISE NOTICE '------------------------------------------------------------';
  
  FOR sample IN
    SELECT 
      tbg.id as tbg_id,
      tbg.name as tbg_name,
      bug.id as bug_id,
      bug.name as bug_name
    FROM target_business_groups tbg
    JOIN business_unit_groups bug ON tbg.name = bug.name
    ORDER BY tbg.name
    LIMIT 10
  LOOP
    counter := counter + 1;
    RAISE NOTICE '%: TBG(%) "%" → BUG(%) "%"', 
      counter, 
      sample.tbg_id, 
      sample.tbg_name, 
      sample.bug_id, 
      sample.bug_name;
  END LOOP;
  
  RAISE NOTICE '------------------------------------------------------------';
END $$;
