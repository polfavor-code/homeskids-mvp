-- ============================================
-- HOMES.KIDS: CALENDAR EVENTS
-- Migration 012: Calendar Events Table
-- ============================================
-- This migration creates the calendar_events table for
-- managing child schedules, home days, and events.
-- 
-- SELF-CONTAINED: Includes all required helper functions
-- ============================================

-- ============================================
-- PREREQUISITE HELPER FUNCTIONS
-- ============================================
-- These functions are created with CREATE OR REPLACE so they
-- won't fail if they already exist.

-- Check if update_updated_at_column function exists, create if not
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if user is a guardian of a child
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

-- Check if user has any access to a child
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

-- Check if user has a specific capability for a child
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
    v_is_guardian BOOLEAN;
BEGIN
    -- First check if user has any access to this child
    IF NOT has_child_access(p_child_id, p_user_id) THEN
        RETURN FALSE;
    END IF;

    -- Check if user is a guardian (guardians have all capabilities by default)
    v_is_guardian := is_guardian(p_child_id, p_user_id);
    IF v_is_guardian THEN
        RETURN TRUE;
    END IF;

    -- For non-guardians, check child_permission_overrides table if it exists
    -- If no override exists, return FALSE for safety
    BEGIN
        EXECUTE format(
            'SELECT %I FROM child_permission_overrides WHERE child_id = $1 AND user_id = $2',
            p_capability
        ) INTO v_result USING p_child_id, p_user_id;
        RETURN COALESCE(v_result, FALSE);
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, guardians already handled above
        RETURN FALSE;
    WHEN undefined_column THEN
        -- Column doesn't exist
        RETURN FALSE;
    END;
END;
$$;

-- ============================================
-- A) CALENDAR_EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Timing
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT TRUE,
    timezone TEXT,
    
    -- Event type: 'home_day' or 'event'
    event_type TEXT NOT NULL CHECK (event_type IN ('home_day', 'event')),
    
    -- For home_day events: which home the child will be at
    home_id UUID REFERENCES homes(id) ON DELETE SET NULL,
    
    -- Status for home_day confirmation workflow
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'proposed', 'rejected')),
    
    -- Proposal/confirmation tracking
    proposed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    proposal_reason TEXT,
    
    -- Soft delete support
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (start_at <= end_at),
    CONSTRAINT home_day_requires_home CHECK (
        event_type != 'home_day' OR home_id IS NOT NULL
    ),
    CONSTRAINT regular_events_confirmed CHECK (
        event_type != 'event' OR status = 'confirmed'
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_child_id ON calendar_events(child_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_home_id ON calendar_events(home_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_child_range ON calendar_events(child_id, start_at, end_at) 
    WHERE is_deleted = FALSE;

-- ============================================
-- B) UPDATED_AT TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- C) CALENDAR-SPECIFIC HELPER FUNCTIONS
-- ============================================

-- Function to check if user can confirm/reject home days
CREATE OR REPLACE FUNCTION can_confirm_home_day(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_child_id UUID;
    v_proposed_by UUID;
    v_event_type TEXT;
    v_status TEXT;
    v_guardian_count INTEGER;
BEGIN
    -- Get event details
    SELECT child_id, proposed_by, event_type, status 
    INTO v_child_id, v_proposed_by, v_event_type, v_status
    FROM calendar_events
    WHERE id = p_event_id AND is_deleted = FALSE;
    
    -- Must be a proposed home_day
    IF v_event_type != 'home_day' OR v_status != 'proposed' THEN
        RETURN FALSE;
    END IF;
    
    -- Must be a guardian
    IF NOT is_guardian(v_child_id, p_user_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Count guardians for this child
    SELECT COUNT(*) INTO v_guardian_count
    FROM child_guardians
    WHERE child_id = v_child_id;
    
    -- If only one guardian, allow self-confirm (edge case)
    IF v_guardian_count <= 1 THEN
        RETURN TRUE;
    END IF;
    
    -- Otherwise, cannot be the proposer
    RETURN v_proposed_by != p_user_id;
END;
$$;

-- Function to get eligible confirmers for a home day
CREATE OR REPLACE FUNCTION get_eligible_confirmers(p_event_id UUID)
RETURNS TABLE(user_id UUID, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_child_id UUID;
    v_proposed_by UUID;
    v_guardian_count INTEGER;
BEGIN
    -- Get event details
    SELECT ce.child_id, ce.proposed_by
    INTO v_child_id, v_proposed_by
    FROM calendar_events ce
    WHERE ce.id = p_event_id AND ce.is_deleted = FALSE;
    
    -- Count guardians
    SELECT COUNT(*) INTO v_guardian_count
    FROM child_guardians
    WHERE child_id = v_child_id;
    
    -- Return eligible guardians
    IF v_guardian_count <= 1 THEN
        -- Single guardian: can self-confirm
        RETURN QUERY
        SELECT cg.user_id, p.name
        FROM child_guardians cg
        JOIN profiles p ON p.id = cg.user_id
        WHERE cg.child_id = v_child_id;
    ELSE
        -- Multiple guardians: exclude proposer
        RETURN QUERY
        SELECT cg.user_id, p.name
        FROM child_guardians cg
        JOIN profiles p ON p.id = cg.user_id
        WHERE cg.child_id = v_child_id
        AND cg.user_id != v_proposed_by;
    END IF;
END;
$$;

-- ============================================
-- D) ROW LEVEL SECURITY
-- ============================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;

-- SELECT: Users can see events for children they have access to
CREATE POLICY "calendar_events_select" ON calendar_events
    FOR SELECT USING (
        is_deleted = FALSE
        AND has_child_access(child_id, auth.uid())
    );

-- INSERT: Users with child access can create events (guardians can create home_days)
CREATE POLICY "calendar_events_insert" ON calendar_events
    FOR INSERT WITH CHECK (
        has_child_access(child_id, auth.uid())
        AND (
            -- Regular events: anyone with access
            event_type = 'event'
            OR
            -- Home days: guardians only
            (event_type = 'home_day' AND is_guardian(child_id, auth.uid()))
        )
        AND created_by = auth.uid()
    );

-- UPDATE: Creator can update, guardians can confirm/reject
CREATE POLICY "calendar_events_update" ON calendar_events
    FOR UPDATE USING (
        is_deleted = FALSE
        AND (
            created_by = auth.uid()
            OR
            (event_type = 'home_day' AND is_guardian(child_id, auth.uid()))
        )
    );

-- DELETE: Only guardians can delete
CREATE POLICY "calendar_events_delete" ON calendar_events
    FOR DELETE USING (is_guardian(child_id, auth.uid()));

-- ============================================
-- E) NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('proposal', 'confirmed', 'rejected')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_calendar_notifications_user ON calendar_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_calendar_notifications_event ON calendar_notifications(event_id);

ALTER TABLE calendar_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_notifications_select" ON calendar_notifications;
DROP POLICY IF EXISTS "calendar_notifications_insert" ON calendar_notifications;
DROP POLICY IF EXISTS "calendar_notifications_update" ON calendar_notifications;

CREATE POLICY "calendar_notifications_select" ON calendar_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "calendar_notifications_insert" ON calendar_notifications
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "calendar_notifications_update" ON calendar_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- F) NOTIFICATION TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION notify_home_day_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.event_type = 'home_day' AND NEW.status = 'proposed' THEN
        INSERT INTO calendar_notifications (event_id, user_id, notification_type)
        SELECT NEW.id, ec.user_id, 'proposal'
        FROM get_eligible_confirmers(NEW.id) ec
        ON CONFLICT (event_id, user_id, notification_type) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_calendar_event_insert ON calendar_events;
CREATE TRIGGER after_calendar_event_insert
    AFTER INSERT ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_home_day_proposal();

CREATE OR REPLACE FUNCTION notify_home_day_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.event_type = 'home_day' AND OLD.status = 'proposed' THEN
        IF NEW.status = 'confirmed' THEN
            INSERT INTO calendar_notifications (event_id, user_id, notification_type)
            VALUES (NEW.id, NEW.proposed_by, 'confirmed')
            ON CONFLICT (event_id, user_id, notification_type) DO NOTHING;
        ELSIF NEW.status = 'rejected' THEN
            INSERT INTO calendar_notifications (event_id, user_id, notification_type)
            VALUES (NEW.id, NEW.proposed_by, 'rejected')
            ON CONFLICT (event_id, user_id, notification_type) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_calendar_event_status_change ON calendar_events;
CREATE TRIGGER after_calendar_event_status_change
    AFTER UPDATE OF status ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_home_day_status_change();

-- ============================================
-- DONE
-- ============================================
