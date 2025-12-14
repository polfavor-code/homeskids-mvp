-- ============================================
-- HOMES.KIDS V2: Disable items_v2 RLS
-- Migration 010: Temporarily disable RLS for development
-- ============================================

-- Disable RLS on items_v2 (like other V2 tables during development)
ALTER TABLE items_v2 DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE
-- ============================================
