-- ============================================
-- HOMES.KIDS V2: Fix children_v2 RLS Policy
-- Migration 008: Fix INSERT policy for children_v2
-- ============================================
-- The INSERT policy needs to verify created_by matches the authenticated user
-- ============================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "children_v2_insert" ON children_v2;

-- Create new insert policy that validates created_by
CREATE POLICY "children_v2_insert" ON children_v2
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (created_by IS NULL OR created_by = auth.uid())
    );

-- ============================================
-- DONE
-- ============================================
