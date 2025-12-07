-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view co-members in family" ON family_members;
DROP POLICY IF EXISTS "Family members can add new members" ON family_members;

-- Recreate with SECURITY DEFINER function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_family_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT family_id FROM family_members WHERE user_id = user_uuid;
$$;

-- Now create policies using the function
CREATE POLICY "Users can view co-members in family" ON family_members
FOR SELECT USING (family_id IN (SELECT get_user_family_ids(auth.uid())));

CREATE POLICY "Family members can add new members" ON family_members
FOR INSERT WITH CHECK (family_id IN (SELECT get_user_family_ids(auth.uid())) OR user_id = auth.uid());
