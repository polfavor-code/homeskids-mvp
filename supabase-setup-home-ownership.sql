ALTER TABLE homes ADD COLUMN IF NOT EXISTS owner_caregiver_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_homes_owner_caregiver ON homes(owner_caregiver_id);
