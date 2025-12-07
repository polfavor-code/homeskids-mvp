-- Migration: Create child_health_status table with 3-state model
-- Run this migration in your Supabase SQL editor
--
-- This replaces the simple boolean flags (no_known_allergies, etc.) with a proper
-- 3-state model: 'skipped' | 'none' | 'has' for each health category

-- Create enum type for health status (if not exists)
DO $$ BEGIN
    CREATE TYPE health_status_enum AS ENUM ('skipped', 'none', 'has');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the child_health_status table
CREATE TABLE IF NOT EXISTS child_health_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

    -- Allergies
    allergies_status health_status_enum NOT NULL DEFAULT 'skipped',
    allergies_details TEXT,

    -- Medication
    medication_status health_status_enum NOT NULL DEFAULT 'skipped',
    medication_details TEXT,

    -- Dietary needs
    dietary_status health_status_enum NOT NULL DEFAULT 'skipped',
    dietary_details TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one record per child
    UNIQUE(child_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_health_status_child_id ON child_health_status(child_id);
CREATE INDEX IF NOT EXISTS idx_child_health_status_family_id ON child_health_status(family_id);

-- Enable Row Level Security
ALTER TABLE child_health_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only family members can access health status
-- Policy for SELECT
CREATE POLICY "Family members can view child health status"
    ON child_health_status
    FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Policy for INSERT
CREATE POLICY "Family members can insert child health status"
    ON child_health_status
    FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Policy for UPDATE
CREATE POLICY "Family members can update child health status"
    ON child_health_status
    FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Policy for DELETE
CREATE POLICY "Family members can delete child health status"
    ON child_health_status
    FOR DELETE
    USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_child_health_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_child_health_status_updated_at ON child_health_status;
CREATE TRIGGER trigger_update_child_health_status_updated_at
    BEFORE UPDATE ON child_health_status
    FOR EACH ROW
    EXECUTE FUNCTION update_child_health_status_updated_at();

-- Migration helper: If you have existing data in the old boolean flags,
-- you can migrate it with this query (run manually if needed):
--
-- INSERT INTO child_health_status (child_id, family_id, allergies_status, medication_status, dietary_status)
-- SELECT
--     c.id as child_id,
--     c.family_id,
--     CASE
--         WHEN c.no_known_allergies = true THEN 'none'::health_status_enum
--         WHEN EXISTS (SELECT 1 FROM allergies a WHERE a.child_id = c.id) THEN 'has'::health_status_enum
--         ELSE 'skipped'::health_status_enum
--     END as allergies_status,
--     CASE
--         WHEN c.no_regular_medication = true THEN 'none'::health_status_enum
--         WHEN EXISTS (SELECT 1 FROM medications m WHERE m.child_id = c.id AND m.is_active = true) THEN 'has'::health_status_enum
--         ELSE 'skipped'::health_status_enum
--     END as medication_status,
--     CASE
--         WHEN c.no_dietary_restrictions = true THEN 'none'::health_status_enum
--         WHEN EXISTS (SELECT 1 FROM dietary_needs d WHERE d.child_id = c.id) THEN 'has'::health_status_enum
--         ELSE 'skipped'::health_status_enum
--     END as dietary_status
-- FROM children c
-- WHERE NOT EXISTS (SELECT 1 FROM child_health_status chs WHERE chs.child_id = c.id)
-- ON CONFLICT (child_id) DO NOTHING;

-- Grant access (if needed for your setup)
-- GRANT ALL ON child_health_status TO authenticated;
-- GRANT ALL ON child_health_status TO service_role;
