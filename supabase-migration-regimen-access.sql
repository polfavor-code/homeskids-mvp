-- =====================================================
-- MIGRATION: Fix Regimen & Schedule Template RLS Policies for Caregiver Access
-- =====================================================
-- Problem: Regimens currently only allow access to the creator.
-- Caregivers connected to a home cannot see tasks for animals in that home.
-- Also: Schedule templates don't check pet_spaces for home-level access.
--
-- Solution:
-- 1. Update has_schedule_template_access to check pet_spaces for home access
-- 2. Create has_regimen_access function with the same flexible checks
-- =====================================================

-- 1a. Update has_schedule_template_access to also check pet_spaces
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

    -- Has pet access (direct)
    IF v_template.pet_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM pet_access
            WHERE pet_id = v_template.pet_id AND user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;

        -- Also check: user has home_memberships for any home the pet belongs to (via pet_spaces)
        IF EXISTS (
            SELECT 1 FROM pet_spaces ps
            JOIN home_memberships hm ON hm.home_id = ps.home_id
            WHERE ps.pet_id = v_template.pet_id AND hm.user_id = p_user_id
        ) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1b. Create has_regimen_access function
-- =====================================================
CREATE OR REPLACE FUNCTION has_regimen_access(p_regimen_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_regimen RECORD;
BEGIN
    SELECT child_id, pet_id, home_id, created_by
    INTO v_regimen
    FROM regimens
    WHERE id = p_regimen_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Created by this user
    IF v_regimen.created_by = p_user_id THEN
        RETURN TRUE;
    END IF;

    -- Has child access
    IF v_regimen.child_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM child_access
            WHERE child_id = v_regimen.child_id AND user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Has pet access (direct)
    IF v_regimen.pet_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM pet_access
            WHERE pet_id = v_regimen.pet_id AND user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;

        -- Also check: user has home_memberships for any home the pet belongs to (via pet_spaces)
        IF EXISTS (
            SELECT 1 FROM pet_spaces ps
            JOIN home_memberships hm ON hm.home_id = ps.home_id
            WHERE ps.pet_id = v_regimen.pet_id AND hm.user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Has home membership (direct on regimen)
    IF v_regimen.home_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM home_memberships
            WHERE home_id = v_regimen.home_id AND user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Drop existing regimen policies
-- =====================================================

DROP POLICY IF EXISTS "regimens_select" ON regimens;
DROP POLICY IF EXISTS "regimens_insert" ON regimens;
DROP POLICY IF EXISTS "regimens_update" ON regimens;
DROP POLICY IF EXISTS "regimens_delete" ON regimens;

DROP POLICY IF EXISTS "regimen_phases_select" ON regimen_phases;
DROP POLICY IF EXISTS "regimen_phases_insert" ON regimen_phases;
DROP POLICY IF EXISTS "regimen_phases_update" ON regimen_phases;
DROP POLICY IF EXISTS "regimen_phases_delete" ON regimen_phases;

DROP POLICY IF EXISTS "phase_tasks_select" ON phase_tasks;
DROP POLICY IF EXISTS "phase_tasks_insert" ON phase_tasks;
DROP POLICY IF EXISTS "phase_tasks_update" ON phase_tasks;
DROP POLICY IF EXISTS "phase_tasks_delete" ON phase_tasks;

DROP POLICY IF EXISTS "regimen_completions_select" ON regimen_completions;
DROP POLICY IF EXISTS "regimen_completions_insert" ON regimen_completions;
DROP POLICY IF EXISTS "regimen_completions_update" ON regimen_completions;
DROP POLICY IF EXISTS "regimen_completions_delete" ON regimen_completions;

-- =====================================================
-- 3. Create new regimen policies with flexible access
-- =====================================================

-- Regimens policies
CREATE POLICY "regimens_select" ON regimens
    FOR SELECT USING (has_regimen_access(id, auth.uid()));

CREATE POLICY "regimens_insert" ON regimens
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "regimens_update" ON regimens
    FOR UPDATE USING (has_regimen_access(id, auth.uid()));

CREATE POLICY "regimens_delete" ON regimens
    FOR DELETE USING (created_by = auth.uid());

-- Regimen phases policies (access through regimen)
CREATE POLICY "regimen_phases_select" ON regimen_phases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM regimens r
            WHERE r.id = regimen_phases.regimen_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "regimen_phases_insert" ON regimen_phases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM regimens r
            WHERE r.id = regimen_phases.regimen_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "regimen_phases_update" ON regimen_phases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM regimens r
            WHERE r.id = regimen_phases.regimen_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "regimen_phases_delete" ON regimen_phases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM regimens r
            WHERE r.id = regimen_phases.regimen_id
            AND r.created_by = auth.uid()
        )
    );

-- Phase tasks policies (access through regimen)
CREATE POLICY "phase_tasks_select" ON phase_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM regimen_phases rp
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE rp.id = phase_tasks.phase_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "phase_tasks_insert" ON phase_tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM regimen_phases rp
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE rp.id = phase_tasks.phase_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "phase_tasks_update" ON phase_tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM regimen_phases rp
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE rp.id = phase_tasks.phase_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "phase_tasks_delete" ON phase_tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM regimen_phases rp
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE rp.id = phase_tasks.phase_id
            AND r.created_by = auth.uid()
        )
    );

-- Regimen completions policies
CREATE POLICY "regimen_completions_select" ON regimen_completions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM phase_tasks pt
            JOIN regimen_phases rp ON rp.id = pt.phase_id
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE pt.id = regimen_completions.phase_task_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "regimen_completions_insert" ON regimen_completions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM phase_tasks pt
            JOIN regimen_phases rp ON rp.id = pt.phase_id
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE pt.id = regimen_completions.phase_task_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "regimen_completions_update" ON regimen_completions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM phase_tasks pt
            JOIN regimen_phases rp ON rp.id = pt.phase_id
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE pt.id = regimen_completions.phase_task_id
            AND has_regimen_access(r.id, auth.uid())
        )
    );

CREATE POLICY "regimen_completions_delete" ON regimen_completions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM phase_tasks pt
            JOIN regimen_phases rp ON rp.id = pt.phase_id
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE pt.id = regimen_completions.phase_task_id
            AND r.created_by = auth.uid()
        )
    );

-- =====================================================
-- Summary of changes:
-- - SELECT: Anyone with child_access, pet_access, or home_memberships can view
-- - INSERT: Authenticated users can create, with access check
-- - UPDATE: Anyone with access can update
-- - DELETE: Only the creator can delete (preserved for safety)
-- =====================================================
