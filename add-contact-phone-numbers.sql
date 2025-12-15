-- Add phone_numbers JSONB column and created_by_user_id to contacts table
-- This supports multiple phone numbers per contact and tracks who added the contact

-- Add the phone_numbers column
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS phone_numbers JSONB DEFAULT NULL;

-- Add created_by_user_id column to track who added the contact
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id);

-- Create an index for better query performance on phone_numbers
CREATE INDEX IF NOT EXISTS idx_contacts_phone_numbers 
ON contacts USING GIN (phone_numbers);

-- Create an index for created_by_user_id
CREATE INDEX IF NOT EXISTS idx_contacts_created_by_user_id 
ON contacts (created_by_user_id);

-- Comment for documentation
COMMENT ON COLUMN contacts.phone_numbers IS 'Array of phone numbers with structure: [{id, number, countryCode, type}]';
COMMENT ON COLUMN contacts.created_by_user_id IS 'User ID of who added this contact';

-- Migrate existing phone data to phone_numbers format (optional - can be done manually or by app)
-- UPDATE contacts 
-- SET phone_numbers = jsonb_build_array(
--     jsonb_build_object(
--         'id', 'legacy-1',
--         'number', phone,
--         'countryCode', COALESCE(phone_country_code, '+1'),
--         'type', 'mobile'
--     )
-- )
-- WHERE phone IS NOT NULL AND phone != '' AND phone_numbers IS NULL;

-- Note: The legacy phone and phone_country_code columns are kept for backward compatibility
-- The app will read from phone_numbers first, falling back to legacy fields
