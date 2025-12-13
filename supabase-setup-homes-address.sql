-- Add address component columns to homes table
-- Run this in Supabase SQL Editor

-- Add address components for Google Places integration
ALTER TABLE homes
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zip TEXT,
ADD COLUMN IF NOT EXISTS address_country TEXT,
ADD COLUMN IF NOT EXISTS address_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS address_lng DOUBLE PRECISION;

-- Add comments for new columns
COMMENT ON COLUMN homes.address_street IS 'Street address';
COMMENT ON COLUMN homes.address_city IS 'City';
COMMENT ON COLUMN homes.address_state IS 'State/Province';
COMMENT ON COLUMN homes.address_zip IS 'ZIP/Postal code';
COMMENT ON COLUMN homes.address_country IS 'Country';
COMMENT ON COLUMN homes.address_lat IS 'Latitude for map display';
COMMENT ON COLUMN homes.address_lng IS 'Longitude for map display';
