-- ============================================
-- HOMES.KIDS V2: FULL DATABASE RESET
-- ============================================
-- WARNING: This deletes ALL data from ALL tables
-- Run this to start fresh with a clean database
-- ============================================

DO $$
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = 'replica';

    -- V2 tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'item_transfer_requests') THEN
        DELETE FROM item_transfer_requests;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items_v2') THEN
        DELETE FROM items_v2;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_space_contacts') THEN
        DELETE FROM child_space_contacts;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_spaces') THEN
        DELETE FROM child_spaces;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_access') THEN
        DELETE FROM child_access;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children_v2') THEN
        DELETE FROM children_v2;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homes_v2') THEN
        DELETE FROM homes_v2;
    END IF;

    -- V1 tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items') THEN
        DELETE FROM items;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_home_item_views') THEN
        DELETE FROM user_home_item_views;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'home_access') THEN
        DELETE FROM home_access;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homes') THEN
        DELETE FROM homes;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children') THEN
        DELETE FROM children;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites') THEN
        DELETE FROM invites;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_members') THEN
        DELETE FROM family_members;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'families') THEN
        DELETE FROM families;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        DELETE FROM contacts;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        DELETE FROM documents;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allergies') THEN
        DELETE FROM allergies;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medications') THEN
        DELETE FROM medications;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diet_preferences') THEN
        DELETE FROM diet_preferences;
    END IF;

    -- User data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DELETE FROM profiles;
    END IF;

    -- Re-enable triggers
    SET session_replication_role = 'origin';
END $$;

-- ============================================
-- DONE - Database is now empty
-- ============================================
-- Next steps:
-- 1. Delete auth users from Supabase Dashboard > Authentication > Users
-- 2. Run all V2 migrations (001-007)
-- 3. Start fresh with onboarding
-- ============================================
