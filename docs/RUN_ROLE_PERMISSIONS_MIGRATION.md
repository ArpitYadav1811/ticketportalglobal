# How to Run Role Permissions Migration

## Step 1: Create the Database Table

You have **3 options** to run the migration. Choose the one that works best for you:

---

### **Option 1: Using Node.js Script (Easiest - Recommended)**

I've created a script that will run the migration for you:

```bash
# Make sure you're in the project root directory
cd /home/arpit/work/personal/TicketPortal/ticketportalglobal

# Run the migration script
node scripts/run-033-migration.js
```

**What it does:**
- ✅ Connects to your database using `DATABASE_URL` from `.env.local`
- ✅ Reads the SQL migration file
- ✅ Executes all SQL statements
- ✅ Verifies the table was created
- ✅ Shows success/error messages

**Expected Output:**
```
🚀 Running Role Permissions Table Migration...

✓ Database URL found
✓ Connecting to database...

✓ Database connection successful!

📄 Reading SQL file...
✓ Found 3 SQL statements

   Executing statement 1/3...
   ✅ Statement 1 completed
   Executing statement 2/3...
   ✅ Statement 2 completed
   Executing statement 3/3...
   ✅ Statement 3 completed

🔍 Verifying table creation...
✅ Table 'role_permissions' created successfully!
✅ Created 2 indexes

🎉 Migration completed successfully!

📋 Next Steps:
   1. Run: node scripts/initialize-role-permissions.js
   2. This will populate default permissions for all roles
   3. Then access Role Permissions in Admin Dashboard (Super Admin only)
```

---

### **Option 2: Using psql Command Line**

If you have `psql` installed and prefer command line:

```bash
# Set your database URL (or use the connection string directly)
export DATABASE_URL="your-database-connection-string"

# Run the SQL file
psql $DATABASE_URL -f scripts/033-create-role-permissions-table.sql
```

**Or if you're already connected to psql:**
```bash
psql $DATABASE_URL
# Then inside psql:
\i scripts/033-create-role-permissions-table.sql
```

---

### **Option 3: Using Existing run-sql-file.js Script**

You can also use the existing script:

```bash
node scripts/run-sql-file.js scripts/033-create-role-permissions-table.sql
```

---

## Step 2: Initialize Default Permissions

After the table is created, run this to populate default permissions:

```bash
node scripts/initialize-role-permissions.js
```

**What it does:**
- ✅ Creates the `role_permissions` table (if not exists)
- ✅ Inserts default permissions for all 4 roles:
  - Super Admin (full access)
  - Admin (most permissions)
  - Manager/SPOC (limited permissions)
  - User (minimal permissions)

**Expected Output:**
```
🚀 Initializing Role Permissions System...

📋 Step 1: Creating role_permissions table...
✅ Table created/verified

📋 Step 2: Creating indexes...
✅ Indexes created

📋 Step 3: Loading default permissions...
📋 Step 4: Inserting default permissions...
   Setting permissions for role: superadmin...
   ✅ 47 permissions set for superadmin
   Setting permissions for role: admin...
   ✅ 47 permissions set for admin
   Setting permissions for role: manager...
   ✅ 47 permissions set for manager
   Setting permissions for role: user...
   ✅ 47 permissions set for user

✅ Role permissions initialized successfully!

📊 Summary:
   superadmin: 47 permissions
   admin: 47 permissions
   manager: 47 permissions
   user: 47 permissions

🎉 All done! You can now manage permissions via the Admin Dashboard.
```

---

## Step 3: Verify the Migration

You can verify the table was created by running:

```bash
# Using Node.js
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT COUNT(*) as count FROM role_permissions\`.then(r => console.log('Total permissions:', r[0].count));
"
```

**Or using SQL directly:**
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'role_permissions'
);

-- Count permissions per role
SELECT role, COUNT(*) as permission_count 
FROM role_permissions 
GROUP BY role 
ORDER BY role;
```

---

## Troubleshooting

### Error: "DATABASE_URL not found"
**Solution:** Make sure your `.env.local` file exists and contains:
```
DATABASE_URL="your-neon-postgres-connection-string"
```

### Error: "Database connection failed"
**Solution:** 
- Check your `DATABASE_URL` is correct
- Verify your database is accessible
- Check if your database is paused (Neon databases pause after inactivity)

### Error: "relation already exists"
**Solution:** This is fine! The table already exists. You can skip to Step 2.

### Error: "permission denied"
**Solution:** Make sure your database user has CREATE TABLE permissions.

---

## What Gets Created

The migration creates:

1. **`role_permissions` table** with columns:
   - `id` (SERIAL PRIMARY KEY)
   - `role` (VARCHAR(50)) - Role name
   - `permission_key` (VARCHAR(100)) - Permission identifier
   - `permission_value` (TEXT) - Permission value (JSON/boolean/string)
   - `is_enabled` (BOOLEAN) - Whether permission is active
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **Indexes:**
   - `idx_role_permissions_role` - For fast role lookups
   - `idx_role_permissions_key` - For fast permission key lookups

3. **Unique Constraint:**
   - `(role, permission_key)` - Prevents duplicate permissions per role

---

## Next Steps After Migration

1. ✅ Table created
2. ✅ Default permissions initialized
3. 🎯 **Access Admin Dashboard** → **Role Permissions** tab (Super Admin only)
4. 🎯 **Customize permissions** for each role as needed
5. 🎯 **Permissions take effect immediately** after saving

---

**Need Help?** Check the main proposal document: `docs/ROLE_PERMISSION_MANAGEMENT_PROPOSAL.md`
