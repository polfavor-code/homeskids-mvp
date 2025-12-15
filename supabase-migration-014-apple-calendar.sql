-- ============================================
-- MIGRATION 014: Apple/iCloud Calendar ICS Integration
-- ============================================
-- One-way import from Apple Calendar via ICS URL
-- Secure handling with encrypted URL storage
-- ============================================

-- ============================================
-- 1. External Calendar Sources (unified for all providers)
-- ============================================

CREATE TABLE IF NOT EXISTS external_calendar_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'ics')),
    display_name TEXT NOT NULL DEFAULT 'Calendar',
    active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('ok', 'error')),
    last_sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_sources_user ON external_calendar_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_external_sources_child ON external_calendar_sources(child_id);
CREATE INDEX IF NOT EXISTS idx_external_sources_provider ON external_calendar_sources(provider);
CREATE INDEX IF NOT EXISTS idx_external_sources_active ON external_calendar_sources(active) WHERE active = TRUE;

COMMENT ON TABLE external_calendar_sources IS 'Unified table for all external calendar sources (Google OAuth, ICS URLs)';
COMMENT ON COLUMN external_calendar_sources.provider IS 'Calendar provider: google (OAuth) or ics (URL-based like iCloud)';
COMMENT ON COLUMN external_calendar_sources.display_name IS 'User-friendly name like "June iCloud calendar"';
COMMENT ON COLUMN external_calendar_sources.last_sync_status IS 'ok = successful, error = failed';
COMMENT ON COLUMN external_calendar_sources.last_sync_error IS 'Safe error message (no sensitive data)';

-- ============================================
-- 2. ICS Sources (provider-specific fields)
-- ============================================

CREATE TABLE IF NOT EXISTS ics_sources (
    source_id UUID PRIMARY KEY REFERENCES external_calendar_sources(id) ON DELETE CASCADE,
    ics_url_encrypted TEXT NOT NULL,
    ics_url_hash TEXT NOT NULL,
    etag TEXT,
    last_modified TEXT,
    refresh_interval_minutes INTEGER DEFAULT 30,
    next_run_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for deduplication (same URL = same hash)
CREATE INDEX IF NOT EXISTS idx_ics_sources_hash ON ics_sources(ics_url_hash);
CREATE INDEX IF NOT EXISTS idx_ics_sources_next_run ON ics_sources(next_run_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE ics_sources IS 'ICS-specific fields for external_calendar_sources where provider=ics';
COMMENT ON COLUMN ics_sources.ics_url_encrypted IS 'AES-256-GCM encrypted ICS URL (server-side only)';
COMMENT ON COLUMN ics_sources.ics_url_hash IS 'SHA256 hash of normalized URL for deduplication';
COMMENT ON COLUMN ics_sources.etag IS 'HTTP ETag for conditional fetching';
COMMENT ON COLUMN ics_sources.last_modified IS 'HTTP Last-Modified header for conditional fetching';
COMMENT ON COLUMN ics_sources.refresh_interval_minutes IS 'How often to check for updates';
COMMENT ON COLUMN ics_sources.next_run_at IS 'When to next sync this source';
COMMENT ON COLUMN ics_sources.revoked_at IS 'Set when user disconnects/replaces the source';

-- ============================================
-- 3. Add soft delete and source tracking to calendar_events
-- ============================================

-- Add soft_deleted_at for events that disappear from ICS feed
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

-- Add source_id for tracking which external source the event came from
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS external_source_id UUID REFERENCES external_calendar_sources(id) ON DELETE SET NULL;

-- Index for soft-deleted events
CREATE INDEX IF NOT EXISTS idx_calendar_events_soft_deleted 
ON calendar_events(soft_deleted_at) 
WHERE soft_deleted_at IS NOT NULL;

-- Index for finding events by external source
CREATE INDEX IF NOT EXISTS idx_calendar_events_source_id
ON calendar_events(external_source_id)
WHERE external_source_id IS NOT NULL;

-- ============================================
-- 4. Extend calendar_event_mappings for ICS
-- ============================================

-- Add external_source_id for ICS-based mappings
ALTER TABLE calendar_event_mappings
ADD COLUMN IF NOT EXISTS external_source_id UUID REFERENCES external_calendar_sources(id) ON DELETE CASCADE;

-- Update source check constraint to include 'ics'
ALTER TABLE calendar_event_mappings 
DROP CONSTRAINT IF EXISTS calendar_event_mappings_source_check;

ALTER TABLE calendar_event_mappings
ADD CONSTRAINT calendar_event_mappings_source_check 
CHECK (source IN ('google', 'apple', 'outlook', 'ics'));

-- Update existing 'apple' entries to 'ics' if any
UPDATE calendar_event_mappings SET source = 'ics' WHERE source = 'apple';

-- ============================================
-- 5. Update calendar_events source check
-- ============================================

ALTER TABLE calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_source_check;

ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_source_check 
CHECK (source IN ('manual', 'google', 'apple', 'outlook', 'ics'));

ALTER TABLE calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_external_provider_check;

ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_external_provider_check 
CHECK (external_provider IN ('google', 'apple', 'outlook', 'ics'));

-- ============================================
-- 6. Update triggers
-- ============================================

-- Trigger for external_calendar_sources
DROP TRIGGER IF EXISTS update_external_sources_updated_at ON external_calendar_sources;
CREATE TRIGGER update_external_sources_updated_at
    BEFORE UPDATE ON external_calendar_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ics_sources
DROP TRIGGER IF EXISTS update_ics_sources_updated_at ON ics_sources;
CREATE TRIGGER update_ics_sources_updated_at
    BEFORE UPDATE ON ics_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Row Level Security
-- ============================================

ALTER TABLE external_calendar_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ics_sources ENABLE ROW LEVEL SECURITY;

-- External Calendar Sources: Owner can manage
DROP POLICY IF EXISTS "external_sources_owner" ON external_calendar_sources;
CREATE POLICY "external_sources_owner" ON external_calendar_sources
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- External Calendar Sources: Child access users can view
DROP POLICY IF EXISTS "external_sources_child_access" ON external_calendar_sources;
CREATE POLICY "external_sources_child_access" ON external_calendar_sources
    FOR SELECT
    USING (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    );

-- ICS Sources: Only owner can access (via join to external_calendar_sources)
-- Using service role for sync operations
DROP POLICY IF EXISTS "ics_sources_owner" ON ics_sources;
CREATE POLICY "ics_sources_owner" ON ics_sources
    FOR ALL
    USING (
        source_id IN (
            SELECT id FROM external_calendar_sources 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        source_id IN (
            SELECT id FROM external_calendar_sources 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 8. Helper Functions
-- ============================================

-- Check if user has any ICS calendar connected for a child
CREATE OR REPLACE FUNCTION has_ics_calendar_connected(p_user_id UUID, p_child_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM external_calendar_sources ecs
        JOIN ics_sources ics ON ics.source_id = ecs.id
        WHERE ecs.user_id = p_user_id
        AND ecs.child_id = p_child_id
        AND ecs.provider = 'ics'
        AND ecs.active = TRUE
        AND ics.revoked_at IS NULL
    );
END;
$$;

-- Get ICS sources due for sync
CREATE OR REPLACE FUNCTION get_ics_sources_due_for_sync(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    source_id UUID,
    user_id UUID,
    child_id UUID,
    display_name TEXT,
    ics_url_encrypted TEXT,
    etag TEXT,
    last_modified TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ecs.id AS source_id,
        ecs.user_id,
        ecs.child_id,
        ecs.display_name,
        ics.ics_url_encrypted,
        ics.etag,
        ics.last_modified
    FROM external_calendar_sources ecs
    JOIN ics_sources ics ON ics.source_id = ecs.id
    WHERE ecs.provider = 'ics'
    AND ecs.active = TRUE
    AND ics.revoked_at IS NULL
    AND (ics.next_run_at IS NULL OR ics.next_run_at <= NOW())
    ORDER BY ics.next_run_at ASC NULLS FIRST
    LIMIT p_limit;
END;
$$;

-- Update sync status for an ICS source
CREATE OR REPLACE FUNCTION update_ics_sync_status(
    p_source_id UUID,
    p_status TEXT,
    p_error TEXT DEFAULT NULL,
    p_etag TEXT DEFAULT NULL,
    p_last_modified TEXT DEFAULT NULL,
    p_next_run_minutes INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_interval INTEGER;
BEGIN
    -- Get refresh interval if not provided
    IF p_next_run_minutes IS NULL THEN
        SELECT refresh_interval_minutes INTO v_interval
        FROM ics_sources WHERE source_id = p_source_id;
        v_interval := COALESCE(v_interval, 30);
    ELSE
        v_interval := p_next_run_minutes;
    END IF;

    -- Update external_calendar_sources
    UPDATE external_calendar_sources
    SET 
        last_synced_at = NOW(),
        last_sync_status = p_status,
        last_sync_error = p_error,
        updated_at = NOW()
    WHERE id = p_source_id;

    -- Update ics_sources
    UPDATE ics_sources
    SET 
        etag = COALESCE(p_etag, etag),
        last_modified = COALESCE(p_last_modified, last_modified),
        next_run_at = NOW() + (v_interval * INTERVAL '1 minute'),
        updated_at = NOW()
    WHERE source_id = p_source_id;
END;
$$;

-- Find mapping rule for an ICS event (extends existing function)
CREATE OR REPLACE FUNCTION find_ics_event_mapping(
    p_child_id UUID,
    p_source_id UUID,
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
    AND external_source_id = p_source_id
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
    AND (external_source_id = p_source_id OR external_source_id IS NULL)
    AND source = 'ics'
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
    AND (external_source_id = p_source_id OR external_source_id IS NULL)
    AND source = 'ics'
    AND match_type = 'title_contains'
    AND LOWER(p_title) LIKE '%' || LOWER(match_value) || '%'
    AND active = TRUE
    ORDER BY priority DESC
    LIMIT 1;
    
    RETURN v_mapping_id;
END;
$$;

-- ============================================
-- 9. Comments
-- ============================================

COMMENT ON FUNCTION has_ics_calendar_connected IS 'Check if user has an active ICS calendar for a child';
COMMENT ON FUNCTION get_ics_sources_due_for_sync IS 'Get ICS sources that need to be synced (used by background job)';
COMMENT ON FUNCTION update_ics_sync_status IS 'Update sync status after ICS fetch completes';
COMMENT ON FUNCTION find_ics_event_mapping IS 'Find matching mapping rule for an ICS event';
