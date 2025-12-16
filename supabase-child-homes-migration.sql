-- ============================================
-- HOMES.KIDS: Child-Home Linking (ChildHome)
-- Migration: Add status field to child_spaces
-- ============================================
-- This migration adds the ability to soft-delete child-home links
-- by using a status field instead of deleting rows.
--
-- KEY CHANGES:
-- - status: 'active' | 'inactive' - controls visibility
-- - created_by_invite_id: optional audit field for invite-created links
-- - updated_at: timestamp for tracking changes
-- ============================================

-- ============================================
-- 1. Add status column to child_spaces
-- ============================================
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'child_spaces' AND column_name = 'status'
    ) THEN
        ALTER TABLE child_spaces ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        ALTER TABLE child_spaces ADD CONSTRAINT child_spaces_status_check 
            CHECK (status IN ('active', 'inactive'));
    END IF;
END $$;

-- ============================================
-- 2. Add created_by_invite_id for audit
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'child_spaces' AND column_name = 'created_by_invite_id'
    ) THEN
        ALTER TABLE child_spaces ADD COLUMN created_by_invite_id UUID;
        -- Note: Foreign key to invites table - using nullable reference
        -- We don't add a FK constraint because invites might be in different table (invites vs invites_v2)
    END IF;
END $$;

-- ============================================
-- 3. Add updated_at column
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'child_spaces' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE child_spaces ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ============================================
-- 4. Create index on status for query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_child_spaces_status ON child_spaces(status);

-- ============================================
-- 5. Create composite index for common queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_child_spaces_child_status ON child_spaces(child_id, status);
CREATE INDEX IF NOT EXISTS idx_child_spaces_home_status ON child_spaces(home_id, status);

-- ============================================
-- 6. Add trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_child_spaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_child_spaces_updated_at ON child_spaces;
CREATE TRIGGER update_child_spaces_updated_at
    BEFORE UPDATE ON child_spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_child_spaces_updated_at();

-- ============================================
-- 7. Migration: Existing rows are already 'active'
--    (DEFAULT 'active' handles this automatically)
-- ============================================

-- ============================================
-- 8. Helper function: Toggle child_space status
-- ============================================
CREATE OR REPLACE FUNCTION toggle_child_home_status(
    p_child_id UUID,
    p_home_id UUID,
    p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_child_space RECORD;
    v_result JSONB;
BEGIN
    -- Validate status
    IF p_new_status NOT IN ('active', 'inactive') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid status. Must be active or inactive.');
    END IF;

    -- Find existing child_space
    SELECT * INTO v_child_space
    FROM child_spaces
    WHERE child_id = p_child_id AND home_id = p_home_id;

    IF v_child_space IS NULL THEN
        -- No existing link - create one if activating
        IF p_new_status = 'active' THEN
            INSERT INTO child_spaces (child_id, home_id, status)
            VALUES (p_child_id, p_home_id, 'active')
            RETURNING * INTO v_child_space;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'action', 'created',
                'child_space_id', v_child_space.id
            );
        ELSE
            RETURN jsonb_build_object('success', FALSE, 'error', 'No existing link to deactivate.');
        END IF;
    ELSE
        -- Update existing link
        UPDATE child_spaces
        SET status = p_new_status
        WHERE id = v_child_space.id;
        
        RETURN jsonb_build_object(
            'success', TRUE,
            'action', CASE WHEN p_new_status = 'active' THEN 'reactivated' ELSE 'deactivated' END,
            'child_space_id', v_child_space.id
        );
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION toggle_child_home_status TO authenticated;

-- ============================================
-- 9. Helper function: Get homes for a child with status
-- ============================================
CREATE OR REPLACE FUNCTION get_child_homes_with_status(p_child_id UUID)
RETURNS TABLE (
    child_space_id UUID,
    home_id UUID,
    home_name TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        cs.id as child_space_id,
        cs.home_id,
        h.name as home_name,
        cs.status,
        cs.created_at,
        cs.updated_at
    FROM child_spaces cs
    JOIN homes h ON h.id = cs.home_id
    WHERE cs.child_id = p_child_id
    ORDER BY cs.status DESC, h.name ASC;  -- Active first, then by name
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_child_homes_with_status TO authenticated;

-- ============================================
-- 10. Helper function: Get children for a home with status
-- ============================================
CREATE OR REPLACE FUNCTION get_home_children_with_status(p_home_id UUID)
RETURNS TABLE (
    child_space_id UUID,
    child_id UUID,
    child_name TEXT,
    child_avatar_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        cs.id as child_space_id,
        cs.child_id,
        c.name as child_name,
        c.avatar_url as child_avatar_url,
        cs.status,
        cs.created_at
    FROM child_spaces cs
    JOIN children c ON c.id = cs.child_id
    WHERE cs.home_id = p_home_id
    ORDER BY cs.status DESC, c.name ASC;  -- Active first, then by name
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_home_children_with_status TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN child_spaces.status IS 'Link status: active (visible) or inactive (soft-deleted)';
COMMENT ON COLUMN child_spaces.created_by_invite_id IS 'Optional: ID of invite that created this link (for audit)';
COMMENT ON COLUMN child_spaces.updated_at IS 'Timestamp of last status change';
COMMENT ON FUNCTION toggle_child_home_status IS 'Toggle or create child-home link with specified status';
COMMENT ON FUNCTION get_child_homes_with_status IS 'Get all homes for a child including inactive ones';
COMMENT ON FUNCTION get_home_children_with_status IS 'Get all children for a home including inactive ones';

-- ============================================
-- DONE
-- ============================================
-- Run this SQL in your Supabase SQL Editor.
-- ============================================
