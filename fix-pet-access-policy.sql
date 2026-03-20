-- ============================================
-- FIX: pet_access INSERT RLS Policy
-- ============================================
--
-- Problem: The original policy has a self-referential bug:
--   NOT EXISTS (SELECT 1 FROM pet_access WHERE pet_id = pet_access.pet_id)
--
-- This checks if pet_access has ANY rows (since pet_id = pet_access.pet_id
-- matches all rows in the subquery), not if the specific pet_id has no access.
--
-- Solution: Follow the same pattern as child_access - allow creators to
-- grant themselves access.
-- ============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "pet_access_insert_policy" ON pet_access;

-- Create fixed INSERT policy
-- Allow insert if:
-- 1. User already has manage access to this pet (for inviting caretakers)
-- 2. OR User is the creator of the pet (for initial owner setup)
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
-- VERIFICATION
-- ============================================
SELECT 'pet_access INSERT policy' as policy,
       pg_get_expr(polwithcheck, polrelid) as check_expr
FROM pg_policy
WHERE polrelid = 'pet_access'::regclass
  AND polname = 'pet_access_insert_policy';

-- ============================================
-- DONE - Run this migration to fix pet creation
-- ============================================
