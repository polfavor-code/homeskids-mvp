-- ============================================
-- ADD CONNECTED_WITH COLUMN TO CONTACTS TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to add
-- the connected_with column to the contacts table.
-- ============================================

-- Add the connected_with column
-- Values: caregiver UUID, 'both', 'all', or NULL
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS connected_with TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN contacts.connected_with IS 'Caregiver ID (UUID), "both" for both sides, "all" for all caregivers, or NULL if not specified';

-- ============================================
-- DONE!
-- ============================================
-- The connected_with column can store:
-- - A caregiver's UUID (e.g., '4984ddd3-af16-4029-81e3-3ccfeb22351a')
-- - 'both' - for contacts connected with both sides
-- - 'all' - for contacts connected with all caregivers
-- - NULL - if no connection is specified
-- ============================================
