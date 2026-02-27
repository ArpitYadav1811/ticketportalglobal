-- ============================================================================
-- Migration Script 024: Convert estimated_duration from VARCHAR to INTEGER
-- ============================================================================
-- Description: Changes estimated_duration from VARCHAR to INTEGER (hours)
--              Parses existing string values and converts to hours
-- Date: 2026-02-27
-- Author: Database Architect
-- Risk Level: MEDIUM - Data conversion with potential loss
-- Rollback: See 024-rollback-convert-estimated-duration.sql
-- ============================================================================

-- STEP 1: Analyze existing data
DO $$
DECLARE
  total_tickets INTEGER;
  tickets_with_duration INTEGER;
  null_duration INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tickets FROM tickets;
  
  SELECT COUNT(*) INTO tickets_with_duration 
  FROM tickets 
  WHERE estimated_duration IS NOT NULL AND estimated_duration != '';
  
  SELECT COUNT(*) INTO null_duration 
  FROM tickets 
  WHERE estimated_duration IS NULL OR estimated_duration = '';
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ESTIMATED DURATION ANALYSIS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total tickets: %', total_tickets;
  RAISE NOTICE 'Tickets with duration: %', tickets_with_duration;
  RAISE NOTICE 'Tickets with NULL/empty duration: %', null_duration;
  RAISE NOTICE '============================================================================';
END $$;

-- STEP 2: Show sample of existing values
DO $$
DECLARE
  sample_record RECORD;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE 'Sample of existing estimated_duration values:';
  FOR sample_record IN 
    SELECT DISTINCT estimated_duration 
    FROM tickets 
    WHERE estimated_duration IS NOT NULL 
    AND estimated_duration != ''
    LIMIT 10
  LOOP
    counter := counter + 1;
    RAISE NOTICE '  %: "%"', counter, sample_record.estimated_duration;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Add new INTEGER column
-- ============================================================================
RAISE NOTICE 'Adding estimated_duration_hours column...';

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS estimated_duration_hours INTEGER;

RAISE NOTICE 'Column added';

-- ============================================================================
-- STEP 4: Parse and convert existing data
-- ============================================================================
RAISE NOTICE 'Converting existing data...';

-- Function to parse duration strings
CREATE OR REPLACE FUNCTION parse_duration_to_hours(duration_str VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
  num_value NUMERIC;
BEGIN
  -- Return NULL for NULL or empty strings
  IF duration_str IS NULL OR TRIM(duration_str) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Convert to lowercase for easier matching
  duration_str := LOWER(TRIM(duration_str));
  
  -- Try to extract numeric value
  BEGIN
    -- Pattern: "X hour(s)" or "X hr(s)"
    IF duration_str ~ '^\d+\.?\d*\s*(hour|hours|hr|hrs)' THEN
      num_value := CAST(REGEXP_REPLACE(duration_str, '(\d+\.?\d*).*', '\1') AS NUMERIC);
      RETURN CAST(num_value AS INTEGER);
    END IF;
    
    -- Pattern: "X day(s)"
    IF duration_str ~ '^\d+\.?\d*\s*(day|days)' THEN
      num_value := CAST(REGEXP_REPLACE(duration_str, '(\d+\.?\d*).*', '\1') AS NUMERIC);
      RETURN CAST(num_value * 8 AS INTEGER); -- 1 day = 8 hours
    END IF;
    
    -- Pattern: "X week(s)"
    IF duration_str ~ '^\d+\.?\d*\s*(week|weeks|wk|wks)' THEN
      num_value := CAST(REGEXP_REPLACE(duration_str, '(\d+\.?\d*).*', '\1') AS NUMERIC);
      RETURN CAST(num_value * 40 AS INTEGER); -- 1 week = 40 hours
    END IF;
    
    -- Pattern: "X month(s)"
    IF duration_str ~ '^\d+\.?\d*\s*(month|months|mon|mons)' THEN
      num_value := CAST(REGEXP_REPLACE(duration_str, '(\d+\.?\d*).*', '\1') AS NUMERIC);
      RETURN CAST(num_value * 160 AS INTEGER); -- 1 month = 160 hours (4 weeks)
    END IF;
    
    -- Pattern: Just a number (assume hours)
    IF duration_str ~ '^\d+\.?\d*$' THEN
      num_value := CAST(duration_str AS NUMERIC);
      RETURN CAST(num_value AS INTEGER);
    END IF;
    
    -- Pattern: "X-Y hours" (take average)
    IF duration_str ~ '^\d+\s*-\s*\d+\s*(hour|hours|hr|hrs)' THEN
      num_value := (
        CAST(REGEXP_REPLACE(duration_str, '(\d+)\s*-\s*(\d+).*', '\1') AS NUMERIC) +
        CAST(REGEXP_REPLACE(duration_str, '(\d+)\s*-\s*(\d+).*', '\2') AS NUMERIC)
      ) / 2;
      RETURN CAST(num_value AS INTEGER);
    END IF;
    
    -- Unable to parse
    RAISE WARNING 'Unable to parse duration: "%"', duration_str;
    RETURN NULL;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error parsing duration "%" : %', duration_str, SQLERRM;
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql;

-- Apply conversion
UPDATE tickets
SET estimated_duration_hours = parse_duration_to_hours(estimated_duration);

-- Report conversion results
DO $$
DECLARE
  total_converted INTEGER;
  failed_conversion INTEGER;
  null_original INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_converted 
  FROM tickets 
  WHERE estimated_duration_hours IS NOT NULL;
  
  SELECT COUNT(*) INTO failed_conversion 
  FROM tickets 
  WHERE estimated_duration IS NOT NULL 
  AND estimated_duration != '' 
  AND estimated_duration_hours IS NULL;
  
  SELECT COUNT(*) INTO null_original 
  FROM tickets 
  WHERE estimated_duration IS NULL OR estimated_duration = '';
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CONVERSION RESULTS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Successfully converted: %', total_converted;
  RAISE NOTICE 'Failed to convert: %', failed_conversion;
  RAISE NOTICE 'Originally NULL/empty: %', null_original;
  RAISE NOTICE '============================================================================';
  
  -- Show failed conversions
  IF failed_conversion > 0 THEN
    RAISE WARNING 'The following values could not be converted:';
    FOR rec IN 
      SELECT DISTINCT estimated_duration 
      FROM tickets 
      WHERE estimated_duration IS NOT NULL 
      AND estimated_duration != '' 
      AND estimated_duration_hours IS NULL
      LIMIT 20
    LOOP
      RAISE WARNING '  "%"', rec.estimated_duration;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Backup old column data (optional - comment out if not needed)
-- ============================================================================
-- Uncomment to create backup table:
-- CREATE TABLE tickets_estimated_duration_backup AS
-- SELECT id, ticket_number, estimated_duration, estimated_duration_hours
-- FROM tickets
-- WHERE estimated_duration IS NOT NULL;

-- ============================================================================
-- STEP 6: Drop old column and rename new column
-- ============================================================================
RAISE NOTICE 'Dropping old estimated_duration column...';

ALTER TABLE tickets 
DROP COLUMN IF EXISTS estimated_duration;

RAISE NOTICE 'Renaming estimated_duration_hours to estimated_duration...';

ALTER TABLE tickets 
RENAME COLUMN estimated_duration_hours TO estimated_duration;

RAISE NOTICE 'Column renamed';

-- ============================================================================
-- STEP 7: Add constraints and comments
-- ============================================================================
RAISE NOTICE 'Adding constraints...';

-- Add check constraint (duration should be positive)
ALTER TABLE tickets 
ADD CONSTRAINT tickets_estimated_duration_positive 
CHECK (estimated_duration IS NULL OR estimated_duration > 0);

-- Add comment
COMMENT ON COLUMN tickets.estimated_duration IS 
'Estimated duration in hours (INTEGER). NULL if not estimated.';

RAISE NOTICE 'Constraints added';

-- ============================================================================
-- STEP 8: Create index for analytics
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tickets_estimated_duration 
ON tickets(estimated_duration) 
WHERE estimated_duration IS NOT NULL;

-- ============================================================================
-- STEP 9: Drop helper function
-- ============================================================================
DROP FUNCTION IF EXISTS parse_duration_to_hours(VARCHAR);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
DO $$
DECLARE
  col_type TEXT;
  total_tickets INTEGER;
  tickets_with_duration INTEGER;
  min_duration INTEGER;
  max_duration INTEGER;
  avg_duration NUMERIC;
BEGIN
  -- Check column type
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'tickets' 
  AND column_name = 'estimated_duration';
  
  -- Get statistics
  SELECT COUNT(*) INTO total_tickets FROM tickets;
  
  SELECT COUNT(*) INTO tickets_with_duration 
  FROM tickets 
  WHERE estimated_duration IS NOT NULL;
  
  SELECT MIN(estimated_duration) INTO min_duration 
  FROM tickets 
  WHERE estimated_duration IS NOT NULL;
  
  SELECT MAX(estimated_duration) INTO max_duration 
  FROM tickets 
  WHERE estimated_duration IS NOT NULL;
  
  SELECT AVG(estimated_duration) INTO avg_duration 
  FROM tickets 
  WHERE estimated_duration IS NOT NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION 024 COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Column type: %', col_type;
  RAISE NOTICE 'Total tickets: %', total_tickets;
  RAISE NOTICE 'Tickets with duration: %', tickets_with_duration;
  RAISE NOTICE 'Min duration: % hours', min_duration;
  RAISE NOTICE 'Max duration: % hours', max_duration;
  RAISE NOTICE 'Avg duration: % hours', ROUND(avg_duration, 2);
  
  IF col_type = 'integer' THEN
    RAISE NOTICE 'SUCCESS: estimated_duration is now INTEGER';
  ELSE
    RAISE EXCEPTION 'FAILED: Column type is % (expected integer)', col_type;
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;
