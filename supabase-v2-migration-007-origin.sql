-- ============================================
-- HOMES.KIDS V2: Item Origin Migration
-- Migration 007: Add origin_user_id and origin_home_id
-- ============================================
-- This migration adds origin tracking fields to items_v2
-- - origin_user_id: who originally brought this item
-- - origin_home_id: which home it originally came from
-- Used for "bring back" / transfer requests (logistics, not ownership)
-- ============================================

-- ============================================
-- ADD origin_user_id (if not exists)
-- ============================================

ALTER TABLE items_v2
ADD COLUMN IF NOT EXISTS origin_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_v2_origin_user_id ON items_v2(origin_user_id);

COMMENT ON COLUMN items_v2.origin_user_id IS 'Who originally brought/added this item. Used for transfer requests. Items always belong to the child.';

-- ============================================
-- ADD origin_home_id (if not exists)
-- ============================================

ALTER TABLE items_v2
ADD COLUMN IF NOT EXISTS origin_home_id UUID REFERENCES homes_v2(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_v2_origin_home_id ON items_v2(origin_home_id);

COMMENT ON COLUMN items_v2.origin_home_id IS 'Which home this item originally came from. Used for "bring back" requests.';

-- ============================================
-- RLS POLICY FOR ORIGIN VISIBILITY
-- ============================================
-- Users can see items they originated even if at another home

-- Drop old policy if exists (handles both naming conventions)
DROP POLICY IF EXISTS "Users can view items for accessible children or purchased by them" ON items_v2;
DROP POLICY IF EXISTS "Users can view items for accessible children or originated from them" ON items_v2;
DROP POLICY IF EXISTS "Users can view items for accessible children" ON items_v2;

CREATE POLICY "Users can view items for accessible children or originated from them"
    ON items_v2
    FOR SELECT
    USING (
        -- Standard: item is in a child_space the user has access to
        EXISTS (
            SELECT 1 FROM child_spaces cs
            JOIN child_access ca ON ca.child_id = cs.child_id
            WHERE cs.id = items_v2.child_space_id
            AND ca.user_id = auth.uid()
        )
        OR
        -- Additional: user is the origin of this item (can always see items they brought)
        origin_user_id = auth.uid()
    );

-- ============================================
-- DONE
-- ============================================
