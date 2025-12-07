-- Migration: Update caregiver roles to new canonical set
--
-- New canonical roles:
--   parent, step_parent, family_member, nanny, babysitter, family_friend, other
--
-- Removed roles (migrated to new values):
--   co_parent -> parent
--   grandparent -> family_member
--   aunt_uncle -> family_member
--   sibling -> family_member
--   cousin -> family_member

-- Step 1: Migrate existing role values in profiles table
UPDATE profiles SET relationship = 'parent' WHERE relationship = 'co_parent';
UPDATE profiles SET relationship = 'family_member' WHERE relationship IN ('grandparent', 'aunt_uncle', 'sibling', 'cousin');

-- Step 2: Migrate existing role values in family_members table
UPDATE family_members SET role = 'parent' WHERE role = 'co_parent';
UPDATE family_members SET role = 'family_member' WHERE role IN ('grandparent', 'aunt_uncle', 'sibling', 'cousin');

-- Step 3: Migrate existing role values in invites table
UPDATE invites SET invitee_role = 'parent' WHERE invitee_role = 'co_parent';
UPDATE invites SET invitee_role = 'family_member' WHERE invitee_role IN ('grandparent', 'aunt_uncle', 'sibling', 'cousin');

-- Step 4 (Optional): Add a check constraint to profiles.relationship
-- Only run this after migrating all data
-- ALTER TABLE profiles
--   ADD CONSTRAINT profiles_relationship_check
--   CHECK (relationship IS NULL OR relationship IN ('parent', 'step_parent', 'family_member', 'nanny', 'babysitter', 'family_friend', 'other'));

-- Step 5 (Optional): Add a check constraint to family_members.role
-- Only run this after migrating all data
-- ALTER TABLE family_members
--   ADD CONSTRAINT family_members_role_check
--   CHECK (role IS NULL OR role IN ('parent', 'step_parent', 'family_member', 'nanny', 'babysitter', 'family_friend', 'other'));

-- Step 6 (Optional): Add a check constraint to invites.invitee_role
-- Only run this after migrating all data
-- ALTER TABLE invites
--   ADD CONSTRAINT invites_invitee_role_check
--   CHECK (invitee_role IS NULL OR invitee_role IN ('parent', 'step_parent', 'family_member', 'nanny', 'babysitter', 'family_friend', 'other'));

-- Note: If the database uses PostgreSQL ENUM types for roles,
-- you'll need to create a new enum type and cast the column to it.
-- This migration assumes roles are stored as text/varchar.

-- Update comments to reflect new role options
COMMENT ON COLUMN profiles.relationship IS 'Role/relationship: parent, step_parent, family_member, nanny, babysitter, family_friend, other';
COMMENT ON COLUMN invites.invitee_role IS 'Role of the invited caregiver: parent, step_parent, family_member, nanny, babysitter, family_friend, other';
