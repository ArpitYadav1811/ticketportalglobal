-- ============================================================================
-- Migration Script 035: Add SPOC Support to Functional Areas
-- ============================================================================
-- Description: Adds primary_spoc_name and secondary_spoc_name columns to 
--              functional_areas table (similar to business_unit_groups)
-- Date: 2026-03-12
-- Risk Level: LOW - Adding nullable columns
-- ============================================================================

-- STEP 1: Add SPOC column to functional_areas table
ALTER TABLE functional_areas
ADD COLUMN IF NOT EXISTS spoc_name VARCHAR(255);

-- STEP 2: Add comments for documentation
COMMENT ON COLUMN functional_areas.spoc_name IS 'SPOC (Single Point of Contact) for this functional area';

-- STEP 3: Create index for better performance when searching by SPOC
CREATE INDEX IF NOT EXISTS idx_functional_areas_spoc 
ON functional_areas(spoc_name) 
WHERE spoc_name IS NOT NULL;

-- STEP 4: Verification
DO $$
DECLARE
  fa_count INTEGER;
  spoc_count INTEGER;
BEGIN
  -- Count functional areas
  SELECT COUNT(*) INTO fa_count FROM functional_areas;
  
  -- Count functional areas with SPOCs
  SELECT COUNT(*) INTO spoc_count 
  FROM functional_areas 
  WHERE spoc_name IS NOT NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 035 COMPLETE: Add SPOC Support to Functional Areas';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total functional areas: %', fa_count;
  RAISE NOTICE 'Functional areas with SPOC: %', spoc_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS: SPOC column added to functional_areas table';
  RAISE NOTICE '   - spoc_name (VARCHAR(255), nullable)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Update functional areas with SPOC names in Admin Dashboard';
  RAISE NOTICE '   2. SPOCs can be assigned from the FA Mappings tab';
  RAISE NOTICE '============================================================================';
END $$;

-- STEP 5: Show current functional areas structure
SELECT 
  id,
  name,
  description,
  spoc_name,
  created_at
FROM functional_areas
ORDER BY name
LIMIT 10;
