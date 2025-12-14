-- ============================================
-- FIX: Calendar Events - All Permissions
-- ============================================
-- Super simple RLS: anyone with child_access can do anything
-- Run this to fix all permission issues
-- ============================================

-- First, check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'calendar_events'
) as table_exists;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;

-- Make sure RLS is enabled
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- SIMPLE POLICY: Anyone with child_access can SELECT
CREATE POLICY "calendar_events_select" ON calendar_events
    FOR SELECT USING (
        is_deleted = FALSE
        AND child_id IN (
            SELECT child_id FROM child_access WHERE user_id = auth.uid()
        )
    );

-- SIMPLE POLICY: Anyone with child_access can INSERT
CREATE POLICY "calendar_events_insert" ON calendar_events
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT child_id FROM child_access WHERE user_id = auth.uid()
        )
    );

-- SIMPLE POLICY: Anyone with child_access can UPDATE
CREATE POLICY "calendar_events_update" ON calendar_events
    FOR UPDATE USING (
        child_id IN (
            SELECT child_id FROM child_access WHERE user_id = auth.uid()
        )
    );

-- SIMPLE POLICY: Anyone with child_access can DELETE
CREATE POLICY "calendar_events_delete" ON calendar_events
    FOR DELETE USING (
        child_id IN (
            SELECT child_id FROM child_access WHERE user_id = auth.uid()
        )
    );

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'calendar_events';

-- Check your child_access
SELECT 
    'Your access:' as info,
    ca.child_id,
    c.name as child_name
FROM child_access ca
JOIN children c ON c.id = ca.child_id
WHERE ca.user_id = auth.uid();
