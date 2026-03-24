-- Migration: RLS policies for guardian vs helper visibility
-- Guardian = child/pet-centric (sees ALL homes linked to children)
-- Helper = home-centric (sees ONLY their assigned home)

-- ============================================
-- 1. Helper function to check if user is guardian of any child in a home
-- ============================================

CREATE OR REPLACE FUNCTION is_guardian_of_home(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- User is guardian if they have guardian access to any child that has a space in this home
  SELECT EXISTS (
    SELECT 1 FROM child_spaces cs
    JOIN child_access ca ON ca.child_id = cs.child_id
    WHERE cs.home_id = p_home_id
      AND ca.user_id = p_user_id
      AND ca.role_type = 'guardian'
  );
$$;

COMMENT ON FUNCTION is_guardian_of_home IS 'Check if user is a guardian of any child that has a space in this home';

-- ============================================
-- 2. Helper function to check home membership type
-- ============================================

CREATE OR REPLACE FUNCTION get_home_access_type(p_home_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Returns 'guardian' if user is a guardian of any child at this home
  -- Returns 'helper' if user is only a helper (home_member but not guardian)
  -- Returns NULL if no access
  SELECT CASE
    WHEN is_guardian_of_home(p_home_id, p_user_id) THEN 'guardian'
    WHEN EXISTS (
      SELECT 1 FROM home_memberships hm
      WHERE hm.home_id = p_home_id AND hm.user_id = p_user_id
    ) THEN 'helper'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION get_home_access_type IS 'Get user access type for a home: guardian (full access) or helper (home-scoped)';

-- ============================================
-- 3. Update homes RLS policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view homes they have access to" ON homes;
DROP POLICY IF EXISTS "Home admins can update homes" ON homes;

-- Guardians: Can see ALL homes linked to their children
-- Helpers: Can ONLY see homes they are members of
CREATE POLICY "Users can view homes based on access type"
ON homes
FOR SELECT
USING (
  -- Guardian access: Can see home if guardian of any child at this home
  is_guardian_of_home(id, auth.uid())
  OR
  -- Helper access: Can only see if explicitly a member
  EXISTS (
    SELECT 1 FROM home_memberships hm
    WHERE hm.home_id = homes.id AND hm.user_id = auth.uid()
  )
  OR
  -- Home creator can always see
  created_by = auth.uid()
);

-- Only guardians (home admins) can update homes
CREATE POLICY "Guardians can update homes"
ON homes
FOR UPDATE
USING (
  is_guardian_of_home(id, auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM home_memberships hm
    WHERE hm.home_id = homes.id
      AND hm.user_id = auth.uid()
      AND hm.is_home_admin = true
  )
);

-- ============================================
-- 4. Update child_spaces RLS policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view child spaces they have access to" ON child_spaces;

-- Guardians: See all child_spaces for their children
-- Helpers: See only child_spaces at their home for children they have access to
CREATE POLICY "Users can view child spaces based on access type"
ON child_spaces
FOR SELECT
USING (
  -- Guardian: Can see if guardian of this child
  EXISTS (
    SELECT 1 FROM child_access ca
    WHERE ca.child_id = child_spaces.child_id
      AND ca.user_id = auth.uid()
      AND ca.role_type = 'guardian'
  )
  OR
  -- Helper: Can see if has explicit child_space_access
  EXISTS (
    SELECT 1 FROM child_space_access csa
    WHERE csa.child_space_id = child_spaces.id
      AND csa.user_id = auth.uid()
  )
);

-- ============================================
-- 5. Update items RLS policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view items in their accessible spaces" ON items;

-- Guardians: See items across ALL homes for their children
-- Helpers: See items ONLY at their assigned home
-- Items are linked to homes via child_space_id
CREATE POLICY "Users can view items based on access type"
ON items
FOR SELECT
USING (
  -- Guardian: Can see if guardian of the child whose space this item belongs to
  EXISTS (
    SELECT 1 FROM child_spaces cs
    JOIN child_access ca ON ca.child_id = cs.child_id
    WHERE cs.id = items.child_space_id
      AND ca.user_id = auth.uid()
      AND ca.role_type = 'guardian'
  )
  OR
  -- Helper: Can see if has explicit child_space_access
  EXISTS (
    SELECT 1 FROM child_space_access csa
    WHERE csa.child_space_id = items.child_space_id
      AND csa.user_id = auth.uid()
  )
);

-- Note: daily_logs table RLS policies would go here when the table exists
-- The daily_logs table is not yet created, so skipping this section
