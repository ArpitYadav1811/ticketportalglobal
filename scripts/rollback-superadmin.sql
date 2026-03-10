-- ============================================
-- ROLLBACK: Revert Super Admin Feature
-- Run this if you want to completely undo
-- the superadmin role and audit log table.
-- ============================================

-- Step 1: Revert all superadmin users back to admin
UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE role = 'superadmin';

-- Step 2: Drop the system audit log table
DROP TABLE IF EXISTS system_audit_log CASCADE;

-- Step 3: Verify no superadmins remain
SELECT COUNT(*) as remaining_superadmins FROM users WHERE role = 'superadmin';
-- Expected: 0

-- Step 4: Verify audit table is gone
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_log'
) as audit_table_exists;
-- Expected: false

-- ============================================
-- AFTER RUNNING THIS SQL:
-- 
-- Git revert the code changes:
--   git revert <commit-hash>
-- 
-- Or if multiple commits, revert to a specific point:
--   git log --oneline   (find the commit before superadmin)
--   git revert <oldest-commit>..<newest-commit>
--
-- Files that were changed (for manual revert):
--   lib/actions/users.ts
--   lib/actions/tickets.ts
--   lib/actions/master-data.ts
--   lib/actions/admin.ts              (DELETE this file)
--   app/admin/page.tsx                (restore old version)
--   app/master-data/page.tsx
--   app/admin/reports/delayed/page.tsx
--   app/tickets/[id]/page.tsx
--   app/tickets/[id]/edit/page.tsx
--   components/tickets/tickets-table.tsx
--   components/layout/horizontal-nav.tsx
--   components/master-data/unified-master-data-v2.tsx
--   scripts/032-add-superadmin-role.sql  (DELETE)
--   scripts/033-create-superadmin.sql    (DELETE)
-- ============================================
