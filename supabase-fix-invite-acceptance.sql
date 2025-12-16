-- ============================================
-- HOMES.KIDS: Fix Invite Acceptance RLS Issue
-- ============================================
-- Problem: When accepting an invite, the user cannot insert into
-- child_guardians or child_access because RLS requires permissions
-- they don't have yet (chicken-and-egg problem).
--
-- Solution: Create a SECURITY DEFINER function that handles invite
-- acceptance and creates the necessary access entries.
-- ============================================

-- ============================================
-- FUNCTION: accept_invite(invite_id, user_id)
-- ============================================
-- Accepts an invite and grants appropriate access to the user.
-- Uses SECURITY DEFINER to bypass RLS for the insert operations.

CREATE OR REPLACE FUNCTION accept_invite(
    p_invite_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite RECORD;
    v_is_guardian BOOLEAN;
    v_helper_type TEXT;
    v_result JSONB;
BEGIN
    -- 1. Fetch the invite
    SELECT * INTO v_invite
    FROM invites
    WHERE id = p_invite_id
    AND status = 'pending';
    
    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invite not found or already accepted');
    END IF;
    
    -- 2. Determine if this is a guardian role
    v_is_guardian := v_invite.invitee_role IN ('parent', 'step_parent');
    
    -- 3. Map invitee_role to valid helper_type values
    -- DB constraint only allows: 'family_member', 'friend', 'nanny'
    IF NOT v_is_guardian THEN
        v_helper_type := CASE v_invite.invitee_role
            WHEN 'nanny' THEN 'nanny'
            WHEN 'babysitter' THEN 'nanny'
            WHEN 'family_member' THEN 'family_member'
            WHEN 'family_friend' THEN 'friend'
            WHEN 'friend' THEN 'friend'
            ELSE 'friend'
        END;
    END IF;
    
    -- 4. If guardian, add to child_guardians (this will trigger apply_guardian_defaults)
    IF v_is_guardian THEN
        INSERT INTO child_guardians (child_id, user_id, guardian_role)
        VALUES (v_invite.child_id, p_user_id, v_invite.invitee_role)
        ON CONFLICT (child_id, user_id) DO NOTHING;
    END IF;
    
    -- 5. Add to child_access (upsert to handle both guardian and helper)
    INSERT INTO child_access (child_id, user_id, role_type, helper_type, access_level)
    VALUES (
        v_invite.child_id,
        p_user_id,
        CASE WHEN v_is_guardian THEN 'guardian' ELSE 'helper' END,
        v_helper_type,
        CASE WHEN v_is_guardian THEN 'manage' ELSE 'view' END
    )
    ON CONFLICT (child_id, user_id) 
    DO UPDATE SET
        role_type = EXCLUDED.role_type,
        helper_type = EXCLUDED.helper_type,
        access_level = EXCLUDED.access_level;
    
    -- 5. Add permission overrides for guardian
    IF v_is_guardian THEN
        INSERT INTO child_permission_overrides (
            child_id, user_id,
            can_view_calendar, can_edit_calendar,
            can_view_items, can_edit_items,
            can_upload_photos, can_add_notes,
            can_view_contacts, can_manage_helpers
        ) VALUES (
            v_invite.child_id, p_user_id,
            TRUE, TRUE,
            TRUE, TRUE,
            TRUE, TRUE,
            TRUE, TRUE
        )
        ON CONFLICT (child_id, user_id) DO UPDATE SET
            can_view_calendar = TRUE,
            can_edit_calendar = TRUE,
            can_view_items = TRUE,
            can_edit_items = TRUE,
            can_upload_photos = TRUE,
            can_add_notes = TRUE,
            can_view_contacts = TRUE,
            can_manage_helpers = TRUE;
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'child_id', v_invite.child_id,
        'is_guardian', v_is_guardian
    );
END;
$$;

COMMENT ON FUNCTION accept_invite IS 'Accepts an invite and grants the user appropriate access to the child. Bypasses RLS using SECURITY DEFINER.';

-- ============================================
-- Grant execute permission to authenticated users
-- ============================================
GRANT EXECUTE ON FUNCTION accept_invite TO authenticated;

-- ============================================
-- DONE
-- ============================================
-- Run this SQL in your Supabase SQL Editor.
-- 
-- IMPORTANT: This update fixes a bug where caregivers with roles like
-- "family_friend" or "babysitter" were not being added to child_access
-- because those values are not valid for the helper_type column.
-- 
-- The function now maps:
--   - nanny → nanny
--   - babysitter → nanny
--   - family_member → family_member
--   - family_friend → friend
--   - (default) → friend
-- ============================================
