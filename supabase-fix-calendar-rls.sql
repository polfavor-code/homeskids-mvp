-- ============================================
-- FIX: Calendar Events RLS Policies
-- ============================================
-- Simpler RLS policies that check child_access directly
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;

-- SELECT: Users can see events if they have access to the child via child_access
CREATE POLICY "calendar_events_select" ON calendar_events
    FOR SELECT USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM child_access ca
            WHERE ca.child_id = calendar_events.child_id
            AND ca.user_id = auth.uid()
        )
    );

-- INSERT: Users can create events if they have access to the child
-- For home_days, must be a guardian
CREATE POLICY "calendar_events_insert" ON calendar_events
    FOR INSERT WITH CHECK (
        -- Must have child access
        EXISTS (
            SELECT 1 FROM child_access ca
            WHERE ca.child_id = calendar_events.child_id
            AND ca.user_id = auth.uid()
        )
        AND (
            -- Regular events: anyone with access can create
            event_type = 'event'
            OR
            -- Home days: must be guardian (in child_guardians table)
            (
                event_type = 'home_day' 
                AND EXISTS (
                    SELECT 1 FROM child_guardians cg
                    WHERE cg.child_id = calendar_events.child_id
                    AND cg.user_id = auth.uid()
                )
            )
        )
        AND created_by = auth.uid()
    );

-- UPDATE: Creator or guardians can update
CREATE POLICY "calendar_events_update" ON calendar_events
    FOR UPDATE USING (
        is_deleted = FALSE
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM child_guardians cg
                WHERE cg.child_id = calendar_events.child_id
                AND cg.user_id = auth.uid()
            )
        )
    );

-- DELETE: Only guardians can delete
CREATE POLICY "calendar_events_delete" ON calendar_events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM child_guardians cg
            WHERE cg.child_id = calendar_events.child_id
            AND cg.user_id = auth.uid()
        )
    );

-- ============================================
-- Verify your access
-- ============================================
-- Run this to check if you have proper access:

SELECT 
    'child_access' as table_name,
    ca.child_id,
    c.name as child_name,
    ca.user_id,
    u.email,
    ca.role_type
FROM child_access ca
JOIN children c ON c.id = ca.child_id
JOIN auth.users u ON u.id = ca.user_id
WHERE c.name ILIKE '%june%';

SELECT 
    'child_guardians' as table_name,
    cg.child_id,
    c.name as child_name,
    cg.user_id,
    u.email,
    cg.guardian_role
FROM child_guardians cg
JOIN children c ON c.id = cg.child_id
JOIN auth.users u ON u.id = cg.user_id
WHERE c.name ILIKE '%june%';
