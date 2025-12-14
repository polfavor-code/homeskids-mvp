-- ============================================
-- TEMPORARY: Disable RLS on calendar_events
-- ============================================
-- This will allow all operations to work
-- Run this to test if RLS is the issue
-- ============================================

-- Option 1: Disable RLS entirely (for testing)
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- Also disable on notifications if it exists
ALTER TABLE calendar_notifications DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('calendar_events', 'calendar_notifications');

-- ============================================
-- After testing, run this to re-enable with simple policies:
-- ============================================
/*
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_all" ON calendar_events;
CREATE POLICY "calendar_events_all" ON calendar_events
    FOR ALL USING (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    )
    WITH CHECK (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    );
*/
