-- ============================================================================
-- Migration Script 025: Add project_id to product_releases
-- ============================================================================
-- Description: Links product_releases to specific projects for better organization
-- Date: 2026-02-27
-- Author: Database Architect
-- Risk Level: LOW - Additive change, no data loss
-- Rollback: See 025-rollback-add-project-to-releases.sql
-- ============================================================================

-- STEP 1: Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_releases') THEN
    RAISE EXCEPTION 'product_releases table does not exist. Run add-brd-features.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    RAISE EXCEPTION 'projects table does not exist. Run add-spoc-and-projects.sql first.';
  END IF;
  
  RAISE NOTICE 'Both product_releases and projects tables exist';
END $$;

-- ============================================================================
-- STEP 2: Show current data
-- ============================================================================
DO $$
DECLARE
  release_count INTEGER;
  project_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO release_count FROM product_releases;
  SELECT COUNT(*) INTO project_count FROM projects;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CURRENT STATE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Product releases: %', release_count;
  RAISE NOTICE 'Projects: %', project_count;
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- STEP 3: Add project_id column to product_releases
-- ============================================================================
RAISE NOTICE 'Adding project_id column to product_releases...';

ALTER TABLE product_releases 
ADD COLUMN IF NOT EXISTS project_id INTEGER;

RAISE NOTICE 'Column added';

-- ============================================================================
-- STEP 4: Add foreign key constraint
-- ============================================================================
RAISE NOTICE 'Adding foreign key constraint...';

ALTER TABLE product_releases 
ADD CONSTRAINT product_releases_project_id_fkey 
FOREIGN KEY (project_id) 
REFERENCES projects(id) ON DELETE CASCADE;

RAISE NOTICE 'Foreign key constraint added';

-- ============================================================================
-- STEP 5: Create index for performance
-- ============================================================================
RAISE NOTICE 'Creating index...';

CREATE INDEX IF NOT EXISTS idx_product_releases_project_id 
ON product_releases(project_id);

RAISE NOTICE 'Index created';

-- ============================================================================
-- STEP 6: Add description column if not exists (for better documentation)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_releases' 
    AND column_name = 'description'
  ) THEN
    RAISE NOTICE 'Adding description column...';
    ALTER TABLE product_releases ADD COLUMN description TEXT;
  ELSE
    RAISE NOTICE 'description column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Update existing releases (optional - map to default project)
-- ============================================================================
-- Uncomment if you want to map existing releases to a default project:
/*
DO $$
DECLARE
  default_project_id INTEGER;
BEGIN
  -- Get or create "Others" project
  SELECT id INTO default_project_id 
  FROM projects 
  WHERE name = 'Others' 
  LIMIT 1;
  
  IF default_project_id IS NULL THEN
    INSERT INTO projects (name, description) 
    VALUES ('Others', 'Unassigned releases') 
    RETURNING id INTO default_project_id;
    
    RAISE NOTICE 'Created default "Others" project with id: %', default_project_id;
  END IF;
  
  -- Update releases without project_id
  UPDATE product_releases 
  SET project_id = default_project_id 
  WHERE project_id IS NULL;
  
  RAISE NOTICE 'Mapped existing releases to default project';
END $$;
*/

-- ============================================================================
-- STEP 8: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN product_releases.project_id IS 
'Foreign key to projects table - links release to a specific project';

COMMENT ON TABLE product_releases IS 
'Product release planning table - tracks releases and their associated projects';

-- ============================================================================
-- STEP 9: Update unique constraint to include project_id (optional)
-- ============================================================================
-- This ensures a release_number is unique within a project, not globally
-- Uncomment if you want this behavior:
/*
-- Drop old unique constraint
ALTER TABLE product_releases 
DROP CONSTRAINT IF EXISTS product_releases_product_name_release_number_key;

-- Add new unique constraint with project_id
ALTER TABLE product_releases 
ADD CONSTRAINT product_releases_project_product_release_unique 
UNIQUE (project_id, product_name, release_number);

RAISE NOTICE 'Updated unique constraint to include project_id';
*/

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
DO $$
DECLARE
  col_exists BOOLEAN;
  fk_exists BOOLEAN;
  index_exists BOOLEAN;
  releases_with_project INTEGER;
  releases_without_project INTEGER;
BEGIN
  -- Check column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_releases' 
    AND column_name = 'project_id'
  ) INTO col_exists;
  
  -- Check FK exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'product_releases_project_id_fkey'
  ) INTO fk_exists;
  
  -- Check index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_product_releases_project_id'
  ) INTO index_exists;
  
  -- Count releases
  SELECT COUNT(*) INTO releases_with_project 
  FROM product_releases 
  WHERE project_id IS NOT NULL;
  
  SELECT COUNT(*) INTO releases_without_project 
  FROM product_releases 
  WHERE project_id IS NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 025 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'project_id column exists: %', col_exists;
  RAISE NOTICE 'Foreign key exists: %', fk_exists;
  RAISE NOTICE 'Index exists: %', index_exists;
  RAISE NOTICE 'Releases with project: %', releases_with_project;
  RAISE NOTICE 'Releases without project: %', releases_without_project;
  
  IF col_exists AND fk_exists AND index_exists THEN
    RAISE NOTICE 'SUCCESS: product_releases now linked to projects';
  ELSE
    RAISE EXCEPTION 'FAILED: Migration incomplete';
  END IF;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Update UI to filter releases by project';
  RAISE NOTICE '2. Update createProductRelease() to require project_id';
  RAISE NOTICE '3. Update ticket form to show project-filtered releases';
  RAISE NOTICE '============================================================================';
END $$;
