-- ============================================
-- HOMES.KIDS V2: CHILD-CENTRIC PERMISSIONS SCHEMA
-- Migration 003: RLS Policies
-- ============================================
-- Row Level Security policies for all tables.
-- Uses helper functions from migration-002 for efficiency.
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_space_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_space_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_stays ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_related" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Users can always view their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can view profiles of people they share child access with
CREATE POLICY "profiles_select_related" ON profiles
    FOR SELECT USING (
        id IN (
            SELECT ca2.user_id
            FROM child_access ca1
            JOIN child_access ca2 ON ca1.child_id = ca2.child_id
            WHERE ca1.user_id = auth.uid()
        )
    );

-- Users can insert their own profile (signup)
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- HOMES_V2 POLICIES
-- ============================================

DROP POLICY IF EXISTS "homes_v2_select" ON homes_v2;
DROP POLICY IF EXISTS "homes_v2_insert" ON homes_v2;
DROP POLICY IF EXISTS "homes_v2_update" ON homes_v2;
DROP POLICY IF EXISTS "homes_v2_delete" ON homes_v2;

-- Users can see homes they have access to
CREATE POLICY "homes_v2_select" ON homes_v2
    FOR SELECT USING (can_see_home(id, auth.uid()));

-- Authenticated users can create homes
CREATE POLICY "homes_v2_insert" ON homes_v2
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only home admins can update homes
CREATE POLICY "homes_v2_update" ON homes_v2
    FOR UPDATE USING (is_home_admin(id, auth.uid()));

-- Only home admins can delete homes
CREATE POLICY "homes_v2_delete" ON homes_v2
    FOR DELETE USING (is_home_admin(id, auth.uid()));

-- ============================================
-- CHILDREN_V2 POLICIES
-- ============================================

DROP POLICY IF EXISTS "children_v2_select" ON children_v2;
DROP POLICY IF EXISTS "children_v2_insert" ON children_v2;
DROP POLICY IF EXISTS "children_v2_update" ON children_v2;
DROP POLICY IF EXISTS "children_v2_delete" ON children_v2;

-- Users can see children they have access to
CREATE POLICY "children_v2_select" ON children_v2
    FOR SELECT USING (has_child_access(id, auth.uid()));

-- Authenticated users can create children (they become guardian)
CREATE POLICY "children_v2_insert" ON children_v2
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only guardians can update children
CREATE POLICY "children_v2_update" ON children_v2
    FOR UPDATE USING (is_guardian(id, auth.uid()));

-- Only guardians can delete children
CREATE POLICY "children_v2_delete" ON children_v2
    FOR DELETE USING (is_guardian(id, auth.uid()));

-- ============================================
-- CHILD_GUARDIANS POLICIES
-- ============================================

DROP POLICY IF EXISTS "child_guardians_select_guardian" ON child_guardians;
DROP POLICY IF EXISTS "child_guardians_select_self" ON child_guardians;
DROP POLICY IF EXISTS "child_guardians_insert" ON child_guardians;
DROP POLICY IF EXISTS "child_guardians_update" ON child_guardians;
DROP POLICY IF EXISTS "child_guardians_delete" ON child_guardians;

-- Guardians can see all guardian rows for their children
CREATE POLICY "child_guardians_select_guardian" ON child_guardians
    FOR SELECT USING (is_guardian(child_id, auth.uid()));

-- Users can see their own guardian rows
CREATE POLICY "child_guardians_select_self" ON child_guardians
    FOR SELECT USING (user_id = auth.uid());

-- Only guardians with manage_helpers can add other guardians
CREATE POLICY "child_guardians_insert" ON child_guardians
    FOR INSERT WITH CHECK (
        -- Either first guardian (no guardians exist yet)
        NOT EXISTS (SELECT 1 FROM child_guardians WHERE child_id = child_guardians.child_id)
        OR
        -- Or existing guardian with manage_helpers permission
        can_manage_helpers(child_id, auth.uid())
    );

-- Only guardians with manage_helpers can update
CREATE POLICY "child_guardians_update" ON child_guardians
    FOR UPDATE USING (can_manage_helpers(child_id, auth.uid()));

-- Only guardians with manage_helpers can delete (but not self if last guardian)
CREATE POLICY "child_guardians_delete" ON child_guardians
    FOR DELETE USING (
        can_manage_helpers(child_id, auth.uid())
        AND (
            user_id != auth.uid()
            OR (SELECT COUNT(*) FROM child_guardians cg WHERE cg.child_id = child_guardians.child_id) > 1
        )
    );

-- ============================================
-- HOME_MEMBERSHIPS POLICIES
-- ============================================

DROP POLICY IF EXISTS "home_memberships_select" ON home_memberships;
DROP POLICY IF EXISTS "home_memberships_insert" ON home_memberships;
DROP POLICY IF EXISTS "home_memberships_update" ON home_memberships;
DROP POLICY IF EXISTS "home_memberships_delete" ON home_memberships;

-- Users can see memberships of homes they can see
CREATE POLICY "home_memberships_select" ON home_memberships
    FOR SELECT USING (can_see_home(home_id, auth.uid()));

-- Home admins can add members
CREATE POLICY "home_memberships_insert" ON home_memberships
    FOR INSERT WITH CHECK (
        -- Either first member (creating home)
        NOT EXISTS (SELECT 1 FROM home_memberships WHERE home_id = home_memberships.home_id)
        OR
        -- Or home admin
        is_home_admin(home_id, auth.uid())
    );

-- Home admins can update memberships
CREATE POLICY "home_memberships_update" ON home_memberships
    FOR UPDATE USING (is_home_admin(home_id, auth.uid()));

-- Home admins can delete memberships (not self if last admin)
CREATE POLICY "home_memberships_delete" ON home_memberships
    FOR DELETE USING (
        is_home_admin(home_id, auth.uid())
        AND (
            user_id != auth.uid()
            OR NOT is_home_admin(home_id, user_id)
            OR (SELECT COUNT(*) FROM home_memberships hm WHERE hm.home_id = home_memberships.home_id AND hm.is_home_admin = TRUE) > 1
        )
    );

-- ============================================
-- CHILD_SPACES POLICIES
-- ============================================

DROP POLICY IF EXISTS "child_spaces_select" ON child_spaces;
DROP POLICY IF EXISTS "child_spaces_insert" ON child_spaces;
DROP POLICY IF EXISTS "child_spaces_update" ON child_spaces;
DROP POLICY IF EXISTS "child_spaces_delete" ON child_spaces;

-- Users can see child_spaces they have access to
-- Guardians: see all child_spaces for their children
-- Helpers: see only child_spaces with explicit child_space_access
CREATE POLICY "child_spaces_select" ON child_spaces
    FOR SELECT USING (
        -- Guardian: can see all child_spaces for their children
        is_guardian(child_id, auth.uid())
        OR
        -- Helper: needs explicit child_space_access
        EXISTS (
            SELECT 1 FROM child_space_access csa
            WHERE csa.child_space_id = child_spaces.id
            AND csa.user_id = auth.uid()
        )
    );

-- Only guardians can create child_spaces
CREATE POLICY "child_spaces_insert" ON child_spaces
    FOR INSERT WITH CHECK (is_guardian(child_id, auth.uid()));

-- Only guardians can update child_spaces
CREATE POLICY "child_spaces_update" ON child_spaces
    FOR UPDATE USING (is_guardian(child_id, auth.uid()));

-- Only guardians can delete child_spaces
CREATE POLICY "child_spaces_delete" ON child_spaces
    FOR DELETE USING (is_guardian(child_id, auth.uid()));

-- ============================================
-- CHILD_ACCESS POLICIES
-- ============================================

DROP POLICY IF EXISTS "child_access_select_self" ON child_access;
DROP POLICY IF EXISTS "child_access_select_guardian" ON child_access;
DROP POLICY IF EXISTS "child_access_insert" ON child_access;
DROP POLICY IF EXISTS "child_access_update" ON child_access;
DROP POLICY IF EXISTS "child_access_delete" ON child_access;

-- Users can see their own access rows
CREATE POLICY "child_access_select_self" ON child_access
    FOR SELECT USING (user_id = auth.uid());

-- Guardians can see all access rows for their children
CREATE POLICY "child_access_select_guardian" ON child_access
    FOR SELECT USING (is_guardian(child_id, auth.uid()));

-- Only guardians with manage_helpers can grant access
CREATE POLICY "child_access_insert" ON child_access
    FOR INSERT WITH CHECK (can_manage_helpers(child_id, auth.uid()));

-- Only guardians with manage_helpers can update access
CREATE POLICY "child_access_update" ON child_access
    FOR UPDATE USING (can_manage_helpers(child_id, auth.uid()));

-- Only guardians with manage_helpers can revoke access
CREATE POLICY "child_access_delete" ON child_access
    FOR DELETE USING (
        can_manage_helpers(child_id, auth.uid())
        -- Cannot revoke own guardian access if only guardian
        AND (
            role_type != 'guardian'
            OR user_id != auth.uid()
            OR (SELECT COUNT(*) FROM child_guardians cg WHERE cg.child_id = child_access.child_id) > 1
        )
    );

-- ============================================
-- CHILD_SPACE_ACCESS POLICIES
-- ============================================

DROP POLICY IF EXISTS "child_space_access_select_self" ON child_space_access;
DROP POLICY IF EXISTS "child_space_access_select_guardian" ON child_space_access;
DROP POLICY IF EXISTS "child_space_access_insert" ON child_space_access;
DROP POLICY IF EXISTS "child_space_access_update" ON child_space_access;
DROP POLICY IF EXISTS "child_space_access_delete" ON child_space_access;

-- Users can see their own access rows
CREATE POLICY "child_space_access_select_self" ON child_space_access
    FOR SELECT USING (user_id = auth.uid());

-- Guardians can see all access rows for their children's spaces
CREATE POLICY "child_space_access_select_guardian" ON child_space_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = child_space_access.child_space_id
            AND is_guardian(cs.child_id, auth.uid())
        )
    );

-- Only guardians with manage_helpers can grant space access
CREATE POLICY "child_space_access_insert" ON child_space_access
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = child_space_access.child_space_id
            AND can_manage_helpers(cs.child_id, auth.uid())
        )
    );

-- Only guardians with manage_helpers can update space access
CREATE POLICY "child_space_access_update" ON child_space_access
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = child_space_access.child_space_id
            AND can_manage_helpers(cs.child_id, auth.uid())
        )
    );

-- Only guardians with manage_helpers can revoke space access
CREATE POLICY "child_space_access_delete" ON child_space_access
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = child_space_access.child_space_id
            AND can_manage_helpers(cs.child_id, auth.uid())
        )
    );

-- ============================================
-- CHILD_PERMISSION_OVERRIDES POLICIES
-- ============================================

DROP POLICY IF EXISTS "child_permission_overrides_select_self" ON child_permission_overrides;
DROP POLICY IF EXISTS "child_permission_overrides_select_guardian" ON child_permission_overrides;
DROP POLICY IF EXISTS "child_permission_overrides_insert" ON child_permission_overrides;
DROP POLICY IF EXISTS "child_permission_overrides_update" ON child_permission_overrides;
DROP POLICY IF EXISTS "child_permission_overrides_delete" ON child_permission_overrides;

-- Users can see their own permission rows
CREATE POLICY "child_permission_overrides_select_self" ON child_permission_overrides
    FOR SELECT USING (user_id = auth.uid());

-- Guardians can see all permission rows for their children
CREATE POLICY "child_permission_overrides_select_guardian" ON child_permission_overrides
    FOR SELECT USING (is_guardian(child_id, auth.uid()));

-- Only guardians with manage_helpers can create overrides
CREATE POLICY "child_permission_overrides_insert" ON child_permission_overrides
    FOR INSERT WITH CHECK (can_manage_helpers(child_id, auth.uid()));

-- Only guardians with manage_helpers can update overrides
CREATE POLICY "child_permission_overrides_update" ON child_permission_overrides
    FOR UPDATE USING (can_manage_helpers(child_id, auth.uid()));

-- Only guardians with manage_helpers can delete overrides
CREATE POLICY "child_permission_overrides_delete" ON child_permission_overrides
    FOR DELETE USING (can_manage_helpers(child_id, auth.uid()));

-- ============================================
-- CHILD_SPACE_CONTACTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "child_space_contacts_select" ON child_space_contacts;
DROP POLICY IF EXISTS "child_space_contacts_insert" ON child_space_contacts;
DROP POLICY IF EXISTS "child_space_contacts_update" ON child_space_contacts;
DROP POLICY IF EXISTS "child_space_contacts_delete" ON child_space_contacts;

-- Users can see contacts for child_spaces they can access with can_view_contacts capability
CREATE POLICY "child_space_contacts_select" ON child_space_contacts
    FOR SELECT USING (
        can_access_child_space(child_space_id, auth.uid(), 'view')
        AND has_child_capability(
            get_child_id_from_child_space(child_space_id),
            auth.uid(),
            'can_view_contacts'
        )
    );

-- Guardians can add contacts, home admins can add contacts
CREATE POLICY "child_space_contacts_insert" ON child_space_contacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = child_space_contacts.child_space_id
            AND (
                can_manage_helpers(cs.child_id, auth.uid())
                OR is_home_admin(cs.home_id, auth.uid())
            )
        )
    );

-- Guardians or home admins can update contacts
-- Users can update their own contact share settings
CREATE POLICY "child_space_contacts_update" ON child_space_contacts
    FOR UPDATE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = child_space_contacts.child_space_id
            AND (
                can_manage_helpers(cs.child_id, auth.uid())
                OR is_home_admin(cs.home_id, auth.uid())
            )
        )
    );

-- Guardians or home admins can delete contacts
CREATE POLICY "child_space_contacts_delete" ON child_space_contacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = child_space_contacts.child_space_id
            AND (
                can_manage_helpers(cs.child_id, auth.uid())
                OR is_home_admin(cs.home_id, auth.uid())
            )
        )
    );

-- ============================================
-- ITEMS_V2 POLICIES
-- ============================================

DROP POLICY IF EXISTS "items_v2_select" ON items_v2;
DROP POLICY IF EXISTS "items_v2_insert" ON items_v2;
DROP POLICY IF EXISTS "items_v2_update" ON items_v2;
DROP POLICY IF EXISTS "items_v2_delete" ON items_v2;

-- Users can see items if they can access the child_space and have can_view_items
CREATE POLICY "items_v2_select" ON items_v2
    FOR SELECT USING (
        can_access_child_space(child_space_id, auth.uid(), 'view')
        AND has_child_capability(
            get_child_id_from_child_space(child_space_id),
            auth.uid(),
            'can_view_items'
        )
    );

-- Users can create items if they can access child_space with contribute+ and have can_edit_items
CREATE POLICY "items_v2_insert" ON items_v2
    FOR INSERT WITH CHECK (
        can_access_child_space(child_space_id, auth.uid(), 'contribute')
        AND has_child_capability(
            get_child_id_from_child_space(child_space_id),
            auth.uid(),
            'can_edit_items'
        )
    );

-- Users can update items if they can access child_space with contribute+ and have can_edit_items
CREATE POLICY "items_v2_update" ON items_v2
    FOR UPDATE USING (
        can_access_child_space(child_space_id, auth.uid(), 'contribute')
        AND has_child_capability(
            get_child_id_from_child_space(child_space_id),
            auth.uid(),
            'can_edit_items'
        )
    );

-- Only guardians can delete items
CREATE POLICY "items_v2_delete" ON items_v2
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM child_spaces cs
            WHERE cs.id = items_v2.child_space_id
            AND is_guardian(cs.child_id, auth.uid())
        )
    );

-- ============================================
-- CHILD_STAYS POLICIES
-- ============================================

DROP POLICY IF EXISTS "child_stays_select" ON child_stays;
DROP POLICY IF EXISTS "child_stays_insert" ON child_stays;
DROP POLICY IF EXISTS "child_stays_update" ON child_stays;
DROP POLICY IF EXISTS "child_stays_delete" ON child_stays;

-- Users can see stays if they have child access and can_view_calendar
CREATE POLICY "child_stays_select" ON child_stays
    FOR SELECT USING (
        has_child_access(child_id, auth.uid())
        AND has_child_capability(child_id, auth.uid(), 'can_view_calendar')
    );

-- Users can create stays if they have can_edit_calendar
CREATE POLICY "child_stays_insert" ON child_stays
    FOR INSERT WITH CHECK (
        has_child_capability(child_id, auth.uid(), 'can_edit_calendar')
    );

-- Users can update stays if they have can_edit_calendar
CREATE POLICY "child_stays_update" ON child_stays
    FOR UPDATE USING (
        has_child_capability(child_id, auth.uid(), 'can_edit_calendar')
    );

-- Only guardians can delete stays
CREATE POLICY "child_stays_delete" ON child_stays
    FOR DELETE USING (is_guardian(child_id, auth.uid()));

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check that RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'profiles',
    'homes_v2',
    'children_v2',
    'child_guardians',
    'home_memberships',
    'child_spaces',
    'child_access',
    'child_space_access',
    'child_permission_overrides',
    'child_space_contacts',
    'items_v2',
    'child_stays'
)
ORDER BY tablename;

-- ============================================
-- DONE: RLS Policies Created
-- ============================================
-- Next: Run seed script for test data
-- ============================================
