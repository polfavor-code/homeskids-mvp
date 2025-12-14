-- ============================================
-- HOMES.KIDS V2: Add packing columns to items_v2
-- Migration 005: Items Packing Support
-- ============================================

-- Add packing-related columns to items_v2
ALTER TABLE items_v2
ADD COLUMN IF NOT EXISTS is_requested_for_next_visit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_packed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_request_canceled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS packed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;

-- Add index for packing status queries
CREATE INDEX IF NOT EXISTS idx_items_v2_packing ON items_v2(is_requested_for_next_visit, is_packed);

COMMENT ON COLUMN items_v2.is_requested_for_next_visit IS 'Item requested to be packed for next home switch';
COMMENT ON COLUMN items_v2.is_packed IS 'Item has been packed in travel bag';
COMMENT ON COLUMN items_v2.is_request_canceled IS 'Request was canceled but item is still packed';
