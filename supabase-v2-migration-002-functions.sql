-- ============================================
-- HOMES.KIDS V2: CHILD-CENTRIC PERMISSIONS SCHEMA
-- Migration 002: Helper Functions for Access Checks
-- ============================================
-- These functions use SECURITY DEFINER to avoid expensive
-- joins in RLS policies. They compute permission checks.
-- ============================================

-- ============================================
-- FUNCTION: is_guardian(child_id, user_id)
-- ============================================
-- Returns TRUE if user is a guardian (parent/stepparent) of the child.

CREATE OR REPLACE FUNCTION is_guardian(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM child_guardians
        WHERE child_id = p_child_id
        AND user_id = p_user_id
    );
END;
$$;

COMMENT ON FUNCTION is_guardian IS 'Returns TRUE if user is a guardian of the child';

-- ============================================
-- FUNCTION: has_child_access(child_id, user_id)
-- ============================================
-- Returns TRUE if user has any access to the child (guardian or helper).

CREATE OR REPLACE FUNCTION has_child_access(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM child_access
        WHERE child_id = p_child_id
        AND user_id = p_user_id
    );
END;
$$;

COMMENT ON FUNCTION has_child_access IS 'Returns TRUE if user has any access row for the child';

-- ============================================
-- FUNCTION: effective_child_access_level(child_id, user_id)
-- ============================================
-- Returns the user's base access level for a child.
-- Returns NULL if no access.

CREATE OR REPLACE FUNCTION effective_child_access_level(p_child_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_level TEXT;
BEGIN
    SELECT access_level INTO v_level
    FROM child_access
    WHERE child_id = p_child_id
    AND user_id = p_user_id;

    RETURN v_level;
END;
$$;

COMMENT ON FUNCTION effective_child_access_level IS 'Returns user access level for child: view, contribute, manage, or NULL';

-- ============================================
-- FUNCTION: has_child_capability(child_id, user_id, capability)
-- ============================================
-- Checks if user has a specific capability for a child.
-- Capabilities: can_view_calendar, can_edit_calendar, can_view_items,
--               can_edit_items, can_upload_photos, can_add_notes,
--               can_view_contacts, can_manage_helpers

CREATE OR REPLACE FUNCTION has_child_capability(
    p_child_id UUID,
    p_user_id UUID,
    p_capability TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_result BOOLEAN;
BEGIN
    -- First check if user has any access to this child
    IF NOT has_child_access(p_child_id, p_user_id) THEN
        RETURN FALSE;
    END IF;

    -- Look up the specific capability
    EXECUTE format(
        'SELECT %I FROM child_permission_overrides WHERE child_id = $1 AND user_id = $2',
        p_capability
    ) INTO v_result USING p_child_id, p_user_id;

    -- If no override row exists, return FALSE (must have explicit permissions)
    RETURN COALESCE(v_result, FALSE);
END;
$$;

COMMENT ON FUNCTION has_child_capability IS 'Checks if user has specific capability for a child';

-- ============================================
-- FUNCTION: can_manage_helpers(child_id, user_id)
-- ============================================
-- Returns TRUE if user can manage helpers for this child.
-- Must be a guardian with can_manage_helpers capability.

CREATE OR REPLACE FUNCTION can_manage_helpers(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Must be guardian AND have the capability
    RETURN is_guardian(p_child_id, p_user_id)
       AND has_child_capability(p_child_id, p_user_id, 'can_manage_helpers');
END;
$$;

COMMENT ON FUNCTION can_manage_helpers IS 'Returns TRUE if user can manage helpers for the child';

-- ============================================
-- FUNCTION: get_child_id_from_child_space(child_space_id)
-- ============================================
-- Helper to get child_id from a child_space record.

CREATE OR REPLACE FUNCTION get_child_id_from_child_space(p_child_space_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_child_id UUID;
BEGIN
    SELECT child_id INTO v_child_id
    FROM child_spaces
    WHERE id = p_child_space_id;

    RETURN v_child_id;
END;
$$;

COMMENT ON FUNCTION get_child_id_from_child_space IS 'Returns child_id for a child_space';

-- ============================================
-- FUNCTION: can_access_child_space(child_space_id, user_id, needed_level)
-- ============================================
-- Checks if user can access a child_space at the required level.
--
-- Logic:
-- 1. User must have child_access for the child
-- 2. User must have child_space_access for this specific child_space
--    OR be a guardian (guardians can access all child_spaces for their children)
-- 3. Effective level = max(child_access.level, child_space_access.override)
-- 4. Effective level must be >= needed_level

CREATE OR REPLACE FUNCTION can_access_child_space(
    p_child_space_id UUID,
    p_user_id UUID,
    p_needed_level TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_child_id UUID;
    v_base_level TEXT;
    v_override_level TEXT;
    v_effective_level TEXT;
    v_level_rank INTEGER;
    v_needed_rank INTEGER;
BEGIN
    -- Get child_id from child_space
    SELECT child_id INTO v_child_id
    FROM child_spaces
    WHERE id = p_child_space_id;

    IF v_child_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check base child_access
    SELECT access_level INTO v_base_level
    FROM child_access
    WHERE child_id = v_child_id
    AND user_id = p_user_id;

    IF v_base_level IS NULL THEN
        RETURN FALSE; -- No access to child at all
    END IF;

    -- Check if guardian (guardians have implicit access to all child_spaces)
    IF is_guardian(v_child_id, p_user_id) THEN
        -- Guardians always have 'manage' level
        v_effective_level := 'manage';
    ELSE
        -- Non-guardians need explicit child_space_access
        SELECT access_level_override INTO v_override_level
        FROM child_space_access
        WHERE child_space_id = p_child_space_id
        AND user_id = p_user_id;

        IF v_override_level IS NULL THEN
            -- Check if there's a row at all (row existence = access granted)
            IF NOT EXISTS (
                SELECT 1 FROM child_space_access
                WHERE child_space_id = p_child_space_id
                AND user_id = p_user_id
            ) THEN
                RETURN FALSE; -- No access to this child_space
            END IF;
            -- Has row but no override, use base level
            v_effective_level := v_base_level;
        ELSE
            -- Use the higher of base or override
            v_effective_level := CASE
                WHEN v_override_level = 'manage' OR v_base_level = 'manage' THEN 'manage'
                WHEN v_override_level = 'contribute' OR v_base_level = 'contribute' THEN 'contribute'
                ELSE 'view'
            END;
        END IF;
    END IF;

    -- Compare levels
    v_level_rank := CASE v_effective_level
        WHEN 'view' THEN 1
        WHEN 'contribute' THEN 2
        WHEN 'manage' THEN 3
        ELSE 0
    END;

    v_needed_rank := CASE p_needed_level
        WHEN 'view' THEN 1
        WHEN 'contribute' THEN 2
        WHEN 'manage' THEN 3
        ELSE 0
    END;

    RETURN v_level_rank >= v_needed_rank;
END;
$$;

COMMENT ON FUNCTION can_access_child_space IS 'Checks if user can access child_space at required level';

-- ============================================
-- FUNCTION: is_home_admin(home_id, user_id)
-- ============================================
-- Returns TRUE if user is an admin of the home.

CREATE OR REPLACE FUNCTION is_home_admin(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM home_memberships
        WHERE home_id = p_home_id
        AND user_id = p_user_id
        AND is_home_admin = TRUE
    );
END;
$$;

COMMENT ON FUNCTION is_home_admin IS 'Returns TRUE if user is home admin';

-- ============================================
-- FUNCTION: is_home_member(home_id, user_id)
-- ============================================
-- Returns TRUE if user is a member of the home.

CREATE OR REPLACE FUNCTION is_home_member(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM home_memberships
        WHERE home_id = p_home_id
        AND user_id = p_user_id
    );
END;
$$;

COMMENT ON FUNCTION is_home_member IS 'Returns TRUE if user is a home member';

-- ============================================
-- FUNCTION: can_see_home(home_id, user_id)
-- ============================================
-- Returns TRUE if user can see a home.
-- User can see a home if:
-- - They are a home member, OR
-- - They are a guardian of a child who has a child_space in that home

CREATE OR REPLACE FUNCTION can_see_home(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Check home membership
    IF is_home_member(p_home_id, p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Check if guardian of any child with a child_space in this home
    RETURN EXISTS (
        SELECT 1
        FROM child_spaces cs
        JOIN child_guardians cg ON cg.child_id = cs.child_id
        WHERE cs.home_id = p_home_id
        AND cg.user_id = p_user_id
    );
END;
$$;

COMMENT ON FUNCTION can_see_home IS 'Returns TRUE if user can see the home';

-- ============================================
-- FUNCTION: get_user_children(user_id)
-- ============================================
-- Returns all child IDs the user has access to.

CREATE OR REPLACE FUNCTION get_user_children(p_user_id UUID)
RETURNS TABLE(child_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT ca.child_id
    FROM child_access ca
    WHERE ca.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_children IS 'Returns all child IDs user has access to';

-- ============================================
-- FUNCTION: get_user_child_spaces(user_id)
-- ============================================
-- Returns all child_space IDs the user can access.

CREATE OR REPLACE FUNCTION get_user_child_spaces(p_user_id UUID)
RETURNS TABLE(child_space_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    -- Guardian: all child_spaces for their children
    SELECT cs.id
    FROM child_spaces cs
    JOIN child_guardians cg ON cg.child_id = cs.child_id
    WHERE cg.user_id = p_user_id

    UNION

    -- Helper: only child_spaces with explicit child_space_access
    SELECT csa.child_space_id
    FROM child_space_access csa
    WHERE csa.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_child_spaces IS 'Returns all child_space IDs user can access';

-- ============================================
-- FUNCTION: apply_guardian_defaults(child_id, user_id)
-- ============================================
-- Sets up default guardian permissions.
-- Call this after creating a child_guardians row.

CREATE OR REPLACE FUNCTION apply_guardian_defaults(p_child_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update child_access
    INSERT INTO child_access (child_id, user_id, role_type, access_level)
    VALUES (p_child_id, p_user_id, 'guardian', 'manage')
    ON CONFLICT (child_id, user_id)
    DO UPDATE SET role_type = 'guardian', access_level = 'manage';

    -- Insert or update permission overrides with guardian defaults
    INSERT INTO child_permission_overrides (
        child_id, user_id,
        can_view_calendar, can_edit_calendar,
        can_view_items, can_edit_items,
        can_upload_photos, can_add_notes,
        can_view_contacts, can_manage_helpers
    ) VALUES (
        p_child_id, p_user_id,
        TRUE, TRUE,  -- calendar
        TRUE, TRUE,  -- items
        TRUE, TRUE,  -- photos, notes
        TRUE, TRUE   -- contacts, manage_helpers
    )
    ON CONFLICT (child_id, user_id)
    DO UPDATE SET
        can_view_calendar = TRUE,
        can_edit_calendar = TRUE,
        can_view_items = TRUE,
        can_edit_items = TRUE,
        can_upload_photos = TRUE,
        can_add_notes = TRUE,
        can_view_contacts = TRUE,
        can_manage_helpers = TRUE,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION apply_guardian_defaults IS 'Sets up guardian with full permissions for a child';

-- ============================================
-- FUNCTION: apply_helper_preset(child_id, user_id, helper_type)
-- ============================================
-- Applies role preset permissions for a helper.

CREATE OR REPLACE FUNCTION apply_helper_preset(
    p_child_id UUID,
    p_user_id UUID,
    p_helper_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_access_level TEXT;
    v_can_view_calendar BOOLEAN := TRUE;
    v_can_edit_calendar BOOLEAN := FALSE;
    v_can_view_items BOOLEAN := TRUE;
    v_can_edit_items BOOLEAN := FALSE;
    v_can_upload_photos BOOLEAN := FALSE;
    v_can_add_notes BOOLEAN := FALSE;
    v_can_view_contacts BOOLEAN := FALSE;
    v_can_manage_helpers BOOLEAN := FALSE;
BEGIN
    -- Set defaults based on helper_type
    CASE p_helper_type
        WHEN 'nanny' THEN
            v_access_level := 'contribute';
            v_can_edit_items := TRUE;
            v_can_upload_photos := TRUE;
            v_can_add_notes := TRUE;
            v_can_view_contacts := TRUE;
        WHEN 'family_member' THEN
            v_access_level := 'view';
            v_can_view_contacts := TRUE;
        WHEN 'friend' THEN
            v_access_level := 'view';
            v_can_view_contacts := FALSE;
        ELSE
            v_access_level := 'view';
    END CASE;

    -- Insert or update child_access
    INSERT INTO child_access (child_id, user_id, role_type, helper_type, access_level)
    VALUES (p_child_id, p_user_id, 'helper', p_helper_type, v_access_level)
    ON CONFLICT (child_id, user_id)
    DO UPDATE SET
        role_type = 'helper',
        helper_type = p_helper_type,
        access_level = v_access_level;

    -- Insert or update permission overrides
    INSERT INTO child_permission_overrides (
        child_id, user_id,
        can_view_calendar, can_edit_calendar,
        can_view_items, can_edit_items,
        can_upload_photos, can_add_notes,
        can_view_contacts, can_manage_helpers
    ) VALUES (
        p_child_id, p_user_id,
        v_can_view_calendar, v_can_edit_calendar,
        v_can_view_items, v_can_edit_items,
        v_can_upload_photos, v_can_add_notes,
        v_can_view_contacts, v_can_manage_helpers
    )
    ON CONFLICT (child_id, user_id)
    DO UPDATE SET
        can_view_calendar = v_can_view_calendar,
        can_edit_calendar = v_can_edit_calendar,
        can_view_items = v_can_view_items,
        can_edit_items = v_can_edit_items,
        can_upload_photos = v_can_upload_photos,
        can_add_notes = v_can_add_notes,
        can_view_contacts = v_can_view_contacts,
        can_manage_helpers = v_can_manage_helpers,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION apply_helper_preset IS 'Applies preset permissions based on helper type';

-- ============================================
-- FUNCTION: grant_child_space_access(child_space_id, user_id, level_override)
-- ============================================
-- Grants a user access to a specific child_space.

CREATE OR REPLACE FUNCTION grant_child_space_access(
    p_child_space_id UUID,
    p_user_id UUID,
    p_level_override TEXT DEFAULT NULL,
    p_can_view_address BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO child_space_access (
        child_space_id, user_id, access_level_override, can_view_address
    ) VALUES (
        p_child_space_id, p_user_id, p_level_override, p_can_view_address
    )
    ON CONFLICT (child_space_id, user_id)
    DO UPDATE SET
        access_level_override = COALESCE(p_level_override, child_space_access.access_level_override),
        can_view_address = p_can_view_address;
END;
$$;

COMMENT ON FUNCTION grant_child_space_access IS 'Grants user access to a child_space';

-- ============================================
-- TRIGGER: Auto-setup guardian after child_guardians insert
-- ============================================

CREATE OR REPLACE FUNCTION trigger_setup_guardian()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM apply_guardian_defaults(NEW.child_id, NEW.user_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_child_guardian_insert ON child_guardians;
CREATE TRIGGER after_child_guardian_insert
    AFTER INSERT ON child_guardians
    FOR EACH ROW
    EXECUTE FUNCTION trigger_setup_guardian();

-- ============================================
-- DONE: Helper Functions Created
-- ============================================
-- Next: Run migration-003 for RLS policies
-- ============================================
