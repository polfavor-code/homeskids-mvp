-- ============================================
-- CREATE DIETARY_NEEDS TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to create
-- the dietary_needs table for storing diet information.
-- ============================================

-- Create the dietary_needs table
CREATE TABLE IF NOT EXISTS dietary_needs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    diet_type TEXT,
    custom_description TEXT,
    instructions TEXT,
    likes TEXT,
    dislikes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE dietary_needs IS 'Stores dietary needs and food preferences for children';
COMMENT ON COLUMN dietary_needs.diet_type IS 'Main diet type: vegetarian, vegan, pescatarian, dairy-free, gluten-free, halal, kosher, other';
COMMENT ON COLUMN dietary_needs.custom_description IS 'Custom description when diet_type is other';
COMMENT ON COLUMN dietary_needs.instructions IS 'Care instructions for meal preparation';
COMMENT ON COLUMN dietary_needs.likes IS 'Foods the child likes';
COMMENT ON COLUMN dietary_needs.dislikes IS 'Foods to avoid';

-- Create index on family_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_dietary_needs_family_id ON dietary_needs(family_id);

-- Enable RLS
ALTER TABLE dietary_needs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Family members can view dietary needs" ON dietary_needs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = dietary_needs.family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert dietary needs" ON dietary_needs
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = dietary_needs.family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update dietary needs" ON dietary_needs
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = dietary_needs.family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete dietary needs" ON dietary_needs
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = dietary_needs.family_id
        AND family_members.user_id = auth.uid()
    )
);

-- ============================================
-- DONE!
-- ============================================
-- The dietary_needs table is now ready to use.
-- ============================================
