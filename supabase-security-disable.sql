-- TEMPORARILY DISABLE RLS ON family_members to stop recursion
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;

-- Drop all policies on family_members
DROP POLICY IF EXISTS "Users can view own family memberships" ON family_members;
DROP POLICY IF EXISTS "Users can view co-members in family" ON family_members;
DROP POLICY IF EXISTS "Family members can add new members" ON family_members;
DROP POLICY IF EXISTS "Users can update own membership" ON family_members;

-- Re-enable with simple non-recursive policies
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can see all family_members (no recursion)
CREATE POLICY "Authenticated users can view family_members" ON family_members
FOR SELECT TO authenticated USING (true);

-- Users can insert their own membership
CREATE POLICY "Users can insert own membership" ON family_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own membership
CREATE POLICY "Users can update own membership" ON family_members
FOR UPDATE USING (user_id = auth.uid());
