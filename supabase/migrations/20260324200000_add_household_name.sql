-- Migration: Add household_name to homes
-- Purpose: Allow grouping of homes under a household label for admin display
-- Example: Multiple homes like "Dad's house", "Mom's house", "Beach house"
--          can be grouped under household_name "Somers Family"

ALTER TABLE homes
ADD COLUMN IF NOT EXISTS household_name TEXT;

CREATE INDEX IF NOT EXISTS idx_homes_household_name ON homes(household_name);

COMMENT ON COLUMN homes.household_name IS 'Optional household group name (e.g., "Somers Family"). Used to group multiple homes under one family unit in admin views.';
