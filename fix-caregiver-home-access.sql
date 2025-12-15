-- ============================================
-- FIX: Remove incorrect child_space_access entries
-- ============================================
-- Problem: Some caregivers were connected to ALL homes instead of just
-- the homes they were invited to or created.
--
-- This script helps identify and fix these issues.
-- ============================================

-- STEP 1: View current child_space_access for a specific user
-- Replace 'USER_EMAIL' with the user's email to investigate
SELECT 
    p.email,
    p.name as user_name,
    csa.child_space_id,
    cs.home_id,
    h.name as home_name,
    h.created_by,
    CASE WHEN h.created_by = p.id THEN 'Created by this user' ELSE 'Not created by this user' END as ownership
FROM child_space_access csa
JOIN child_spaces cs ON cs.id = csa.child_space_id
JOIN homes h ON h.id = cs.home_id
JOIN profiles p ON p.id = csa.user_id
WHERE p.email = 'USER_EMAIL'  -- Replace with actual email
ORDER BY h.name;

-- STEP 2: Find homes the user should have access to
-- (homes they created OR homes they were invited to)
-- Replace 'USER_ID' with the actual user ID

-- Homes created by the user:
SELECT id, name, 'Created' as reason 
FROM homes 
WHERE created_by = 'USER_ID';  -- Replace with actual user ID

-- Homes from accepted invites:
SELECT i.home_id, h.name, 'Invited' as reason
FROM invites i
JOIN homes h ON h.id = i.home_id
WHERE i.accepted_by = 'USER_ID'  -- Replace with actual user ID
AND i.home_id IS NOT NULL;

-- STEP 3: Remove access to homes the user should NOT have access to
-- This removes child_space_access entries where:
-- - The user did NOT create the home
-- - The user was NOT invited to the home
-- 
-- ⚠️ BE CAREFUL: Review the SELECT first before running DELETE

-- First, review what will be deleted:
SELECT 
    csa.id,
    p.email,
    h.name as home_name,
    'WILL BE DELETED' as action
FROM child_space_access csa
JOIN child_spaces cs ON cs.id = csa.child_space_id
JOIN homes h ON h.id = cs.home_id
JOIN profiles p ON p.id = csa.user_id
WHERE csa.user_id = 'USER_ID'  -- Replace with actual user ID
AND h.created_by != csa.user_id  -- Not the home creator
AND cs.home_id NOT IN (
    SELECT i.home_id 
    FROM invites i 
    WHERE i.accepted_by = csa.user_id 
    AND i.home_id IS NOT NULL
);

-- If the above looks correct, run the DELETE:
-- DELETE FROM child_space_access
-- WHERE user_id = 'USER_ID'  -- Replace with actual user ID
-- AND child_space_id IN (
--     SELECT cs.id
--     FROM child_spaces cs
--     JOIN homes h ON h.id = cs.home_id
--     WHERE h.created_by != 'USER_ID'  -- Not the home creator
--     AND cs.home_id NOT IN (
--         SELECT i.home_id 
--         FROM invites i 
--         WHERE i.accepted_by = 'USER_ID' 
--         AND i.home_id IS NOT NULL
--     )
-- );

-- Also remove home_memberships for homes they shouldn't have:
-- DELETE FROM home_memberships
-- WHERE user_id = 'USER_ID'  -- Replace with actual user ID
-- AND home_id NOT IN (
--     SELECT id FROM homes WHERE created_by = 'USER_ID'
--     UNION
--     SELECT home_id FROM invites WHERE accepted_by = 'USER_ID' AND home_id IS NOT NULL
-- );

-- ============================================
-- After running this fix, the user will need to refresh their browser
-- to see the updated home access.
-- ============================================
