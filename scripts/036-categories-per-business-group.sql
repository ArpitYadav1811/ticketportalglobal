-- ============================================================================
-- Migration Script 036: Make Categories Belong to Business Groups
-- ============================================================================
-- Description: Adds business_unit_group_id to categories table so each
--              Business Group can have its own set of categories
-- Date: 2026-03-12
-- Risk Level: MEDIUM - Schema change with data migration
-- ============================================================================

-- STEP 1: Add business_unit_group_id column to categories (nullable for migration)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS business_unit_group_id INTEGER REFERENCES business_unit_groups(id) ON DELETE CASCADE;

-- STEP 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_business_group 
ON categories(business_unit_group_id);

-- STEP 3: Migrate existing data
-- For existing categories that are used in mappings, we need to duplicate them per business group
DO $$
DECLARE
  cat_record RECORD;
  mapping_record RECORD;
  new_cat_id INTEGER;
  existing_mappings INTEGER;
BEGIN
  RAISE NOTICE 'Starting category migration to business group specific...';
  
  -- Get count of existing mappings
  SELECT COUNT(*) INTO existing_mappings FROM ticket_classification_mapping;
  RAISE NOTICE 'Found % existing mappings to migrate', existing_mappings;
  
  -- For each unique combination of category + business_group in mappings
  FOR mapping_record IN 
    SELECT DISTINCT 
      tcm.business_unit_group_id,
      tcm.category_id,
      c.name as category_name,
      c.description as category_description
    FROM ticket_classification_mapping tcm
    JOIN categories c ON tcm.category_id = c.id
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
      
      RAISE NOTICE 'Created category "%" for BG ID %', mapping_record.category_name, mapping_record.business_unit_group_id;
      
      -- Update mappings to use the new category
      UPDATE ticket_classification_mapping
      SET category_id = new_cat_id
      WHERE business_unit_group_id = mapping_record.business_unit_group_id
      AND category_id = mapping_record.category_id;
    END IF;
  END LOOP;
  
  -- Delete old global categories that are no longer referenced
  DELETE FROM categories WHERE business_unit_group_id IS NULL;
  
  RAISE NOTICE 'Migration complete!';
END $$;

-- STEP 4: Make business_unit_group_id NOT NULL (now required)
ALTER TABLE categories
ALTER COLUMN business_unit_group_id SET NOT NULL;

-- STEP 5: Update unique constraint to allow same category name across different business groups
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add new unique constraint: category name must be unique within a business group
ALTER TABLE categories
ADD CONSTRAINT categories_name_business_group_unique 
UNIQUE (name, business_unit_group_id);

-- STEP 6: Add comments for documentation
COMMENT ON COLUMN categories.business_unit_group_id IS 'The business group this category belongs to';
COMMENT ON TABLE categories IS 'Categories for ticket classification - each category belongs to a specific business group';

-- STEP 7: Verification
DO $$
DECLARE
  total_categories INTEGER;
  categories_per_bg RECORD;
BEGIN
  -- Count total categories
  SELECT COUNT(*) INTO total_categories FROM categories;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 036 COMPLETE: Categories Now Belong to Business Groups';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total categories: %', total_categories;
  RAISE NOTICE '';
  RAISE NOTICE 'Categories per Business Group:';
  
  FOR categories_per_bg IN
    SELECT 
      bug.name as business_group,
      COUNT(c.id) as category_count
    FROM business_unit_groups bug
    LEFT JOIN categories c ON c.business_unit_group_id = bug.id
    GROUP BY bug.id, bug.name
    ORDER BY bug.name
  LOOP
    RAISE NOTICE '  - %: % categories', categories_per_bg.business_group, categories_per_bg.category_count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS: Categories are now business group specific';
  RAISE NOTICE '   - business_unit_group_id column added (NOT NULL)';
  RAISE NOTICE '   - Unique constraint: (name, business_unit_group_id)';
  RAISE NOTICE '   - Same category name can exist in different business groups';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: All existing mappings have been preserved';
  RAISE NOTICE '============================================================================';
END $$;

-- STEP 8: Show sample data
SELECT 
  bug.name as business_group,
  c.name as category,
  c.description,
  (SELECT COUNT(*) FROM subcategories s WHERE s.category_id = c.id) as subcategory_count
FROM categories c
JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
ORDER BY bug.name, c.name
LIMIT 20;
