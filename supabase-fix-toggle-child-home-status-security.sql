-- ============================================
-- FIX: Add authorization check to toggle_child_home_status
-- ============================================
-- 
-- Problem 1: The toggle_child_home_status function uses SECURITY DEFINER
-- which bypasses RLS, but had no check to verify the calling user
-- has permission to modify the child-home link.
--
-- Problem 2: The is_guardian function was checking the wrong table
-- (child_guardians instead of child_access).
--
-- Solution: 
-- 1. Fix is_guardian to check child_access table with role_type = 'guardian'
-- 2. Add a guardian check at the start of toggle_child_home_status
--
-- Note: The frontend doesn't actually call toggle_child_home_status (it uses
-- direct table queries protected by RLS), but this secures the
-- function in case it's used in the future.
-- ============================================

-- ============================================
-- STEP 1: Fix is_guardian function to use correct table
-- ============================================
CREATE OR REPLACE FUNCTION is_guardian(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM child_access
        WHERE child_id = p_child_id
        AND user_id = p_user_id
        AND role_type = 'guardian'
    );
END;
$$;

COMMENT ON FUNCTION is_guardian IS 'Returns TRUE if user is a guardian (parent/stepparent) of the child. Checks child_access table.';

-- ============================================
-- STEP 2: Fix toggle_child_home_status with authorization check
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
    v_user_id UUID := auth.uid();
BEGIN
    -- Authorization check: verify caller is a guardian of this child
    IF NOT is_guardian(p_child_id, v_user_id) THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Permission denied. Only guardians can modify child-home links.'
        );
    END IF;

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

-- Comment explaining the security model
COMMENT ON FUNCTION toggle_child_home_status IS 
    'Toggle or create child-home link with specified status. Requires guardian access to the child.';
