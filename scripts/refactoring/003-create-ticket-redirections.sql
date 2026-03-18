-- =====================================================
-- TICKET REDIRECTIONS TABLE
-- =====================================================
-- Purpose: Track ticket redirection history
-- Replaces: redirected_from_* columns in tickets table
-- =====================================================

-- Create ticket_redirections table
CREATE TABLE ticket_redirections (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- From (source)
  from_business_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id),
  from_spoc_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- To (destination)
  to_business_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id),
  to_spoc_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Redirection details
  remarks TEXT NOT NULL,
  redirected_by INTEGER NOT NULL REFERENCES users(id),
  redirected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_ticket_redirections_ticket_id ON ticket_redirections(ticket_id);
CREATE INDEX idx_ticket_redirections_from_group ON ticket_redirections(from_business_group_id);
CREATE INDEX idx_ticket_redirections_to_group ON ticket_redirections(to_business_group_id);
CREATE INDEX idx_ticket_redirections_redirected_by ON ticket_redirections(redirected_by);
CREATE INDEX idx_ticket_redirections_redirected_at ON ticket_redirections(redirected_at DESC);

-- Composite index for tracking redirection chains
CREATE INDEX idx_ticket_redirections_chain ON ticket_redirections(ticket_id, redirected_at DESC);

-- Comments for documentation
COMMENT ON TABLE ticket_redirections IS 'Tracks complete history of ticket redirections between business groups';
COMMENT ON COLUMN ticket_redirections.from_business_group_id IS 'Business group that redirected the ticket away';
COMMENT ON COLUMN ticket_redirections.to_business_group_id IS 'Business group that received the redirected ticket';
COMMENT ON COLUMN ticket_redirections.remarks IS 'Reason or notes for the redirection';
COMMENT ON COLUMN ticket_redirections.redirected_by IS 'User who performed the redirection';
