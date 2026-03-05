-- ============================================================================
-- Migration Script: Update Business Group SPOCs
-- ============================================================================
-- Description: Sets SPOC names for all business unit groups according to the
--              new functional area mappings
-- Date: 2026-02-27
-- ============================================================================

-- ============================================================================
-- UPDATE SPOC NAMES FOR BUSINESS UNIT GROUPS
-- ============================================================================

-- TD Apps -> Joji Joseph
UPDATE business_unit_groups 
SET spoc_name = 'Joji Joseph'
WHERE name = 'TD Apps';

-- TD Web -> Soju Jose
UPDATE business_unit_groups 
SET spoc_name = 'Soju Jose'
WHERE name = 'TD Web';

-- TD BM -> Joji Joseph
UPDATE business_unit_groups 
SET spoc_name = 'Joji Joseph'
WHERE name = 'TD BM';

-- TD RMN -> Santosh Kumar
UPDATE business_unit_groups 
SET spoc_name = 'Santosh Kumar'
WHERE name = 'TD RMN';

-- TD Central -> Sachin Kumar
-- Note: Check if user exists as "sachin kumar" (lowercase) and update if needed
UPDATE business_unit_groups 
SET spoc_name = 'Sachin Kumar'
WHERE name = 'TD Central';

-- Also update user's full_name to match if it's lowercase
UPDATE users 
SET full_name = 'Sachin Kumar'
WHERE LOWER(full_name) = 'sachin kumar' AND full_name != 'Sachin Kumar';

-- TD Integrations -> Apar Bhatnagar
UPDATE business_unit_groups 
SET spoc_name = 'Apar Bhatnagar'
WHERE name = 'TD Integrations';

-- TD GUI -> Chethana H
UPDATE business_unit_groups 
SET spoc_name = 'Chethana H'
WHERE name = 'TD GUI';

-- TD IS -> Gaurav Verma
UPDATE business_unit_groups 
SET spoc_name = 'Gaurav Verma'
WHERE name = 'TD IS';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM business_unit_groups 
  WHERE spoc_name IS NOT NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SPOC UPDATE COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Business groups with SPOC assigned: %', updated_count;
  RAISE NOTICE '============================================================================';
END $$;

-- Show all business groups with their SPOCs
SELECT 
  bug.name as business_group,
  bug.spoc_name,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ User found'
    WHEN bug.spoc_name IS NOT NULL THEN '⚠️  User not found - ensure user exists with this exact name'
    ELSE '❌ No SPOC assigned'
  END as status,
  u.id as user_id,
  u.email as user_email
FROM business_unit_groups bug
LEFT JOIN users u ON u.full_name = bug.spoc_name
ORDER BY bug.name;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 
-- For SPOC to work correctly, you must ensure that users exist in the 
-- users table with the exact full_name matching the spoc_name:
--
-- - Joji Joseph
-- - Soju Jose
-- - Santosh Kumar
-- - Sachin Kumar
-- - Apar Bhatnagar
-- - Chethana H
-- - Gaurav Verma
--
-- If users don't exist, create them or update existing users' full_name
-- to match exactly (case-sensitive).
-- ============================================================================
