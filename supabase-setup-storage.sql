-- ============================================
-- SUPABASE STORAGE SETUP FOR DOCUMENTS
-- ============================================
-- Run this in your Supabase SQL Editor to create
-- the storage bucket and RLS policies for file uploads.
-- ============================================

-- 1. Create the documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow authenticated users to upload files to their family's folder
CREATE POLICY "Users can upload to their family folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
  )
);

-- 4. Policy: Allow authenticated users to read files from their family's folder
CREATE POLICY "Users can read their family files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
  )
);

-- 5. Policy: Allow authenticated users to update files in their family's folder
CREATE POLICY "Users can update their family files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
  )
);

-- 6. Policy: Allow authenticated users to delete files from their family's folder
CREATE POLICY "Users can delete their family files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
  )
);

-- ============================================
-- DONE!
-- ============================================
-- After running this SQL, you can test by:
-- 1. Logging in to your app
-- 2. Going to Documents, IDs, School, or Medication pages
-- 3. Adding a new item with a file upload
-- ============================================
