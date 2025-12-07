-- =============================================
-- HEALTH FLAGS - "No known..." confirmations
-- =============================================
-- Add boolean flags to children table for confirming
-- that a child has no allergies, dietary restrictions,
-- or regular medication.

-- Add health confirmation flags to children table
ALTER TABLE children
ADD COLUMN IF NOT EXISTS no_known_allergies BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS no_dietary_restrictions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS no_regular_medication BOOLEAN DEFAULT FALSE;

-- Comment on the new columns
COMMENT ON COLUMN children.no_known_allergies IS 'User confirmed child has no known allergies';
COMMENT ON COLUMN children.no_dietary_restrictions IS 'User confirmed child has no dietary restrictions';
COMMENT ON COLUMN children.no_regular_medication IS 'User confirmed child takes no regular medication';

-- Note: The health section is considered "complete" when:
-- - At least one allergy OR dietary record OR medication entry exists
-- - OR any of the three "no_..." flags is true

-- This allows parents to either:
-- 1. Add actual health data (allergies, diet, medication)
-- 2. Confirm "none" for each category to mark it complete
