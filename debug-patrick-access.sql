-- ============================================
-- Debug Patrick's Access to June
-- ============================================
-- Run these queries to check Patrick's current access state
-- ============================================

-- 1. Find Patrick's user ID
SELECT id, email, raw_user_meta_data->>'full_name' as full_name
FROM auth.users 
WHERE email ILIKE '%patrick%' OR raw_user_meta_data->>'full_name' ILIKE '%patrick%';

-- 2. Find June's child ID
SELECT id, name, dob, avatar_url, created_by
FROM children 
WHERE name ILIKE '%june%';

-- 3. Check if Patrick has child_access for June
-- Replace with actual IDs from queries 1 and 2
SELECT ca.*, c.name as child_name
FROM child_access ca
JOIN children c ON c.id = ca.child_id
WHERE ca.user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%patrick%')
  AND ca.child_id IN (SELECT id FROM children WHERE name ILIKE '%june%');

-- 4. Check if Patrick is in child_guardians for June
SELECT cg.*, c.name as child_name
FROM child_guardians cg
JOIN children c ON c.id = cg.child_id
WHERE cg.user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%patrick%')
  AND cg.child_id IN (SELECT id FROM children WHERE name ILIKE '%june%');

-- 5. Check Patrick's permission overrides for June
SELECT cpo.*, c.name as child_name
FROM child_permission_overrides cpo
JOIN children c ON c.id = cpo.child_id
WHERE cpo.user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%patrick%')
  AND cpo.child_id IN (SELECT id FROM children WHERE name ILIKE '%june%');

-- 6. Check pending invites for Patrick
SELECT i.*, c.name as child_name
FROM invites i
JOIN children c ON c.id = i.child_id
WHERE i.invitee_name ILIKE '%patrick%';

-- ============================================
-- If Patrick has NO ACCESS, run this to grant it:
-- ============================================
-- (Replace the IDs with actual values from queries 1 and 2)
/*
DO $$
DECLARE
    v_patrick_id UUID := 'PASTE_PATRICK_USER_ID_HERE';
    v_june_id UUID := 'PASTE_JUNE_CHILD_ID_HERE';
BEGIN
    -- Add to child_guardians
    INSERT INTO child_guardians (child_id, user_id, guardian_role)
    VALUES (v_june_id, v_patrick_id, 'step_parent')
    ON CONFLICT (child_id, user_id) DO NOTHING;
    
    -- Add to child_access
    INSERT INTO child_access (child_id, user_id, role_type, access_level)
    VALUES (v_june_id, v_patrick_id, 'guardian', 'manage')
    ON CONFLICT (child_id, user_id) DO UPDATE SET 
        role_type = 'guardian', access_level = 'manage';
    
    -- Add permission overrides
    INSERT INTO child_permission_overrides (
        child_id, user_id,
        can_view_calendar, can_edit_calendar,
        can_view_items, can_edit_items,
        can_upload_photos, can_add_notes,
        can_view_contacts, can_manage_helpers
    ) VALUES (
        v_june_id, v_patrick_id,
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
    )
    ON CONFLICT (child_id, user_id) DO UPDATE SET
        can_view_calendar = TRUE, can_edit_calendar = TRUE,
        can_view_items = TRUE, can_edit_items = TRUE,
        can_upload_photos = TRUE, can_add_notes = TRUE,
        can_view_contacts = TRUE, can_manage_helpers = TRUE;
    
    RAISE NOTICE 'Access granted successfully';
END $$;
*/
