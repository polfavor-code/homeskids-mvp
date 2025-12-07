-- =====================================================
-- ITEMS ALERTS FEATURE - Database Setup
-- =====================================================
-- Run this in Supabase SQL Editor to enable realtime item alerts
-- This adds tracking for who created items and when users last saw items

-- 1. Add created_by column to items table (tracks who added the item)
ALTER TABLE items ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create table to track when each user last saw items for each home
-- This is used for offline aggregation (showing "X items added while you were away")
CREATE TABLE IF NOT EXISTS user_home_item_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, home_id)
);

-- 3. Enable Row Level Security
ALTER TABLE user_home_item_views ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_home_item_views
-- Users can only see/update their own records
CREATE POLICY "Users can view own item view timestamps"
    ON user_home_item_views FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own item view timestamps"
    ON user_home_item_views FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own item view timestamps"
    ON user_home_item_views FOR UPDATE
    USING (user_id = auth.uid());

-- 5. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_home_item_views_user_home
    ON user_home_item_views(user_id, home_id);

CREATE INDEX IF NOT EXISTS idx_items_created_at
    ON items(created_at);

CREATE INDEX IF NOT EXISTS idx_items_created_by
    ON items(created_by);

CREATE INDEX IF NOT EXISTS idx_items_location_home_created
    ON items(location_home_id, created_at);

-- 6. Enable realtime on items table (if not already enabled)
-- This allows the app to receive instant updates when items are added
ALTER PUBLICATION supabase_realtime ADD TABLE items;

-- Note: If you get "relation already exists" error for the publication,
-- that means realtime is already enabled - which is fine!

-- =====================================================
-- VERIFY SETUP
-- =====================================================
-- Run these queries to verify the setup worked:
--
-- Check items table has new columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'items' AND column_name IN ('created_by', 'created_at');
--
-- Check user_home_item_views table exists:
-- SELECT * FROM user_home_item_views LIMIT 1;
--
-- Check realtime is enabled:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
