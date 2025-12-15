-- ============================================
-- MIGRATION 013: Google Calendar Integration
-- ============================================
-- Phase 2: One-way sync from Google Calendar
-- with explicit mapping rules for Home Stays
-- ============================================

-- ============================================
-- 1. Google Calendar Connections (OAuth tokens)
-- ============================================

CREATE TABLE IF NOT EXISTS google_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    google_account_email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ NOT NULL,
    granted_scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One connection per user (can reconnect/update)
    CONSTRAINT unique_user_google_connection UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_google_connections_user ON google_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_google_connections_email ON google_calendar_connections(google_account_email);

COMMENT ON TABLE google_calendar_connections IS 'Stores Google OAuth tokens for Calendar access. One connection per user.';

-- ============================================
-- 2. Google Calendar Sources (calendar-to-child mapping)
-- ============================================

CREATE TABLE IF NOT EXISTS google_calendar_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES google_calendar_connections(id) ON DELETE CASCADE,
    google_calendar_id TEXT NOT NULL,
    google_calendar_name TEXT NOT NULL,
    google_calendar_color TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT TRUE,
    sync_token TEXT,
    last_synced_at TIMESTAMPTZ,
    last_sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each Google calendar can only be mapped once per user
    CONSTRAINT unique_user_google_calendar UNIQUE (user_id, google_calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_google_sources_user ON google_calendar_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_google_sources_child ON google_calendar_sources(child_id);
CREATE INDEX IF NOT EXISTS idx_google_sources_active ON google_calendar_sources(active) WHERE active = TRUE;

COMMENT ON TABLE google_calendar_sources IS 'Maps Google calendars to children. Each calendar syncs events for one child.';

-- ============================================
-- 3. Calendar Event Mappings (rules for converting events)
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_event_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'google' CHECK (source IN ('google', 'apple', 'outlook')),
    google_calendar_id TEXT,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    match_type TEXT NOT NULL CHECK (match_type IN ('event_id', 'title_exact', 'title_contains')),
    match_value TEXT NOT NULL,
    home_id UUID REFERENCES homes(id) ON DELETE SET NULL,
    resulting_event_type TEXT NOT NULL CHECK (resulting_event_type IN ('home_day', 'event')),
    auto_confirm BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_mappings_child ON calendar_event_mappings(child_id);
CREATE INDEX IF NOT EXISTS idx_event_mappings_calendar ON calendar_event_mappings(google_calendar_id);
CREATE INDEX IF NOT EXISTS idx_event_mappings_active ON calendar_event_mappings(active) WHERE active = TRUE;

COMMENT ON TABLE calendar_event_mappings IS 'Rules for converting imported Google events into Home Stays or categorized events.';

-- ============================================
-- 4. Add external event fields to calendar_events
-- ============================================

-- Add columns for external event tracking
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'google', 'apple', 'outlook'));

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS external_provider TEXT CHECK (external_provider IN ('google', 'apple', 'outlook'));

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS external_event_id TEXT;

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS external_updated_at TIMESTAMPTZ;

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS external_html_link TEXT;

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS is_home_stay_candidate BOOLEAN DEFAULT FALSE;

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS candidate_reason TEXT CHECK (candidate_reason IN ('all_day', 'multi_day', 'recurring', 'title_match'));

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS mapping_rule_id UUID REFERENCES calendar_event_mappings(id) ON DELETE SET NULL;

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN DEFAULT FALSE;

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

-- Index for finding external events
CREATE INDEX IF NOT EXISTS idx_calendar_events_external 
ON calendar_events(external_provider, external_calendar_id, external_event_id) 
WHERE external_event_id IS NOT NULL;

-- Index for finding candidates
CREATE INDEX IF NOT EXISTS idx_calendar_events_candidates 
ON calendar_events(child_id, is_home_stay_candidate) 
WHERE is_home_stay_candidate = TRUE;

-- ============================================
-- 5. Update triggers
-- ============================================

-- Trigger for google_calendar_connections
DROP TRIGGER IF EXISTS update_google_connections_updated_at ON google_calendar_connections;
CREATE TRIGGER update_google_connections_updated_at
    BEFORE UPDATE ON google_calendar_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for google_calendar_sources
DROP TRIGGER IF EXISTS update_google_sources_updated_at ON google_calendar_sources;
CREATE TRIGGER update_google_sources_updated_at
    BEFORE UPDATE ON google_calendar_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for calendar_event_mappings
DROP TRIGGER IF EXISTS update_event_mappings_updated_at ON calendar_event_mappings;
CREATE TRIGGER update_event_mappings_updated_at
    BEFORE UPDATE ON calendar_event_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Row Level Security
-- ============================================

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- Google Calendar Connections: Only owner can access
DROP POLICY IF EXISTS "google_connections_owner" ON google_calendar_connections;
CREATE POLICY "google_connections_owner" ON google_calendar_connections
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Google Calendar Sources: Owner can manage, child access users can view
DROP POLICY IF EXISTS "google_sources_owner" ON google_calendar_sources;
CREATE POLICY "google_sources_owner" ON google_calendar_sources
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "google_sources_child_access" ON google_calendar_sources;
CREATE POLICY "google_sources_child_access" ON google_calendar_sources
    FOR SELECT
    USING (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    );

-- Calendar Event Mappings: Child access users can view, guardians can manage
DROP POLICY IF EXISTS "event_mappings_view" ON calendar_event_mappings;
CREATE POLICY "event_mappings_view" ON calendar_event_mappings
    FOR SELECT
    USING (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "event_mappings_manage" ON calendar_event_mappings;
CREATE POLICY "event_mappings_manage" ON calendar_event_mappings
    FOR ALL
    USING (
        child_id IN (
            SELECT child_id FROM child_guardians 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        child_id IN (
            SELECT child_id FROM child_guardians 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 7. Helper Functions
-- ============================================

-- Check if user has Google Calendar connected
CREATE OR REPLACE FUNCTION has_google_calendar_connected(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM google_calendar_connections
        WHERE user_id = p_user_id
        AND revoked_at IS NULL
        AND token_expires_at > NOW() - INTERVAL '7 days'
    );
END;
$$;

-- Find matching mapping rule for an event
CREATE OR REPLACE FUNCTION find_event_mapping(
    p_child_id UUID,
    p_google_calendar_id TEXT,
    p_external_event_id TEXT,
    p_title TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_mapping_id UUID;
BEGIN
    -- Check for exact event_id match first (highest priority)
    SELECT id INTO v_mapping_id
    FROM calendar_event_mappings
    WHERE child_id = p_child_id
    AND google_calendar_id = p_google_calendar_id
    AND match_type = 'event_id'
    AND match_value = p_external_event_id
    AND active = TRUE
    ORDER BY priority DESC
    LIMIT 1;
    
    IF v_mapping_id IS NOT NULL THEN
        RETURN v_mapping_id;
    END IF;
    
    -- Check for exact title match
    SELECT id INTO v_mapping_id
    FROM calendar_event_mappings
    WHERE child_id = p_child_id
    AND (google_calendar_id = p_google_calendar_id OR google_calendar_id IS NULL)
    AND match_type = 'title_exact'
    AND LOWER(match_value) = LOWER(p_title)
    AND active = TRUE
    ORDER BY priority DESC
    LIMIT 1;
    
    IF v_mapping_id IS NOT NULL THEN
        RETURN v_mapping_id;
    END IF;
    
    -- Check for title contains match
    SELECT id INTO v_mapping_id
    FROM calendar_event_mappings
    WHERE child_id = p_child_id
    AND (google_calendar_id = p_google_calendar_id OR google_calendar_id IS NULL)
    AND match_type = 'title_contains'
    AND LOWER(p_title) LIKE '%' || LOWER(match_value) || '%'
    AND active = TRUE
    ORDER BY priority DESC
    LIMIT 1;
    
    RETURN v_mapping_id;
END;
$$;

-- ============================================
-- 8. Comments
-- ============================================

COMMENT ON COLUMN calendar_events.source IS 'Origin of event: manual (created in app), google, apple, outlook';
COMMENT ON COLUMN calendar_events.external_event_id IS 'ID of event in external system (e.g., Google Calendar event ID)';
COMMENT ON COLUMN calendar_events.is_home_stay_candidate IS 'Flagged as potential Home Stay (all-day, multi-day, or recurring)';
COMMENT ON COLUMN calendar_events.candidate_reason IS 'Why this event was flagged as a Home Stay candidate';
COMMENT ON COLUMN calendar_events.mapping_rule_id IS 'Which mapping rule converted this event (if any)';
COMMENT ON COLUMN calendar_events.is_read_only IS 'True for imported events that cannot be edited in Homes.kids';
