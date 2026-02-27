# Fix Functional Areas Table - Step by Step Instructions

## Quick Fix (Choose One Method)

### Method 1: Using Node.js Script (Recommended)

Open your terminal in the project root directory and run:

```bash
node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql
```

### Method 2: Using psql Directly

If you have `psql` installed, run:

```bash
psql $DATABASE_URL -f scripts/027-seed-functional-areas-updated.sql
```

Or if DATABASE_URL is not exported:

```bash
psql "your-database-connection-string" -f scripts/027-seed-functional-areas-updated.sql
```

### Method 3: Manual SQL Execution

If you have a database GUI tool (like pgAdmin, DBeaver, or Neon Console):

1. Open your database connection
2. Copy the contents of `scripts/027-seed-functional-areas-updated.sql`
3. Paste and execute it in your SQL editor

## Verification

After running the fix, verify it worked:

```bash
node scripts/verify-functional-areas.js
```

Or check manually:

```sql
SELECT COUNT(*) FROM functional_areas;
-- Should return 12

SELECT * FROM functional_areas ORDER BY name;
-- Should show all 12 functional areas
```

## What This Does

The script will:
1. ✅ Create `functional_areas` table if it doesn't exist
2. ✅ Create `functional_area_business_group_mapping` table if it doesn't exist
3. ✅ Insert 12 functional areas (safe to run multiple times)
4. ✅ Create mappings to business unit groups

## After Fixing

1. **Restart your Next.js dev server** if it's running:
   - Stop the server (Ctrl+C)
   - Start it again: `npm run dev` or `pnpm dev`

2. **Test the application** - try creating a ticket and selecting a functional area

## Troubleshooting

### Error: "DATABASE_URL not found"
- Make sure `.env.local` exists in the project root
- Make sure it contains `DATABASE_URL=...` or `DATABASE_URL_DEV=...`

### Error: "Cannot connect to database"
- Check your database connection string is correct
- Verify the database is running and accessible
- For Neon databases, check the database is not suspended

### Error: "relation 'business_unit_groups' does not exist"
- You need to run other migration scripts first
- Check `scripts/` folder for business unit group setup scripts

### Still seeing errors after fix?
- Restart your dev server
- Clear browser cache
- Check you're connecting to the correct database
