-- ============================================
-- HOMES.KIDS V2: Refinements Migration
-- Migration 006: Terminology, purchased_by, transfer requests
-- ============================================
-- This migration applies the clarifications:
-- A) Terminology: "People you can contact here" (not "responsible adults")
-- G) Items: Add purchased_by for item attribution
-- G) Items: Add item_transfer_requests for minimal transfer workflow
-- ============================================

-- ============================================
-- A) TERMINOLOGY UPDATE (Comments only, no schema change)
-- ============================================
-- Update comments to reflect new terminology

COMMENT ON TABLE child_space_contacts IS 'People you can contact about a child at a specific home. Contact fields shown based on share_* flags.';
COMMENT ON COLUMN child_space_contacts.note IS 'Optional note (e.g., "Available 9-5 only")';

-- ============================================
-- G) ITEMS: Add purchased_by field
-- ============================================
-- Who bought the item. Items still belong to the child, not the buyer.
-- A user can see items where purchased_by = their user_id even if item is at another home.

ALTER TABLE items_v2
ADD COLUMN IF NOT EXISTS purchased_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_v2_purchased_by ON items_v2(purchased_by);

COMMENT ON COLUMN items_v2.purchased_by IS 'Who purchased this item. User can see items they bought even at other homes.';

-- ============================================
-- G) ITEM TRANSFER REQUESTS
-- ============================================
-- Minimal v1: Request to move an item to a different home or "bring next handover"

CREATE TABLE IF NOT EXISTS item_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items_v2(id) ON DELETE CASCADE,
    -- Who is requesting the transfer
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Target destination (optional - null means "bring to next handover")
    target_home_id UUID REFERENCES homes_v2(id) ON DELETE SET NULL,
    -- Status of the request
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'canceled')),
    -- Optional message
    message TEXT,
    -- When to bring (optional)
    requested_for_date DATE,
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_item_transfer_requests_item_id ON item_transfer_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_item_transfer_requests_requested_by ON item_transfer_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_item_transfer_requests_status ON item_transfer_requests(status);

COMMENT ON TABLE item_transfer_requests IS 'Requests to transfer items between homes. Minimal v1 workflow.';
COMMENT ON COLUMN item_transfer_requests.target_home_id IS 'Target home, or NULL for "bring to next handover"';
COMMENT ON COLUMN item_transfer_requests.message IS 'Optional message like "Please bring June blue jacket to Ellis home"';
COMMENT ON COLUMN item_transfer_requests.requested_for_date IS 'Optional: when the item is needed by';

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_item_transfer_requests_updated_at ON item_transfer_requests;
CREATE TRIGGER update_item_transfer_requests_updated_at
    BEFORE UPDATE ON item_transfer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- F) BAGS: Ensure bags are child-owned via items_v2.child_space_id
-- ============================================
-- Bags are already child-owned through child_space_id (which links to child_id).
-- No schema changes needed, but adding a comment for clarity.

COMMENT ON TABLE items_v2 IS 'Items belonging to a child at a specific home. Bags are child-owned via child_space.child_id.';

-- ============================================
-- RLS for item_transfer_requests
-- ============================================
-- Users can see transfer requests for items they have access to

ALTER TABLE item_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Can see requests for items you have access to (via child_access)
CREATE POLICY "Users can view transfer requests for accessible items"
    ON item_transfer_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM items_v2 i
            JOIN child_spaces cs ON cs.id = i.child_space_id
            JOIN child_access ca ON ca.child_id = cs.child_id
            WHERE i.id = item_transfer_requests.item_id
            AND ca.user_id = auth.uid()
        )
    );

-- Policy: Can create requests if you have access to the child
CREATE POLICY "Users can create transfer requests for accessible items"
    ON item_transfer_requests
    FOR INSERT
    WITH CHECK (
        requested_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM items_v2 i
            JOIN child_spaces cs ON cs.id = i.child_space_id
            JOIN child_access ca ON ca.child_id = cs.child_id
            WHERE i.id = item_transfer_requests.item_id
            AND ca.user_id = auth.uid()
        )
    );

-- Policy: Can update your own requests (cancel) or respond if guardian
CREATE POLICY "Users can update transfer requests"
    ON item_transfer_requests
    FOR UPDATE
    USING (
        -- Creator can update (cancel)
        requested_by = auth.uid()
        OR
        -- Guardian of the child can respond
        EXISTS (
            SELECT 1 FROM items_v2 i
            JOIN child_spaces cs ON cs.id = i.child_space_id
            JOIN child_access ca ON ca.child_id = cs.child_id
            WHERE i.id = item_transfer_requests.item_id
            AND ca.user_id = auth.uid()
            AND ca.role_type = 'guardian'
        )
    );

-- Policy: Only creator can delete
CREATE POLICY "Users can delete own transfer requests"
    ON item_transfer_requests
    FOR DELETE
    USING (requested_by = auth.uid());

-- ============================================
-- Updated RLS for items_v2: Allow seeing purchased_by items
-- ============================================
-- Drop and recreate the select policy to include purchased_by visibility

DROP POLICY IF EXISTS "Users can view items for accessible children" ON items_v2;

CREATE POLICY "Users can view items for accessible children or purchased by them"
    ON items_v2
    FOR SELECT
    USING (
        -- Standard: item is in a child_space the user has access to
        EXISTS (
            SELECT 1 FROM child_spaces cs
            JOIN child_access ca ON ca.child_id = cs.child_id
            WHERE cs.id = items_v2.child_space_id
            AND ca.user_id = auth.uid()
        )
        OR
        -- Additional: user purchased this item (can always see items they bought)
        purchased_by = auth.uid()
    );

-- ============================================
-- DONE: Refinements Applied
-- ============================================
