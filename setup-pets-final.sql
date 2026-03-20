-- =====================================================
-- FINAL PET SETUP - Auto-detects homes table
-- Just run this entire script in Supabase SQL Editor
-- =====================================================

-- Create pet_spaces with correct homes reference
DO $$
BEGIN
    -- Check if homes_v2 exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homes_v2') THEN
        -- Create pet_spaces referencing homes_v2
        CREATE TABLE IF NOT EXISTS pet_spaces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            home_id UUID NOT NULL REFERENCES homes_v2(id) ON DELETE CASCADE,
            pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(home_id, pet_id)
        );
        RAISE NOTICE 'Created pet_spaces with homes_v2 reference';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homes') THEN
        -- Create pet_spaces referencing homes
        CREATE TABLE IF NOT EXISTS pet_spaces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
            pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(home_id, pet_id)
        );
        RAISE NOTICE 'Created pet_spaces with homes reference';
    ELSE
        RAISE EXCEPTION 'No homes table found!';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pet_spaces_home_id ON pet_spaces(home_id);
CREATE INDEX IF NOT EXISTS idx_pet_spaces_pet_id ON pet_spaces(pet_id);

-- Enable RLS
ALTER TABLE pet_spaces ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "pet_spaces_select_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_insert_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_update_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_delete_policy" ON pet_spaces;

-- Create pet_spaces policies
CREATE POLICY "pet_spaces_select_policy" ON pet_spaces
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM pet_access pa WHERE pa.pet_id = pet_spaces.pet_id AND pa.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM pets WHERE id = pet_spaces.pet_id AND created_by = auth.uid())
    );

CREATE POLICY "pet_spaces_insert_policy" ON pet_spaces
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            EXISTS (SELECT 1 FROM pet_access pa WHERE pa.pet_id = pet_spaces.pet_id AND pa.user_id = auth.uid() AND pa.access_level = 'manage')
            OR EXISTS (SELECT 1 FROM pets WHERE id = pet_spaces.pet_id AND created_by = auth.uid())
        )
    );

CREATE POLICY "pet_spaces_update_policy" ON pet_spaces
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM pet_access pa WHERE pa.pet_id = pet_spaces.pet_id AND pa.user_id = auth.uid() AND pa.access_level = 'manage')
        OR EXISTS (SELECT 1 FROM pets WHERE id = pet_spaces.pet_id AND created_by = auth.uid())
    );

CREATE POLICY "pet_spaces_delete_policy" ON pet_spaces
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM pet_access pa WHERE pa.pet_id = pet_spaces.pet_id AND pa.user_id = auth.uid() AND pa.access_level = 'manage')
    );

-- Also fix pet_access insert policy
DROP POLICY IF EXISTS "pet_access_insert_policy" ON pet_access;

CREATE POLICY "pet_access_insert_policy" ON pet_access
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            EXISTS (SELECT 1 FROM pet_access pa WHERE pa.pet_id = pet_access.pet_id AND pa.user_id = auth.uid() AND pa.access_level = 'manage')
            OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM pets WHERE id = pet_access.pet_id AND created_by = auth.uid()))
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pet_spaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pet_spaces_updated_at_trigger ON pet_spaces;
CREATE TRIGGER pet_spaces_updated_at_trigger
    BEFORE UPDATE ON pet_spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_pet_spaces_updated_at();

-- Verify
SELECT 'SUCCESS! pet_spaces table created' as status;
SELECT table_name FROM information_schema.tables WHERE table_name = 'pet_spaces';
