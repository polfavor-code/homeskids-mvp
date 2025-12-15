-- ============================================
-- FIX CONTACTS TABLE FOR V2
-- ============================================
-- Add missing columns and update to child-centric model
-- ============================================

-- Add child_id column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE CASCADE;

-- Make family_id nullable for V2
ALTER TABLE contacts
ALTER COLUMN family_id DROP NOT NULL;

-- Add phone_country_code column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS phone_country_code TEXT;

-- Add detailed address columns
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address_street TEXT;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address_city TEXT;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address_state TEXT;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address_zip TEXT;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address_country TEXT;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address_lat DOUBLE PRECISION;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS address_lng DOUBLE PRECISION;

-- Add connected_with column (for linking contacts)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS connected_with TEXT;

-- Add avatar_url column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index on child_id for performance
CREATE INDEX IF NOT EXISTS idx_contacts_child_id ON contacts(child_id);

-- Add comments
COMMENT ON COLUMN contacts.child_id IS 'V2: Reference to child (child-centric model)';
COMMENT ON COLUMN contacts.family_id IS 'V1: Reference to family (legacy, nullable in V2)';
COMMENT ON COLUMN contacts.phone_country_code IS 'International phone country code (e.g., +1, +31)';
COMMENT ON COLUMN contacts.address_street IS 'Street address';
COMMENT ON COLUMN contacts.address_city IS 'City';
COMMENT ON COLUMN contacts.address_state IS 'State/Province';
COMMENT ON COLUMN contacts.address_zip IS 'Postal code';
COMMENT ON COLUMN contacts.address_country IS 'Country';
COMMENT ON COLUMN contacts.address_lat IS 'Latitude for map display';
COMMENT ON COLUMN contacts.address_lng IS 'Longitude for map display';
COMMENT ON COLUMN contacts.connected_with IS 'Link to related profile or contact';
COMMENT ON COLUMN contacts.avatar_url IS 'Path to contact avatar image';

-- ============================================
-- UPDATE RLS POLICIES FOR V2
-- ============================================

-- Drop old V1 policies
DROP POLICY IF EXISTS "Users can view their family's contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts for their family" ON contacts;
DROP POLICY IF EXISTS "Users can update their family's contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their family's contacts" ON contacts;

-- Drop any existing V2 policies
DROP POLICY IF EXISTS "Users with child access can view contacts" ON contacts;
DROP POLICY IF EXISTS "Users with child access can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Users with child access can update contacts" ON contacts;
DROP POLICY IF EXISTS "Users with child access can delete contacts" ON contacts;

-- Create V2 child-centric policies
CREATE POLICY "Users with child access can view contacts"
ON contacts FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Users with child access can insert contacts"
ON contacts FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Users with child access can update contacts"
ON contacts FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Users with child access can delete contacts"
ON contacts FOR DELETE
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
AND column_name IN ('child_id', 'family_id', 'phone_country_code', 'address_street', 'address_city', 'connected_with', 'avatar_url')
ORDER BY column_name;

-- Show policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'contacts'
ORDER BY policyname;

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. Contacts can be added with child_id (V2)
-- 2. All expected columns exist (address details, phone country code, etc.)
-- 3. RLS policies use child_access permissions
-- ============================================
