-- ============================================
-- AGGRESSIVE FIX FOR HEALTH TABLES RLS
-- ============================================
-- This is a more aggressive approach that ensures policies work
-- by recreating everything from scratch
-- ============================================

-- ============================================
-- STEP 1: Create helper functions if missing
-- ============================================

-- Drop and recreate has_child_access function
DROP FUNCTION IF EXISTS has_child_access(UUID, UUID);
CREATE OR REPLACE FUNCTION has_child_access(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM child_access
        WHERE child_id = p_child_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate is_guardian function
DROP FUNCTION IF EXISTS is_guardian(UUID, UUID);
CREATE OR REPLACE FUNCTION is_guardian(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM child_guardians
        WHERE child_id = p_child_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: ALLERGIES - Drop all policies and recreate
-- ============================================

-- Disable RLS temporarily
ALTER TABLE allergies DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'allergies')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON allergies';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies
CREATE POLICY "allow_select_with_child_access" ON allergies
    FOR SELECT USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_insert_with_child_access" ON allergies
    FOR INSERT WITH CHECK (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_update_with_child_access" ON allergies
    FOR UPDATE USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_delete_with_child_access" ON allergies
    FOR DELETE USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

-- ============================================
-- STEP 3: MEDICATIONS - Drop all policies and recreate
-- ============================================

-- Disable RLS temporarily
ALTER TABLE medications DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'medications')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON medications';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies
CREATE POLICY "allow_select_with_child_access" ON medications
    FOR SELECT USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_insert_with_child_access" ON medications
    FOR INSERT WITH CHECK (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_update_with_child_access" ON medications
    FOR UPDATE USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_delete_with_child_access" ON medications
    FOR DELETE USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

-- ============================================
-- STEP 4: DIETARY_NEEDS - Drop all policies and recreate
-- ============================================

-- Disable RLS temporarily
ALTER TABLE dietary_needs DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'dietary_needs')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON dietary_needs';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE dietary_needs ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies
CREATE POLICY "allow_select_with_child_access" ON dietary_needs
    FOR SELECT USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_insert_with_child_access" ON dietary_needs
    FOR INSERT WITH CHECK (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_update_with_child_access" ON dietary_needs
    FOR UPDATE USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

CREATE POLICY "allow_delete_with_child_access" ON dietary_needs
    FOR DELETE USING (
        child_id IS NOT NULL 
        AND has_child_access(child_id, auth.uid())
    );

-- ============================================
-- VERIFY EVERYTHING
-- ============================================

-- Show all policies for health tables
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('allergies', 'medications', 'dietary_needs')
ORDER BY tablename, policyname;

-- Test the functions
SELECT 
    'Testing has_child_access function' as test,
    ca.child_id,
    c.name as child_name,
    has_child_access(ca.child_id, auth.uid()) as result
FROM child_access ca
JOIN children_v2 c ON c.id = ca.child_id
WHERE ca.user_id = auth.uid()
LIMIT 1;

-- ============================================
-- DONE
-- ============================================
-- This migration:
-- 1. Recreates helper functions from scratch
-- 2. Drops ALL existing policies (no naming conflicts)
-- 3. Creates clean, simple policies with unique names
-- 4. Tests that the functions work
-- ============================================
