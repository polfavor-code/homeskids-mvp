-- Migration: Add created_by column to documents table for tracking who added documents
-- This enables real-time notifications when other caregivers add documents

-- 1. Add created_by column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

-- 3. Enable realtime for documents table (if not already enabled)
-- Check if table is already in the publication before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'documents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE documents;
    END IF;
END $$;

-- Verify the column was added
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'created_by';
