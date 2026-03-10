# Rollback: Super Admin Feature — Database Only

## What was added to the DB

| Change | Table | Type |
|--------|-------|------|
| New table `system_audit_log` | `system_audit_log` | CREATE TABLE |
| New role value `superadmin` | `users.role` | UPDATE (string value) |

---

## Rollback SQL

Run the following in order:

```sql
-- 1. Revert all superadmin users back to admin
UPDATE users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE role = 'superadmin';

-- 2. Drop the system audit log table
DROP TABLE IF EXISTS system_audit_log CASCADE;
```

---

## Verification

```sql
-- Confirm no superadmins remain
SELECT COUNT(*) AS remaining_superadmins FROM users WHERE role = 'superadmin';
-- Expected: 0

-- Confirm audit table is gone
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'system_audit_log'
) AS audit_table_exists;
-- Expected: false
```

---

## Migration Scripts to Delete

After rollback, these scripts are no longer relevant:

- `scripts/032-add-superadmin-role.sql`
- `scripts/033-create-superadmin.sql`
- `scripts/rollback-superadmin.sql`
- `scripts/ROLLBACK-SUPERADMIN-DB.md` (this file)

---

## Notes

- **No existing tables were altered** — no columns added/dropped/renamed.
- **No existing data was modified** — only new rows (audit logs) and a role string change.
- Dropping `system_audit_log` has **zero impact** on tickets, users, or any other table.
- Reverting `superadmin` → `admin` restores original admin access for those users.
