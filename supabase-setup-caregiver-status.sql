-- ============================================
-- ADD CAREGIVER STATUS TO PROFILES TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to add
-- the caregiver_status field for enabling/disabling
-- caregiver access.
-- ============================================

-- Add caregiver_status column to profiles table
-- Values: 'active' (default), 'disabled'
-- Note: 'pending' status is determined by invite state, not stored here
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS caregiver_status TEXT DEFAULT 'active'
CHECK (caregiver_status IN ('active', 'disabled'));

-- Add comment for the new column
COMMENT ON COLUMN profiles.caregiver_status IS 'Caregiver access status: active (full access) or disabled (temporarily paused access)';

-- ============================================
-- DONE!
-- ============================================
-- The profiles table now has a caregiver_status field.
-- Existing caregivers will default to 'active'.
-- ============================================
