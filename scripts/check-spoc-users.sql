-- ============================================================================
-- Check Script: Verify SPOC Users Exist
-- ============================================================================
-- Description: Checks if users with SPOC names exist in the users table
-- ============================================================================

-- Show all business groups and their SPOC status
SELECT 
  bug.name as business_group,
  bug.spoc_name as assigned_spoc_name,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ User found'
    WHEN bug.spoc_name IS NOT NULL THEN '⚠️  User NOT found - needs to be created'
    ELSE '❌ No SPOC assigned'
  END as status,
  u.id as user_id,
  u.full_name as user_full_name,
  u.email as user_email
FROM business_unit_groups bug
LEFT JOIN users u ON u.full_name = bug.spoc_name
ORDER BY bug.name;

-- Show all users for reference
SELECT 
  id,
  full_name,
  email,
  role,
  business_unit_group_id
FROM users
ORDER BY full_name;
