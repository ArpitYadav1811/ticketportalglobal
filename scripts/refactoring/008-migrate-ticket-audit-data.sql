-- =====================================================
-- DATA MIGRATION: TICKET AUDIT EVENTS
-- =====================================================
-- Purpose: Migrate existing audit data from tickets table to ticket_audit_events
-- Prerequisites: Run 001-create-ticket-audit-events.sql first
-- =====================================================

-- Migrate ticket creation events
INSERT INTO ticket_audit_events (ticket_id, event_type, performed_by, created_at, notes)
SELECT 
  id,
  'created'::ticket_event_type,
  created_by,
  created_at,
  'Ticket created'
FROM tickets
WHERE id IS NOT NULL;

-- Migrate ticket hold events
INSERT INTO ticket_audit_events (ticket_id, event_type, performed_by, created_at, old_value, new_value, notes)
SELECT 
  id,
  'held'::ticket_event_type,
  hold_by,
  hold_at,
  NULL,
  'on-hold',
  'Ticket placed on hold'
FROM tickets
WHERE hold_by IS NOT NULL AND hold_at IS NOT NULL;

-- Migrate ticket closed events
INSERT INTO ticket_audit_events (ticket_id, event_type, performed_by, created_at, old_value, new_value, notes)
SELECT 
  id,
  'closed'::ticket_event_type,
  closed_by,
  closed_at,
  NULL,
  'closed',
  'Ticket closed'
FROM tickets
WHERE closed_by IS NOT NULL AND closed_at IS NOT NULL;

-- Migrate ticket resolved events
INSERT INTO ticket_audit_events (ticket_id, event_type, performed_by, created_at, old_value, new_value, notes)
SELECT 
  id,
  'status_changed'::ticket_event_type,
  COALESCE(assigned_to, created_by),
  resolved_at,
  NULL,
  'resolved',
  'Ticket resolved'
FROM tickets
WHERE resolved_at IS NOT NULL;

-- Migrate ticket deletion events
INSERT INTO ticket_audit_events (ticket_id, event_type, performed_by, created_at, old_value, new_value, notes)
SELECT 
  id,
  'deleted'::ticket_event_type,
  created_by, -- Default to creator if we don't know who deleted it
  deleted_at,
  NULL,
  'deleted',
  'Ticket soft deleted'
FROM tickets
WHERE is_deleted = true AND deleted_at IS NOT NULL;

-- Migrate ticket redirection events
INSERT INTO ticket_audit_events (ticket_id, event_type, performed_by, created_at, old_value, new_value, notes)
SELECT 
  t.id,
  'redirected'::ticket_event_type,
  COALESCE(t.spoc_user_id, t.created_by),
  t.redirected_at,
  t.redirected_from_business_unit_group_id::TEXT,
  t.target_business_group_id::TEXT,
  t.redirection_remarks
FROM tickets t
WHERE t.redirected_at IS NOT NULL;

-- Add index on ticket_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticket_audit_events_ticket_id ON ticket_audit_events(ticket_id);

-- Verify migration
SELECT 
  event_type,
  COUNT(*) as event_count
FROM ticket_audit_events
GROUP BY event_type
ORDER BY event_count DESC;
