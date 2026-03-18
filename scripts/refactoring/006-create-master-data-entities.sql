-- =====================================================
-- MASTER DATA ENTITIES
-- =====================================================
-- Purpose: Create proper entity tables for ticket statuses, priorities, types, and user roles
-- Replaces: VARCHAR columns with hardcoded values
-- Benefits: Centralized management, easier to extend, better data integrity
-- =====================================================

-- =====================================================
-- TICKET STATUSES
-- =====================================================

CREATE TABLE ticket_statuses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color code (e.g., #FF5733)
  icon VARCHAR(50), -- Icon identifier for UI
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_closed_state BOOLEAN DEFAULT false, -- Whether this status means ticket is closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial ticket statuses
INSERT INTO ticket_statuses (code, name, description, color, sort_order, is_closed_state) VALUES
  ('open', 'Open', 'Ticket is open and awaiting action', '#3B82F6', 1, false),
  ('in_progress', 'In Progress', 'Ticket is being actively worked on', '#F59E0B', 2, false),
  ('on_hold', 'On Hold', 'Ticket is temporarily paused', '#EF4444', 3, false),
  ('resolved', 'Resolved', 'Ticket has been resolved', '#10B981', 4, true),
  ('closed', 'Closed', 'Ticket is closed', '#6B7280', 5, true),
  ('returned', 'Returned', 'Ticket was returned to creator', '#8B5CF6', 6, false),
  ('deleted', 'Deleted', 'Ticket has been soft deleted', '#DC2626', 7, true);

CREATE INDEX idx_ticket_statuses_code ON ticket_statuses(code);
CREATE INDEX idx_ticket_statuses_active ON ticket_statuses(is_active) WHERE is_active = true;

COMMENT ON TABLE ticket_statuses IS 'Master data for ticket status values';

-- =====================================================
-- TICKET PRIORITIES
-- =====================================================

CREATE TABLE ticket_priorities (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color code
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  sla_hours INTEGER, -- SLA response time in hours
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial ticket priorities
INSERT INTO ticket_priorities (code, name, description, color, sort_order, sla_hours) VALUES
  ('low', 'Low', 'Low priority - can be addressed in regular workflow', '#10B981', 4, 168), -- 7 days
  ('medium', 'Medium', 'Medium priority - should be addressed soon', '#F59E0B', 3, 72), -- 3 days
  ('high', 'High', 'High priority - needs prompt attention', '#EF4444', 2, 24), -- 1 day
  ('urgent', 'Urgent', 'Urgent priority - requires immediate attention', '#DC2626', 1, 4); -- 4 hours

CREATE INDEX idx_ticket_priorities_code ON ticket_priorities(code);
CREATE INDEX idx_ticket_priorities_sort ON ticket_priorities(sort_order);
CREATE INDEX idx_ticket_priorities_active ON ticket_priorities(is_active) WHERE is_active = true;

COMMENT ON TABLE ticket_priorities IS 'Master data for ticket priority levels with SLA definitions';

-- =====================================================
-- TICKET TYPES
-- =====================================================

CREATE TABLE ticket_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial ticket types
INSERT INTO ticket_types (code, name, description, icon, sort_order) VALUES
  ('support', 'Support', 'Support request or issue that needs resolution', 'help-circle', 1),
  ('requirement', 'Requirement', 'New feature or enhancement requirement', 'file-text', 2),
  ('incident', 'Incident', 'Urgent issue affecting service', 'alert-circle', 3),
  ('change', 'Change Request', 'Request for change in existing functionality', 'edit', 4);

CREATE INDEX idx_ticket_types_code ON ticket_types(code);
CREATE INDEX idx_ticket_types_sort ON ticket_types(sort_order);
CREATE INDEX idx_ticket_types_active ON ticket_types(is_active) WHERE is_active = true;

COMMENT ON TABLE ticket_types IS 'Master data for ticket type classifications';

-- =====================================================
-- USER ROLES
-- =====================================================

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 0, -- Hierarchy level (higher = more permissions)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial user roles
INSERT INTO user_roles (code, name, description, level) VALUES
  ('user', 'User', 'Regular user who can create and view tickets', 10),
  ('spoc', 'SPOC', 'Single Point of Contact for a business group', 30),
  ('manager', 'Manager', 'Manager with team oversight capabilities', 40),
  ('admin', 'Admin', 'Administrator with elevated permissions', 80),
  ('superadmin', 'Super Admin', 'Super administrator with full system access', 100);

CREATE INDEX idx_user_roles_code ON user_roles(code);
CREATE INDEX idx_user_roles_level ON user_roles(level);
CREATE INDEX idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;

COMMENT ON TABLE user_roles IS 'Master data for user role definitions and hierarchy';
COMMENT ON COLUMN user_roles.level IS 'Hierarchy level - higher values indicate more permissions';

-- =====================================================
-- USER ROLE ASSIGNMENTS (Many-to-Many)
-- =====================================================

CREATE TABLE user_role_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  
  -- Assignment metadata
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure unique active role per user
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON user_role_assignments(is_active) WHERE is_active = true;

COMMENT ON TABLE user_role_assignments IS 'Manages many-to-many relationships between users and roles';
