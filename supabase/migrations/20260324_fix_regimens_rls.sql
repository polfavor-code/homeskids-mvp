-- =====================================================
-- FIX: Regimens RLS policies
-- Make INSERT policy more permissive - just require authentication
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "regimens_select" ON regimens;
DROP POLICY IF EXISTS "regimens_insert" ON regimens;
DROP POLICY IF EXISTS "regimens_update" ON regimens;
DROP POLICY IF EXISTS "regimens_delete" ON regimens;

-- Recreate with fixed policies
-- SELECT: Users can see regimens they created OR regimens for children/pets they have access to
CREATE POLICY "regimens_select" ON regimens
    FOR SELECT USING (
        created_by = auth.uid()
        OR (child_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM child_access ca WHERE ca.child_id = regimens.child_id AND ca.user_id = auth.uid()
        ))
        OR (pet_id IS NOT NULL AND has_pet_access(pet_id, auth.uid()))
    );

-- INSERT: Any authenticated user can insert (created_by will be set by the app)
CREATE POLICY "regimens_insert" ON regimens
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Users can update regimens they created
CREATE POLICY "regimens_update" ON regimens
    FOR UPDATE USING (created_by = auth.uid());

-- DELETE: Users can delete regimens they created
CREATE POLICY "regimens_delete" ON regimens
    FOR DELETE USING (created_by = auth.uid());
