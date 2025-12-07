-- ============================================
-- Supabase Setup for Avatar Upload
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- STEP 1: Create the 'avatars' storage bucket
-- Go to Supabase Dashboard > Storage > "New bucket"
-- Name: avatars
-- Public: No (keep it private)
-- Click Create

-- STEP 2: Run the SQL below to set up storage policies
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to read any avatar (for viewing other users)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- STEP 3: Ensure profiles table has avatar_url column
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Done! Avatar upload should now work.

