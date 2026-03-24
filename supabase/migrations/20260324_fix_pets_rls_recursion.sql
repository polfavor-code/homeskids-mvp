-- =====================================================
-- FIX: Infinite recursion in pets RLS policies
-- The issue: pet_access policies query pet_access, causing recursion
-- Solution: Use SECURITY DEFINER functions that bypass RLS
-- =====================================================

-- 1. Create helper function to check if user has ANY pet access (bypasses RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION has_pet_access(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pet_access
        WHERE pet_id = p_pet_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create helper function to check if user can manage a pet (bypasses RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION can_manage_pet(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pet_access
        WHERE pet_id = p_pet_id
        AND user_id = p_user_id
        AND access_level = 'manage'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create helper to check if user created the pet (bypasses RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION is_pet_creator(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pets
        WHERE id = p_pet_id
        AND created_by = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop and recreate pets policies using the helper functions
-- =====================================================
DROP POLICY IF EXISTS "pets_select_policy" ON pets;
DROP POLICY IF EXISTS "pets_insert_policy" ON pets;
DROP POLICY IF EXISTS "pets_update_policy" ON pets;
DROP POLICY IF EXISTS "pets_delete_policy" ON pets;

CREATE POLICY "pets_select_policy" ON pets
    FOR SELECT
    USING (
        has_pet_access(id, auth.uid())
        OR created_by = auth.uid()
    );

CREATE POLICY "pets_insert_policy" ON pets
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "pets_update_policy" ON pets
    FOR UPDATE
    USING (
        can_manage_pet(id, auth.uid())
        OR created_by = auth.uid()
    );

CREATE POLICY "pets_delete_policy" ON pets
    FOR DELETE
    USING (can_manage_pet(id, auth.uid()));

-- 6. Drop and recreate pet_access policies using helper functions
-- =====================================================
DROP POLICY IF EXISTS "pet_access_select_policy" ON pet_access;
DROP POLICY IF EXISTS "pet_access_insert_policy" ON pet_access;
DROP POLICY IF EXISTS "pet_access_update_policy" ON pet_access;
DROP POLICY IF EXISTS "pet_access_delete_policy" ON pet_access;

-- SELECT: Users can view their own access OR access for pets they manage
CREATE POLICY "pet_access_select_policy" ON pet_access
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR can_manage_pet(pet_id, auth.uid())
    );

-- INSERT: Users can insert if they manage the pet OR are the pet creator granting themselves access
CREATE POLICY "pet_access_insert_policy" ON pet_access
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            can_manage_pet(pet_id, auth.uid())
            OR (
                user_id = auth.uid()
                AND is_pet_creator(pet_id, auth.uid())
            )
        )
    );

-- UPDATE: Only managers can update access records
CREATE POLICY "pet_access_update_policy" ON pet_access
    FOR UPDATE
    USING (can_manage_pet(pet_id, auth.uid()));

-- DELETE: Only managers can delete access records
CREATE POLICY "pet_access_delete_policy" ON pet_access
    FOR DELETE
    USING (can_manage_pet(pet_id, auth.uid()));

-- 7. Drop and recreate pet_spaces policies using helper functions
-- =====================================================
DROP POLICY IF EXISTS "pet_spaces_select_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_insert_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_update_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_delete_policy" ON pet_spaces;

CREATE POLICY "pet_spaces_select_policy" ON pet_spaces
    FOR SELECT
    USING (
        has_pet_access(pet_id, auth.uid())
        OR is_pet_creator(pet_id, auth.uid())
    );

CREATE POLICY "pet_spaces_insert_policy" ON pet_spaces
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            can_manage_pet(pet_id, auth.uid())
            OR is_pet_creator(pet_id, auth.uid())
        )
    );

CREATE POLICY "pet_spaces_update_policy" ON pet_spaces
    FOR UPDATE
    USING (
        can_manage_pet(pet_id, auth.uid())
        OR is_pet_creator(pet_id, auth.uid())
    );

CREATE POLICY "pet_spaces_delete_policy" ON pet_spaces
    FOR DELETE
    USING (can_manage_pet(pet_id, auth.uid()));
