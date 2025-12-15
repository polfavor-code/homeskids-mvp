-- Fix item-photos storage permissions for V2 (child_access model)
-- Run this in Supabase SQL Editor

-- 1. Create the item-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies for item-photos (if any)
DROP POLICY IF EXISTS "Users can upload item photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read item photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update item photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete item photos" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "item_photos_delete" ON storage.objects;

-- 3. Create new policies based on child_access (V2 model)
-- Users can view item photos if they have access to any child
CREATE POLICY "item_photos_select" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'item-photos'
    AND EXISTS (
        SELECT 1 FROM child_access ca
        WHERE ca.user_id = auth.uid()
    )
);

-- Users can upload item photos if they have access to any child
CREATE POLICY "item_photos_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'item-photos'
    AND EXISTS (
        SELECT 1 FROM child_access ca
        WHERE ca.user_id = auth.uid()
    )
);

-- Users can update item photos if they have access to any child
CREATE POLICY "item_photos_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'item-photos'
    AND EXISTS (
        SELECT 1 FROM child_access ca
        WHERE ca.user_id = auth.uid()
    )
);

-- Users can delete item photos if they have access to any child
CREATE POLICY "item_photos_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'item-photos'
    AND EXISTS (
        SELECT 1 FROM child_access ca
        WHERE ca.user_id = auth.uid()
    )
);

-- 4. Verify policies were created
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'item_photos%';
