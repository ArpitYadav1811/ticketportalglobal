-- Migration: Create ticket_references junction table for many-to-many ticket linking
-- Description: Allows tickets to reference other tickets (many-to-many relationship)

-- Create the junction table
CREATE TABLE IF NOT EXISTS ticket_references (
  id SERIAL PRIMARY KEY,
  source_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  reference_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(source_ticket_id, reference_ticket_id),
  CHECK (source_ticket_id != reference_ticket_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ticket_ref_source ON ticket_references(source_ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_ref_reference ON ticket_references(reference_ticket_id);

-- Verification
SELECT 'ticket_references table created successfully' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ticket_references' 
ORDER BY ordinal_position;
