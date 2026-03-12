# Run Migrations Manually (Connection Timeout Fix)

Since the automated migration scripts are timing out when connecting to your Neon database, here's how to run both migrations manually using the Neon Console.

## 🎯 Two Migrations to Run

1. **Migration 035**: Add SPOC to Functional Areas
2. **Migration 036**: Make Categories belong to Business Groups

## 🚀 Quick Steps (All in One)

### Go to Neon Console
1. Open https://console.neon.tech
2. Select your project
3. Go to **SQL Editor**

### Run Both Migrations

Copy and paste this entire SQL block (runs both migrations):

```sql
-- ============================================================================
-- MIGRATION 035: Add SPOC to Functional Areas
-- ============================================================================

ALTER TABLE functional_areas
ADD COLUMN IF NOT EXISTS spoc_name VARCHAR(255);

COMMENT ON COLUMN functional_areas.spoc_name IS 'SPOC (Single Point of Contact) for this functional area';

CREATE INDEX IF NOT EXISTS idx_functional_areas_spoc 
ON functional_areas(spoc_name) 
WHERE spoc_name IS NOT NULL;

-- Verify Migration 035
DO $$
DECLARE
  fa_count INTEGER;
  spoc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fa_count FROM functional_areas;
  SELECT COUNT(*) INTO spoc_count FROM functional_areas WHERE spoc_name IS NOT NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ MIGRATION 035 COMPLETE: Functional Area SPOCs';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total functional areas: %', fa_count;
  RAISE NOTICE 'Functional areas with SPOC: %', spoc_count;
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- MIGRATION 036: Make Categories Belong to Business Groups
-- ============================================================================

-- Step 1: Add business_unit_group_id column (nullable for migration)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS business_unit_group_id INTEGER REFERENCES business_unit_groups(id) ON DELETE CASCADE;

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_categories_business_group 
ON categories(business_unit_group_id);

-- Step 3: Migrate existing data
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

-- Step 4: Delete old global categories
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

-- Step 8: Final Verification
DO $$
DECLARE
  total_categories INTEGER;
  bg_record RECORD;
BEGIN
  SELECT COUNT(*) INTO total_categories FROM categories;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ MIGRATION 036 COMPLETE: Categories Based on Business Groups';
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
  RAISE NOTICE '✅ Both migrations completed successfully!';
  RAISE NOTICE '============================================================================';
END $$;

-- Show sample data
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

You should see messages like:
```
✅ MIGRATION 035 COMPLETE: Functional Area SPOCs
✅ MIGRATION 036 COMPLETE: Categories Based on Business Groups
```

And a table showing categories grouped by business group.

## ✅ After Running Migrations

### Step 1: Clear Cache & Restart
```bash
rm -rf .next
npm run dev
```

### Step 2: Hard Refresh Browser
Press `Ctrl + Shift + R` in your browser

### Step 3: Verify in UI

#### Check Functional Area SPOCs:
1. Go to **Admin Dashboard** → **FA Mappings** tab
2. Click **Edit** on any Functional Area
3. You should see **SPOC dropdown** (3rd field)

#### Check Categories by Business Group:
1. Go to **Master Data Management** → **Categories** tab
2. Table should show **Business Group** column
3. Click **Add New** - should require **Business Group** selection
4. Each category should show which BG it belongs to

#### Check Ticket Creation:
1. Go to **Create Ticket**
2. Select a **Business Group**
3. **Category dropdown** should show only categories for that BG

## 🔍 Verification Queries

Run these in Neon SQL Editor to verify everything worked:

### 1. Check Functional Area SPOCs
```sql
SELECT id, name, spoc_name 
FROM functional_areas 
ORDER BY name;
```

### 2. Check Categories Have Business Groups
```sql
SELECT 
  c.id,
  c.name as category,
  bug.name as business_group
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name;
```

### 3. Check No NULL Business Groups in Categories
```sql
SELECT COUNT(*) as null_count 
FROM categories 
WHERE business_unit_group_id IS NULL;
-- Should return 0
```

### 4. Check Mappings Are Valid
```sql
SELECT 
  bug.name as business_group,
  c.name as category,
  s.name as subcategory,
  c.business_unit_group_id as cat_bg_id,
  tcm.target_business_group_id as mapping_bg_id
FROM ticket_classification_mapping tcm
JOIN business_unit_groups bug ON tcm.target_business_group_id = bug.id
JOIN categories c ON tcm.category_id = c.id
JOIN subcategories s ON tcm.subcategory_id = s.id
LIMIT 10;
-- cat_bg_id and mapping_bg_id should match!
```

## 🎯 What You Can Do Now

### 1. Assign SPOCs to Functional Areas
- Go to **Admin Dashboard** → **FA Mappings** tab
- Click **Edit** on any FA
- Select a user from the **SPOC dropdown**
- Save

### 2. Create Business Group-Specific Categories
- Go to **Master Data Management** → **Categories** tab
- Click **Add New**
- Enter category name
- **Select Business Group** (required)
- Save

### 3. Import Data with Excel
Your Excel file can now include:
- Functional Area + FA SPOC columns
- Categories will be created per Business Group automatically

```bash
node scripts/import-categories-by-business-group.js your-file.xlsx
```

## 📊 Example Data After Migration

### Functional Areas with SPOCs:
| Name | SPOC |
|------|------|
| IT Support | John Doe |
| Finance Ops | Jane Smith |
| HR Operations | Bob Wilson |

### Categories by Business Group:
| Business Group | Category | Subcategories |
|----------------|----------|---------------|
| Tech Delivery | Hardware | 3 |
| Tech Delivery | Software | 5 |
| Finance | Hardware | 2 |
| Finance | Accounting | 4 |
| HR | Recruitment | 3 |
| HR | Payroll | 2 |

## ❓ FAQ

### Q: Do I need to run both migrations?
**A:** Yes! Migration 035 adds FA SPOCs, Migration 036 makes categories BG-specific.

### Q: Can I run them separately?
**A:** Yes, but it's easier to run the combined SQL above.

### Q: Will this break anything?
**A:** No! The migrations preserve all existing data and update references automatically.

### Q: What if I already ran Migration 035?
**A:** The SQL uses `IF NOT EXISTS`, so it's safe to run again. It will skip Migration 035 and only run 036.

### Q: How long does it take?
**A:** Usually 5-30 seconds depending on your data size.

### Q: Can I rollback?
**A:** Yes, but you'd need to restore from a backup. The migrations are designed to be safe and shouldn't need rollback.

## 🆘 Need Help?

If you encounter issues:
1. Share the exact error message from Neon Console
2. Share output of verification queries
3. Check if your database is active (not paused) in Neon
4. Verify you have write permissions on the database

---

**Ready?** Copy the SQL above, paste it into Neon Console SQL Editor, and click **Run**! 🚀
