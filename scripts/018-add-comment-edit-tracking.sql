-- Migration script to add comment edit tracking

-- 1. Add updated_at and is_edited fields to comments table
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_by INTEGER REFERENCES users(id);

-- 2. Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_updated_at ON comments(updated_at);

-- 3. Add comment for documentation
COMMENT ON COLUMN comments.updated_at IS 'Timestamp when comment was last edited';
COMMENT ON COLUMN comments.is_edited IS 'Flag indicating if comment has been edited';
COMMENT ON COLUMN comments.edited_by IS 'User who last edited the comment';

SELECT 'Migration to add comment edit tracking completed.' as status;
