-- =====================================================
-- DATA MIGRATION: TICKET PROJECTS
-- =====================================================
-- Purpose: Migrate project and release data from tickets table to ticket_projects
-- Prerequisites: Run 002-create-ticket-projects.sql first
-- =====================================================

-- Migrate tickets with project information
INSERT INTO ticket_projects (
  ticket_id,
  project_id,
  product_release_id,
  estimated_release_date,
  created_by,
  created_at
)
SELECT 
  t.id,
  t.project_id,
  pr.id as product_release_id, -- Match by product_release_name
  t.estimated_release_date::DATE,
  t.created_by,
  t.created_at
FROM tickets t
LEFT JOIN product_releases pr ON pr.product_name = t.product_release_name
WHERE 
  t.project_id IS NOT NULL 
  OR t.product_release_name IS NOT NULL 
  OR t.estimated_release_date IS NOT NULL;

-- Verify migration
SELECT 
  COUNT(*) as total_ticket_projects,
  COUNT(project_id) as with_project,
  COUNT(product_release_id) as with_release,
  COUNT(estimated_release_date) as with_release_date
FROM ticket_projects;

-- Show any tickets that couldn't be migrated due to missing product_release
SELECT 
  t.id,
  t.ticket_id,
  t.product_release_name,
  'Product release not found in product_releases table' as issue
FROM tickets t
LEFT JOIN product_releases pr ON pr.product_name = t.product_release_name
WHERE 
  t.product_release_name IS NOT NULL 
  AND pr.id IS NULL;
