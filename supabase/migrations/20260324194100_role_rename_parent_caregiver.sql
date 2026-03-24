-- Migration: Permissions model update
-- Keep existing role names: guardian, helper
-- Add new permission functions and invite columns
--
-- Core principle:
-- - Guardian = child/pet-centric (follows child/pet globally across ALL homes)
-- - Helper = home-centric (scoped to specific home with explicit selection)

-- ============================================
-- 1. Update invites table for invite_type
-- ============================================

-- Add invite_type column to distinguish guardian vs helper invites
ALTER TABLE invites ADD COLUMN IF NOT EXISTS invite_type TEXT
  DEFAULT 'helper' CHECK (invite_type IN ('guardian', 'helper'));

-- Add selected_child_ids and selected_pet_ids for explicit selection
ALTER TABLE invites ADD COLUMN IF NOT EXISTS selected_child_ids UUID[] DEFAULT '{}';
ALTER TABLE invites ADD COLUMN IF NOT EXISTS selected_pet_ids UUID[] DEFAULT '{}';

-- ============================================
-- 2. Add new permission helper functions
-- ============================================

-- Check if user is a caregiver (helper) with access to child at specific home only
CREATE OR REPLACE FUNCTION is_helper_at_home(p_child_id UUID, p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_space_access csa
    JOIN child_spaces cs ON cs.id = csa.child_space_id
    JOIN child_access ca ON ca.child_id = cs.child_id AND ca.user_id = csa.user_id
    WHERE cs.child_id = p_child_id
      AND cs.home_id = p_home_id
      AND csa.user_id = p_user_id
      AND ca.role_type = 'helper'
  );
$$;

-- Check if user can manage household settings (guardians only)
CREATE OR REPLACE FUNCTION can_manage_household(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Only guardians can manage household (not helpers)
  SELECT is_guardian(p_child_id, p_user_id);
$$;

-- ============================================
-- 3. Add comments for documentation
-- ============================================

COMMENT ON FUNCTION is_guardian IS 'Check if user is a guardian of the child (has full cross-home access)';
COMMENT ON FUNCTION is_helper_at_home IS 'Check if user is a helper with access to child at specific home only';
COMMENT ON FUNCTION can_manage_household IS 'Check if user can manage household settings (guardians only)';
