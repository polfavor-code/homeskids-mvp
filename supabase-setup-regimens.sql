-- =====================================================
-- REGIMEN SYSTEM - Multi-phase scheduling protocols
-- =====================================================
-- Supports: medication tapers, complex schedules,
-- different frequencies per phase, auto-transitions
-- =====================================================

-- 1. Regimens (multi-phase protocols)
-- Example: "Prednisone Taper" with phases for dose reduction
CREATE TABLE IF NOT EXISTS regimens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner (one of these must be set)
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    family_member_name TEXT,

    -- Metadata
    name TEXT NOT NULL,  -- "Prednisone Taper", "Morning Routine"
    description TEXT,
    regimen_type TEXT NOT NULL,  -- medication, supplement, routine, therapy

    -- Timing
    start_date DATE NOT NULL,

    -- Status
    status TEXT DEFAULT 'active',  -- active, completed, paused

    -- Ownership
    created_by UUID NOT NULL REFERENCES profiles(id),
    home_id UUID REFERENCES homes(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT regimen_owner_required CHECK (
        child_id IS NOT NULL OR pet_id IS NOT NULL OR family_member_name IS NOT NULL
    )
);

-- 2. Regimen Phases
-- Each phase has a duration and can have different tasks/frequencies
CREATE TABLE IF NOT EXISTS regimen_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regimen_id UUID NOT NULL REFERENCES regimens(id) ON DELETE CASCADE,

    phase_order INTEGER NOT NULL,  -- 1, 2, 3...
    name TEXT,  -- "Week 1 - High dose", "Maintenance"
    duration_days INTEGER,  -- null = forever (last phase continues indefinitely)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(regimen_id, phase_order)
);

-- 3. Phase Tasks (with flexible frequency options)
-- Each task within a phase can have its own frequency
CREATE TABLE IF NOT EXISTS phase_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES regimen_phases(id) ON DELETE CASCADE,

    name TEXT NOT NULL,  -- "Prednisone 10mg"
    description TEXT,
    task_type TEXT NOT NULL,  -- medication, supplement, routine, activity

    -- Frequency configuration
    frequency_type TEXT NOT NULL DEFAULT 'daily',
    -- Options:
    -- 'daily' = once per day
    -- 'x_times_daily' = multiple times per day (frequency_value = count)
    -- 'every_x_hours' = every N hours (frequency_value = hours)
    -- 'every_x_days' = every N days (frequency_value = days)
    -- 'specific_days' = specific days of week (uses days_of_week)

    frequency_value INTEGER DEFAULT 1,
    -- For x_times_daily: 2 = twice daily, 3 = three times daily
    -- For every_x_hours: 6 = every 6 hours, 8 = every 8 hours
    -- For every_x_days: 2 = every other day, 3 = every 3 days

    scheduled_times TIME[],  -- ['08:00', '20:00'] for multiple times
    days_of_week INTEGER[],  -- [1,3,5] for Mon/Wed/Fri (1=Monday, 7=Sunday)

    sort_order INTEGER DEFAULT 0,
    image_url TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Regimen Completions
-- Track completion of individual task occurrences
CREATE TABLE IF NOT EXISTS regimen_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_task_id UUID NOT NULL REFERENCES phase_tasks(id) ON DELETE CASCADE,

    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    occurrence_index INTEGER DEFAULT 0,  -- 0=first of day, 1=second, etc.

    status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, skipped, postponed
    completed_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    postponed_until TIMESTAMPTZ,
    postpone_reason TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phase_task_id, scheduled_date, occurrence_index)
);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_regimens_child_id ON regimens(child_id);
CREATE INDEX IF NOT EXISTS idx_regimens_pet_id ON regimens(pet_id);
CREATE INDEX IF NOT EXISTS idx_regimens_home_id ON regimens(home_id);
CREATE INDEX IF NOT EXISTS idx_regimens_created_by ON regimens(created_by);
CREATE INDEX IF NOT EXISTS idx_regimens_status ON regimens(status);

CREATE INDEX IF NOT EXISTS idx_regimen_phases_regimen_id ON regimen_phases(regimen_id);

CREATE INDEX IF NOT EXISTS idx_phase_tasks_phase_id ON phase_tasks(phase_id);

CREATE INDEX IF NOT EXISTS idx_regimen_completions_task_date
    ON regimen_completions(phase_task_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_regimen_completions_date
    ON regimen_completions(scheduled_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE regimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE regimen_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE regimen_completions ENABLE ROW LEVEL SECURITY;

-- Regimens policies
CREATE POLICY "regimens_select" ON regimens
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "regimens_insert" ON regimens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "regimens_update" ON regimens
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "regimens_delete" ON regimens
    FOR DELETE USING (created_by = auth.uid());

-- Regimen phases policies (access through regimen ownership)
CREATE POLICY "regimen_phases_select" ON regimen_phases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM regimens r
            WHERE r.id = regimen_phases.regimen_id
            AND r.created_by = auth.uid()
        )
    );

CREATE POLICY "regimen_phases_insert" ON regimen_phases
    FOR INSERT WITH CHECK (true);

CREATE POLICY "regimen_phases_update" ON regimen_phases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM regimens r
            WHERE r.id = regimen_phases.regimen_id
            AND r.created_by = auth.uid()
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

-- Phase tasks policies (access through regimen ownership)
CREATE POLICY "phase_tasks_select" ON phase_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM regimen_phases rp
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE rp.id = phase_tasks.phase_id
            AND r.created_by = auth.uid()
        )
    );

CREATE POLICY "phase_tasks_insert" ON phase_tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "phase_tasks_update" ON phase_tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM regimen_phases rp
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE rp.id = phase_tasks.phase_id
            AND r.created_by = auth.uid()
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
            AND r.created_by = auth.uid()
        )
    );

CREATE POLICY "regimen_completions_insert" ON regimen_completions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "regimen_completions_update" ON regimen_completions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM phase_tasks pt
            JOIN regimen_phases rp ON rp.id = pt.phase_id
            JOIN regimens r ON r.id = rp.regimen_id
            WHERE pt.id = regimen_completions.phase_task_id
            AND r.created_by = auth.uid()
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
-- REALTIME for live updates
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE regimen_completions;

-- =====================================================
-- HELPER FUNCTION: Get active phase for a regimen on a given date
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_phase(
    p_regimen_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    phase_id UUID,
    phase_name TEXT,
    phase_order INTEGER,
    phase_start_date DATE,
    phase_end_date DATE,
    is_forever BOOLEAN
) AS $$
DECLARE
    v_start_date DATE;
    v_current_date DATE;
    v_phase RECORD;
BEGIN
    -- Get regimen start date
    SELECT start_date INTO v_start_date
    FROM regimens
    WHERE id = p_regimen_id;

    IF v_start_date IS NULL THEN
        RETURN;
    END IF;

    v_current_date := v_start_date;

    -- Iterate through phases in order
    FOR v_phase IN
        SELECT rp.id, rp.name, rp.phase_order, rp.duration_days
        FROM regimen_phases rp
        WHERE rp.regimen_id = p_regimen_id
        ORDER BY rp.phase_order
    LOOP
        -- If duration is null, this phase lasts forever
        IF v_phase.duration_days IS NULL THEN
            IF p_date >= v_current_date THEN
                phase_id := v_phase.id;
                phase_name := v_phase.name;
                phase_order := v_phase.phase_order;
                phase_start_date := v_current_date;
                phase_end_date := NULL;
                is_forever := TRUE;
                RETURN NEXT;
                RETURN;
            END IF;
        ELSE
            -- Check if p_date falls within this phase
            IF p_date >= v_current_date AND p_date < (v_current_date + v_phase.duration_days) THEN
                phase_id := v_phase.id;
                phase_name := v_phase.name;
                phase_order := v_phase.phase_order;
                phase_start_date := v_current_date;
                phase_end_date := v_current_date + v_phase.duration_days - 1;
                is_forever := FALSE;
                RETURN NEXT;
                RETURN;
            END IF;
            v_current_date := v_current_date + v_phase.duration_days;
        END IF;
    END LOOP;

    -- No active phase found (regimen completed or date is before start)
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Example usage:
--
-- SELECT * FROM get_active_phase('regimen-uuid', '2024-03-25');
--
-- Returns: phase_id, phase_name, phase_order, phase_start_date, phase_end_date, is_forever
-- =====================================================
