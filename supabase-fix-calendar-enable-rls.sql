-- ============================================
-- Re-enable RLS with simple working policy
-- ============================================

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_all" ON calendar_events;

-- Single simple policy for ALL operations
CREATE POLICY "calendar_events_all" ON calendar_events
    FOR ALL 
    USING (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    )
    WITH CHECK (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    );

-- Notifications policies
DROP POLICY IF EXISTS "calendar_notifications_select" ON calendar_notifications;
DROP POLICY IF EXISTS "calendar_notifications_insert" ON calendar_notifications;
DROP POLICY IF EXISTS "calendar_notifications_update" ON calendar_notifications;
DROP POLICY IF EXISTS "calendar_notifications_all" ON calendar_notifications;

CREATE POLICY "calendar_notifications_all" ON calendar_notifications
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (true);

-- Verify
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('calendar_events', 'calendar_notifications');
