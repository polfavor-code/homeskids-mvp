-- ============================================
-- HOMES.KIDS: Fix Onboarding Child Access RLS
-- ============================================
-- PROBLEM: During onboarding, when a user creates a child, they cannot 
-- insert into child_access because the RLS policy requires them to already
-- have manage_helpers permission - but they don't have it until they're 
-- in child_access! (chicken-and-egg problem)
--
-- SOLUTION: Allow the creator of a child (children.created_by = auth.uid())
-- to grant themselves access to that child.
-- ============================================

-- ============================================
-- STEP 1: Fix child_access INSERT policy
-- ============================================
-- Allow insert if:
-- 1. User already has manage_helpers permission (existing behavior for inviting others)
-- 2. OR User is the creator of the child (new - for onboarding self-access)

DROP POLICY IF EXISTS "child_access_insert" ON child_access;

CREATE POLICY "child_access_insert" ON child_access
    FOR INSERT WITH CHECK (
        -- Existing: Guardians with manage_helpers can grant access to others
        can_manage_helpers(child_id, auth.uid())
        OR
        -- NEW: Creator of the child can grant themselves access
        (
            user_id = auth.uid() 
            AND EXISTS (
                SELECT 1 FROM children 
                WHERE children.id = child_id 
                AND children.created_by = auth.uid()
            )
        )
    );

-- ============================================
-- STEP 2: Ensure children table RLS allows viewing own created children
-- ============================================
-- The SELECT policy should also allow viewing children you created
-- (in case child_access insert succeeds but hasn't propagated yet)

DROP POLICY IF EXISTS "Users with child access can view children" ON children;
DROP POLICY IF EXISTS "Family members can view children" ON children;

CREATE POLICY "Users with child access can view children"
ON children FOR SELECT
USING (
    -- Standard: user has child_access
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = children.id 
        AND child_access.user_id = auth.uid()
    )
    OR
    -- NEW: user created this child (backup for race conditions)
    created_by = auth.uid()
);

-- ============================================
-- STEP 3: Ensure INSERT policy allows authenticated users to create children
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert children" ON children;
DROP POLICY IF EXISTS "Family members can insert children" ON children;

CREATE POLICY "Authenticated users can insert children"
ON children FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 4: Ensure UPDATE/DELETE policies for children work with child_access
-- ============================================
DROP POLICY IF EXISTS "Guardians can update children" ON children;
DROP POLICY IF EXISTS "Family members can update children" ON children;

CREATE POLICY "Guardians can update children"
ON children FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = children.id 
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
    OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Guardians can delete children" ON children;
DROP POLICY IF EXISTS "Family members can delete children" ON children;

CREATE POLICY "Guardians can delete children"
ON children FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = children.id 
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'child_access INSERT policy' as policy, 
       pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as check_expr
FROM pg_policy 
WHERE polrelid = 'child_access'::regclass 
  AND polname = 'child_access_insert';

SELECT 'children SELECT policy' as policy,
       pg_get_expr(polqual, polrelid) as using_expr
FROM pg_policy 
WHERE polrelid = 'children'::regclass 
  AND polname = 'Users with child access can view children';

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. New users can create children during onboarding
-- 2. They can immediately grant themselves access via child_access
-- 3. They can see the children they created
-- ============================================
