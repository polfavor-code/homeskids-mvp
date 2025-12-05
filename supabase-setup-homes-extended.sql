-- ============================================
-- EXTEND HOMES TABLE WITH ADDITIONAL FIELDS
-- ============================================
-- Run this in your Supabase SQL Editor to add
-- time zone, contact info, and wifi fields to homes.
-- ============================================

-- Add new columns to homes table
ALTER TABLE homes
ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS home_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS wifi_name TEXT,
ADD COLUMN IF NOT EXISTS wifi_password TEXT,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Add comments for new columns
COMMENT ON COLUMN homes.time_zone IS 'Time zone for this home (e.g., Europe/Madrid, auto for browser default)';
COMMENT ON COLUMN homes.home_phone IS 'Home phone number';
COMMENT ON COLUMN homes.emergency_contact IS 'Emergency contact info for this home';
COMMENT ON COLUMN homes.wifi_name IS 'WiFi network name';
COMMENT ON COLUMN homes.wifi_password IS 'WiFi password';
COMMENT ON COLUMN homes.is_primary IS 'Whether this is the primary home';

-- ============================================
-- DONE!
-- ============================================
-- The homes table now has extended fields.
-- ============================================
