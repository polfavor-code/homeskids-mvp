-- ============================================
-- ADD AVATAR_URL COLUMN TO CONTACTS TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to add
-- the avatar_url column to the contacts table.
-- ============================================

-- Add the avatar_url column
-- Stores the path to the avatar in Supabase storage
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN contacts.avatar_url IS 'Path to the contact avatar image in Supabase storage (avatars bucket)';

-- ============================================
-- DONE!
-- ============================================
-- The avatar_url column stores the storage path
-- to the contact's avatar image, e.g.:
-- '{family_id}/contacts/{timestamp}-{random}_display.jpg'
--
-- The full image URL is retrieved using:
-- supabase.storage.from('avatars').createSignedUrl(path, expiresIn)
-- ============================================
