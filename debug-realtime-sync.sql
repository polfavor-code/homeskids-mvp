-- Debug script for realtime home sync issues
-- Run these queries in Supabase SQL Editor

-- 1. Check if children table has current_home_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'children' 
AND column_name = 'current_home_id';

-- 2. Check if realtime is enabled for children tablea
SELECT * 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'children';

-- 3. Check all Emma records and their current_home_id
SELECT c.id, c.name, c.current_home_id, h.name as current_home_name
FROM children c
LEFT JOIN homes h ON c.current_home_id = h.id
WHERE c.name ILIKE '%emma%';

-- 4. Check child_access for Emma - who has access?
SELECT 
    c.id as child_id,
    c.name as child_name,
    ca.user_id,
    p.name as user_name,
    ca.role_type,
    ca.access_level
FROM children c
JOIN child_access ca ON c.id = ca.child_id
JOIN profiles p ON ca.user_id = p.id
WHERE c.name ILIKE '%emma%'
ORDER BY c.id, p.name;

-- 5. Check if there are DUPLICATE Emma records (different IDs, same name)
SELECT name, COUNT(*) as count, ARRAY_AGG(id) as child_ids
FROM children
WHERE name ILIKE '%emma%'
GROUP BY name
HAVING COUNT(*) > 1;

-- 6. Check RLS policies on children table
SELECT polname, polcmd, polroles, polqual, polwithcheck
FROM pg_policies
WHERE tablename = 'children';

-- 7. If you need to enable realtime for children table:
-- ALTER PUBLICATION supabase_realtime ADD TABLE children;

-- 8. If you need to set REPLICA IDENTITY for realtime updates to include old values:
-- ALTER TABLE children REPLICA IDENTITY FULL;
