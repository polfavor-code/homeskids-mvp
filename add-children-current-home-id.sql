-- Add current_home_id column to children table for realtime home sync
-- Run this in Supabase SQL Editor

-- 1. Add the current_home_id column
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS current_home_id UUID REFERENCES homes(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_children_current_home ON children(current_home_id);

-- 3. Ensure realtime is enabled for children table
ALTER PUBLICATION supabase_realtime ADD TABLE children;

-- 4. Set REPLICA IDENTITY to FULL so realtime updates include old values
-- This is needed for the home switch alert to know the previous home
ALTER TABLE children REPLICA IDENTITY FULL;

-- 5. Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'children' 
AND column_name = 'current_home_id';

-- 6. Verify realtime is enabled
SELECT * 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'children';
