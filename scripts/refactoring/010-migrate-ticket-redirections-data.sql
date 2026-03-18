-- =====================================================
-- DATA MIGRATION: TICKET REDIRECTIONS
-- =====================================================
-- Purpose: Migrate redirection history from tickets table to ticket_redirections
-- Prerequisites: Run 003-create-ticket-redirections.sql first
-- =====================================================

-- Migrate tickets that have been redirected
INSERT INTO ticket_redirections (
  ticket_id,
  from_business_group_id,
  from_spoc_user_id,
  to_business_group_id,
  to_spoc_user_id,
  remarks,
  redirected_by,
  redirected_at,
  created_at
)
SELECT 
  t.id,
  t.redirected_from_business_unit_group_id,
  t.redirected_from_spoc_user_id,
  t.target_business_group_id,
  t.spoc_user_id,
  COALESCE(t.redirection_remarks, 'Ticket redirected'),
  COALESCE(t.spoc_user_id, t.created_by), -- Default to current SPOC or creator
  t.redirected_at,
  t.redirected_at
FROM tickets t
WHERE 
  t.redirected_at IS NOT NULL 
  AND t.redirected_from_business_unit_group_id IS NOT NULL;

-- Verify migration
SELECT 
  COUNT(*) as total_redirections,
  COUNT(DISTINCT ticket_id) as unique_tickets_redirected,
  COUNT(from_spoc_user_id) as with_from_spoc,
  COUNT(to_spoc_user_id) as with_to_spoc
FROM ticket_redirections;

-- Show redirection chains (tickets redirected multiple times)
SELECT 
  ticket_id,
  COUNT(*) as redirection_count
FROM ticket_redirections
GROUP BY ticket_id
HAVING COUNT(*) > 1
ORDER BY redirection_count DESC;
