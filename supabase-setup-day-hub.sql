-- =====================================================
-- DAY HUB DATABASE SETUP
-- Daily schedule/task tracker for medications, activities, and routines
-- =====================================================

-- 1. Schedule Templates
-- Defines recurring schedule templates (e.g., "Galaxy's Daily Meds")
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner: can be linked to a child OR a pet OR a custom family member name
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- For custom family members (when not using child/pet records)
    family_member_name TEXT,
    family_member_type TEXT CHECK (family_member_type IN ('child', 'cat', 'dog', 'bird', 'other')),
    family_member_avatar_url TEXT,
    family_member_avatar_emoji TEXT,
    family_member_badge_color TEXT DEFAULT '#E0F2F1',
    family_member_badge_text_color TEXT DEFAULT '#00796B',

    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('medication', 'supplement', 'activity', 'pickup', 'routine', 'custom')),

    -- Ownership
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    home_id UUID REFERENCES homes(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Must have some owner reference
    CONSTRAINT template_owner_required CHECK (
        child_id IS NOT NULL OR pet_id IS NOT NULL OR family_member_name IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_child_id ON schedule_templates(child_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_pet_id ON schedule_templates(pet_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_created_by ON schedule_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_home_id ON schedule_templates(home_id);

COMMENT ON TABLE schedule_templates IS 'Reusable schedule definitions (e.g., "Galaxy daily meds", "Tuesday pickup routine")';


-- 2. Schedule Tasks
-- Individual tasks within a schedule template
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,

    -- Task details
    name TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN ('medication', 'supplement', 'activity', 'pickup', 'routine', 'custom')),

    -- Timing
    time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night')),
    scheduled_time TIME,

    -- Display
    sort_order INTEGER DEFAULT 0,
    image_url TEXT,

    -- Flexible metadata for dose info, frequency notes, etc.
    metadata JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_tasks_template_id ON schedule_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_time_slot ON schedule_tasks(time_slot);

COMMENT ON TABLE schedule_tasks IS 'Individual tasks within a schedule template';
COMMENT ON COLUMN schedule_tasks.time_slot IS 'Time of day: morning, afternoon, evening, night';
COMMENT ON COLUMN schedule_tasks.metadata IS 'Flexible field for dose info, frequency notes, special instructions';


-- 3. Daily Schedule Instances
-- A generated schedule for a specific date
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_schedule_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One instance per template per day
    UNIQUE(template_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_schedule_instances_template_id ON daily_schedule_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_instances_date ON daily_schedule_instances(date);

COMMENT ON TABLE daily_schedule_instances IS 'Generated schedule for a specific date';


-- 4. Task Completions
-- Tracks status of each task on a given day
-- =====================================================
CREATE TABLE IF NOT EXISTS task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES daily_schedule_instances(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES schedule_tasks(id) ON DELETE CASCADE,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'postponed', 'skipped')),

    -- Completion tracking
    completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,

    -- Postponement tracking
    postponed_until TIMESTAMPTZ,
    postpone_reason TEXT,
    original_time_slot TEXT,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One completion record per task per instance
    UNIQUE(instance_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_completions_instance_id ON task_completions(instance_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_status ON task_completions(status);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_by ON task_completions(completed_by);

COMMENT ON TABLE task_completions IS 'Tracks status of each task on a given day';
COMMENT ON COLUMN task_completions.postpone_reason IS 'e.g., "1 hour", "2 hours", "Move to evening", "Skip for today"';


-- 5. Enable RLS on all tables
-- =====================================================
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedule_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;


-- 6. Helper function to check schedule template access
-- User has access if they:
--   - Created the template, OR
--   - Have access to the child (via child_access), OR
--   - Have access to the pet (via pet_access), OR
--   - Have membership in the home (via home_memberships)
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

    -- Has pet access
    IF v_template.pet_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM pet_access
            WHERE pet_id = v_template.pet_id AND user_id = p_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Has home membership
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


-- 7. RLS Policies for schedule_templates
-- =====================================================

CREATE POLICY "schedule_templates_select" ON schedule_templates
    FOR SELECT
    USING (has_schedule_template_access(id, auth.uid()));

CREATE POLICY "schedule_templates_insert" ON schedule_templates
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "schedule_templates_update" ON schedule_templates
    FOR UPDATE
    USING (has_schedule_template_access(id, auth.uid()));

CREATE POLICY "schedule_templates_delete" ON schedule_templates
    FOR DELETE
    USING (created_by = auth.uid());


-- 8. RLS Policies for schedule_tasks
-- =====================================================

CREATE POLICY "schedule_tasks_select" ON schedule_tasks
    FOR SELECT
    USING (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE has_schedule_template_access(id, auth.uid())
        )
    );

CREATE POLICY "schedule_tasks_insert" ON schedule_tasks
    FOR INSERT
    WITH CHECK (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE has_schedule_template_access(id, auth.uid())
        )
    );

CREATE POLICY "schedule_tasks_update" ON schedule_tasks
    FOR UPDATE
    USING (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE has_schedule_template_access(id, auth.uid())
        )
    );

CREATE POLICY "schedule_tasks_delete" ON schedule_tasks
    FOR DELETE
    USING (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE created_by = auth.uid()
        )
    );


-- 9. RLS Policies for daily_schedule_instances
-- =====================================================

CREATE POLICY "daily_schedule_instances_select" ON daily_schedule_instances
    FOR SELECT
    USING (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE has_schedule_template_access(id, auth.uid())
        )
    );

CREATE POLICY "daily_schedule_instances_insert" ON daily_schedule_instances
    FOR INSERT
    WITH CHECK (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE has_schedule_template_access(id, auth.uid())
        )
    );

CREATE POLICY "daily_schedule_instances_update" ON daily_schedule_instances
    FOR UPDATE
    USING (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE has_schedule_template_access(id, auth.uid())
        )
    );

CREATE POLICY "daily_schedule_instances_delete" ON daily_schedule_instances
    FOR DELETE
    USING (
        template_id IN (
            SELECT id FROM schedule_templates
            WHERE created_by = auth.uid()
        )
    );


-- 10. RLS Policies for task_completions
-- =====================================================

CREATE POLICY "task_completions_select" ON task_completions
    FOR SELECT
    USING (
        instance_id IN (
            SELECT dsi.id FROM daily_schedule_instances dsi
            JOIN schedule_templates st ON st.id = dsi.template_id
            WHERE has_schedule_template_access(st.id, auth.uid())
        )
    );

CREATE POLICY "task_completions_insert" ON task_completions
    FOR INSERT
    WITH CHECK (
        instance_id IN (
            SELECT dsi.id FROM daily_schedule_instances dsi
            JOIN schedule_templates st ON st.id = dsi.template_id
            WHERE has_schedule_template_access(st.id, auth.uid())
        )
    );

CREATE POLICY "task_completions_update" ON task_completions
    FOR UPDATE
    USING (
        instance_id IN (
            SELECT dsi.id FROM daily_schedule_instances dsi
            JOIN schedule_templates st ON st.id = dsi.template_id
            WHERE has_schedule_template_access(st.id, auth.uid())
        )
    );

CREATE POLICY "task_completions_delete" ON task_completions
    FOR DELETE
    USING (
        instance_id IN (
            SELECT dsi.id FROM daily_schedule_instances dsi
            JOIN schedule_templates st ON st.id = dsi.template_id
            WHERE st.created_by = auth.uid()
        )
    );


-- 11. Enable Realtime for task_completions
-- So caregivers see updates in real-time
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;


-- 12. Triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_templates_updated_at ON schedule_templates;
CREATE TRIGGER schedule_templates_updated_at
    BEFORE UPDATE ON schedule_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_updated_at();

DROP TRIGGER IF EXISTS schedule_tasks_updated_at ON schedule_tasks;
CREATE TRIGGER schedule_tasks_updated_at
    BEFORE UPDATE ON schedule_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_updated_at();

DROP TRIGGER IF EXISTS daily_schedule_instances_updated_at ON daily_schedule_instances;
CREATE TRIGGER daily_schedule_instances_updated_at
    BEFORE UPDATE ON daily_schedule_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_updated_at();

DROP TRIGGER IF EXISTS task_completions_updated_at ON task_completions;
CREATE TRIGGER task_completions_updated_at
    BEFORE UPDATE ON task_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_updated_at();


-- 13. Storage bucket for task images (medication photos, etc.)
-- =====================================================
-- Run this in Supabase Dashboard > Storage > Create new bucket
-- Bucket name: task-images
-- Public: No
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
