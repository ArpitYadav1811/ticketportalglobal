-- ============================================================================
-- Migration Script 026: Add role column to my_team_members
-- ============================================================================
-- Description: Adds role-based permissions for team leads
-- Date: 2026-02-27
-- Author: Database Architect
-- Risk Level: LOW - Additive change with default value
-- Rollback: See 026-rollback-add-role-to-my-team.sql
-- ============================================================================

-- STEP 1: Verify table exists (create if not)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'my_team_members') THEN
    RAISE NOTICE 'my_team_members table does not exist, creating...';
    
    CREATE TABLE my_team_members (
      id SERIAL PRIMARY KEY,
      lead_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lead_user_id, member_user_id)
    );
    
    CREATE INDEX idx_my_team_members_lead ON my_team_members(lead_user_id);
    CREATE INDEX idx_my_team_members_member ON my_team_members(member_user_id);
    
    RAISE NOTICE 'my_team_members table created';
  ELSE
    RAISE NOTICE 'my_team_members table exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Show current data
-- ============================================================================
DO $$
DECLARE
  team_member_count INTEGER;
  unique_leads INTEGER;
BEGIN
  SELECT COUNT(*) INTO team_member_count FROM my_team_members;
  SELECT COUNT(DISTINCT lead_user_id) INTO unique_leads FROM my_team_members;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CURRENT STATE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total team member relationships: %', team_member_count;
  RAISE NOTICE 'Unique leads: %', unique_leads;
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- STEP 3: Add role column
-- ============================================================================
RAISE NOTICE 'Adding role column to my_team_members...';

ALTER TABLE my_team_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';

RAISE NOTICE 'Column added';

-- ============================================================================
-- STEP 4: Add check constraint for valid roles
-- ============================================================================
RAISE NOTICE 'Adding check constraint...';

ALTER TABLE my_team_members 
DROP CONSTRAINT IF EXISTS my_team_members_role_check;

ALTER TABLE my_team_members 
ADD CONSTRAINT my_team_members_role_check 
CHECK (role IN ('lead', 'member'));

RAISE NOTICE 'Check constraint added';

-- ============================================================================
-- STEP 5: Update existing records to 'member' (if any have NULL)
-- ============================================================================
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE my_team_members 
  SET role = 'member' 
  WHERE role IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % existing records to role=member', updated_count;
  ELSE
    RAISE NOTICE 'No NULL roles found (expected with DEFAULT)';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Make role NOT NULL
-- ============================================================================
RAISE NOTICE 'Setting role column to NOT NULL...';

ALTER TABLE my_team_members 
ALTER COLUMN role SET NOT NULL;

RAISE NOTICE 'role column is now NOT NULL';

-- ============================================================================
-- STEP 7: Create index for role-based queries
-- ============================================================================
RAISE NOTICE 'Creating index for role queries...';

CREATE INDEX IF NOT EXISTS idx_my_team_members_role 
ON my_team_members(role);

-- Composite index for lead + role queries
CREATE INDEX IF NOT EXISTS idx_my_team_members_lead_role 
ON my_team_members(lead_user_id, role);

RAISE NOTICE 'Indexes created';

-- ============================================================================
-- STEP 8: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN my_team_members.role IS 
'Role of the team member: "lead" (can comment/attach on team tickets) or "member" (standard member)';

COMMENT ON TABLE my_team_members IS 
'Personal team management - allows users to designate others as their team for ticket visibility and collaboration';

-- ============================================================================
-- STEP 9: Create helper view for leads
-- ============================================================================
RAISE NOTICE 'Creating helper view...';

CREATE OR REPLACE VIEW team_leads AS
SELECT DISTINCT
  mtm.lead_user_id,
  u.full_name as lead_name,
  u.email as lead_email,
  COUNT(mtm.member_user_id) as team_size,
  COUNT(CASE WHEN mtm.role = 'lead' THEN 1 END) as lead_count,
  COUNT(CASE WHEN mtm.role = 'member' THEN 1 END) as member_count
FROM my_team_members mtm
JOIN users u ON mtm.lead_user_id = u.id
GROUP BY mtm.lead_user_id, u.full_name, u.email;

COMMENT ON VIEW team_leads IS 
'Summary view of team leads and their team composition';

RAISE NOTICE 'Helper view created';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
DO $$
DECLARE
  col_exists BOOLEAN;
  col_type TEXT;
  col_nullable TEXT;
  constraint_exists BOOLEAN;
  total_members INTEGER;
  lead_members INTEGER;
  regular_members INTEGER;
BEGIN
  -- Check column exists and properties
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'my_team_members' AND column_name = 'role'),
    data_type,
    is_nullable
  INTO col_exists, col_type, col_nullable
  FROM information_schema.columns 
  WHERE table_name = 'my_team_members' 
  AND column_name = 'role';
  
  -- Check constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'my_team_members_role_check'
  ) INTO constraint_exists;
  
  -- Count members by role
  SELECT COUNT(*) INTO total_members FROM my_team_members;
  
  SELECT COUNT(*) INTO lead_members 
  FROM my_team_members 
  WHERE role = 'lead';
  
  SELECT COUNT(*) INTO regular_members 
  FROM my_team_members 
  WHERE role = 'member';
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 026 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'role column exists: %', col_exists;
  RAISE NOTICE 'Column type: %', col_type;
  RAISE NOTICE 'Nullable: %', col_nullable;
  RAISE NOTICE 'Check constraint exists: %', constraint_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Team member statistics:';
  RAISE NOTICE '  Total: %', total_members;
  RAISE NOTICE '  Leads: %', lead_members;
  RAISE NOTICE '  Members: %', regular_members;
  
  IF col_exists AND col_type = 'character varying' AND col_nullable = 'NO' AND constraint_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE 'SUCCESS: role column added with constraints';
  ELSE
    RAISE EXCEPTION 'FAILED: Migration incomplete';
  END IF;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PERMISSION MATRIX FOR LEADS:';
  RAISE NOTICE '  - View team member tickets: YES';
  RAISE NOTICE '  - Add comments: YES';
  RAISE NOTICE '  - Add attachments: YES';
  RAISE NOTICE '  - Edit ticket fields: NO (unless also SPOC)';
  RAISE NOTICE '  - Change status: NO (unless also SPOC)';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Update addMyTeamMember() to accept role parameter';
  RAISE NOTICE '2. Add updateMyTeamMemberRole() function';
  RAISE NOTICE '3. Update UI to allow role selection';
  RAISE NOTICE '4. Implement permission checks in ticket actions';
  RAISE NOTICE '============================================================================';
END $$;
