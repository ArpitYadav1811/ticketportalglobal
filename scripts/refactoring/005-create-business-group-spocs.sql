-- =====================================================
-- BUSINESS GROUP SPOCS TABLE
-- =====================================================
-- Purpose: Proper entity for SPOC management with foreign keys
-- Replaces: spoc_name, primary_spoc_name, secondary_spoc_name in business_unit_groups
-- Benefits: Allows multiple SPOCs, proper referential integrity, easier queries
-- =====================================================

-- Create enum for SPOC types
CREATE TYPE spoc_type AS ENUM (
  'primary',
  'secondary',
  'functional_area'
);

-- Create business_group_spocs table
CREATE TABLE business_group_spocs (
  id SERIAL PRIMARY KEY,
  business_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spoc_type spoc_type NOT NULL DEFAULT 'secondary',
  
  -- Metadata
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure unique SPOC type per business group
  UNIQUE(business_group_id, user_id, spoc_type)
);

-- Create indexes
CREATE INDEX idx_business_group_spocs_group ON business_group_spocs(business_group_id);
CREATE INDEX idx_business_group_spocs_user ON business_group_spocs(user_id);
CREATE INDEX idx_business_group_spocs_type ON business_group_spocs(spoc_type);
CREATE INDEX idx_business_group_spocs_active ON business_group_spocs(is_active) WHERE is_active = true;

-- Composite index for common queries
CREATE INDEX idx_business_group_spocs_group_type ON business_group_spocs(business_group_id, spoc_type) WHERE is_active = true;

-- Comments for documentation
COMMENT ON TABLE business_group_spocs IS 'Manages SPOC (Single Point of Contact) assignments for business groups';
COMMENT ON COLUMN business_group_spocs.spoc_type IS 'Type of SPOC: primary (main contact), secondary (backup), functional_area (cross-group)';
COMMENT ON COLUMN business_group_spocs.is_active IS 'Whether this SPOC assignment is currently active';
COMMENT ON COLUMN business_group_spocs.assigned_by IS 'User who assigned this SPOC (typically admin or superadmin)';

-- Add constraint: Only one active primary SPOC per business group
CREATE UNIQUE INDEX idx_business_group_spocs_one_primary 
  ON business_group_spocs(business_group_id) 
  WHERE spoc_type = 'primary' AND is_active = true;
