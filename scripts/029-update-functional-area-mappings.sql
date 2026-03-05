-- ============================================================================
-- Migration Script: Update Functional Area Mappings
-- ============================================================================
-- Description: Updates functional area names, adds new ones, removes obsolete ones,
--              and updates all mappings according to the new structure
-- Date: 2026-02-27
-- ============================================================================

-- ============================================================================
-- STEP 1: UPDATE EXISTING FUNCTIONAL AREA NAMES
-- ============================================================================

-- Update existing functional area names where there's a clear mapping
UPDATE functional_areas SET name = 'Tool MFBuddy', description = 'Support for MFBuddy application' WHERE name = 'MFBuddy support';
UPDATE functional_areas SET name = 'Tool Cportal', description = 'Support for Customer Portal' WHERE name = 'Customer Portal support';
UPDATE functional_areas SET name = 'Tool Tportal', description = 'Support for Ticket Portal' WHERE name = 'Ticket Portal support';
UPDATE functional_areas SET name = 'Tool Bportal', description = 'Support for Billing Portal' WHERE name = 'Billing Portal support';
UPDATE functional_areas SET name = 'Dev Integrations', description = 'Support for Customer Integrations' WHERE name = 'Customer Integrations support';
UPDATE functional_areas SET name = 'Dev GUI', description = 'GUI Development work' WHERE name = 'GUI Development support';
UPDATE functional_areas SET name = 'IT Admin', description = 'IT Administration tasks' WHERE name = 'IT Administration support';
UPDATE functional_areas SET name = 'IT InfoSec', description = 'IT Security tasks' WHERE name = 'IT Security support';
UPDATE functional_areas SET name = 'IT DevOps', description = 'IT DevOps tasks' WHERE name = 'IT DevOps support';

-- ============================================================================
-- STEP 2: INSERT NEW FUNCTIONAL AREAS
-- ============================================================================

INSERT INTO functional_areas (name, description) VALUES
  ('CS Apps', 'Customer Success Applications'),
  ('CS Web', 'Customer Success Web Services'),
  ('CS Brand', 'Customer Success Brand Management'),
  ('CS BM', 'Brand Monitoring'),
  ('CS RMN', 'Customer Success RMN')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 3: DELETE OBSOLETE FUNCTIONAL AREAS
-- ============================================================================

-- Delete obsolete functional areas (they will cascade delete their mappings)
DELETE FROM functional_areas WHERE name IN ('Customer Solutions support', 'Competitive Research support');

-- ============================================================================
-- STEP 4: DELETE ALL EXISTING MAPPINGS
-- ============================================================================

-- Clear all existing mappings to recreate them with new structure
DELETE FROM functional_area_business_group_mapping;

-- ============================================================================
-- STEP 5: CREATE NEW MAPPINGS (Functional Area → Business Unit Group)
-- ============================================================================

-- CS Apps → TD Apps
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'CS Apps' AND bug.name = 'TD Apps'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- CS Web → TD Web
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'CS Web' AND bug.name = 'TD Web'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- CS Brand → TD Web
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'CS Brand' AND bug.name = 'TD Web'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- CS BM → TD BM
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'CS BM' AND bug.name = 'TD BM'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- CS RMN → TD RMN
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'CS RMN' AND bug.name = 'TD RMN'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Tool MFBuddy → TD Central
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Tool MFBuddy' AND bug.name = 'TD Central'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Tool Cportal → TD Central
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Tool Cportal' AND bug.name = 'TD Central'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Tool Tportal → TD Central
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Tool Tportal' AND bug.name = 'TD Central'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Tool Bportal → TD Central
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Tool Bportal' AND bug.name = 'TD Central'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Dev Integrations → TD Integrations
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Dev Integrations' AND bug.name = 'TD Integrations'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Dev GUI → TD GUI
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Dev GUI' AND bug.name = 'TD GUI'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- IT Admin → TD IS
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'IT Admin' AND bug.name = 'TD IS'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- IT InfoSec → TD IS
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'IT InfoSec' AND bug.name = 'TD IS'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- IT DevOps → TD IS
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'IT DevOps' AND bug.name = 'TD IS'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Others → Map to all business unit groups
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Others'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  fa_count INTEGER;
  mapping_count INTEGER;
  bug_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fa_count FROM functional_areas;
  SELECT COUNT(*) INTO mapping_count FROM functional_area_business_group_mapping;
  SELECT COUNT(*) INTO bug_count FROM business_unit_groups;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'FUNCTIONAL AREA MAPPING UPDATE COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Functional Areas: %', fa_count;
  RAISE NOTICE 'Business Unit Groups: %', bug_count;
  RAISE NOTICE 'Mappings created: %', mapping_count;
  RAISE NOTICE '============================================================================';
  
  IF fa_count >= 14 AND mapping_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Functional area mappings updated successfully';
  ELSE
    RAISE WARNING '⚠️  Check data: Expected at least 14 functional areas and multiple mappings';
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;

-- Show all mappings
SELECT 
  fa.name as functional_area,
  bug.name as business_unit_group
FROM functional_area_business_group_mapping fabgm
JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
ORDER BY fa.name, bug.name;
