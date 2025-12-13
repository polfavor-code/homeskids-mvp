-- Add columns to track WHO requested and packed items
-- Run this in Supabase SQL Editor

-- Add requested_by column (caregiver ID who requested the item)
ALTER TABLE items
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id);

-- Add packed_by column (caregiver ID who packed the item)
ALTER TABLE items
ADD COLUMN IF NOT EXISTS packed_by UUID REFERENCES profiles(id);

-- Add timestamps for when these actions occurred
ALTER TABLE items
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

ALTER TABLE items
ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_requested_by ON items(requested_by);
CREATE INDEX IF NOT EXISTS idx_items_packed_by ON items(packed_by);

-- Grant permissions (following existing RLS patterns)
-- The existing RLS policies should cover these new columns since they're on the same table
