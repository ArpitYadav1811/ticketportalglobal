-- =====================================================
-- DATA MIGRATION: TICKET HIERARCHY
-- =====================================================
-- Purpose: Migrate parent-child relationships from tickets table to ticket_hierarchy
-- Prerequisites: Run 004-create-ticket-hierarchy.sql first
-- =====================================================

-- Migrate parent-child relationships
INSERT INTO ticket_hierarchy (
  parent_ticket_id,
  child_ticket_id,
  relationship_type,
  created_by,
  created_at
)
SELECT 
  t.parent_ticket_id,
  t.id as child_ticket_id,
  'subtask',
  t.created_by,
  t.created_at
FROM tickets t
WHERE 
  t.parent_ticket_id IS NOT NULL
  AND t.parent_ticket_id != t.id; -- Ensure no self-references

-- Verify migration
SELECT 
  COUNT(*) as total_relationships,
  COUNT(DISTINCT parent_ticket_id) as unique_parents,
  COUNT(DISTINCT child_ticket_id) as unique_children
FROM ticket_hierarchy;

-- Show tickets with multiple children
SELECT 
  th.parent_ticket_id,
  t.ticket_id as parent_ticket_number,
  COUNT(th.child_ticket_id) as child_count
FROM ticket_hierarchy th
JOIN tickets t ON t.id = th.parent_ticket_id
GROUP BY th.parent_ticket_id, t.ticket_id
HAVING COUNT(th.child_ticket_id) > 1
ORDER BY child_count DESC;

-- Show orphaned children (parent doesn't exist)
SELECT 
  th.child_ticket_id,
  t.ticket_id as child_ticket_number,
  th.parent_ticket_id as missing_parent_id
FROM ticket_hierarchy th
JOIN tickets t ON t.id = th.child_ticket_id
LEFT JOIN tickets p ON p.id = th.parent_ticket_id
WHERE p.id IS NULL;
