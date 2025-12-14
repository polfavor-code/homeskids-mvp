-- ============================================
-- HOMES.KIDS V2: Invites Table
-- Migration 009: Create invites_v2 for child-centric model
-- ============================================

-- Create invites_v2 table for V2 child-centric invitations
CREATE TABLE IF NOT EXISTS invites_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

    -- Invitee info (filled in during onboarding by inviter)
    invitee_name TEXT,
    invitee_label TEXT,  -- What the child calls them
    invitee_role TEXT NOT NULL CHECK (invitee_role IN ('parent', 'step_parent', 'family_member', 'nanny', 'babysitter', 'family_friend', 'other')),

    -- What this invite grants access to
    child_id UUID REFERENCES children_v2(id) ON DELETE CASCADE,

    -- Home setup info
    has_own_home BOOLEAN DEFAULT true,  -- If false, invitee joins inviter's home
    home_id UUID REFERENCES homes_v2(id) ON DELETE SET NULL,  -- If has_own_home=false, this is the home they join

    -- Who created the invite
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id)
);

-- Index for looking up invites by token
CREATE INDEX IF NOT EXISTS idx_invites_v2_token ON invites_v2(token);
CREATE INDEX IF NOT EXISTS idx_invites_v2_child_id ON invites_v2(child_id);
CREATE INDEX IF NOT EXISTS idx_invites_v2_invited_by ON invites_v2(invited_by);

-- Temporarily disable RLS (like other V2 tables during development)
ALTER TABLE invites_v2 DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE
-- ============================================
