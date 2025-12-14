-- ============================================
-- FIX: Calendar Events RLS - More Permissive
-- ============================================
-- Temporarily allow anyone with child_access to create events
-- We can tighten this later once confirmed working
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;

-- SELECT: Anyone with child access can view
CREATE POLICY "calendar_events_select" ON calendar_events
    FOR SELECT USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM child_access ca
            WHERE ca.child_id = calendar_events.child_id
            AND ca.user_id = auth.uid()
        )
    );

-- INSERT: Anyone with child access can create any event type
-- (We'll enforce guardian-only for home_days in the app layer)
CREATE POLICY "calendar_events_insert" ON calendar_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM child_access ca
            WHERE ca.child_id = calendar_events.child_id
            AND ca.user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- UPDATE: Anyone with child access can update
CREATE POLICY "calendar_events_update" ON calendar_events
    FOR UPDATE USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM child_access ca
            WHERE ca.child_id = calendar_events.child_id
            AND ca.user_id = auth.uid()
        )
    );

-- DELETE: Anyone with child access can delete
CREATE POLICY "calendar_events_delete" ON calendar_events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM child_access ca
            WHERE ca.child_id = calendar_events.child_id
            AND ca.user_id = auth.uid()
        )
    );

-- ============================================
-- Verify: Check your child_access
-- ============================================
SELECT 
    u.email,
    c.name as child_name,
    ca.child_id,
    ca.user_id,
    ca.role_type,
    ca.access_level
FROM child_access ca
JOIN children c ON c.id = ca.child_id
JOIN auth.users u ON u.id = ca.user_id
ORDER BY c.name, u.email;
