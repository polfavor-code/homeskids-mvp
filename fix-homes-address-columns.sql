-- Migration to add missing columns to homes table
-- Run this in Supabase SQL Editor

-- Add family_id if it doesn't exist (references families table)
ALTER TABLE homes ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

-- Add owner_caregiver_id if it doesn't exist
ALTER TABLE homes ADD COLUMN IF NOT EXISTS owner_caregiver_id UUID;

-- Add status column if it doesn't exist
ALTER TABLE homes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add is_primary column if it doesn't exist
ALTER TABLE homes ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Add address detail columns if they don't exist
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address_country TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address_lat DOUBLE PRECISION;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS address_lng DOUBLE PRECISION;

-- Add time_zone column if it doesn't exist
ALTER TABLE homes ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'auto';

-- Add contact info columns if they don't exist
ALTER TABLE homes ADD COLUMN IF NOT EXISTS home_phone TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS wifi_name TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS wifi_password TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'homes'
ORDER BY column_name;
