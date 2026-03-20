-- ============================================
-- COMPLETE FIX: Pet RLS Policies
-- ============================================
-- Fixes both pet_access AND pet_spaces INSERT policies
-- ============================================

-- ============================================
-- 1. Fix pet_access INSERT policy
-- ============================================
DROP POLICY IF EXISTS "pet_access_insert_policy" ON pet_access;

CREATE POLICY "pet_access_insert_policy" ON pet_access
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            -- User manages this pet already (for inviting others)
            pet_id IN (
                SELECT pa.pet_id FROM pet_access pa
                WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
            )
            -- OR User is the creator of the pet (for initial self-access)
            OR (
                user_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM pets
                    WHERE id = pet_access.pet_id
                    AND created_by = auth.uid()
                )
            )
        )
    );

-- ============================================
-- 2. Fix pet_spaces INSERT policy
-- ============================================
-- The original policy only allows users with existing manage access.
-- We need to ALSO allow the pet creator to link homes during initial setup.

DROP POLICY IF EXISTS "pet_spaces_insert_policy" ON pet_spaces;

CREATE POLICY "pet_spaces_insert_policy" ON pet_spaces
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            -- User has manage access to this pet
            pet_id IN (
                SELECT pa.pet_id FROM pet_access pa
                WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
            )
            -- OR User is the creator of the pet (for initial setup before pet_access is committed)
            OR EXISTS (
                SELECT 1 FROM pets
                WHERE id = pet_spaces.pet_id
                AND created_by = auth.uid()
            )
        )
    );

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'pet_access INSERT' as policy,
       substring(pg_get_expr(polwithcheck, polrelid), 1, 200) as check_expr
FROM pg_policy
WHERE polrelid = 'pet_access'::regclass
  AND polname = 'pet_access_insert_policy';

SELECT 'pet_spaces INSERT' as policy,
       substring(pg_get_expr(polwithcheck, polrelid), 1, 200) as check_expr
FROM pg_policy
WHERE polrelid = 'pet_spaces'::regclass
  AND polname = 'pet_spaces_insert_policy';

-- ============================================
-- DONE
-- ============================================
