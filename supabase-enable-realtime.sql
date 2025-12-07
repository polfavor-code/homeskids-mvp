-- =====================================================
-- ENABLE REALTIME FOR INSTANT SYNC BETWEEN PARENTS
-- =====================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- IMPORTANT: You also need to enable Realtime in the Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Under "supabase_realtime" publication, click on it
-- 3. Toggle ON the "items" table (and any other tables you want)
--
-- OR just run this SQL which does the same thing:

-- Enable realtime for the items table
ALTER PUBLICATION supabase_realtime ADD TABLE items;

-- =====================================================
-- VERIFY IT WORKED
-- =====================================================
-- Run this query to confirm items table is in the publication:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- You should see "items" in the results.

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- If you get "relation already exists" error, the table is already added.
--
-- If realtime still doesn't work:
-- 1. Check browser console for "Realtime subscription status: SUBSCRIBED"
-- 2. If you see "CHANNEL_ERROR", check your Supabase project settings
-- 3. Make sure your Supabase project has Realtime enabled (it's on by default)
--
-- To remove and re-add (if needed):
-- ALTER PUBLICATION supabase_realtime DROP TABLE items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE items;
