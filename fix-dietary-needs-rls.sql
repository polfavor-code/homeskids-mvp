-- ============================================
-- FIX DIETARY_NEEDS RLS FOR V2 PERMISSIONS
-- ============================================
-- The dietary_needs table is using old V1 family-based RLS
-- Need to update to V2 child-centric RLS
-- ============================================

-- Drop old V1 RLS policies
DROP POLICY IF EXISTS "Family members can view dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can insert dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can update dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can delete dietary needs" ON dietary_needs;

-- Create V2 child-centric RLS policies
-- Users with child_access can view dietary needs for that child
CREATE POLICY "Users with child access can view dietary needs"
ON dietary_needs FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

-- Guardians and users with manage_helpers can insert dietary needs
CREATE POLICY "Guardians can insert dietary needs"
ON dietary_needs FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

-- Guardians and users with manage_helpers can update dietary needs
CREATE POLICY "Guardians can update dietary needs"
ON dietary_needs FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

-- Only guardians can delete dietary needs
CREATE POLICY "Guardians can delete dietary needs"
ON dietary_needs FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- ============================================
-- VERIFY THE CHANGES
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'dietary_needs'
ORDER BY policyname;

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. Patrick should be able to save dietary needs for June
-- 2. All users with child_access can view dietary needs
-- 3. Only guardians can edit/delete dietary needs
-- ============================================
