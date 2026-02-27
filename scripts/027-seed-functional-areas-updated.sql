-- ============================================================================
-- Updated Script: Seed Functional Areas and Mappings
-- Post-Migration Version (after target_business_groups merger)
-- ============================================================================
-- Description: Seeds functional_areas and maps them to business_unit_groups
-- Date: 2026-02-27
-- Note: Updated to use business_unit_groups instead of target_business_groups
-- Note: Uses functional_areas table (renamed from organizations for clarity)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES IF THEY DON'T EXIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS functional_areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS functional_area_business_group_mapping (
  id SERIAL PRIMARY KEY,
  functional_area_id INTEGER NOT NULL REFERENCES functional_areas(id) ON DELETE CASCADE,
  target_business_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(functional_area_id, target_business_group_id)
);

CREATE INDEX IF NOT EXISTS idx_functional_area_bg_mapping_fa ON functional_area_business_group_mapping(functional_area_id);
CREATE INDEX IF NOT EXISTS idx_functional_area_bg_mapping_bg ON functional_area_business_group_mapping(target_business_group_id);

-- ============================================================================
-- STEP 2: INSERT FUNCTIONAL AREAS
-- ============================================================================

INSERT INTO functional_areas (name, description) VALUES
  ('MFBuddy support', 'Support for MFBuddy application'),
  ('Customer Portal support', 'Support for Customer Portal'),
  ('Ticket Portal support', 'Support for Ticket Portal'),
  ('Billing Portal support', 'Support for Billing Portal'),
  ('Customer Integrations support', 'Support for Customer Integrations'),
  ('GUI Development support', 'GUI Development work'),
  ('IT Administration support', 'IT Administration tasks'),
  ('IT Security support', 'IT Security tasks'),
  ('IT DevOps support', 'IT DevOps tasks'),
  ('Customer Solutions support', 'Customer Solutions work'),
  ('Competitive Research support', 'Competitive Research work'),
  ('Others', 'Other functional areas')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE MAPPINGS (Functional Area → Business Unit Group)
-- ============================================================================

-- Note: Now using business_unit_groups instead of target_business_groups

-- MFBuddy support → TD Central
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'MFBuddy support' AND bug.name = 'TD Central'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Customer Portal support → TD Central
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Customer Portal support' AND bug.name = 'TD Central'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Ticket Portal support → TD GUI
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Ticket Portal support' AND bug.name = 'TD GUI'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Billing Portal support → TD Central
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Billing Portal support' AND bug.name = 'TD Central'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Customer Integrations support → TD Integrations
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Customer Integrations support' AND bug.name = 'TD Integrations'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- GUI Development support → TD GUI
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'GUI Development support' AND bug.name = 'TD GUI'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- IT Administration support → TD IS
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'IT Administration support' AND bug.name = 'TD IS'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- IT Security support → TD IS
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'IT Security support' AND bug.name = 'TD IS'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- IT DevOps support → TD IS
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'IT DevOps support' AND bug.name = 'TD IS'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Customer Solutions support → TD Product
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Customer Solutions support' AND bug.name = 'TD Product'
ON CONFLICT (functional_area_id, target_business_group_id) DO NOTHING;

-- Competitive Research support → TD Product
INSERT INTO functional_area_business_group_mapping (functional_area_id, target_business_group_id)
SELECT fa.id, bug.id
FROM functional_areas fa
CROSS JOIN business_unit_groups bug
WHERE fa.name = 'Competitive Research support' AND bug.name = 'TD Product'
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
  org_count INTEGER;
  mapping_count INTEGER;
  bug_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM functional_areas;
  SELECT COUNT(*) INTO mapping_count FROM functional_area_business_group_mapping;
  SELECT COUNT(*) INTO bug_count FROM business_unit_groups;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'FUNCTIONAL AREAS SEEDING COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Functional Areas: %', org_count;
  RAISE NOTICE 'Business Unit Groups: %', bug_count;
  RAISE NOTICE 'Mappings created: %', mapping_count;
  RAISE NOTICE '============================================================================';
  
  IF org_count >= 12 AND mapping_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Functional areas seeded successfully';
  ELSE
    RAISE WARNING '⚠️  Check data: Expected 12 functional areas and multiple mappings';
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;

-- Show sample mappings
SELECT 
  fa.name as functional_area,
  bug.name as target_business_group
FROM functional_area_business_group_mapping fabgm
JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
ORDER BY fa.name, bug.name
LIMIT 20;
