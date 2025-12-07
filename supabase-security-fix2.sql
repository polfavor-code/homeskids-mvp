-- COMPLETE FIX: Drop all policies and recreate with helper function

-- Step 1: Create helper function that bypasses RLS
CREATE OR REPLACE FUNCTION get_my_family_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid();
$$;

-- Step 2: Drop ALL existing policies on family_members
DROP POLICY IF EXISTS "Users can view own family memberships" ON family_members;
DROP POLICY IF EXISTS "Users can view co-members in family" ON family_members;
DROP POLICY IF EXISTS "Family members can add new members" ON family_members;
DROP POLICY IF EXISTS "Users can update own membership" ON family_members;

-- Step 3: Recreate family_members policies using the function
CREATE POLICY "Users can view own family memberships" ON family_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view co-members in family" ON family_members
FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Family members can add new members" ON family_members
FOR INSERT WITH CHECK (family_id IN (SELECT get_my_family_ids()) OR user_id = auth.uid());

CREATE POLICY "Users can update own membership" ON family_members
FOR UPDATE USING (user_id = auth.uid());

-- Step 4: Update other tables to use the function too
DROP POLICY IF EXISTS "Family members can view family" ON families;
DROP POLICY IF EXISTS "Family members can update family" ON families;
CREATE POLICY "Family members can view family" ON families FOR SELECT USING (id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can update family" ON families FOR UPDATE USING (id IN (SELECT get_my_family_ids()));

DROP POLICY IF EXISTS "Family members can view children" ON children;
DROP POLICY IF EXISTS "Family members can insert children" ON children;
DROP POLICY IF EXISTS "Family members can update children" ON children;
DROP POLICY IF EXISTS "Family members can delete children" ON children;
CREATE POLICY "Family members can view children" ON children FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can insert children" ON children FOR INSERT WITH CHECK (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can update children" ON children FOR UPDATE USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can delete children" ON children FOR DELETE USING (family_id IN (SELECT get_my_family_ids()));

DROP POLICY IF EXISTS "Family members can view items" ON items;
DROP POLICY IF EXISTS "Family members can insert items" ON items;
DROP POLICY IF EXISTS "Family members can update items" ON items;
DROP POLICY IF EXISTS "Family members can delete items" ON items;
CREATE POLICY "Family members can view items" ON items FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can insert items" ON items FOR INSERT WITH CHECK (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can update items" ON items FOR UPDATE USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can delete items" ON items FOR DELETE USING (family_id IN (SELECT get_my_family_ids()));

DROP POLICY IF EXISTS "Family members can view invites" ON invites;
DROP POLICY IF EXISTS "Family members can create invites" ON invites;
DROP POLICY IF EXISTS "Family members can update invites" ON invites;
CREATE POLICY "Family members can view invites" ON invites FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can create invites" ON invites FOR INSERT WITH CHECK (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can update invites" ON invites FOR UPDATE USING (family_id IN (SELECT get_my_family_ids()));

DROP POLICY IF EXISTS "Family members can view homes" ON homes;
DROP POLICY IF EXISTS "Family members can insert homes" ON homes;
DROP POLICY IF EXISTS "Family members can update homes" ON homes;
DROP POLICY IF EXISTS "Family members can delete homes" ON homes;
CREATE POLICY "Family members can view homes" ON homes FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can insert homes" ON homes FOR INSERT WITH CHECK (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can update homes" ON homes FOR UPDATE USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can delete homes" ON homes FOR DELETE USING (family_id IN (SELECT get_my_family_ids()));

DROP POLICY IF EXISTS "Family members can view contacts" ON contacts;
DROP POLICY IF EXISTS "Family members can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Family members can update contacts" ON contacts;
DROP POLICY IF EXISTS "Family members can delete contacts" ON contacts;
CREATE POLICY "Family members can view contacts" ON contacts FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can insert contacts" ON contacts FOR INSERT WITH CHECK (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can update contacts" ON contacts FOR UPDATE USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can delete contacts" ON contacts FOR DELETE USING (family_id IN (SELECT get_my_family_ids()));

DROP POLICY IF EXISTS "Family members can view documents" ON documents;
DROP POLICY IF EXISTS "Family members can insert documents" ON documents;
DROP POLICY IF EXISTS "Family members can update documents" ON documents;
DROP POLICY IF EXISTS "Family members can delete documents" ON documents;
CREATE POLICY "Family members can view documents" ON documents FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can insert documents" ON documents FOR INSERT WITH CHECK (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can update documents" ON documents FOR UPDATE USING (family_id IN (SELECT get_my_family_ids()));
CREATE POLICY "Family members can delete documents" ON documents FOR DELETE USING (family_id IN (SELECT get_my_family_ids()));

DROP POLICY IF EXISTS "Users can view family member profiles" ON profiles;
CREATE POLICY "Users can view family member profiles" ON profiles FOR SELECT USING (id IN (SELECT fm.user_id FROM family_members fm WHERE fm.family_id IN (SELECT get_my_family_ids())));
