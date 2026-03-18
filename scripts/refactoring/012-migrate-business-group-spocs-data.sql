-- =====================================================
-- DATA MIGRATION: BUSINESS GROUP SPOCS
-- =====================================================
-- Purpose: Migrate SPOC data from string columns to proper entity table
-- Prerequisites: Run 005-create-business-group-spocs.sql first
-- =====================================================

-- Step 1: Migrate Primary SPOCs
-- Match by full_name in users table
INSERT INTO business_group_spocs (
  business_group_id,
  user_id,
  spoc_type,
  is_active,
  assigned_at
)
SELECT DISTINCT
  bg.id,
  u.id,
  'primary'::spoc_type,
  true,
  CURRENT_TIMESTAMP
FROM business_unit_groups bg
JOIN users u ON u.full_name = COALESCE(bg.primary_spoc_name, bg.spoc_name)
WHERE COALESCE(bg.primary_spoc_name, bg.spoc_name) IS NOT NULL
ON CONFLICT (business_group_id, user_id, spoc_type) DO NOTHING;

-- Step 2: Migrate Secondary SPOCs
INSERT INTO business_group_spocs (
  business_group_id,
  user_id,
  spoc_type,
  is_active,
  assigned_at
)
SELECT DISTINCT
  bg.id,
  u.id,
  'secondary'::spoc_type,
  true,
  CURRENT_TIMESTAMP
FROM business_unit_groups bg
JOIN users u ON u.full_name = bg.secondary_spoc_name
WHERE bg.secondary_spoc_name IS NOT NULL
ON CONFLICT (business_group_id, user_id, spoc_type) DO NOTHING;

-- Step 3: Migrate Functional Area SPOCs
INSERT INTO business_group_spocs (
  business_group_id,
  user_id,
  spoc_type,
  is_active,
  assigned_at
)
SELECT DISTINCT
  fabgm.target_business_group_id,
  u.id,
  'functional_area'::spoc_type,
  true,
  CURRENT_TIMESTAMP
FROM functional_areas fa
JOIN functional_area_business_group_mapping fabgm ON fabgm.functional_area_id = fa.id
JOIN users u ON u.full_name = fa.spoc_name
WHERE fa.spoc_name IS NOT NULL
ON CONFLICT (business_group_id, user_id, spoc_type) DO NOTHING;

-- Verify migration
SELECT 
  spoc_type,
  COUNT(*) as spoc_count,
  COUNT(DISTINCT business_group_id) as groups_with_spocs,
  COUNT(DISTINCT user_id) as unique_spoc_users
FROM business_group_spocs
WHERE is_active = true
GROUP BY spoc_type
ORDER BY spoc_type;

-- Show business groups without primary SPOC
SELECT 
  bg.id,
  bg.name,
  bg.primary_spoc_name,
  bg.spoc_name,
  'No matching user found' as issue
FROM business_unit_groups bg
LEFT JOIN business_group_spocs bgs ON bgs.business_group_id = bg.id AND bgs.spoc_type = 'primary'
WHERE 
  bgs.id IS NULL
  AND (bg.primary_spoc_name IS NOT NULL OR bg.spoc_name IS NOT NULL);

-- Show users who are SPOCs for multiple groups
SELECT 
  u.id,
  u.full_name,
  u.email,
  COUNT(DISTINCT bgs.business_group_id) as group_count,
  STRING_AGG(DISTINCT bgs.spoc_type::TEXT, ', ') as spoc_types
FROM users u
JOIN business_group_spocs bgs ON bgs.user_id = u.id
WHERE bgs.is_active = true
GROUP BY u.id, u.full_name, u.email
HAVING COUNT(DISTINCT bgs.business_group_id) > 1
ORDER BY group_count DESC;
