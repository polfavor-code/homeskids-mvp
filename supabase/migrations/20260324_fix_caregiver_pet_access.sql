-- =====================================================
-- FIX: Caregivers can't see Day Hub tasks for pets in their homes
-- Problem: has_pet_access() only checks direct pet_access records
--          but not home_memberships via pet_spaces
-- =====================================================

CREATE OR REPLACE FUNCTION has_pet_access(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct pet_access
    IF EXISTS (
        SELECT 1 FROM pet_access
        WHERE pet_id = p_pet_id AND user_id = p_user_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Home membership for any home the pet belongs to (via pet_spaces)
    IF EXISTS (
        SELECT 1 FROM pet_spaces ps
        JOIN home_memberships hm ON hm.home_id = ps.home_id
        WHERE ps.pet_id = p_pet_id AND hm.user_id = p_user_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Also fix has_schedule_template_access() to use has_pet_access()
-- instead of inline check (so it benefits from the fix above)
-- =====================================================

CREATE OR REPLACE FUNCTION has_schedule_template_access(p_template_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_template RECORD;
BEGIN
    SELECT child_id, pet_id, home_id, created_by
    INTO v_template
    FROM schedule_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Created by this user
    IF v_template.created_by = p_user_id THEN
        RETURN TRUE;
    END IF;

    -- Has child access
    IF v_template.child_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM child_access
            WHERE child_id = v_template.child_id AND user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Has pet access (now uses has_pet_access which checks home_memberships)
    IF v_template.pet_id IS NOT NULL THEN
        IF has_pet_access(v_template.pet_id, p_user_id) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Has home membership (direct on template)
    IF v_template.home_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM home_memberships
            WHERE home_id = v_template.home_id AND user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
