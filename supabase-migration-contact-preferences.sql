-- Migration: Add contact preferences support
-- Run this in your Supabase SQL editor
-- This migration adds support for contact preferences (preferred communication methods)

-- Add new columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS telegram TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS contact_preferences TEXT[] DEFAULT '{}';

-- Add comment explaining the contact_preferences column
COMMENT ON COLUMN contacts.contact_preferences IS 
'Array of preferred contact methods: whatsapp, phone, sms, email, telegram, instagram';

-- Create an index for faster filtering by preferences (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_contacts_preferences ON contacts USING GIN (contact_preferences);

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name IN ('telegram', 'instagram', 'contact_preferences');
