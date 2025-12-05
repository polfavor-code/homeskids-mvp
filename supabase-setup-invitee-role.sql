-- Add invitee_role column to invites table
-- This stores the role of the invited caregiver (parent, grandparent, nanny, etc.)

ALTER TABLE invites
ADD COLUMN IF NOT EXISTS invitee_role TEXT;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN invites.invitee_role IS 'Role of the invited caregiver (e.g., parent, grandparent, nanny, babysitter)';
