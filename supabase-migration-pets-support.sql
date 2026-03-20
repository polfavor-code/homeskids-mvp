-- =====================================================
-- PETS SUPPORT MIGRATION
-- Adds pet management capabilities to Homes.Kids
-- =====================================================

-- 1. Add new columns to profiles table for onboarding preferences
-- =====================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS manages_children BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manages_pets BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_child_role TEXT;

COMMENT ON COLUMN profiles.manages_children IS 'Whether user manages children (set during onboarding)';
COMMENT ON COLUMN profiles.manages_pets IS 'Whether user manages pets (set during onboarding)';
COMMENT ON COLUMN profiles.onboarding_child_role IS 'Child role selected during onboarding - for context only, NOT for permissions';


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

COMMENT ON TABLE pets IS 'Pets records - first-class managed entities like children';
COMMENT ON COLUMN pets.species IS 'Type of pet: dog, cat, bird, fish, reptile, small_mammal, or other';


-- 3. Create pet_access table (mirrors child_access pattern)
-- =====================================================
CREATE TABLE IF NOT EXISTS pet_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('owner', 'caretaker')),
    access_level TEXT NOT NULL CHECK (access_level IN ('view', 'contribute', 'manage')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pet_id, user_id),
    -- Constraint: owners must have manage access
    CONSTRAINT owner_must_manage CHECK (
        role_type != 'owner' OR access_level = 'manage'
    )
);

CREATE INDEX IF NOT EXISTS idx_pet_access_pet_id ON pet_access(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_access_user_id ON pet_access(user_id);

COMMENT ON TABLE pet_access IS 'Main permission table: who can access a pet and with what role';
COMMENT ON COLUMN pet_access.role_type IS 'owner (primary caretaker) or caretaker (helper)';


-- 4. Create pet_spaces table (links pets to homes, like child_spaces)
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

COMMENT ON TABLE pet_spaces IS 'PetSpace: links a pet to a home where it can stay';


-- 5. Enable RLS on new tables
-- =====================================================
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_spaces ENABLE ROW LEVEL SECURITY;


-- 6. Helper function to check pet access
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

-- SELECT: Users can view pets they have access to
CREATE POLICY "pets_select_policy" ON pets
    FOR SELECT
    USING (has_pet_access(id, auth.uid()));

-- INSERT: Authenticated users can create pets
CREATE POLICY "pets_insert_policy" ON pets
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Users with manage access can update
CREATE POLICY "pets_update_policy" ON pets
    FOR UPDATE
    USING (
        id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );

-- DELETE: Users with manage access can delete
CREATE POLICY "pets_delete_policy" ON pets
    FOR DELETE
    USING (
        id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );


-- 8. RLS Policies for pet_access table
-- =====================================================

-- SELECT: Users can view their own access records or records for pets they manage
CREATE POLICY "pet_access_select_policy" ON pet_access
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR pet_id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );

-- INSERT: Users can insert if they manage the pet OR if no access exists yet (first owner)
CREATE POLICY "pet_access_insert_policy" ON pet_access
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            -- User manages this pet already
            pet_id IN (
                SELECT pet_id FROM pet_access
                WHERE user_id = auth.uid() AND access_level = 'manage'
            )
            -- OR no one has access yet (first owner setting up)
            OR NOT EXISTS (
                SELECT 1 FROM pet_access WHERE pet_id = pet_access.pet_id
            )
        )
    );

-- UPDATE: Only managers can update access records
CREATE POLICY "pet_access_update_policy" ON pet_access
    FOR UPDATE
    USING (
        pet_id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );

-- DELETE: Only managers can delete access records
CREATE POLICY "pet_access_delete_policy" ON pet_access
    FOR DELETE
    USING (
        pet_id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );


-- 9. RLS Policies for pet_spaces table
-- =====================================================

-- SELECT: Users can view pet_spaces for pets they have access to
CREATE POLICY "pet_spaces_select_policy" ON pet_spaces
    FOR SELECT
    USING (has_pet_access(pet_id, auth.uid()));

-- INSERT: Users with manage access can link pets to homes
CREATE POLICY "pet_spaces_insert_policy" ON pet_spaces
    FOR INSERT
    WITH CHECK (
        pet_id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );

-- UPDATE: Users with manage access can update
CREATE POLICY "pet_spaces_update_policy" ON pet_spaces
    FOR UPDATE
    USING (
        pet_id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );

-- DELETE: Users with manage access can remove pet-home links
CREATE POLICY "pet_spaces_delete_policy" ON pet_spaces
    FOR DELETE
    USING (
        pet_id IN (
            SELECT pet_id FROM pet_access
            WHERE user_id = auth.uid() AND access_level = 'manage'
        )
    );


-- 10. Trigger for updated_at on pets
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


-- 11. Trigger for updated_at on pet_spaces
-- =====================================================
DROP TRIGGER IF EXISTS pet_spaces_updated_at_trigger ON pet_spaces;
CREATE TRIGGER pet_spaces_updated_at_trigger
    BEFORE UPDATE ON pet_spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_pets_updated_at();
