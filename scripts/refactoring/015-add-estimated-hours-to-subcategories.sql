-- =====================================================
-- ADD ESTIMATED HOURS TO SUBCATEGORIES
-- =====================================================
-- Purpose: Add estimated_hours column to subcategories table
-- =====================================================

-- Add estimated_hours column to subcategories
ALTER TABLE subcategories 
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;

-- Add comment
COMMENT ON COLUMN subcategories.estimated_hours IS 'Estimated hours to complete tickets in this subcategory';

-- Update existing subcategories with default value if needed
UPDATE subcategories 
SET estimated_hours = 1 
WHERE estimated_hours IS NULL;

-- Verify
SELECT 
  id,
  name,
  estimated_hours,
  category_id
FROM subcategories
ORDER BY category_id, name;
