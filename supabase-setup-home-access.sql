-- =============================================================================
-- HOME ACCESS SYSTEM MIGRATION
-- =============================================================================
-- This migration implements the new caregiver & home access system where:
-- - A caregiver's status is derived from their home connections (not stored)
-- - Active = connected to >= 1 home in the family
-- - Inactive = connected to 0 homes in the family
-- - Pending = invite not yet accepted
-- =============================================================================

-- 1. Create home_access table for many-to-many relationship
-- This replaces the accessible_caregiver_ids array on the homes table
CREATE TABLE IF NOT EXISTS home_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(home_id, caregiver_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_home_access_home_id ON home_access(home_id);
CREATE INDEX IF NOT EXISTS idx_home_access_caregiver_id ON home_access(caregiver_id);

-- Enable RLS
ALTER TABLE home_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for home_access
-- Users can see home_access entries for homes they have access to
CREATE POLICY "Users can view home_access for their family homes"
    ON home_access FOR SELECT
    USING (
        home_id IN (
            SELECT h.id FROM homes h
            JOIN family_members fm ON h.family_id = fm.family_id
            WHERE fm.user_id = auth.uid()
        )
    );

-- Users can insert home_access for homes in their family
CREATE POLICY "Users can add home_access for their family homes"
    ON home_access FOR INSERT
    WITH CHECK (
        home_id IN (
            SELECT h.id FROM homes h
            JOIN family_members fm ON h.family_id = fm.family_id
            WHERE fm.user_id = auth.uid()
        )
    );

-- Users can delete home_access for homes in their family
CREATE POLICY "Users can remove home_access for their family homes"
    ON home_access FOR DELETE
    USING (
        home_id IN (
            SELECT h.id FROM homes h
            JOIN family_members fm ON h.family_id = fm.family_id
            WHERE fm.user_id = auth.uid()
        )
    );

-- 2. Add home_ids array to invites table for storing selected homes during invite
ALTER TABLE invites
ADD COLUMN IF NOT EXISTS home_ids UUID[] DEFAULT '{}';

-- 3. Migrate existing accessible_caregiver_ids data to home_access table
-- This converts the old array-based system to the new relational system
DO $$
DECLARE
    home_record RECORD;
    caregiver_id UUID;
BEGIN
    FOR home_record IN
        SELECT id, accessible_caregiver_ids
        FROM homes
        WHERE accessible_caregiver_ids IS NOT NULL
        AND array_length(accessible_caregiver_ids, 1) > 0
    LOOP
        FOREACH caregiver_id IN ARRAY home_record.accessible_caregiver_ids
        LOOP
            -- Insert into home_access if not already exists
            INSERT INTO home_access (home_id, caregiver_id)
            VALUES (home_record.id, caregiver_id)
            ON CONFLICT (home_id, caregiver_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 4. Remove the old caregiver_status column from profiles (status is now derived)
-- Note: We'll keep it for now for backwards compatibility and remove in a future migration
-- ALTER TABLE profiles DROP COLUMN IF EXISTS caregiver_status;

-- 5. Add comments for documentation
COMMENT ON TABLE home_access IS 'Maps caregivers to homes they have access to. A caregiver is "active" if they have >= 1 entry, "inactive" if they have 0 entries.';
COMMENT ON COLUMN home_access.home_id IS 'Reference to the home';
COMMENT ON COLUMN home_access.caregiver_id IS 'Reference to the caregiver (profiles table)';
COMMENT ON COLUMN invites.home_ids IS 'Array of home IDs the invited caregiver will have access to upon accepting';

-- 6. Create a helper view for getting caregiver status
CREATE OR REPLACE VIEW caregiver_home_counts AS
SELECT
    fm.user_id as caregiver_id,
    fm.family_id,
    COUNT(ha.id) as home_count,
    CASE
        WHEN COUNT(ha.id) > 0 THEN 'active'
        ELSE 'inactive'
    END as derived_status
FROM family_members fm
LEFT JOIN home_access ha ON ha.caregiver_id = fm.user_id
LEFT JOIN homes h ON ha.home_id = h.id AND h.family_id = fm.family_id
GROUP BY fm.user_id, fm.family_id;
