-- ============================================
-- HOMES.KIDS V2: CHILD-CENTRIC PERMISSIONS SCHEMA
-- Migration 001: Core Tables
-- ============================================
-- This migration creates the new child-partitioned permission model
-- with multi-home, multi-child co-parenting support.
--
-- KEY CONCEPTS:
-- - Child: The central entity around which permissions revolve
-- - Home: A physical location where a child can stay
-- - Guardian: Parent or stepparent with full rights for a child
-- - Helper: Family member, friend, or nanny with limited rights
-- - ChildSpace: The combination of (child_id + home_id)
-- ============================================

-- ============================================
-- A) PROFILES (auth users)
-- ============================================
-- The profiles table already exists with columns:
--   id, name, label, phone, avatar_initials, avatar_color, avatar_url, etc.
-- We just add any new columns needed for v2

DO $$
BEGIN
    -- Add whatsapp column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'whatsapp') THEN
        ALTER TABLE profiles ADD COLUMN whatsapp TEXT;
    END IF;

    -- Add email column if it doesn't exist (for contact sharing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;

    -- Add preferred_contact_method if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_contact_method') THEN
        ALTER TABLE profiles ADD COLUMN preferred_contact_method TEXT CHECK (preferred_contact_method IN ('phone', 'email', 'whatsapp'));
    END IF;
END $$;

COMMENT ON COLUMN profiles.whatsapp IS 'WhatsApp number for contact sharing';
COMMENT ON COLUMN profiles.preferred_contact_method IS 'User preference: phone, email, or whatsapp';

-- ============================================
-- B) HOMES
-- ============================================
-- Physical locations where children can stay

CREATE TABLE IF NOT EXISTS homes_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    photo_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homes_v2_created_by ON homes_v2(created_by);

COMMENT ON TABLE homes_v2 IS 'Physical locations/homes where children stay';
COMMENT ON COLUMN homes_v2.name IS 'Display name (e.g., "Daddy''s House", "MommyHome")';

-- ============================================
-- C) CHILDREN
-- ============================================
-- Child records - the central entity for permissions

CREATE TABLE IF NOT EXISTS children_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    dob DATE,
    avatar_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_children_v2_created_by ON children_v2(created_by);

COMMENT ON TABLE children_v2 IS 'Children records - central entity for permission model';
COMMENT ON COLUMN children_v2.dob IS 'Date of birth';

-- ============================================
-- D) CHILD_GUARDIANS
-- ============================================
-- Guardian assignment (parent/stepparent). Child-scoped authority.
-- This establishes who has guardian-tier rights for a child.

CREATE TABLE IF NOT EXISTS child_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    guardian_role TEXT NOT NULL CHECK (guardian_role IN ('parent', 'stepparent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_child_guardians_child_id ON child_guardians(child_id);
CREATE INDEX IF NOT EXISTS idx_child_guardians_user_id ON child_guardians(user_id);

COMMENT ON TABLE child_guardians IS 'Guardian assignments for children. Guardians have highest permission tier.';
COMMENT ON COLUMN child_guardians.guardian_role IS 'Label only: parent or stepparent. Both have same guardian-tier rights.';

-- ============================================
-- E) HOME_MEMBERSHIPS
-- ============================================
-- Home admin/membership for home-level settings only.
-- Does NOT grant child visibility by itself.

CREATE TABLE IF NOT EXISTS home_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES homes_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_home_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(home_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_home_memberships_home_id ON home_memberships(home_id);
CREATE INDEX IF NOT EXISTS idx_home_memberships_user_id ON home_memberships(user_id);

COMMENT ON TABLE home_memberships IS 'Home container membership. For managing home settings, NOT for child visibility.';
COMMENT ON COLUMN home_memberships.is_home_admin IS 'Can manage home name, address, invite people to home context';

-- ============================================
-- F) CHILD_SPACES
-- ============================================
-- Links a child to a home. Creates the "ChildSpace" concept.
-- All child-in-home data (items, contacts) belongs to a child_space.

CREATE TABLE IF NOT EXISTS child_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES homes_v2(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children_v2(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(home_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_child_spaces_home_id ON child_spaces(home_id);
CREATE INDEX IF NOT EXISTS idx_child_spaces_child_id ON child_spaces(child_id);

COMMENT ON TABLE child_spaces IS 'ChildSpace: links a child to a home. All per-home child data belongs here.';

-- ============================================
-- G) CHILD_ACCESS
-- ============================================
-- Main permission row: who can access a child globally, with what base role.
-- Guardians must have role_type='guardian', access_level='manage'.
-- Helpers get role_type='helper' with helper_type set.

CREATE TABLE IF NOT EXISTS child_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('guardian', 'helper')),
    helper_type TEXT CHECK (helper_type IN ('family_member', 'friend', 'nanny')),
    access_level TEXT NOT NULL CHECK (access_level IN ('view', 'contribute', 'manage')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, user_id),
    -- Constraint: guardians cannot have helper_type
    CONSTRAINT guardian_no_helper_type CHECK (
        (role_type = 'guardian' AND helper_type IS NULL) OR
        (role_type = 'helper' AND helper_type IS NOT NULL)
    ),
    -- Constraint: guardians must have manage access
    CONSTRAINT guardian_must_manage CHECK (
        role_type != 'guardian' OR access_level = 'manage'
    )
);

CREATE INDEX IF NOT EXISTS idx_child_access_child_id ON child_access(child_id);
CREATE INDEX IF NOT EXISTS idx_child_access_user_id ON child_access(user_id);

COMMENT ON TABLE child_access IS 'Main permission table: who can access a child and with what base role';
COMMENT ON COLUMN child_access.role_type IS 'guardian or helper';
COMMENT ON COLUMN child_access.helper_type IS 'For helpers: family_member, friend, or nanny';
COMMENT ON COLUMN child_access.access_level IS 'view (read-only), contribute (can edit), manage (full control)';

-- ============================================
-- H) CHILD_SPACE_ACCESS
-- ============================================
-- Scopes a user's child access to specific homes.
-- Restricts WHERE within a child's homes a user can operate.

CREATE TABLE IF NOT EXISTS child_space_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_space_id UUID NOT NULL REFERENCES child_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    access_level_override TEXT CHECK (access_level_override IN ('view', 'contribute', 'manage')),
    can_view_address BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_child_space_access_child_space_id ON child_space_access(child_space_id);
CREATE INDEX IF NOT EXISTS idx_child_space_access_user_id ON child_space_access(user_id);

COMMENT ON TABLE child_space_access IS 'Per-home access for a user. Scopes child_access to specific homes.';
COMMENT ON COLUMN child_space_access.access_level_override IS 'Optional override. Effective = max(child_access.level, this)';
COMMENT ON COLUMN child_space_access.can_view_address IS 'Whether user can see home address for this child_space';

-- ============================================
-- I) CHILD_PERMISSION_OVERRIDES
-- ============================================
-- Fine-grained permission toggles per user per child.
-- Guardians can increase/decrease rights for any user.

CREATE TABLE IF NOT EXISTS child_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Calendar permissions
    can_view_calendar BOOLEAN DEFAULT TRUE,
    can_edit_calendar BOOLEAN DEFAULT FALSE,
    -- Items permissions
    can_view_items BOOLEAN DEFAULT TRUE,
    can_edit_items BOOLEAN DEFAULT FALSE,
    -- Content permissions
    can_upload_photos BOOLEAN DEFAULT FALSE,
    can_add_notes BOOLEAN DEFAULT FALSE,
    -- Contact/social permissions
    can_view_contacts BOOLEAN DEFAULT TRUE,
    can_manage_helpers BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_child_permission_overrides_child_id ON child_permission_overrides(child_id);
CREATE INDEX IF NOT EXISTS idx_child_permission_overrides_user_id ON child_permission_overrides(user_id);

COMMENT ON TABLE child_permission_overrides IS 'Fine-grained capability toggles per user per child';
COMMENT ON COLUMN child_permission_overrides.can_manage_helpers IS 'Can invite/remove helpers and adjust their permissions';

-- ============================================
-- J) CHILD_SPACE_CONTACTS
-- ============================================
-- Responsible adults list per child per home.
-- What Daddy sees for June at PatrickHome.

CREATE TABLE IF NOT EXISTS child_space_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_space_id UUID NOT NULL REFERENCES child_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    -- Privacy controls: only show fields where share_* is true
    share_phone BOOLEAN DEFAULT FALSE,
    share_email BOOLEAN DEFAULT FALSE,
    share_whatsapp BOOLEAN DEFAULT FALSE,
    share_note BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_child_space_contacts_child_space_id ON child_space_contacts(child_space_id);
CREATE INDEX IF NOT EXISTS idx_child_space_contacts_user_id ON child_space_contacts(user_id);

COMMENT ON TABLE child_space_contacts IS 'Responsible adults list per child-space. Contact fields shown based on share_* flags.';
COMMENT ON COLUMN child_space_contacts.note IS 'Optional note (e.g., "Call in emergencies only")';

-- ============================================
-- K) ITEMS (per child_space)
-- ============================================
-- Items stored per ChildSpace (child + home combination)

CREATE TABLE IF NOT EXISTS items_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_space_id UUID NOT NULL REFERENCES child_spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'at_home' CHECK (status IN ('at_home', 'in_bag', 'moved', 'lost')),
    photo_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_v2_child_space_id ON items_v2(child_space_id);
CREATE INDEX IF NOT EXISTS idx_items_v2_status ON items_v2(status);
CREATE INDEX IF NOT EXISTS idx_items_v2_created_by ON items_v2(created_by);

COMMENT ON TABLE items_v2 IS 'Items belonging to a child at a specific home';
COMMENT ON COLUMN items_v2.status IS 'at_home, in_bag, moved, or lost';

-- ============================================
-- L) CHILD_STAYS (child schedule)
-- ============================================
-- Calendar: which home a child is at during a time period

CREATE TABLE IF NOT EXISTS child_stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children_v2(id) ON DELETE CASCADE,
    home_id UUID NOT NULL REFERENCES homes_v2(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure start < end
    CONSTRAINT valid_date_range CHECK (start_at < end_at)
);

CREATE INDEX IF NOT EXISTS idx_child_stays_child_id ON child_stays(child_id);
CREATE INDEX IF NOT EXISTS idx_child_stays_home_id ON child_stays(home_id);
CREATE INDEX IF NOT EXISTS idx_child_stays_dates ON child_stays(start_at, end_at);

COMMENT ON TABLE child_stays IS 'Child schedule: which home a child stays at during each time period';

-- ============================================
-- TRIGGERS: Updated timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['profiles', 'homes_v2', 'children_v2', 'child_permission_overrides', 'child_space_contacts', 'items_v2', 'child_stays'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- ============================================
-- DONE: Tables Created
-- ============================================
-- Next: Run migration-002 for helper functions
-- Then: Run migration-003 for RLS policies
-- ============================================
