-- ============================================
-- HOMES.KIDS: Item-Child Relationship
-- Migration 011: Add child_ids array to items
-- ============================================
-- This migration adds explicit child ownership to items
-- - child_ids: array of child IDs that own this item
-- Supports items belonging to one child, multiple children, or all children
-- ============================================

-- ============================================
-- ADD child_ids ARRAY (if not exists)
-- ============================================

ALTER TABLE items
ADD COLUMN IF NOT EXISTS child_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_items_child_ids ON items USING GIN(child_ids);

COMMENT ON COLUMN items.child_ids IS 'Array of child IDs that own this item. Supports single, multiple, or all children.';

-- ============================================
-- BACKFILL: Set child_ids from child_space
-- ============================================
-- For existing items, derive child_id from child_space_id

UPDATE items
SET child_ids = ARRAY(
    SELECT cs.child_id 
    FROM child_spaces cs 
    WHERE cs.id = items.child_space_id
)
WHERE child_ids = '{}' OR child_ids IS NULL;

-- ============================================
-- DONE
-- ============================================
