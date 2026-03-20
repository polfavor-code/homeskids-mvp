-- Migration: Add end_date to regimen_phases
-- Duration can be: duration_days (number), end_date (specific date), or null (forever)

ALTER TABLE regimen_phases ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update the helper function to support end_date
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
    v_phase_end DATE;
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
        SELECT rp.id, rp.name, rp.phase_order, rp.duration_days, rp.end_date
        FROM regimen_phases rp
        WHERE rp.regimen_id = p_regimen_id
        ORDER BY rp.phase_order
    LOOP
        -- Determine phase end date
        -- Priority: end_date > duration_days > null (forever)
        IF v_phase.end_date IS NOT NULL THEN
            v_phase_end := v_phase.end_date;
        ELSIF v_phase.duration_days IS NOT NULL THEN
            v_phase_end := v_current_date + v_phase.duration_days - 1;
        ELSE
            v_phase_end := NULL; -- Forever
        END IF;

        -- If duration is null and no end_date, this phase lasts forever
        IF v_phase_end IS NULL THEN
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
            IF p_date >= v_current_date AND p_date <= v_phase_end THEN
                phase_id := v_phase.id;
                phase_name := v_phase.name;
                phase_order := v_phase.phase_order;
                phase_start_date := v_current_date;
                phase_end_date := v_phase_end;
                is_forever := FALSE;
                RETURN NEXT;
                RETURN;
            END IF;
            v_current_date := v_phase_end + 1;
        END IF;
    END LOOP;

    -- No active phase found (regimen completed or date is before start)
    RETURN;
END;
$$ LANGUAGE plpgsql;
