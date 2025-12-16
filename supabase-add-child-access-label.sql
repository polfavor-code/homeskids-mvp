-- ============================================
-- HOMES.KIDS: Add Label Column to child_access
-- ============================================
-- This migration adds a 'label' column to the child_access table
-- to store how a child calls each caregiver (e.g., "Daddy", "Grandma", "Aunt Lisa")
-- This is child-specific, so each caregiver can have a different nickname per child.
-- ============================================

-- Add label column to child_access table
ALTER TABLE child_access 
ADD COLUMN IF NOT EXISTS label TEXT;

-- Add comment for documentation
COMMENT ON COLUMN child_access.label IS 'How the child calls this caregiver (e.g., Daddy, Grandma, Aunt Lisa). Shown throughout the child''s space.';

-- ============================================
-- Verification query (run after migration)
-- ============================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'child_access' AND column_name = 'label';
-- ============================================
