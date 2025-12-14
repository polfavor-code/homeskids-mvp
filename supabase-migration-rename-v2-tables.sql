-- ============================================
-- HOMES.KIDS: Rename V2 Tables to Standard Names
-- This migration renames all _v2 tables to their standard names
-- ============================================

-- IMPORTANT: Run this migration when no users are active
-- The rename operations are quick but will briefly break the app

-- ============================================
-- STEP 1: Drop old V1 tables (if they exist and are no longer needed)
-- ============================================

-- First, check if old tables exist and drop them
-- These are the original V1 tables that are no longer used

DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS homes CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS invites CASCADE;

-- ============================================
-- STEP 2: Rename V2 tables to standard names
-- ============================================

-- Rename children_v2 to children
ALTER TABLE IF EXISTS children_v2 RENAME TO children;

-- Rename homes_v2 to homes
ALTER TABLE IF EXISTS homes_v2 RENAME TO homes;

-- Rename items_v2 to items
ALTER TABLE IF EXISTS items_v2 RENAME TO items;

-- Rename invites_v2 to invites
ALTER TABLE IF EXISTS invites_v2 RENAME TO invites;

-- ============================================
-- STEP 3: Rename indexes (optional but good practice)
-- ============================================

-- Rename children indexes
ALTER INDEX IF EXISTS idx_children_v2_created_by RENAME TO idx_children_created_by;

-- Rename homes indexes
ALTER INDEX IF EXISTS idx_homes_v2_created_by RENAME TO idx_homes_created_by;

-- Rename items indexes
ALTER INDEX IF EXISTS idx_items_v2_child_space_id RENAME TO idx_items_child_space_id;
ALTER INDEX IF EXISTS idx_items_v2_category RENAME TO idx_items_category;
ALTER INDEX IF EXISTS idx_items_v2_status RENAME TO idx_items_status;

-- Rename invites indexes
ALTER INDEX IF EXISTS idx_invites_v2_token RENAME TO idx_invites_token;
ALTER INDEX IF EXISTS idx_invites_v2_child_id RENAME TO idx_invites_child_id;
ALTER INDEX IF EXISTS idx_invites_v2_invited_by RENAME TO idx_invites_invited_by;

-- ============================================
-- STEP 4: Update foreign key constraint names (optional)
-- ============================================

-- Note: Foreign key constraints will continue to work with their original names
-- Renaming them is optional and only for consistency

-- ============================================
-- STEP 5: Verify the changes
-- ============================================

-- Run these queries to verify the tables exist with new names:
-- SELECT * FROM children LIMIT 1;
-- SELECT * FROM homes LIMIT 1;
-- SELECT * FROM items LIMIT 1;
-- SELECT * FROM invites LIMIT 1;

-- ============================================
-- DONE
-- ============================================
-- After running this migration:
-- 1. Verify the app works correctly
-- 2. The old V1 tables have been dropped
-- 3. The V2 tables are now the standard tables
-- ============================================
