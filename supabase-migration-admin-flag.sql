-- Migration: Add is_admin flag to profiles table
-- Run this in Supabase SQL Editor

-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for efficient admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- After running this migration, mark your user as admin:
-- UPDATE profiles SET is_admin = true WHERE email = 'YOUR_EMAIL_HERE';
