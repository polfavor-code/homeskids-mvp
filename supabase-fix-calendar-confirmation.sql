-- ============================================
-- FIX: Home Day Confirmation Logic
-- ============================================
-- Confirmers should be users connected to the DESTINATION home
-- (via home_memberships), not the proposer
-- ============================================

-- Update the can_confirm_home_day function
CREATE OR REPLACE FUNCTION can_confirm_home_day(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_child_id UUID;
    v_home_id UUID;
    v_proposed_by UUID;
    v_event_type TEXT;
    v_status TEXT;
    v_home_member_count INTEGER;
BEGIN
    -- Get event details
    SELECT child_id, home_id, proposed_by, event_type, status 
    INTO v_child_id, v_home_id, v_proposed_by, v_event_type, v_status
    FROM calendar_events
    WHERE id = p_event_id AND is_deleted = FALSE;
    
    -- Must be a proposed home_day
    IF v_event_type != 'home_day' OR v_status != 'proposed' THEN
        RETURN FALSE;
    END IF;
    
    -- Must have access to the child
    IF NOT EXISTS (
        SELECT 1 FROM child_access ca
        WHERE ca.child_id = v_child_id
        AND ca.user_id = p_user_id
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Must be a member of the destination home
    IF NOT EXISTS (
        SELECT 1 FROM home_memberships hm
        WHERE hm.home_id = v_home_id
        AND hm.user_id = p_user_id
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Count home members (excluding proposer)
    SELECT COUNT(*) INTO v_home_member_count
    FROM home_memberships hm
    WHERE hm.home_id = v_home_id
    AND hm.user_id != v_proposed_by;
    
    -- If no other home members, allow self-confirm
    IF v_home_member_count = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Otherwise, cannot be the proposer
    RETURN v_proposed_by != p_user_id;
END;
$$;

-- Update the get_eligible_confirmers function
CREATE OR REPLACE FUNCTION get_eligible_confirmers(p_event_id UUID)
RETURNS TABLE(user_id UUID, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_child_id UUID;
    v_home_id UUID;
    v_proposed_by UUID;
    v_other_member_count INTEGER;
BEGIN
    -- Get event details
    SELECT ce.child_id, ce.home_id, ce.proposed_by
    INTO v_child_id, v_home_id, v_proposed_by
    FROM calendar_events ce
    WHERE ce.id = p_event_id AND ce.is_deleted = FALSE;
    
    -- Count other home members
    SELECT COUNT(*) INTO v_other_member_count
    FROM home_memberships hm
    WHERE hm.home_id = v_home_id
    AND hm.user_id != v_proposed_by;
    
    -- Return eligible confirmers (home members who have child access)
    IF v_other_member_count = 0 THEN
        -- No other members: proposer can self-confirm
        RETURN QUERY
        SELECT hm.user_id, p.name
        FROM home_memberships hm
        JOIN profiles p ON p.id = hm.user_id
        JOIN child_access ca ON ca.user_id = hm.user_id AND ca.child_id = v_child_id
        WHERE hm.home_id = v_home_id;
    ELSE
        -- Other members exist: exclude proposer
        RETURN QUERY
        SELECT hm.user_id, p.name
        FROM home_memberships hm
        JOIN profiles p ON p.id = hm.user_id
        JOIN child_access ca ON ca.user_id = hm.user_id AND ca.child_id = v_child_id
        WHERE hm.home_id = v_home_id
        AND hm.user_id != v_proposed_by;
    END IF;
END;
$$;

-- ============================================
-- Verify home memberships
-- ============================================
SELECT 
    h.name as home_name,
    h.id as home_id,
    p.name as user_name,
    u.email,
    hm.is_home_admin
FROM home_memberships hm
JOIN homes h ON h.id = hm.home_id
JOIN profiles p ON p.id = hm.user_id
JOIN auth.users u ON u.id = hm.user_id
ORDER BY h.name, p.name;
