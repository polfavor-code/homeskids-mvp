-- ============================================
-- CREATE HOMES TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to create
-- the homes table for storing physical locations.
-- ============================================

-- Create the homes table
CREATE TABLE IF NOT EXISTS homes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo_url TEXT,
    address TEXT,
    notes TEXT,
    owner_caregiver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    accessible_caregiver_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE homes IS 'Physical locations where children stay';
COMMENT ON COLUMN homes.name IS 'Display name for the home (e.g., Daddy''s House)';
COMMENT ON COLUMN homes.photo_url IS 'Path to home photo in storage bucket';
COMMENT ON COLUMN homes.address IS 'Physical address of the home';
COMMENT ON COLUMN homes.notes IS 'Additional notes about the home';
COMMENT ON COLUMN homes.owner_caregiver_id IS 'Primary caregiver responsible for this home';
COMMENT ON COLUMN homes.accessible_caregiver_ids IS 'Array of caregiver IDs who have access to this home';

-- Create index on family_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_homes_family_id ON homes(family_id);

-- Enable RLS
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Family members can view homes" ON homes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = homes.family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert homes" ON homes
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = homes.family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update homes" ON homes
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = homes.family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete homes" ON homes
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = homes.family_id
        AND family_members.user_id = auth.uid()
    )
);

-- ============================================
-- ADD CAREGIVER FIELDS TO PROFILES TABLE
-- ============================================
-- Add relationship and phone columns to profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS relationship TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN profiles.relationship IS 'Relationship to child: parent, grandparent, nanny, babysitter, etc.';
COMMENT ON COLUMN profiles.phone IS 'Phone number for the caregiver';

-- ============================================
-- DONE!
-- ============================================
-- The homes table is now ready to use.
-- Profiles table now has relationship and phone columns.
-- ============================================
