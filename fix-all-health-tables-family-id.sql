-- ============================================
-- FIX ALL HEALTH TABLES: MAKE FAMILY_ID NULLABLE
-- ============================================
-- Multiple health tables require family_id but V2 uses child-centric model
-- This migration makes family_id nullable for all health tables
-- ============================================

-- Fix allergies table
ALTER TABLE allergies 
ALTER COLUMN family_id DROP NOT NULL;

COMMENT ON COLUMN allergies.family_id IS 'Legacy family_id for V1 compatibility. Nullable in V2 child-centric model.';

-- Fix medications table
ALTER TABLE medications 
ALTER COLUMN family_id DROP NOT NULL;

COMMENT ON COLUMN medications.family_id IS 'Legacy family_id for V1 compatibility. Nullable in V2 child-centric model.';

-- Fix dietary_needs table
ALTER TABLE dietary_needs 
ALTER COLUMN family_id DROP NOT NULL;

COMMENT ON COLUMN dietary_needs.family_id IS 'Legacy family_id for V1 compatibility. Nullable in V2 child-centric model.';

-- Fix child_health_status table
ALTER TABLE child_health_status 
ALTER COLUMN family_id DROP NOT NULL;

COMMENT ON COLUMN child_health_status.family_id IS 'Legacy family_id for V1 compatibility. Nullable in V2 child-centric model.';

-- Verify all changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('allergies', 'medications', 'dietary_needs', 'child_health_status')
AND column_name = 'family_id'
ORDER BY table_name;

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. All health tables can work without family_id
-- 2. V2 child-centric permissions work correctly
-- 3. Existing records with family_id remain unchanged
-- ============================================
