-- Enable Realtime for children table (for home switch alerts)
-- Run this in Supabase SQL Editor

ALTER PUBLICATION supabase_realtime ADD TABLE children;

-- Verify it worked:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
