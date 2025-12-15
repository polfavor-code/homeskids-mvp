-- ============================================
-- HOMES.KIDS: COMPLETE DATABASE RESET
-- ============================================
-- WARNING: This deletes ALL data from ALL tables
-- Run this in your Supabase SQL editor for a fresh start
-- ============================================

DO $$
BEGIN
    -- Disable triggers temporarily to avoid FK constraint issues
    SET session_replication_role = 'replica';

    -- ============================================
    -- CALENDAR TABLES (delete first due to FK dependencies)
    -- ============================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_notifications') THEN
        DELETE FROM calendar_notifications;
        RAISE NOTICE 'Cleared calendar_notifications';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        DELETE FROM calendar_events;
        RAISE NOTICE 'Cleared calendar_events';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_event_mappings') THEN
        DELETE FROM calendar_event_mappings;
        RAISE NOTICE 'Cleared calendar_event_mappings';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ics_sources') THEN
        DELETE FROM ics_sources;
        RAISE NOTICE 'Cleared ics_sources';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_sources') THEN
        DELETE FROM external_calendar_sources;
        RAISE NOTICE 'Cleared external_calendar_sources';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_calendar_sources') THEN
        DELETE FROM google_calendar_sources;
        RAISE NOTICE 'Cleared google_calendar_sources';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_calendar_connections') THEN
        DELETE FROM google_calendar_connections;
        RAISE NOTICE 'Cleared google_calendar_connections';
    END IF;

    -- ============================================
    -- V2 TABLES (child-centric model)
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'item_transfer_requests') THEN
        DELETE FROM item_transfer_requests;
        RAISE NOTICE 'Cleared item_transfer_requests';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items_v2') THEN
        DELETE FROM items_v2;
        RAISE NOTICE 'Cleared items_v2';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_space_contacts') THEN
        DELETE FROM child_space_contacts;
        RAISE NOTICE 'Cleared child_space_contacts';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_space_access') THEN
        DELETE FROM child_space_access;
        RAISE NOTICE 'Cleared child_space_access';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_spaces') THEN
        DELETE FROM child_spaces;
        RAISE NOTICE 'Cleared child_spaces';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_permission_overrides') THEN
        DELETE FROM child_permission_overrides;
        RAISE NOTICE 'Cleared child_permission_overrides';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_access') THEN
        DELETE FROM child_access;
        RAISE NOTICE 'Cleared child_access';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_guardians') THEN
        DELETE FROM child_guardians;
        RAISE NOTICE 'Cleared child_guardians';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_stays') THEN
        DELETE FROM child_stays;
        RAISE NOTICE 'Cleared child_stays';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'home_memberships') THEN
        DELETE FROM home_memberships;
        RAISE NOTICE 'Cleared home_memberships';
    END IF;

    -- ============================================
    -- V1 TABLES (legacy - may still have data)
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items') THEN
        DELETE FROM items;
        RAISE NOTICE 'Cleared items';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_home_item_views') THEN
        DELETE FROM user_home_item_views;
        RAISE NOTICE 'Cleared user_home_item_views';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'home_access') THEN
        DELETE FROM home_access;
        RAISE NOTICE 'Cleared home_access';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites') THEN
        DELETE FROM invites;
        RAISE NOTICE 'Cleared invites';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_essentials') THEN
        DELETE FROM bag_essentials;
        RAISE NOTICE 'Cleared bag_essentials';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bag_transfers') THEN
        DELETE FROM bag_transfers;
        RAISE NOTICE 'Cleared bag_transfers';
    END IF;

    -- ============================================
    -- HEALTH TABLES
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allergies') THEN
        DELETE FROM allergies;
        RAISE NOTICE 'Cleared allergies';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medications') THEN
        DELETE FROM medications;
        RAISE NOTICE 'Cleared medications';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diet_preferences') THEN
        DELETE FROM diet_preferences;
        RAISE NOTICE 'Cleared diet_preferences';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dietary_needs') THEN
        DELETE FROM dietary_needs;
        RAISE NOTICE 'Cleared dietary_needs';
    END IF;

    -- ============================================
    -- DOCUMENTS TABLE
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        DELETE FROM documents;
        RAISE NOTICE 'Cleared documents';
    END IF;

    -- ============================================
    -- CONTACTS TABLE
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        DELETE FROM contacts;
        RAISE NOTICE 'Cleared contacts';
    END IF;

    -- ============================================
    -- CHILDREN TABLES (clear before homes)
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children_v2') THEN
        DELETE FROM children_v2;
        RAISE NOTICE 'Cleared children_v2';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children') THEN
        DELETE FROM children;
        RAISE NOTICE 'Cleared children';
    END IF;

    -- ============================================
    -- HOMES TABLES
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homes_v2') THEN
        DELETE FROM homes_v2;
        RAISE NOTICE 'Cleared homes_v2';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homes') THEN
        DELETE FROM homes;
        RAISE NOTICE 'Cleared homes';
    END IF;

    -- ============================================
    -- FAMILY TABLES (legacy)
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_members') THEN
        DELETE FROM family_members;
        RAISE NOTICE 'Cleared family_members';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'families') THEN
        DELETE FROM families;
        RAISE NOTICE 'Cleared families';
    END IF;

    -- ============================================
    -- PROFILES (user data - clear last)
    -- ============================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DELETE FROM profiles;
        RAISE NOTICE 'Cleared profiles';
    END IF;

    -- Re-enable triggers
    SET session_replication_role = 'origin';

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DATABASE RESET COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: You must also delete auth users!';
    RAISE NOTICE 'Go to: Supabase Dashboard > Authentication > Users';
    RAISE NOTICE 'Select all users and delete them.';
    RAISE NOTICE '';
    RAISE NOTICE 'Then you can sign up fresh with your accounts.';
    RAISE NOTICE '============================================';

END $$;
