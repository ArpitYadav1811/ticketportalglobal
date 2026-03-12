# Check Migration Status

Run these queries in Neon Console to verify migrations were applied:

## 🔍 Check Migration 035 (FA SPOCs)

```sql
-- Check if spoc_name column exists in functional_areas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'functional_areas' 
AND column_name = 'spoc_name';
```

**Expected**: Should return 1 row showing `spoc_name | character varying`

---

## 🔍 Check Migration 036 (Categories per BG)

```sql
-- Check if business_unit_group_id column exists in categories
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND column_name = 'business_unit_group_id';
```

**Expected**: Should return 1 row showing `business_unit_group_id | integer | NO`

---

## 🔍 Check Categories Have Business Groups

```sql
-- Check if any categories exist
SELECT COUNT(*) as total_categories,
       COUNT(business_unit_group_id) as with_business_group
FROM categories;
```

**Expected**: Both numbers should be equal (all categories have a business group)

---

## 🔍 View Current Categories

```sql
-- See all categories with their business groups
SELECT 
  c.id,
  c.name as category,
  bug.name as business_group,
  c.business_unit_group_id as bg_id
FROM categories c
LEFT JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name;
```

**Expected**: Each category should show which business group it belongs to

---

## 🔍 Check Unique Constraint

```sql
-- Check if the new unique constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'categories'
AND constraint_name = 'categories_name_business_group_unique';
```

**Expected**: Should return 1 row showing the unique constraint

---

## ⚠️ If Migrations NOT Applied

If any of the above queries return empty or show the column doesn't exist, you need to run the migrations!

Go to https://console.neon.tech → SQL Editor and run the SQL from `docs/RUN_MIGRATIONS_MANUALLY.md`

---

## 🎯 Quick Check (All-in-One)

Run this single query to check everything:

```sql
DO $$
DECLARE
  fa_spoc_exists BOOLEAN;
  cat_bg_exists BOOLEAN;
  cat_bg_not_null BOOLEAN;
  total_cats INTEGER;
  cats_with_bg INTEGER;
BEGIN
  -- Check FA SPOC column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'functional_areas' AND column_name = 'spoc_name'
  ) INTO fa_spoc_exists;
  
  -- Check Categories BG column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'business_unit_group_id'
  ) INTO cat_bg_exists;
  
  -- Check if BG column is NOT NULL
  SELECT is_nullable = 'NO' INTO cat_bg_not_null
  FROM information_schema.columns 
  WHERE table_name = 'categories' AND column_name = 'business_unit_group_id';
  
  -- Count categories
  SELECT COUNT(*) INTO total_cats FROM categories;
  SELECT COUNT(business_unit_group_id) INTO cats_with_bg FROM categories;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION STATUS CHECK';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Migration 035 (FA SPOCs): %', CASE WHEN fa_spoc_exists THEN '✅ APPLIED' ELSE '❌ NOT APPLIED' END;
  RAISE NOTICE 'Migration 036 (Categories per BG): %', CASE WHEN cat_bg_exists THEN '✅ APPLIED' ELSE '❌ NOT APPLIED' END;
  RAISE NOTICE 'Categories BG column NOT NULL: %', CASE WHEN cat_bg_not_null THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Total categories: %', total_cats;
  RAISE NOTICE 'Categories with business group: %', cats_with_bg;
  RAISE NOTICE '';
  
  IF fa_spoc_exists AND cat_bg_exists AND cat_bg_not_null THEN
    RAISE NOTICE '✅ ALL MIGRATIONS APPLIED - Ready to import!';
  ELSE
    RAISE NOTICE '❌ MIGRATIONS NOT COMPLETE - Run migrations first!';
  END IF;
  RAISE NOTICE '============================================================================';
END $$;
```

**Expected output:**
```
✅ Migration 035 (FA SPOCs): APPLIED
✅ Migration 036 (Categories per BG): APPLIED
✅ Categories BG column NOT NULL: YES
✅ ALL MIGRATIONS APPLIED - Ready to import!
```

---

**Run this check query in Neon Console and share the output!** This will tell us if migrations were applied correctly. 🔍
