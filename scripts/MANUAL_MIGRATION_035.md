# Manual Migration 035: Add SPOC to Functional Areas

If the automated script fails due to connection issues, you can run this migration manually.

## Option 1: Using Your Database GUI (Recommended)

If you have access to a database GUI (like pgAdmin, DBeaver, or Neon Console), run these SQL commands:

```sql
-- Add SPOC column
ALTER TABLE functional_areas
ADD COLUMN IF NOT EXISTS spoc_name VARCHAR(255);

-- Add documentation
COMMENT ON COLUMN functional_areas.spoc_name IS 'SPOC (Single Point of Contact) for this functional area';

-- Create index
CREATE INDEX IF NOT EXISTS idx_functional_areas_spoc 
ON functional_areas(spoc_name) 
WHERE spoc_name IS NOT NULL;

-- Verify
SELECT 
  id,
  name,
  description,
  spoc_name,
  created_at
FROM functional_areas
ORDER BY name;
```

## Option 2: Using psql Command Line

If you have `psql` installed:

```bash
# Connect to your database
psql "YOUR_DATABASE_URL"

# Then paste the SQL commands from Option 1
```

## Option 3: Using Neon Console

1. Go to https://console.neon.tech
2. Select your project
3. Go to **SQL Editor**
4. Paste the SQL commands from Option 1
5. Click **Run**

## Option 4: Fix the Connection and Retry

The connection timeout might be due to:

### A. Network/Firewall Issues
- Check if you're behind a corporate firewall
- Try connecting from a different network
- Verify Neon database is not paused (check Neon Console)

### B. Update Connection String
Your `.env.local` might need the `sslmode` parameter:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

Or for better compatibility:

```env
DATABASE_URL=postgresql://user:pass@host/db?uselibpqcompat=true&sslmode=require
```

### C. Use Neon's Pooled Connection
If you have a pooled connection string (ends with `-pooler`), try using that instead:

```env
DATABASE_URL=postgresql://user:pass@host-pooler/db?sslmode=require
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'functional_areas' 
AND column_name = 'spoc_name';

-- Should return:
-- column_name | data_type
-- spoc_name   | character varying
```

## Next Steps

Once the migration is complete:
1. ✅ The Admin Dashboard is already updated to show/edit SPOCs
2. ✅ The backend functions are ready to handle SPOC data
3. ✅ The import script will create/update FAs with SPOCs from Excel
4. 🎯 You can start assigning SPOCs to Functional Areas in the Admin Dashboard

## Need Help?

If you're still having connection issues:
1. Check if your Neon database is active (not paused)
2. Verify your IP is allowed in Neon's IP allowlist
3. Try accessing the database from your Next.js app to confirm it works
4. Share any error messages you see
