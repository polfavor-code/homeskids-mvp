-- Create contacts table for storing family contacts
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('medical', 'school', 'family', 'activities', 'other')),
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by family
CREATE INDEX IF NOT EXISTS idx_contacts_family_id ON contacts(family_id);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);

-- Create index for favorites (useful for sorting)
CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON contacts(is_favorite);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view contacts for their family
CREATE POLICY "Users can view their family's contacts"
    ON contacts
    FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert contacts for their family
CREATE POLICY "Users can insert contacts for their family"
    ON contacts
    FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update contacts for their family
CREATE POLICY "Users can update their family's contacts"
    ON contacts
    FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete contacts for their family
CREATE POLICY "Users can delete their family's contacts"
    ON contacts
    FOR DELETE
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_updated_at();
