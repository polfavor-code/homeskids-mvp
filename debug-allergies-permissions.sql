-- ============================================
-- DEBUG ALLERGIES PERMISSIONS
-- ============================================
-- Check if the user has the right permissions to add allergies
-- ============================================

-- Check current policies on allergies table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'allergies'
ORDER BY policyname;

-- Check if required V2 functions exist
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('has_child_access', 'is_guardian', 'can_manage_helpers')
ORDER BY proname;

-- Check current user's child_access
SELECT 
    ca.id,
    ca.child_id,
    ca.user_id,
    ca.role_type,
    ca.helper_type,
    ca.access_level,
    c.name as child_name,
    p.name as user_name
FROM child_access ca
JOIN children_v2 c ON c.id = ca.child_id
LEFT JOIN profiles p ON p.id = ca.user_id
WHERE ca.user_id = auth.uid();

-- Check if user is a guardian for any child
SELECT 
    cg.child_id,
    c.name as child_name,
    cg.guardian_role
FROM child_guardians cg
JOIN children_v2 c ON c.id = cg.child_id
WHERE cg.user_id = auth.uid();

-- Test the permission functions directly
SELECT 
    'has_child_access test' as test,
    ca.child_id,
    has_child_access(ca.child_id, auth.uid()) as has_access,
    is_guardian(ca.child_id, auth.uid()) as is_guardian,
    can_manage_helpers(ca.child_id, auth.uid()) as can_manage_helpers
FROM child_access ca
WHERE ca.user_id = auth.uid()
LIMIT 1;

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- Run this query to see:
-- 1. What policies are active on allergies table
-- 2. If V2 permission functions exist
-- 3. What permissions the current user has
-- 4. Whether permission checks pass
-- ============================================
