-- Enable realtime for items table
-- Run this in Supabase SQL Editor

-- 1. Add items table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE items;

-- 2. Set REPLICA IDENTITY to FULL for complete old/new values in updates
ALTER TABLE items REPLICA IDENTITY FULL;

-- 3. Verify realtime is enabled
SELECT tablename, attnames 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'items';

-- 4. Also verify children table is still enabled
SELECT tablename, attnames 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('items', 'children');
