-- ============================================
-- HOMES.KIDS: Fix Missing Home Memberships
-- ============================================
-- Problem: When a guardian links a home from another child's space,
-- they don't automatically get a home_membership for that home.
-- This causes the home to not appear in their main page home flow.
--
-- This script creates missing home_memberships for guardians who
-- have homes linked to their children but no membership for those homes.
-- ============================================

-- ============================================
-- STEP 1: DEBUGGING - See current state
-- ============================================

-- 1a. Show all child_spaces (which homes are linked to which children)
SELECT 
    '1. Child-Home Links' as step,
    c.name as child_name,
    h.name as home_name,
    cs.status
FROM child_spaces cs
JOIN children c ON c.id = cs.child_id
JOIN homes h ON h.id = cs.home_id
ORDER BY c.name, h.name;

-- 1b. Show all home_memberships (who has access to which homes)
SELECT 
    '2. Current Memberships' as step,
    p.name as user_name,
    p.email,
    h.name as home_name
FROM home_memberships hm
JOIN profiles p ON p.id = hm.user_id
JOIN homes h ON h.id = hm.home_id
ORDER BY p.name, h.name;

-- 1c. Show guardians and their children
SELECT 
    '3. Guardians' as step,
    p.name as guardian_name,
    p.email,
    c.name as child_name
FROM child_access ca
JOIN profiles p ON p.id = ca.user_id
JOIN children c ON c.id = ca.child_id
WHERE ca.role_type = 'guardian'
ORDER BY p.name, c.name;

-- ============================================
-- STEP 2: FIND MISSING MEMBERSHIPS
-- ============================================
SELECT 
    '4. MISSING MEMBERSHIPS' as step,
    p.name as user_name,
    p.email,
    h.name as home_name,
    c.name as child_name
FROM child_access ca
JOIN child_spaces cs ON cs.child_id = ca.child_id AND cs.status = 'active'
JOIN profiles p ON p.id = ca.user_id
JOIN homes h ON h.id = cs.home_id
JOIN children c ON c.id = ca.child_id
WHERE ca.role_type = 'guardian'
AND NOT EXISTS (
    SELECT 1 FROM home_memberships hm 
    WHERE hm.home_id = cs.home_id 
    AND hm.user_id = ca.user_id
)
ORDER BY p.name, h.name;

-- ============================================
-- STEP 3: CREATE MISSING HOME MEMBERSHIPS
-- ============================================
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
-- STEP 4: VERIFY THE FIX
-- ============================================
SELECT 
    '5. AFTER FIX - All Memberships' as step,
    p.name as user_name,
    h.name as home_name
FROM home_memberships hm
JOIN profiles p ON p.id = hm.user_id
JOIN homes h ON h.id = hm.home_id
ORDER BY p.name, h.name;

-- Check if any are still missing
SELECT 
    '6. Still Missing (should be empty)' as step,
    p.name as user_name,
    h.name as home_name,
    c.name as child_name
FROM child_access ca
JOIN child_spaces cs ON cs.child_id = ca.child_id AND cs.status = 'active'
JOIN profiles p ON p.id = ca.user_id
JOIN homes h ON h.id = cs.home_id
JOIN children c ON c.id = ca.child_id
WHERE ca.role_type = 'guardian'
AND NOT EXISTS (
    SELECT 1 FROM home_memberships hm 
    WHERE hm.home_id = cs.home_id 
    AND hm.user_id = ca.user_id
);

-- ============================================
-- After running this:
-- 1. All guardians will have home_memberships for all homes
--    linked to their children
-- 2. The main page home flow will show all homes correctly
-- 3. Refresh your browser to see the changes
-- ============================================
