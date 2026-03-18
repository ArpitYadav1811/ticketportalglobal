-- =====================================================
-- TICKET HIERARCHY TABLE
-- =====================================================
-- Purpose: Manage parent-child relationships between tickets
-- Replaces: parent_ticket_id column in tickets table
-- Benefits: Supports multiple parents, easier hierarchy queries
-- =====================================================

-- Create ticket_hierarchy table
CREATE TABLE ticket_hierarchy (
  id SERIAL PRIMARY KEY,
  parent_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  child_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Relationship metadata
  relationship_type VARCHAR(50) DEFAULT 'subtask', -- subtask, related, blocks, blocked_by, duplicates
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure no duplicate relationships
  UNIQUE(parent_ticket_id, child_ticket_id, relationship_type),
  
  -- Prevent self-referencing
  CHECK (parent_ticket_id != child_ticket_id)
);

-- Create indexes
CREATE INDEX idx_ticket_hierarchy_parent ON ticket_hierarchy(parent_ticket_id);
CREATE INDEX idx_ticket_hierarchy_child ON ticket_hierarchy(child_ticket_id);
CREATE INDEX idx_ticket_hierarchy_relationship ON ticket_hierarchy(relationship_type);

-- Composite index for querying all children of a parent
CREATE INDEX idx_ticket_hierarchy_parent_type ON ticket_hierarchy(parent_ticket_id, relationship_type);

-- Comments for documentation
COMMENT ON TABLE ticket_hierarchy IS 'Manages parent-child and related ticket relationships';
COMMENT ON COLUMN ticket_hierarchy.relationship_type IS 'Type of relationship: subtask, related, blocks, blocked_by, duplicates';
COMMENT ON COLUMN ticket_hierarchy.parent_ticket_id IS 'The parent/source ticket in the relationship';
COMMENT ON COLUMN ticket_hierarchy.child_ticket_id IS 'The child/target ticket in the relationship';
