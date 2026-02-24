-- Migration script to remove child ticket (sub-ticket) functionality
-- This removes the parent_ticket_id column and related indexes

-- ============================================================================
-- 1. DROP INDEXES
-- ============================================================================

-- Drop index for querying sub-tickets by parent
DROP INDEX IF EXISTS idx_tickets_parent_ticket_id;

-- Drop index for querying parent tickets (tickets with children)
DROP INDEX IF EXISTS idx_tickets_has_children;

-- ============================================================================
-- 2. REMOVE COLUMN
-- ============================================================================

-- Remove parent_ticket_id column from tickets table
ALTER TABLE tickets DROP COLUMN IF EXISTS parent_ticket_id;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify the column has been removed
SELECT 'Tickets table columns after migration:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- Verify indexes have been dropped
SELECT 'Remaining indexes on tickets table:' as info;
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tickets'
ORDER BY indexname;

-- ============================================================================
-- 4. COMPLETION MESSAGE
-- ============================================================================

SELECT 'Migration completed successfully!' as status;
SELECT 'Removed: parent_ticket_id column and related indexes' as summary;
SELECT 'Child ticket functionality has been removed from the system' as note;
