-- Promote an existing admin user to superadmin
-- Replace the email below with the actual super admin's email

-- First, see current admins:
SELECT id, email, full_name, role FROM users WHERE role = 'admin' ORDER BY id;

-- Promote (update the email below):
-- UPDATE users SET role = 'superadmin', updated_at = CURRENT_TIMESTAMP WHERE email = 'your-email@mfilterit.com';

-- Verify:
-- SELECT id, email, full_name, role FROM users WHERE role = 'superadmin';
