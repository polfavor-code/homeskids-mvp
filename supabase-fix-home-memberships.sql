-- ============================================
-- DIAGNOSTIC: Check Home Memberships
-- ============================================
-- This shows who is registered as a member of each home
-- The confirmation workflow requires the confirmer to be a MEMBER
-- of the destination home (via home_memberships table)
-- ============================================

-- 1. Show current home memberships
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

-- 2. Show all homes and their owner/creator
SELECT 
    h.name as home_name,
    h.id as home_id,
    p.name as creator_name,
    u.email as creator_email
FROM homes h
LEFT JOIN profiles p ON p.id = h.created_by
LEFT JOIN auth.users u ON u.id = h.created_by
ORDER BY h.name;

-- 3. Show all users with profiles
SELECT 
    p.name,
    u.email,
    p.id as user_id
FROM profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.name;

-- ============================================
-- FIX: Add missing home memberships
-- ============================================
-- Run the diagnostic queries above first to identify:
-- 1. Which user is "Mommy" (get their user_id)
-- 2. What is the home_id for "Mommy's home"
-- Then uncomment and modify the INSERT below:

/*
-- Example: Add Mommy to Mommy's home
-- Replace the UUIDs with actual values from the diagnostic queries above

INSERT INTO home_memberships (home_id, user_id, is_home_admin)
VALUES (
    'MOMMY_HOME_ID_HERE',  -- home_id from query 2
    'MOMMY_USER_ID_HERE',  -- user_id from query 3
    true  -- is_home_admin (usually true for the primary parent of a home)
)
ON CONFLICT (home_id, user_id) DO NOTHING;
*/

-- ============================================
-- ALTERNATIVE: Auto-add home creators to their homes
-- ============================================
-- This adds any home creator who isn't already a member

INSERT INTO home_memberships (home_id, user_id, is_home_admin)
SELECT h.id, h.created_by, true
FROM homes h
WHERE h.created_by IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM home_memberships hm 
    WHERE hm.home_id = h.id AND hm.user_id = h.created_by
)
ON CONFLICT (home_id, user_id) DO NOTHING;

-- Verify the fix
SELECT 
    h.name as home_name,
    p.name as user_name,
    u.email,
    hm.is_home_admin
FROM home_memberships hm
JOIN homes h ON h.id = hm.home_id
JOIN profiles p ON p.id = hm.user_id
JOIN auth.users u ON u.id = hm.user_id
ORDER BY h.name, p.name;
