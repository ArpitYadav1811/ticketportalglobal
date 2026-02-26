-- ============================================================================
-- Complete SQL Script: Seed Functional Areas (Organizations) and Mappings
-- Run this script directly in Neon SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES (if they don't exist)
-- ============================================================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create organization to target business group mapping table
CREATE TABLE IF NOT EXISTS organization_target_business_group_mapping (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_business_group_id INTEGER NOT NULL REFERENCES target_business_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, target_business_group_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_tbg_mapping_org ON organization_target_business_group_mapping(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_tbg_mapping_tbg ON organization_target_business_group_mapping(target_business_group_id);

-- ============================================================================
-- STEP 2: ENSURE TARGET BUSINESS GROUPS EXIST
-- ============================================================================

INSERT INTO target_business_groups (name, description) VALUES
  ('TD Apps', 'Tech Delivery Apps Team'),
  ('TD Web', 'Tech Delivery Web Team'),
  ('TD Brand', 'Tech Delivery Brand Team'),
  ('TD BM', 'Tech Delivery Brand Monitoring Team'),
  ('TD RMN', 'Tech Delivery RMN Team'),
  ('TD Central', 'Tech Delivery Central Team'),
  ('TD GUI', 'Tech Delivery GUI Team'),
  ('TD Integrations', 'Tech Delivery Integrations Team'),
  ('TD IS', 'Tech Delivery Information Systems Team'),
  ('TD Product', 'Tech Delivery Product Team')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 3: INSERT FUNCTIONAL AREAS (ORGANIZATIONS)
-- ============================================================================

INSERT INTO organizations (name, description) VALUES
  ('MFBuddy support', 'MFBuddy Support Functional Area'),
  ('Customer Portal support', 'Customer Portal Support Functional Area'),
  ('Ticket Portal support', 'Ticket Portal Support Functional Area'),
  ('Billing Portal support', 'Billing Portal Support Functional Area'),
  ('Customer Integrations support', 'Customer Integrations Support Functional Area'),
  ('GUI Development support', 'GUI Development Support Functional Area'),
  ('IT Administration support', 'IT Administration Support Functional Area'),
  ('IT Security support', 'IT Security Support Functional Area'),
  ('IT DevOps support', 'IT DevOps Support Functional Area'),
  ('Customer Solutions support', 'Customer Solutions Support Functional Area'),
  ('Competitive Research support', 'Competitive Research Support Functional Area'),
  ('Others', 'Other Support Functional Areas')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 4: CLEAR EXISTING MAPPINGS (Optional - uncomment if you want to reset)
-- ============================================================================

-- DELETE FROM organization_target_business_group_mapping;

-- ============================================================================
-- STEP 5: CREATE FUNCTIONAL AREA TO TARGET BUSINESS GROUP MAPPINGS
-- ============================================================================

-- MFBuddy support -> TD Central
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'MFBuddy support' AND tbg.name = 'TD Central'
ON CONFLICT DO NOTHING;

-- Customer Portal support -> TD Central
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'Customer Portal support' AND tbg.name = 'TD Central'
ON CONFLICT DO NOTHING;

-- Ticket Portal support -> TD GUI
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'Ticket Portal support' AND tbg.name = 'TD GUI'
ON CONFLICT DO NOTHING;

-- Billing Portal support -> TD Central
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'Billing Portal support' AND tbg.name = 'TD Central'
ON CONFLICT DO NOTHING;

-- Customer Integrations support -> TD Integrations
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'Customer Integrations support' AND tbg.name = 'TD Integrations'
ON CONFLICT DO NOTHING;

-- GUI Development support -> TD GUI
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'GUI Development support' AND tbg.name = 'TD GUI'
ON CONFLICT DO NOTHING;

-- IT Administration support -> TD IS
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'IT Administration support' AND tbg.name = 'TD IS'
ON CONFLICT DO NOTHING;

-- IT Security support -> TD IS
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'IT Security support' AND tbg.name = 'TD IS'
ON CONFLICT DO NOTHING;

-- IT DevOps support -> TD IS
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'IT DevOps support' AND tbg.name = 'TD IS'
ON CONFLICT DO NOTHING;

-- Customer Solutions support -> TD Product
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'Customer Solutions support' AND tbg.name = 'TD Product'
ON CONFLICT DO NOTHING;

-- Competitive Research support -> TD Product
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'Competitive Research support' AND tbg.name = 'TD Product'
ON CONFLICT DO NOTHING;

-- Others -> All target business groups (TD Apps, TD Web, TD Brand, TD BM, TD RMN, TD Central, TD GUI, TD Integrations, TD IS, TD Product)
INSERT INTO organization_target_business_group_mapping (organization_id, target_business_group_id)
SELECT o.id, tbg.id
FROM organizations o, target_business_groups tbg
WHERE o.name = 'Others' 
  AND tbg.name IN ('TD Apps', 'TD Web', 'TD Brand', 'TD BM', 'TD RMN', 'TD Central', 'TD GUI', 'TD Integrations', 'TD IS', 'TD Product')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: VERIFY MAPPINGS
-- ============================================================================

SELECT 
  o.name as functional_area,
  tbg.name as target_business_group,
  COUNT(*) as mapping_count
FROM organizations o
JOIN organization_target_business_group_mapping otbgm ON o.id = otbgm.organization_id
JOIN target_business_groups tbg ON otbgm.target_business_group_id = tbg.id
GROUP BY o.name, tbg.name
ORDER BY o.name, tbg.name;

-- ============================================================================
-- VERIFICATION QUERIES (Run separately to check)
-- ============================================================================

-- Check total organizations count
-- SELECT COUNT(*) as total_organizations FROM organizations;

-- Check total mappings count
-- SELECT COUNT(*) as total_mappings FROM organization_target_business_group_mapping;

-- List all organizations
-- SELECT id, name, description FROM organizations ORDER BY name;
