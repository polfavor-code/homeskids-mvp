-- ============================================
-- ADD FILE UPLOAD COLUMNS TO MEDICATIONS TABLE
-- ============================================
-- The medications table needs columns for storing file uploads
-- (prescription photos, etc.)
-- ============================================

-- Add file_path column (path to file in Supabase storage)
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Add file_type column (e.g., 'image/jpeg', 'application/pdf')
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Add file_size column (size in bytes)
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add comments explaining the columns
COMMENT ON COLUMN medications.file_path IS 'Path to the medication file (prescription photo, etc.) in Supabase storage';
COMMENT ON COLUMN medications.file_type IS 'MIME type of the uploaded file (e.g., image/jpeg, application/pdf)';
COMMENT ON COLUMN medications.file_size IS 'Size of the uploaded file in bytes';

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'medications' 
AND column_name IN ('file_path', 'file_type', 'file_size')
ORDER BY column_name;

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. Users can upload prescription photos with medications
-- 2. File metadata is stored in the medications table
-- 3. File path can be used to retrieve the file from storage
-- ============================================
