-- Fix RLS policy for calendar_event_mappings
-- The issue is the policy subquery on child_guardians may be blocked by its own RLS

-- Option 1: Use child_access view instead (if it exists and is accessible)
DROP POLICY IF EXISTS "event_mappings_manage" ON calendar_event_mappings;
DROP POLICY IF EXISTS "event_mappings_view" ON calendar_event_mappings;

-- Simple policy: allow all operations if user has child_access
CREATE POLICY "event_mappings_access" ON calendar_event_mappings
    FOR ALL
    USING (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    )
    WITH CHECK (
        child_id IN (SELECT child_id FROM child_access WHERE user_id = auth.uid())
    );

-- If child_access doesn't work, we can temporarily make it more permissive
-- by checking if the user created the mapping or has any relationship to the child

-- Alternative: Create a security definer function to check guardian status
CREATE OR REPLACE FUNCTION is_child_guardian(p_child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM child_guardians 
        WHERE child_id = p_child_id 
        AND user_id = auth.uid()
    );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_child_guardian(UUID) TO authenticated;
