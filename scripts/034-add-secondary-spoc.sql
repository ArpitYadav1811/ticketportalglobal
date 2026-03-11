-- ============================================================================
-- Migration Script: Add Secondary SPOC Support
-- ============================================================================
-- Description: Adds secondary_spoc_name column to business_unit_groups table
--              to support dual SPOC system (Primary and Secondary)
-- Date: 2026-02-27
-- ============================================================================

-- Add secondary_spoc_name column
ALTER TABLE business_unit_groups
ADD COLUMN IF NOT EXISTS secondary_spoc_name VARCHAR(255);

-- Add primary_spoc_name column (alias for spoc_name for clarity)
-- We keep spoc_name as the primary field for backward compatibility
ALTER TABLE business_unit_groups
ADD COLUMN IF NOT EXISTS primary_spoc_name VARCHAR(255);

-- Copy existing spoc_name to primary_spoc_name for consistency
UPDATE business_unit_groups
SET primary_spoc_name = spoc_name
WHERE spoc_name IS NOT NULL AND (primary_spoc_name IS NULL OR primary_spoc_name = '');

-- Ensure primary_spoc_name stays in sync with spoc_name going forward
-- (spoc_name remains the source of truth for primary SPOC)

-- Add comment for documentation
COMMENT ON COLUMN business_unit_groups.spoc_name IS 'Primary SPOC name (default SPOC)';
COMMENT ON COLUMN business_unit_groups.primary_spoc_name IS 'Primary SPOC name (alias for spoc_name)';
COMMENT ON COLUMN business_unit_groups.secondary_spoc_name IS 'Secondary SPOC name (can only be updated by Primary SPOC)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  total_groups INTEGER;
  groups_with_primary INTEGER;
  groups_with_secondary INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_groups FROM business_unit_groups;
  SELECT COUNT(*) INTO groups_with_primary FROM business_unit_groups WHERE spoc_name IS NOT NULL OR primary_spoc_name IS NOT NULL;
  SELECT COUNT(*) INTO groups_with_secondary FROM business_unit_groups WHERE secondary_spoc_name IS NOT NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SECONDARY SPOC MIGRATION COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total business groups: %', total_groups;
  RAISE NOTICE 'Groups with Primary SPOC: %', groups_with_primary;
  RAISE NOTICE 'Groups with Secondary SPOC: %', groups_with_secondary;
  RAISE NOTICE '============================================================================';
END $$;

-- Show all business groups with their SPOCs
SELECT 
  bug.name as business_group,
  bug.spoc_name as primary_spoc,
  bug.primary_spoc_name as primary_spoc_alias,
  bug.secondary_spoc_name as secondary_spoc,
  CASE 
    WHEN bug.spoc_name IS NOT NULL THEN '✅ Primary SPOC assigned'
    ELSE '❌ No Primary SPOC'
  END as primary_status,
  CASE 
    WHEN bug.secondary_spoc_name IS NOT NULL THEN '✅ Secondary SPOC assigned'
    ELSE '— No Secondary SPOC'
  END as secondary_status
FROM business_unit_groups bug
ORDER BY bug.name;
