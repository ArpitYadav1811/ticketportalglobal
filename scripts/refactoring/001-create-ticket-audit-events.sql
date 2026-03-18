-- =====================================================
-- TICKET AUDIT EVENTS TABLE
-- =====================================================
-- Purpose: Consolidate all ticket audit/tracking events
-- Replaces: Inline audit columns in tickets table
-- =====================================================

-- Create enum for event types
CREATE TYPE ticket_event_type AS ENUM (
  'created',
  'assigned',
  'reassigned',
  'status_changed',
  'priority_changed',
  'held',
  'unheld',
  'closed',
  'reopened',
  'redirected',
  'updated',
  'deleted',
  'restored'
);

-- Create ticket_audit_events table
CREATE TABLE ticket_audit_events (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type ticket_event_type NOT NULL,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  
  -- Event-specific data
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_ticket_audit_events_ticket_id ON ticket_audit_events(ticket_id);
CREATE INDEX idx_ticket_audit_events_performed_by ON ticket_audit_events(performed_by);
CREATE INDEX idx_ticket_audit_events_event_type ON ticket_audit_events(event_type);
CREATE INDEX idx_ticket_audit_events_created_at ON ticket_audit_events(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_ticket_audit_events_ticket_event ON ticket_audit_events(ticket_id, event_type, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE ticket_audit_events IS 'Centralized audit trail for all ticket events and state changes';
COMMENT ON COLUMN ticket_audit_events.event_type IS 'Type of event that occurred on the ticket';
COMMENT ON COLUMN ticket_audit_events.old_value IS 'Previous value before the change (JSON or text)';
COMMENT ON COLUMN ticket_audit_events.new_value IS 'New value after the change (JSON or text)';
COMMENT ON COLUMN ticket_audit_events.notes IS 'Additional context or remarks about the event';
