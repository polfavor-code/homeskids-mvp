-- ============================================
-- FIX: Create missing child_access records for accepted invites
-- ============================================
-- This script finds all accepted invites that don't have a corresponding
-- child_access record and creates them.
--
-- This fixes the bug where helper roles (family_friend, babysitter, etc.)
-- failed to create child_access due to invalid helper_type values.
-- ============================================

-- First, let's see what's missing
SELECT 
    i.id as invite_id,
    i.child_id,
    i.accepted_by as user_id,
    i.invitee_name,
    i.invitee_role,
    i.status,
    i.accepted_at,
    ca.id as child_access_id
FROM invites i
LEFT JOIN child_access ca ON ca.child_id = i.child_id AND ca.user_id = i.accepted_by
WHERE i.status = 'accepted'
  AND i.accepted_by IS NOT NULL
  AND ca.id IS NULL;

-- Now create the missing child_access records
INSERT INTO child_access (child_id, user_id, role_type, helper_type, access_level)
SELECT 
    i.child_id,
    i.accepted_by,
    CASE 
        WHEN i.invitee_role IN ('parent', 'step_parent') THEN 'guardian'
        ELSE 'helper'
    END as role_type,
    CASE 
        WHEN i.invitee_role IN ('parent', 'step_parent') THEN NULL
        WHEN i.invitee_role = 'nanny' THEN 'nanny'
        WHEN i.invitee_role = 'babysitter' THEN 'nanny'
        WHEN i.invitee_role = 'family_member' THEN 'family_member'
        WHEN i.invitee_role = 'family_friend' THEN 'friend'
        ELSE 'friend'
    END as helper_type,
    CASE 
        WHEN i.invitee_role IN ('parent', 'step_parent') THEN 'manage'
        ELSE 'view'
    END as access_level
FROM invites i
LEFT JOIN child_access ca ON ca.child_id = i.child_id AND ca.user_id = i.accepted_by
WHERE i.status = 'accepted'
  AND i.accepted_by IS NOT NULL
  AND ca.id IS NULL
ON CONFLICT (child_id, user_id) DO NOTHING;

-- Verify the fix
SELECT 
    i.id as invite_id,
    i.invitee_name,
    i.invitee_role,
    ca.role_type,
    ca.helper_type,
    ca.access_level
FROM invites i
JOIN child_access ca ON ca.child_id = i.child_id AND ca.user_id = i.accepted_by
WHERE i.status = 'accepted';
