-- Travel Bags Tables Setup
-- Run this in your Supabase SQL Editor

-- Table for travel bag sessions
CREATE TABLE IF NOT EXISTS travel_bags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    from_home_id UUID REFERENCES homes(id) ON DELETE SET NULL,
    to_home_id UUID REFERENCES homes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'packing' CHECK (status IN ('packing', 'in_transit', 'completed', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Table for untracked extras in a travel bag
CREATE TABLE IF NOT EXISTS travel_bag_untracked_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_bag_id UUID NOT NULL REFERENCES travel_bags(id) ON DELETE CASCADE UNIQUE,
    extras_everyday_clothes BOOLEAN DEFAULT FALSE,
    extras_underwear_socks BOOLEAN DEFAULT FALSE,
    extras_pajamas BOOLEAN DEFAULT FALSE,
    extras_school_uniform BOOLEAN DEFAULT FALSE,
    extras_toiletries BOOLEAN DEFAULT FALSE,
    extras_outerwear BOOLEAN DEFAULT FALSE,
    note TEXT,
    updated_by_caregiver_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE travel_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_bag_untracked_extras ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_bags
CREATE POLICY "Users can view travel bags for their family"
    ON travel_bags FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert travel bags for their family"
    ON travel_bags FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update travel bags for their family"
    ON travel_bags FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for travel_bag_untracked_extras
CREATE POLICY "Users can view extras for their family's travel bags"
    ON travel_bag_untracked_extras FOR SELECT
    USING (
        travel_bag_id IN (
            SELECT tb.id FROM travel_bags tb
            JOIN family_members fm ON tb.family_id = fm.family_id
            WHERE fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert extras for their family's travel bags"
    ON travel_bag_untracked_extras FOR INSERT
    WITH CHECK (
        travel_bag_id IN (
            SELECT tb.id FROM travel_bags tb
            JOIN family_members fm ON tb.family_id = fm.family_id
            WHERE fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update extras for their family's travel bags"
    ON travel_bag_untracked_extras FOR UPDATE
    USING (
        travel_bag_id IN (
            SELECT tb.id FROM travel_bags tb
            JOIN family_members fm ON tb.family_id = fm.family_id
            WHERE fm.user_id = auth.uid()
        )
    );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_travel_bags_family_status ON travel_bags(family_id, status);
CREATE INDEX IF NOT EXISTS idx_travel_bag_extras_bag_id ON travel_bag_untracked_extras(travel_bag_id);
