-- =====================================================
-- COMPLETE PETS SETUP (with fixed RLS policies)
-- Run this to set up all pet tables and correct policies
-- =====================================================

-- 1. Add columns to profiles (if not exists)
-- =====================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS manages_children BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manages_pets BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_child_role TEXT;

-- 2. Create pets table
-- =====================================================
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'bird', 'fish', 'reptile', 'small_mammal', 'other')),
    breed TEXT,
    dob DATE,
    avatar_url TEXT,
    avatar_initials TEXT,
    avatar_color TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_created_by ON pets(created_by);

-- 3. Create pet_access table
-- =====================================================
CREATE TABLE IF NOT EXISTS pet_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('owner', 'caretaker')),
    access_level TEXT NOT NULL CHECK (access_level IN ('view', 'contribute', 'manage')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pet_id, user_id),
    CONSTRAINT owner_must_manage CHECK (
        role_type != 'owner' OR access_level = 'manage'
    )
);

CREATE INDEX IF NOT EXISTS idx_pet_access_pet_id ON pet_access(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_access_user_id ON pet_access(user_id);

-- 4. Create pet_spaces table
-- =====================================================
CREATE TABLE IF NOT EXISTS pet_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES homes_v2(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(home_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_pet_spaces_home_id ON pet_spaces(home_id);
CREATE INDEX IF NOT EXISTS idx_pet_spaces_pet_id ON pet_spaces(pet_id);

-- 5. Enable RLS
-- =====================================================
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_spaces ENABLE ROW LEVEL SECURITY;

-- 6. Helper function
-- =====================================================
CREATE OR REPLACE FUNCTION has_pet_access(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pet_access
        WHERE pet_id = p_pet_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for pets table
-- =====================================================
DROP POLICY IF EXISTS "pets_select_policy" ON pets;
DROP POLICY IF EXISTS "pets_insert_policy" ON pets;
DROP POLICY IF EXISTS "pets_update_policy" ON pets;
DROP POLICY IF EXISTS "pets_delete_policy" ON pets;

CREATE POLICY "pets_select_policy" ON pets
    FOR SELECT
    USING (has_pet_access(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "pets_insert_policy" ON pets
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "pets_update_policy" ON pets
    FOR UPDATE
    USING (
        id IN (
            SELECT pa.pet_id FROM pet_access pa
            WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "pets_delete_policy" ON pets
    FOR DELETE
    USING (
        id IN (
            SELECT pa.pet_id FROM pet_access pa
            WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
        )
    );

-- 8. RLS Policies for pet_access table (FIXED)
-- =====================================================
DROP POLICY IF EXISTS "pet_access_select_policy" ON pet_access;
DROP POLICY IF EXISTS "pet_access_insert_policy" ON pet_access;
DROP POLICY IF EXISTS "pet_access_update_policy" ON pet_access;
DROP POLICY IF EXISTS "pet_access_delete_policy" ON pet_access;

CREATE POLICY "pet_access_select_policy" ON pet_access
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR pet_id IN (
            SELECT pa.pet_id FROM pet_access pa
            WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
        )
    );

-- FIXED: Allow pet creator to grant themselves initial access
CREATE POLICY "pet_access_insert_policy" ON pet_access
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            -- User manages this pet already
            pet_id IN (
                SELECT pa.pet_id FROM pet_access pa
                WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
            )
            -- OR User is the creator of the pet (for initial self-access)
            OR (
                user_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM pets
                    WHERE id = pet_access.pet_id
                    AND created_by = auth.uid()
                )
            )
        )
    );

CREATE POLICY "pet_access_update_policy" ON pet_access
    FOR UPDATE
    USING (
        pet_id IN (
            SELECT pa.pet_id FROM pet_access pa
            WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
        )
    );

CREATE POLICY "pet_access_delete_policy" ON pet_access
    FOR DELETE
    USING (
        pet_id IN (
            SELECT pa.pet_id FROM pet_access pa
            WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
        )
    );

-- 9. RLS Policies for pet_spaces table (FIXED)
-- =====================================================
DROP POLICY IF EXISTS "pet_spaces_select_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_insert_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_update_policy" ON pet_spaces;
DROP POLICY IF EXISTS "pet_spaces_delete_policy" ON pet_spaces;

CREATE POLICY "pet_spaces_select_policy" ON pet_spaces
    FOR SELECT
    USING (
        has_pet_access(pet_id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM pets WHERE id = pet_id AND created_by = auth.uid()
        )
    );

-- FIXED: Allow pet creator to link homes
CREATE POLICY "pet_spaces_insert_policy" ON pet_spaces
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            pet_id IN (
                SELECT pa.pet_id FROM pet_access pa
                WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
            )
            OR EXISTS (
                SELECT 1 FROM pets
                WHERE id = pet_spaces.pet_id
                AND created_by = auth.uid()
            )
        )
    );

CREATE POLICY "pet_spaces_update_policy" ON pet_spaces
    FOR UPDATE
    USING (
        pet_id IN (
            SELECT pa.pet_id FROM pet_access pa
            WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
        )
        OR EXISTS (
            SELECT 1 FROM pets WHERE id = pet_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "pet_spaces_delete_policy" ON pet_spaces
    FOR DELETE
    USING (
        pet_id IN (
            SELECT pa.pet_id FROM pet_access pa
            WHERE pa.user_id = auth.uid() AND pa.access_level = 'manage'
        )
    );

-- 10. Triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pets_updated_at_trigger ON pets;
CREATE TRIGGER pets_updated_at_trigger
    BEFORE UPDATE ON pets
    FOR EACH ROW
    EXECUTE FUNCTION update_pets_updated_at();

DROP TRIGGER IF EXISTS pet_spaces_updated_at_trigger ON pet_spaces;
CREATE TRIGGER pet_spaces_updated_at_trigger
    BEFORE UPDATE ON pet_spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_pets_updated_at();

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Tables created' as status,
       (SELECT count(*) FROM information_schema.tables WHERE table_name IN ('pets', 'pet_access', 'pet_spaces')) as count;

-- =====================================================
-- DONE - Pet support is now fully set up!
-- =====================================================
