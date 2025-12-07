-- ============================================
-- BAG ESSENTIALS TABLE FOR HOMES.KIDS
-- ============================================
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create bag_essentials table
-- These are per-child default items that always go in the bag
-- NOT part of the request flow, just a reminder list for parents
CREATE TABLE IF NOT EXISTS bag_essentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bag_essentials_child_id ON bag_essentials(child_id);
CREATE INDEX IF NOT EXISTS idx_bag_essentials_position ON bag_essentials(child_id, position);

-- ============================================
-- DONE! Table created.
-- ============================================
-- RLS is disabled globally, so no policies needed.
-- ============================================
