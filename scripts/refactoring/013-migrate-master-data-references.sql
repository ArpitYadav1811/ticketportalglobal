-- =====================================================
-- DATA MIGRATION: MASTER DATA REFERENCES
-- =====================================================
-- Purpose: Migrate VARCHAR columns to FK references for statuses, priorities, types
-- Prerequisites: Run 006-create-master-data-entities.sql first
-- =====================================================

-- =====================================================
-- MIGRATE TICKET STATUSES
-- =====================================================

-- Update tickets.status_id based on tickets.status VARCHAR
UPDATE tickets t
SET status_id = ts.id
FROM ticket_statuses ts
WHERE LOWER(t.status) = ts.code;

-- Verify status migration
SELECT 
  t.status as old_status_varchar,
  ts.code as new_status_code,
  ts.name as new_status_name,
  COUNT(*) as ticket_count
FROM tickets t
LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
GROUP BY t.status, ts.code, ts.name
ORDER BY ticket_count DESC;

-- Show tickets with unmapped statuses
SELECT 
  id,
  ticket_id,
  status as unmapped_status
FROM tickets
WHERE status_id IS NULL;

-- =====================================================
-- MIGRATE TICKET PRIORITIES
-- =====================================================

-- Update tickets.priority_id based on tickets.priority VARCHAR
UPDATE tickets t
SET priority_id = tp.id
FROM ticket_priorities tp
WHERE LOWER(t.priority) = tp.code;

-- Verify priority migration
SELECT 
  t.priority as old_priority_varchar,
  tp.code as new_priority_code,
  tp.name as new_priority_name,
  COUNT(*) as ticket_count
FROM tickets t
LEFT JOIN ticket_priorities tp ON tp.id = t.priority_id
GROUP BY t.priority, tp.code, tp.name
ORDER BY ticket_count DESC;

-- Show tickets with unmapped priorities
SELECT 
  id,
  ticket_id,
  priority as unmapped_priority
FROM tickets
WHERE priority_id IS NULL;

-- =====================================================
-- MIGRATE TICKET TYPES
-- =====================================================

-- Update tickets.type_id based on tickets.ticket_type VARCHAR
UPDATE tickets t
SET type_id = tt.id
FROM ticket_types tt
WHERE LOWER(t.ticket_type) = tt.code;

-- Verify type migration
SELECT 
  t.ticket_type as old_type_varchar,
  tt.code as new_type_code,
  tt.name as new_type_name,
  COUNT(*) as ticket_count
FROM tickets t
LEFT JOIN ticket_types tt ON tt.id = t.type_id
GROUP BY t.ticket_type, tt.code, tt.name
ORDER BY ticket_count DESC;

-- Show tickets with unmapped types
SELECT 
  id,
  ticket_id,
  ticket_type as unmapped_type
FROM tickets
WHERE type_id IS NULL;

-- =====================================================
-- MIGRATE USER ROLES
-- =====================================================

-- Update users.role_id based on users.role VARCHAR (if we add role_id column)
-- Note: This assumes we'll add a role_id column to users table
-- For now, we'll keep the VARCHAR column and use user_role_assignments for multiple roles

-- Seed initial role assignments based on current role column
INSERT INTO user_role_assignments (user_id, role_id, assigned_at, is_active)
SELECT 
  u.id,
  ur.id,
  u.created_at,
  true
FROM users u
JOIN user_roles ur ON LOWER(u.role) = ur.code
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify role migration
SELECT 
  u.role as old_role_varchar,
  ur.code as new_role_code,
  ur.name as new_role_name,
  COUNT(*) as user_count
FROM users u
LEFT JOIN user_role_assignments ura ON ura.user_id = u.id AND ura.is_active = true
LEFT JOIN user_roles ur ON ur.id = ura.role_id
GROUP BY u.role, ur.code, ur.name
ORDER BY user_count DESC;

-- Show users with unmapped roles
SELECT 
  id,
  email,
  full_name,
  role as unmapped_role
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_role_assignments ura 
  WHERE ura.user_id = u.id AND ura.is_active = true
);
