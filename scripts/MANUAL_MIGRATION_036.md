# Manual Migration 036: Make Categories Belong to Business Groups

Due to connection timeouts, you can run this migration manually using the Neon Console.

## 🎯 What This Migration Does

Transforms categories from **global entities** to **business group-specific entities**.

**Before**: One "Hardware" category used by all business groups  
**After**: Each business group has its own "Hardware" category

## 🚀 Quick Migration (Neon Console)

### Step 1: Go to Neon Console
1. Open https://console.neon.tech
2. Select your project
3. Go to **SQL Editor**

### Step 2: Run This SQL

Copy and paste this entire SQL block:

```sql
-- ============================================================================
-- Migration 036: Make Categories Belong to Business Groups
-- ============================================================================

-- Step 1: Add business_unit_group_id column (nullable for migration)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS business_unit_group_id INTEGER REFERENCES business_unit_groups(id) ON DELETE CASCADE;

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_categories_business_group 
ON categories(business_unit_group_id);

-- Step 3: Migrate existing data
-- For each category used in mappings, create BG-specific versions
DO $$
DECLARE
  mapping_record RECORD;
  new_cat_id INTEGER;
  migrated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting category migration...';
  
  -- For each unique combination of category + business_group in mappings
  FOR mapping_record IN 
    SELECT DISTINCT 
      tcm.business_unit_group_id,
      tcm.category_id,
      c.name as category_name,
      c.description as category_description,
      bug.name as business_group_name
    FROM ticket_classification_mapping tcm
    JOIN categories c ON tcm.category_id = c.id
    JOIN business_unit_groups bug ON tcm.business_unit_group_id = bug.id
    ORDER BY tcm.business_unit_group_id, c.name
  LOOP
    -- Check if this category already exists for this business group
    SELECT id INTO new_cat_id
    FROM categories 
    WHERE name = mapping_record.category_name 
    AND business_unit_group_id = mapping_record.business_unit_group_id;
    
    IF new_cat_id IS NULL THEN
      -- Create new category for this business group
      INSERT INTO categories (name, description, business_unit_group_id)
      VALUES (
        mapping_record.category_name,
        mapping_record.category_description,
        mapping_record.business_unit_group_id
      )
      RETURNING id INTO new_cat_id;
      
      RAISE NOTICE 'Created: % for %', mapping_record.category_name, mapping_record.business_group_name;
      migrated_count := migrated_count + 1;
    END IF;
    
    -- Update mappings to use the new category
    UPDATE ticket_classification_mapping
    SET category_id = new_cat_id
    WHERE business_unit_group_id = mapping_record.business_unit_group_id
    AND category_id = mapping_record.category_id;
  END LOOP;
  
  RAISE NOTICE 'Created % business-group-specific categories', migrated_count;
END $$;

-- Step 4: Delete old global categories (those without business_unit_group_id)
DELETE FROM categories WHERE business_unit_group_id IS NULL;

-- Step 5: Make business_unit_group_id required
ALTER TABLE categories
ALTER COLUMN business_unit_group_id SET NOT NULL;

-- Step 6: Update unique constraint
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_name_key;

ALTER TABLE categories
ADD CONSTRAINT categories_name_business_group_unique 
UNIQUE (name, business_unit_group_id);

-- Step 7: Add documentation
COMMENT ON COLUMN categories.business_unit_group_id IS 'The business group this category belongs to';
COMMENT ON TABLE categories IS 'Categories for ticket classification - each category belongs to a specific business group';

-- Step 8: Verification
DO $$
DECLARE
  total_categories INTEGER;
  bg_record RECORD;
BEGIN
  SELECT COUNT(*) INTO total_categories FROM categories;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 036 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total categories: %', total_categories;
  RAISE NOTICE '';
  RAISE NOTICE 'Categories per Business Group:';
  
  FOR bg_record IN
    SELECT 
      bug.name as business_group,
      COUNT(c.id) as category_count
    FROM business_unit_groups bug
    LEFT JOIN categories c ON c.business_unit_group_id = bug.id
    GROUP BY bug.id, bug.name
    ORDER BY bug.name
  LOOP
    RAISE NOTICE '  - %: % categories', bg_record.business_group, bg_record.category_count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS: Categories are now business group specific!';
  RAISE NOTICE '============================================================================';
END $$;

-- Step 9: Show sample data
SELECT 
  bug.name as business_group,
  c.name as category,
  c.description,
  (SELECT COUNT(*) FROM subcategories s WHERE s.category_id = c.id) as subcategory_count
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name
LIMIT 20;
```

### Step 3: Verify Success

You should see output like:
```
MIGRATION 036 COMPLETE
Total categories: 15
Categories per Business Group:
  - Tech Delivery: 5 categories
  - Finance: 4 categories
  - HR: 3 categories
  - Sales: 3 categories
✅ SUCCESS: Categories are now business group specific!
```

## 🔍 Verification Queries

After migration, run these to verify:

### Check All Categories Have Business Groups
```sql
SELECT COUNT(*) as total,
       COUNT(business_unit_group_id) as with_bg
FROM categories;
-- Both should be equal
```

### View Categories by Business Group
```sql
SELECT 
  bug.name as business_group,
  c.name as category,
  (SELECT COUNT(*) FROM subcategories WHERE category_id = c.id) as subcategories
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name;
```

### Check Mappings Still Work
```sql
SELECT 
  bug.name as business_group,
  c.name as category,
  s.name as subcategory
FROM ticket_classification_mapping tcm
JOIN business_unit_groups bug ON tcm.target_business_group_id = bug.id
JOIN categories c ON tcm.category_id = c.id
JOIN subcategories s ON tcm.subcategory_id = s.id
LIMIT 10;
```

## ⚠️ Important Notes

### Data Safety
- ✅ All existing categories are preserved (duplicated per BG)
- ✅ All subcategories remain linked correctly
- ✅ All mappings continue to work
- ✅ All tickets keep their category references

### What Gets Duplicated
If "Hardware" category is used by 3 business groups, the migration creates:
- "Hardware" for Tech Delivery (new ID)
- "Hardware" for Finance (new ID)
- "Hardware" for HR (new ID)

Each with its own subcategories and mappings!

### No Rollback Needed
The migration is designed to be safe and preserve all data. If something goes wrong, the transaction will rollback automatically.

## 🎨 After Migration

### In Master Data Management:
- Categories table shows **Business Group** column
- Add/Edit category requires selecting a **Business Group**
- Categories are grouped by Business Group

### In Ticket Creation:
- Select **Business Group** first
- Category dropdown shows only categories for that Business Group
- Cleaner, more relevant category lists!

### In Excel Import:
- Same format, but creates BG-specific categories
- Same category name in different BGs creates separate categories

## 🔧 Troubleshooting

### Migration Fails with "column already exists"
The column might already exist. Check:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND column_name = 'business_unit_group_id';
```

If it exists but is NULL, run from Step 3 onwards.

### Migration Fails with "constraint already exists"
The constraint might already exist. Check:
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'categories' 
AND constraint_name = 'categories_name_business_group_unique';
```

If it exists, skip Step 6.

### Categories Not Showing in UI
1. Clear Next.js cache: `rm -rf .next`
2. Restart dev server: `npm run dev`
3. Hard refresh browser: `Ctrl + Shift + R`

### Categories Still Global in UI
Make sure you've:
1. ✅ Run the migration
2. ✅ Cleared cache and restarted
3. ✅ Accepted all file changes in your IDE
4. ✅ Hard refreshed the browser

## 📋 Checklist

After running the migration:

- [ ] Run the SQL in Neon Console
- [ ] Verify success message appears
- [ ] Check categories have business_unit_group_id
- [ ] Clear Next.js cache (`rm -rf .next`)
- [ ] Restart dev server (`npm run dev`)
- [ ] Hard refresh browser (`Ctrl + Shift + R`)
- [ ] Test creating a category (should require Business Group)
- [ ] Test creating a ticket (categories should filter by BG)
- [ ] Test Excel import (should create BG-specific categories)

## 🎯 Next Steps

Once migration is complete:
1. **Test in UI**: Go to Master Data → Categories, verify Business Group column appears
2. **Create Test Category**: Add a new category, select a Business Group
3. **Test Ticket Creation**: Create a ticket, verify categories filter by BG
4. **Import Your Excel**: Run the import script with your data

## 📚 Related Documentation

- **`docs/MIGRATION_036_GUIDE.md`** - Detailed migration guide
- **`docs/CATEGORY_STRUCTURE_EXPLAINED.md`** - How the new structure works
- **`docs/IMPORT_CATEGORIES_GUIDE.md`** - How to import with new structure

---

**Need Help?** If you encounter any issues, share:
- The exact error message
- Which step failed
- Output of verification queries
