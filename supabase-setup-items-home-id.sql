-- ============================================
-- ADD HOME ID TO ITEMS TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to add
-- location_home_id field to items table.
-- This migrates from caregiver-as-location to
-- actual homes from the homes table.
-- ============================================

-- Step 1: Add location_home_id column to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS location_home_id UUID REFERENCES homes(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_location_home_id ON items(location_home_id);

-- Add comment
COMMENT ON COLUMN items.location_home_id IS 'The home where this item is currently located (from homes table)';

-- ============================================
-- Step 2: Migrate existing items to use home_id
-- ============================================
-- This maps items from location_caregiver_id to the
-- corresponding home where that caregiver is the owner.
--
-- Logic: For each item with a location_caregiver_id,
-- find the home where owner_caregiver_id matches,
-- and set location_home_id to that home's id.
-- ============================================

-- Migrate items: set location_home_id based on owner_caregiver_id match
UPDATE items i
SET location_home_id = h.id
FROM homes h
WHERE i.location_caregiver_id = h.owner_caregiver_id
  AND i.location_home_id IS NULL
  AND i.family_id = h.family_id;

-- Alternative: If no owner match, try accessible_caregiver_ids array
UPDATE items i
SET location_home_id = (
    SELECT h.id
    FROM homes h
    WHERE h.family_id = i.family_id
      AND i.location_caregiver_id = ANY(h.accessible_caregiver_ids)
    LIMIT 1
)
WHERE i.location_home_id IS NULL
  AND i.location_caregiver_id IS NOT NULL;

-- ============================================
-- Step 3: Update RLS policies for the new column
-- ============================================
-- The existing RLS policies on items should still work
-- since they're based on family_id, but we add an
-- explicit policy for home-based access if needed.

-- No additional RLS needed - existing family_id policies cover this

-- ============================================
-- DONE!
-- ============================================
-- The items table now has location_home_id.
-- Existing items have been migrated where possible.
-- Items without a matching home will have NULL location_home_id.
-- ============================================
