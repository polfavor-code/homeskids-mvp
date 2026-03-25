-- Add invitee_roles column to support multiple role selection
-- e.g., someone can be both "babysitter" and "pet_sitter"

ALTER TABLE invites ADD COLUMN IF NOT EXISTS invitee_roles TEXT[] DEFAULT '{}';

-- Add pet_sitter to the allowed values for invitee_role
-- First drop the existing constraint, then recreate with new value
ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_invitee_role_check;

ALTER TABLE invites ADD CONSTRAINT invites_invitee_role_check
    CHECK (invitee_role IS NULL OR invitee_role IN (
        'parent', 'step_parent', 'stepparent',
        'family_member', 'nanny', 'babysitter', 'family_friend', 'pet_sitter', 'other'
    ));

-- Backfill existing invites: copy invitee_role to invitee_roles array
UPDATE invites
SET invitee_roles = ARRAY[invitee_role]
WHERE invitee_role IS NOT NULL
  AND (invitee_roles IS NULL OR invitee_roles = '{}');
