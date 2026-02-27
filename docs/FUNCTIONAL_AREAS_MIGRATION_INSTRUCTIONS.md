# Functional Areas Migration Instructions

## Quick Start

**First, run the diagnostic script to check your database state:**

```bash
node scripts/diagnose-functional-areas.js
```

This will tell you exactly which migration script to run based on your current database state.

**If you have the table but queries are failing, run the test script:**

```bash
node scripts/test-functional-areas-query.js
```

This will test the exact query the application uses and identify why it's failing.

## Migration Scenarios

### Scenario 1: You have `organizations` table (needs rename)

If the diagnostic shows you have the `organizations` table but not `functional_areas`:

**Run the rename migration:**
```bash
node scripts/run-sql-file.js scripts/028-rename-organizations-to-functional-areas.sql
```

**What this does:**
- Renames `organizations` → `functional_areas`
- Renames `organization_target_business_group_mapping` → `functional_area_business_group_mapping`
- Renames the `organization_id` column to `functional_area_id`
- Updates all indexes and constraints

**Expected result:**
- `functional_areas` table exists with your existing data
- Mappings are preserved

### Scenario 2: Neither table exists (fresh setup)

If the diagnostic shows neither `organizations` nor `functional_areas` exists:

**Run the seed script:**
```bash
node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql
```

**What this does:**
- Creates `functional_areas` table
- Creates `functional_area_business_group_mapping` table
- Seeds 12 functional areas:
  - MFBuddy support
  - Customer Portal support
  - Ticket Portal support
  - Billing Portal support
  - Customer Integrations support
  - GUI Development support
  - IT Administration support
  - IT Security support
  - IT DevOps support
  - Customer Solutions support
  - Competitive Research support
  - Others
- Creates mappings to business unit groups

**Expected result:**
- `functional_areas` table with 12 records
- `functional_area_business_group_mapping` with mappings

### Scenario 3: `functional_areas` exists but is empty

If the diagnostic shows `functional_areas` exists but has fewer than 12 records:

**Run the seed script (safe to re-run):**
```bash
node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql
```

**What this does:**
- Uses `ON CONFLICT DO NOTHING` clauses, so it's safe to run multiple times
- Only inserts missing functional areas
- Only creates missing mappings

**Expected result:**
- All 12 functional areas present
- All mappings created

### Scenario 4: `functional_areas` exists but queries fail

If you have the table but the application still shows "relation does not exist" errors:

**Run the test script to diagnose:**
```bash
node scripts/test-functional-areas-query.js
```

**Common causes and solutions:**

1. **Table in wrong schema:**
   - If table is not in `public` schema, you have two options:
     - **Option A:** Move table to public schema:
       ```sql
       ALTER TABLE your_schema.functional_areas SET SCHEMA public;
       ```
     - **Option B:** Update queries to use schema-qualified name (not recommended)

2. **Empty table:**
   - Run the seed script to populate data:
     ```bash
     node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql
     ```

3. **Connection to wrong database:**
   - Verify `DATABASE_URL` in `.env.local` points to the correct database
   - Check that the table exists in that specific database

4. **Permissions issue:**
   - Ensure the database user has SELECT permissions on the table
   - Check with your database administrator

5. **Application cache:**
   - Restart your Next.js development server
   - Clear any cached database connections

## Verification

After running the migration, verify it worked:

```bash
node scripts/verify-functional-areas.js
```

Or manually check:
```sql
-- Check table exists and has data
SELECT COUNT(*) FROM functional_areas;
-- Should return 12

-- Check mappings exist
SELECT COUNT(*) FROM functional_area_business_group_mapping;
-- Should return multiple mappings

-- View sample data
SELECT 
  fa.name as functional_area,
  bug.name as business_unit_group
FROM functional_area_business_group_mapping fabgm
JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
ORDER BY fa.name, bug.name
LIMIT 10;
```

## Troubleshooting

### Error: "relation 'functional_areas' does not exist" after migration

1. Verify the migration script ran successfully (check for error messages)
2. Check you're connected to the correct database
3. Run the diagnostic script again to verify state
4. If still missing, run the seed script (027) to create it

### Error: "relation 'organizations' does not exist" when trying to rename

This means you don't have the old table. Run the seed script (027) instead.

### Application still shows errors after migration

1. Restart your Next.js development server
2. Clear any cached database connections
3. Verify the table exists using the verification script
4. Check that `DATABASE_URL` in `.env.local` points to the correct database

### Migration script fails with connection errors

1. Verify `DATABASE_URL` is set in `.env.local`
2. Check database is accessible
3. For Neon databases, ensure the database is not suspended
4. Try running the diagnostic script first to test connectivity

## Using psql Directly

If you prefer using `psql` directly instead of the Node.js scripts:

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run migration
psql $DATABASE_URL -f scripts/028-rename-organizations-to-functional-areas.sql
# OR
psql $DATABASE_URL -f scripts/027-seed-functional-areas-updated.sql
```

## Rollback (if needed)

If you need to rollback the rename migration:

```sql
-- Rename tables back
ALTER TABLE functional_areas RENAME TO organizations;
ALTER TABLE functional_area_business_group_mapping RENAME TO organization_target_business_group_mapping;

-- Rename column back
ALTER TABLE organization_target_business_group_mapping 
RENAME COLUMN functional_area_id TO organization_id;

-- Rename indexes back
ALTER INDEX idx_functional_area_bg_mapping_fa RENAME TO idx_org_tbg_mapping_org;
ALTER INDEX idx_functional_area_bg_mapping_bg RENAME TO idx_org_tbg_mapping_tbg;
```

**Note:** Only rollback if absolutely necessary. The application code expects `functional_areas`.

## Summary

1. **Run diagnostic:** `node scripts/diagnose-functional-areas.js`
2. **Follow the recommended action** from the diagnostic output
3. **Verify:** `node scripts/verify-functional-areas.js`
4. **Restart your application** if needed

The migration is safe and preserves all existing data. The seed script can be run multiple times without issues.
