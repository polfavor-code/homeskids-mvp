-- ============================================
-- FIX ALL HEALTH TABLES RLS - SIMPLIFIED APPROACH
-- ============================================
-- The current RLS policies might be too restrictive
-- This creates more permissive policies for allergies, medications, and dietary_needs
-- ============================================

-- First, check if V2 functions exist, if not create simplified versions
DO $$
BEGIN
    -- Create simplified has_child_access if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_child_access') THEN
        CREATE OR REPLACE FUNCTION has_child_access(p_child_id UUID, p_user_id UUID)
        RETURNS BOOLEAN AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM child_access
                WHERE child_id = p_child_id AND user_id = p_user_id
            );
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    END IF;

    -- Create simplified is_guardian if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_guardian') THEN
        CREATE OR REPLACE FUNCTION is_guardian(p_child_id UUID, p_user_id UUID)
        RETURNS BOOLEAN AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM child_guardians
                WHERE child_id = p_child_id AND user_id = p_user_id
            );
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    END IF;

    -- Create simplified can_manage_helpers if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_manage_helpers') THEN
        CREATE OR REPLACE FUNCTION can_manage_helpers(p_child_id UUID, p_user_id UUID)
        RETURNS BOOLEAN AS $func$
        BEGIN
            -- For now, guardians can manage helpers
            RETURN is_guardian(p_child_id, p_user_id);
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    END IF;
END $$;

-- Drop all existing policies (V1 and V2 variants)
DROP POLICY IF EXISTS "Users can view their family's allergies" ON allergies;
DROP POLICY IF EXISTS "Users can insert allergies for their family" ON allergies;
DROP POLICY IF EXISTS "Users can update their family's allergies" ON allergies;
DROP POLICY IF EXISTS "Users can delete their family's allergies" ON allergies;
DROP POLICY IF EXISTS "Users with child access can view allergies" ON allergies;
DROP POLICY IF EXISTS "Users with child access can insert allergies" ON allergies;
DROP POLICY IF EXISTS "Users with child access can update allergies" ON allergies;
DROP POLICY IF EXISTS "Guardians can insert allergies" ON allergies;
DROP POLICY IF EXISTS "Guardians can update allergies" ON allergies;
DROP POLICY IF EXISTS "Guardians can delete allergies" ON allergies;

-- Create new, more permissive V2 policies
-- SELECT: Anyone with child_access can view
CREATE POLICY "Users with child access can view allergies"
ON allergies FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

-- INSERT: Anyone with child_access can insert (more permissive for testing)
CREATE POLICY "Users with child access can insert allergies"
ON allergies FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

-- UPDATE: Anyone with child_access can update
CREATE POLICY "Users with child access can update allergies"
ON allergies FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

-- DELETE: Only guardians can delete
CREATE POLICY "Guardians can delete allergies"
ON allergies FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- ============================================
-- MEDICATIONS TABLE
-- ============================================

-- Drop all existing policies (V1 and V2 variants)
DROP POLICY IF EXISTS "Users can view their family's medications" ON medications;
DROP POLICY IF EXISTS "Users can insert medications for their family" ON medications;
DROP POLICY IF EXISTS "Users can update their family's medications" ON medications;
DROP POLICY IF EXISTS "Users can delete their family's medications" ON medications;
DROP POLICY IF EXISTS "Users with child access can view medications" ON medications;
DROP POLICY IF EXISTS "Users with child access can insert medications" ON medications;
DROP POLICY IF EXISTS "Users with child access can update medications" ON medications;
DROP POLICY IF EXISTS "Guardians can insert medications" ON medications;
DROP POLICY IF EXISTS "Guardians can update medications" ON medications;
DROP POLICY IF EXISTS "Guardians can delete medications" ON medications;

-- Create new, more permissive V2 policies
CREATE POLICY "Users with child access can view medications"
ON medications FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Users with child access can insert medications"
ON medications FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Users with child access can update medications"
ON medications FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Guardians can delete medications"
ON medications FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- ============================================
-- DIETARY_NEEDS TABLE
-- ============================================

-- Drop all existing policies (V1 and V2 variants)
DROP POLICY IF EXISTS "Family members can view dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can insert dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can update dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can delete dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Users with child access can view dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Users with child access can insert dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Users with child access can update dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Guardians can insert dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Guardians can update dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Guardians can delete dietary needs" ON dietary_needs;

-- Create new, more permissive V2 policies
CREATE POLICY "Users with child access can view dietary needs"
ON dietary_needs FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Users with child access can insert dietary needs"
ON dietary_needs FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Users with child access can update dietary needs"
ON dietary_needs FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Guardians can delete dietary needs"
ON dietary_needs FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- Verify the changes
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('allergies', 'medications', 'dietary_needs')
ORDER BY tablename, policyname;

-- ============================================
-- DONE
-- ============================================
-- This creates more permissive policies that allow any user
-- with child_access to add/edit health data (not just guardians)
-- Applies to: allergies, medications, dietary_needs
-- ============================================
