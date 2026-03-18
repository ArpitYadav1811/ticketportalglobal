-- =====================================================
-- TICKET PROJECTS TABLE
-- =====================================================
-- Purpose: Separate project and release planning data from tickets
-- Replaces: project_name, product_release_name, project_id, estimated_release_date in tickets
-- =====================================================

-- Create ticket_projects table
CREATE TABLE ticket_projects (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Release information
  product_release_id INTEGER REFERENCES product_releases(id) ON DELETE SET NULL,
  estimated_release_date DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  
  -- Ensure one project assignment per ticket
  UNIQUE(ticket_id)
);

-- Create indexes
CREATE INDEX idx_ticket_projects_ticket_id ON ticket_projects(ticket_id);
CREATE INDEX idx_ticket_projects_project_id ON ticket_projects(project_id);
CREATE INDEX idx_ticket_projects_product_release_id ON ticket_projects(product_release_id);
CREATE INDEX idx_ticket_projects_release_date ON ticket_projects(estimated_release_date);

-- Comments for documentation
COMMENT ON TABLE ticket_projects IS 'Links tickets to projects and product releases for release planning';
COMMENT ON COLUMN ticket_projects.product_release_id IS 'Foreign key to product_releases table';
COMMENT ON COLUMN ticket_projects.estimated_release_date IS 'Estimated date for this ticket to be released';
