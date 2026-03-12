-- Create role_permissions table for granular permission management
-- Only Super Admin can manage these permissions

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  permission_value TEXT, -- JSON string for complex permissions or boolean as text
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON role_permissions(permission_key);

-- Add comment
COMMENT ON TABLE role_permissions IS 'Stores granular permissions for each role. Only Super Admin can manage these.';
COMMENT ON COLUMN role_permissions.role IS 'Role name (superadmin, admin, manager, user)';
COMMENT ON COLUMN role_permissions.permission_key IS 'Permission key (e.g., tickets.assign_tickets, analytics.view_scope)';
COMMENT ON COLUMN role_permissions.permission_value IS 'Permission value (JSON string for arrays, boolean as text, or simple string)';
COMMENT ON COLUMN role_permissions.is_enabled IS 'Whether this permission is enabled';
