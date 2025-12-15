-- ============================================
-- FIX DIETARY_NEEDS: MAKE FAMILY_ID NULLABLE
-- ============================================
-- The dietary_needs table requires family_id but V2 uses child-centric model
-- This migration makes family_id nullable for compatibility with V2
-- ============================================

-- Make family_id nullable
ALTER TABLE dietary_needs 
ALTER COLUMN family_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN dietary_needs.family_id IS 'Legacy family_id for V1 compatibility. Nullable in V2 child-centric model.';

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'dietary_needs' 
AND column_name = 'family_id';

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. dietary_needs can be created without family_id
-- 2. RLS policies use child_access (not family_members)
-- 3. Existing records with family_id remain unchanged
-- ============================================
