-- =====================================================
-- FIX: Regimens RLS policies
-- Uses SECURITY DEFINER helper functions for consistent access checks
-- =====================================================

-- Create helper function for child access (consistent with has_pet_access)
CREATE OR REPLACE FUNCTION has_child_access(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM child_access
        WHERE child_id = p_child_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
        OR (child_id IS NOT NULL AND has_child_access(child_id, auth.uid()))
        OR (pet_id IS NOT NULL AND has_pet_access(pet_id, auth.uid()))
    );

-- INSERT: Authenticated user must be the creator OR own the referenced child/pet
CREATE POLICY "regimens_insert" ON regimens
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR (child_id IS NOT NULL AND has_child_access(child_id, auth.uid()))
            OR (pet_id IS NOT NULL AND has_pet_access(pet_id, auth.uid()))
        )
    );

-- UPDATE: Users can update regimens they created
CREATE POLICY "regimens_update" ON regimens
    FOR UPDATE USING (created_by = auth.uid());

-- DELETE: Users can delete regimens they created
CREATE POLICY "regimens_delete" ON regimens
    FOR DELETE USING (created_by = auth.uid());
