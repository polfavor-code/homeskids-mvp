-- ============================================
-- FIX ALL HEALTH TABLES RLS FOR V2 PERMISSIONS
-- ============================================
-- Update all health table RLS policies to use V2 child-centric model
-- instead of V1 family-based model
-- ============================================

-- ============================================
-- ALLERGIES TABLE
-- ============================================

-- Drop old V1 RLS policies
DROP POLICY IF EXISTS "Users can view their family's allergies" ON allergies;
DROP POLICY IF EXISTS "Users can insert allergies for their family" ON allergies;
DROP POLICY IF EXISTS "Users can update their family's allergies" ON allergies;
DROP POLICY IF EXISTS "Users can delete their family's allergies" ON allergies;

-- Create V2 child-centric RLS policies
CREATE POLICY "Users with child access can view allergies"
ON allergies FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Guardians can insert allergies"
ON allergies FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can update allergies"
ON allergies FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can delete allergies"
ON allergies FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- ============================================
-- MEDICATIONS TABLE
-- ============================================

-- Drop old V1 RLS policies
DROP POLICY IF EXISTS "Users can view their family's medications" ON medications;
DROP POLICY IF EXISTS "Users can insert medications for their family" ON medications;
DROP POLICY IF EXISTS "Users can update their family's medications" ON medications;
DROP POLICY IF EXISTS "Users can delete their family's medications" ON medications;

-- Create V2 child-centric RLS policies
CREATE POLICY "Users with child access can view medications"
ON medications FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Guardians can insert medications"
ON medications FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can update medications"
ON medications FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
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

-- Drop old V1 RLS policies
DROP POLICY IF EXISTS "Family members can view dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can insert dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can update dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can delete dietary needs" ON dietary_needs;

-- Drop V2 policies if they already exist (from previous migrations)
DROP POLICY IF EXISTS "Users with child access can view dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Guardians can insert dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Guardians can update dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Guardians can delete dietary needs" ON dietary_needs;

-- Create V2 child-centric RLS policies
CREATE POLICY "Users with child access can view dietary needs"
ON dietary_needs FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Guardians can insert dietary needs"
ON dietary_needs FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can update dietary needs"
ON dietary_needs FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can delete dietary needs"
ON dietary_needs FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- ============================================
-- CHILD_HEALTH_STATUS TABLE (if it exists)
-- ============================================

-- Drop old V1 RLS policies
DROP POLICY IF EXISTS "Family members can view child health status" ON child_health_status;
DROP POLICY IF EXISTS "Family members can insert child health status" ON child_health_status;
DROP POLICY IF EXISTS "Family members can update child health status" ON child_health_status;
DROP POLICY IF EXISTS "Family members can delete child health status" ON child_health_status;

-- Create V2 child-centric RLS policies
CREATE POLICY "Users with child access can view health status"
ON child_health_status FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Guardians can insert health status"
ON child_health_status FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can update health status"
ON child_health_status FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can delete health status"
ON child_health_status FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- ============================================
-- VERIFY THE CHANGES
-- ============================================
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename IN ('allergies', 'medications', 'dietary_needs', 'child_health_status')
ORDER BY tablename, policyname;

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. All health tables use V2 child-centric permissions
-- 2. Users with child_access can view health data
-- 3. Guardians can manage all health data
-- 4. Helper permissions work correctly
-- ============================================
