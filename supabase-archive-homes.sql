-- ============================================
-- MIGRATION: Add soft-delete (archive) support for homes
-- ============================================
-- 
-- This migration adds the ability to archive homes instead of hard-deleting them.
-- Archived homes:
-- - Are hidden from normal views (home selectors, settings list)
-- - Keep all child_spaces, items, and history intact
-- - Can be restored at any time
-- - Can be permanently deleted with explicit confirmation
--
-- Items in archived homes can still be moved to active homes,
-- allowing parents to physically pick up items and relocate them in the app.
-- ============================================

-- Add archived_at column to track when a home was archived
ALTER TABLE homes 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for efficient filtering of archived vs active homes
CREATE INDEX IF NOT EXISTS idx_homes_archived_at ON homes(archived_at);

-- Add comment explaining the column
COMMENT ON COLUMN homes.archived_at IS 'When set, home is archived and hidden from normal views. NULL means active.';

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- 
-- Check column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'homes' AND column_name = 'archived_at';
--
-- Check index was created:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'homes' AND indexname = 'idx_homes_archived_at';
--
-- Test archive/restore:
-- UPDATE homes SET archived_at = NOW() WHERE id = 'some-uuid';  -- Archive
-- UPDATE homes SET archived_at = NULL WHERE id = 'some-uuid';   -- Restore
-- ============================================
