-- ============================================
-- HOMES.KIDS: Fix Guardian Home Membership Access
-- ============================================
-- Problem: When a guardian links a home to their child, they can't
-- add themselves to home_memberships because RLS requires either:
-- 1. Being the first member (home has no members), OR
-- 2. Being a home admin
--
-- Solution: Create a security definer function that allows guardians
-- to add themselves to homes linked to their children.
-- ============================================

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION ensure_guardian_home_membership(
    p_home_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_guardian BOOLEAN := FALSE;
    v_home_has_child_link BOOLEAN := FALSE;
BEGIN
    -- Check if user is a guardian for ANY child linked to this home
    SELECT EXISTS (
        SELECT 1 
        FROM child_access ca
        JOIN child_spaces cs ON cs.child_id = ca.child_id
        WHERE ca.user_id = p_user_id
        AND ca.role_type = 'guardian'
        AND cs.home_id = p_home_id
        AND cs.status = 'active'
    ) INTO v_is_guardian;

    IF NOT v_is_guardian THEN
        -- User is not a guardian for a child linked to this home
        RETURN FALSE;
    END IF;

    -- Check if membership already exists
    IF EXISTS (
        SELECT 1 FROM home_memberships 
        WHERE home_id = p_home_id AND user_id = p_user_id
    ) THEN
        -- Already has membership
        RETURN TRUE;
    END IF;

    -- Create the membership (not as admin)
    INSERT INTO home_memberships (home_id, user_id, is_home_admin)
    VALUES (p_home_id, p_user_id, FALSE)
    ON CONFLICT (home_id, user_id) DO NOTHING;

    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_guardian_home_membership(UUID, UUID) TO authenticated;

-- ============================================
-- FIX EXISTING DATA: Add missing memberships for guardians
-- ============================================
-- This runs with admin privileges so it bypasses RLS

INSERT INTO home_memberships (home_id, user_id, is_home_admin)
SELECT DISTINCT
    cs.home_id,
    ca.user_id,
    false as is_home_admin
FROM child_access ca
JOIN child_spaces cs ON cs.child_id = ca.child_id AND cs.status = 'active'
WHERE ca.role_type = 'guardian'
AND NOT EXISTS (
    SELECT 1 FROM home_memberships hm 
    WHERE hm.home_id = cs.home_id 
    AND hm.user_id = ca.user_id
)
ON CONFLICT (home_id, user_id) DO NOTHING;

-- ============================================
-- VERIFY: Show all guardian memberships after fix
-- ============================================
SELECT 
    'Guardian Memberships' as info,
    p.name as guardian_name,
    h.name as home_name,
    c.name as child_linked
FROM child_access ca
JOIN child_spaces cs ON cs.child_id = ca.child_id AND cs.status = 'active'
JOIN home_memberships hm ON hm.home_id = cs.home_id AND hm.user_id = ca.user_id
JOIN profiles p ON p.id = ca.user_id
JOIN homes h ON h.id = cs.home_id
JOIN children c ON c.id = ca.child_id
WHERE ca.role_type = 'guardian'
ORDER BY p.name, h.name, c.name;

-- ============================================
-- After running this:
-- 1. All existing guardians get memberships for their children's homes
-- 2. The new function can be called from the app to add memberships
-- 3. Refresh your browser to see the changes
-- ============================================
