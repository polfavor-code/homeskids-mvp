-- ============================================
-- BAG TRANSFERS TABLES FOR HOMES.KIDS
-- ============================================
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create bag_transfers table
CREATE TABLE IF NOT EXISTS bag_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    from_home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    to_home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'packed', 'delivered', 'canceled')),
    packed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    packed_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes_untracked_items TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bag_transfer_items table (junction table)
CREATE TABLE IF NOT EXISTS bag_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_transfer_id UUID NOT NULL REFERENCES bag_transfers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(bag_transfer_id, item_id)
);

-- Add current_home_id to children table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'children' AND column_name = 'current_home_id'
    ) THEN
        ALTER TABLE children ADD COLUMN current_home_id UUID REFERENCES homes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add location_status to items table if not exists (for at_home, in_bag, lost etc)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'location_status'
    ) THEN
        ALTER TABLE items ADD COLUMN location_status TEXT DEFAULT 'at_home' CHECK (location_status IN ('at_home', 'in_bag', 'in_transit', 'lost'));
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bag_transfers_family_id ON bag_transfers(family_id);
CREATE INDEX IF NOT EXISTS idx_bag_transfers_child_id ON bag_transfers(child_id);
CREATE INDEX IF NOT EXISTS idx_bag_transfers_status ON bag_transfers(status);
CREATE INDEX IF NOT EXISTS idx_bag_transfers_from_home ON bag_transfers(from_home_id);
CREATE INDEX IF NOT EXISTS idx_bag_transfers_to_home ON bag_transfers(to_home_id);
CREATE INDEX IF NOT EXISTS idx_bag_transfer_items_transfer ON bag_transfer_items(bag_transfer_id);
CREATE INDEX IF NOT EXISTS idx_bag_transfer_items_item ON bag_transfer_items(item_id);
CREATE INDEX IF NOT EXISTS idx_children_current_home ON children(current_home_id);

-- Create updated_at trigger for bag_transfers
CREATE OR REPLACE FUNCTION update_bag_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bag_transfers_updated_at ON bag_transfers;
CREATE TRIGGER bag_transfers_updated_at
    BEFORE UPDATE ON bag_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_bag_transfers_updated_at();

-- ============================================
-- DONE! Tables created.
-- ============================================
