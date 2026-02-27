-- ============================================================================
-- Diagnostic Script: Check business_unit_groups vs target_business_groups
-- ============================================================================
-- Purpose: Shows exactly which groups are missing and why
-- ============================================================================

-- Show all target_business_groups
SELECT 
  'TARGET_BUSINESS_GROUPS' as table_name,
  id,
  name,
  description,
  created_at
FROM target_business_groups
ORDER BY name;

RAISE NOTICE '';
RAISE NOTICE '============================================================================';

-- Show all business_unit_groups
SELECT 
  'BUSINESS_UNIT_GROUPS' as table_name,
  id,
  name,
  description,
  created_at
FROM business_unit_groups
ORDER BY name;

RAISE NOTICE '';
RAISE NOTICE '============================================================================';

-- Show missing groups
SELECT 
  'MISSING IN BUSINESS_UNIT_GROUPS' as status,
  tbg.id,
  tbg.name,
  tbg.description
FROM target_business_groups tbg
WHERE NOT EXISTS (
  SELECT 1 FROM business_unit_groups bug
  WHERE bug.name = tbg.name
)
ORDER BY tbg.name;

RAISE NOTICE '';
RAISE NOTICE '============================================================================';

-- Show counts
SELECT 
  (SELECT COUNT(*) FROM business_unit_groups) as business_unit_groups_count,
  (SELECT COUNT(*) FROM target_business_groups) as target_business_groups_count,
  (SELECT COUNT(*) 
   FROM target_business_groups tbg
   WHERE NOT EXISTS (
     SELECT 1 FROM business_unit_groups bug
     WHERE bug.name = tbg.name
   )) as missing_count;
