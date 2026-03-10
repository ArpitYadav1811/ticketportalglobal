-- Migration: Add superadmin role support
-- This migration adds the 'superadmin' role to the system.
-- Superadmins have access to high-risk modules: FA Mappings, Role Management, System Audit Logs

-- Note: The users.role column is VARCHAR(50) with no CHECK constraint,
-- so we just need to add the first superadmin user.

-- Step 1: Create a system_audit_log table for system-wide audit logging
CREATE TABLE IF NOT EXISTS system_audit_log (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100), -- 'user', 'business_group', 'functional_area', 'mapping', 'role', etc.
    entity_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255),
    notes TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_audit_action ON system_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_system_audit_entity ON system_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_performed_by ON system_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON system_audit_log(created_at DESC);

-- Step 2: Verify
SELECT 'system_audit_log table created' as status;
SELECT COUNT(*) as user_count FROM users WHERE role = 'superadmin';
