-- ============================================
-- ADD AVATAR_URL TO CHILDREN TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to add
-- the avatar_url column to the children table.
-- ============================================

-- Add avatar_url column
ALTER TABLE children
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN children.avatar_url IS 'Path to avatar image in storage bucket';

-- ============================================
-- DONE!
-- ============================================
