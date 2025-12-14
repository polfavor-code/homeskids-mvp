-- ============================================
-- HOMES.KIDS V2: CHILD-CENTRIC PERMISSIONS SCHEMA
-- Migration 004: Seed Script for Local/Dev
-- ============================================
-- Creates test data:
-- Users: Uses EXISTING profiles from your database
-- Children: June, Elodie
-- Homes: DaddyHome, MommyHome, PatrickHome
--
-- Verifies:
-- - Daddy can read June items at PatrickHome
-- - Daddy cannot read Elodie items anywhere
-- - Daddy can see responsible adults for June at PatrickHome
-- ============================================

-- ============================================
-- IMPORTANT: This script uses EXISTING users!
-- ============================================
-- Since profiles has a foreign key to auth.users, we cannot
-- insert fake users. This script will:
-- 1. Use the first 5 profiles in your database as test users
-- 2. Assign them roles (Daddy, Mommy, Patrick, Nanny, Grandma)
--
-- If you have fewer than 5 users, create more accounts first.
-- ============================================

DO $$
DECLARE
    -- Users - will be populated from existing profiles
    v_daddy_id UUID;
    v_mommy_id UUID;
    v_patrick_id UUID;
    v_nanny_sarah_id UUID;
    v_grandma_id UUID;
    v_user_count INTEGER;

    -- Children (these are new v2 tables, so we can use fixed UUIDs)
    v_june_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_elodie_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    -- Homes (new v2 tables)
    v_daddy_home_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd01';
    v_mommy_home_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd02';
    v_patrick_home_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd03';

    -- Child Spaces
    v_june_daddy_home_id UUID;
    v_june_mommy_home_id UUID;
    v_june_patrick_home_id UUID;
    v_elodie_mommy_home_id UUID;
    v_elodie_patrick_home_id UUID;

BEGIN
    -- ============================================
    -- 1. GET EXISTING USERS FROM PROFILES
    -- ============================================

    -- Count existing profiles
    SELECT COUNT(*) INTO v_user_count FROM profiles;

    IF v_user_count < 1 THEN
        RAISE EXCEPTION 'No profiles found! Create at least 1 user account first.';
    END IF;

    -- Get existing user IDs (use same user for all roles if we don't have enough)
    SELECT id INTO v_daddy_id FROM profiles ORDER BY created_at LIMIT 1;
    SELECT id INTO v_mommy_id FROM profiles ORDER BY created_at LIMIT 1 OFFSET LEAST(1, v_user_count - 1);
    SELECT id INTO v_patrick_id FROM profiles ORDER BY created_at LIMIT 1 OFFSET LEAST(2, v_user_count - 1);
    SELECT id INTO v_nanny_sarah_id FROM profiles ORDER BY created_at LIMIT 1 OFFSET LEAST(3, v_user_count - 1);
    SELECT id INTO v_grandma_id FROM profiles ORDER BY created_at LIMIT 1 OFFSET LEAST(4, v_user_count - 1);

    RAISE NOTICE 'Using existing profiles:';
    RAISE NOTICE '  Daddy: %', v_daddy_id;
    RAISE NOTICE '  Mommy: %', v_mommy_id;
    RAISE NOTICE '  Patrick: %', v_patrick_id;
    RAISE NOTICE '  Nanny: %', v_nanny_sarah_id;
    RAISE NOTICE '  Grandma: %', v_grandma_id;

    IF v_user_count < 3 THEN
        RAISE NOTICE 'WARNING: Only % users found. Some roles will share the same user.', v_user_count;
        RAISE NOTICE 'Create more user accounts for a proper multi-user test.';
    END IF;

    -- ============================================
    -- 2. CREATE HOMES
    -- ============================================

    INSERT INTO homes_v2 (id, name, address, created_by)
    VALUES
        (v_daddy_home_id, 'DaddyHome', '123 Father Street, Dadville, CA 90210', v_daddy_id),
        (v_mommy_home_id, 'MommyHome', '456 Mother Avenue, Momtown, CA 90211', v_mommy_id),
        (v_patrick_home_id, 'PatrickHome', '789 Step Road, Familyville, CA 90212', v_patrick_id)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address;

    RAISE NOTICE 'Created homes';

    -- ============================================
    -- 3. CREATE HOME MEMBERSHIPS
    -- ============================================

    INSERT INTO home_memberships (home_id, user_id, is_home_admin)
    VALUES
        -- DaddyHome: Daddy is admin
        (v_daddy_home_id, v_daddy_id, TRUE),

        -- MommyHome: Mommy is admin, Patrick can be member
        (v_mommy_home_id, v_mommy_id, TRUE),
        (v_mommy_home_id, v_patrick_id, FALSE),

        -- PatrickHome: Patrick is admin, Mommy can be member
        (v_patrick_home_id, v_patrick_id, TRUE),
        (v_patrick_home_id, v_mommy_id, FALSE)
    ON CONFLICT (home_id, user_id) DO UPDATE SET
        is_home_admin = EXCLUDED.is_home_admin;

    RAISE NOTICE 'Created home memberships';

    -- ============================================
    -- 4. CREATE CHILDREN
    -- ============================================

    INSERT INTO children_v2 (id, name, dob, created_by)
    VALUES
        (v_june_id, 'June', '2018-06-15', v_mommy_id),
        (v_elodie_id, 'Elodie', '2020-03-22', v_mommy_id)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        dob = EXCLUDED.dob;

    RAISE NOTICE 'Created children';

    -- ============================================
    -- 5. CREATE CHILD GUARDIANS
    -- ============================================
    -- June: Mommy (parent), Daddy (parent), Patrick (stepparent)
    -- Elodie: Mommy (parent), Patrick (parent)

    INSERT INTO child_guardians (child_id, user_id, guardian_role)
    VALUES
        -- June's guardians
        (v_june_id, v_mommy_id, 'parent'),
        (v_june_id, v_daddy_id, 'parent'),
        (v_june_id, v_patrick_id, 'stepparent'),

        -- Elodie's guardians (Daddy is NOT a guardian!)
        (v_elodie_id, v_mommy_id, 'parent'),
        (v_elodie_id, v_patrick_id, 'parent')
    ON CONFLICT (child_id, user_id) DO UPDATE SET
        guardian_role = EXCLUDED.guardian_role;

    RAISE NOTICE 'Created child guardians (triggers will auto-create child_access and permissions)';

    -- ============================================
    -- 6. CREATE CHILD SPACES
    -- ============================================
    -- June stays at: DaddyHome, MommyHome, PatrickHome
    -- Elodie stays at: MommyHome, PatrickHome (NOT DaddyHome)

    INSERT INTO child_spaces (home_id, child_id)
    VALUES
        -- June's child_spaces
        (v_daddy_home_id, v_june_id),
        (v_mommy_home_id, v_june_id),
        (v_patrick_home_id, v_june_id),

        -- Elodie's child_spaces (no DaddyHome!)
        (v_mommy_home_id, v_elodie_id),
        (v_patrick_home_id, v_elodie_id)
    ON CONFLICT (home_id, child_id) DO NOTHING;

    -- Get the child_space IDs
    SELECT id INTO v_june_daddy_home_id FROM child_spaces WHERE home_id = v_daddy_home_id AND child_id = v_june_id;
    SELECT id INTO v_june_mommy_home_id FROM child_spaces WHERE home_id = v_mommy_home_id AND child_id = v_june_id;
    SELECT id INTO v_june_patrick_home_id FROM child_spaces WHERE home_id = v_patrick_home_id AND child_id = v_june_id;
    SELECT id INTO v_elodie_mommy_home_id FROM child_spaces WHERE home_id = v_mommy_home_id AND child_id = v_elodie_id;
    SELECT id INTO v_elodie_patrick_home_id FROM child_spaces WHERE home_id = v_patrick_home_id AND child_id = v_elodie_id;

    RAISE NOTICE 'Created child spaces';

    -- ============================================
    -- 7. ADD HELPER: Nanny Sarah for June
    -- ============================================

    -- Add Sarah as nanny helper for June
    PERFORM apply_helper_preset(v_june_id, v_nanny_sarah_id, 'nanny');

    -- Give Sarah access to June at MommyHome and PatrickHome
    PERFORM grant_child_space_access(v_june_mommy_home_id, v_nanny_sarah_id, NULL, FALSE);
    PERFORM grant_child_space_access(v_june_patrick_home_id, v_nanny_sarah_id, NULL, FALSE);

    RAISE NOTICE 'Added Nanny Sarah for June';

    -- ============================================
    -- 8. ADD HELPER: Grandma for both children
    -- ============================================

    -- Add Grandma as family_member helper for June
    PERFORM apply_helper_preset(v_june_id, v_grandma_id, 'family_member');
    PERFORM grant_child_space_access(v_june_mommy_home_id, v_grandma_id, NULL, FALSE);

    -- Add Grandma as family_member helper for Elodie
    PERFORM apply_helper_preset(v_elodie_id, v_grandma_id, 'family_member');
    PERFORM grant_child_space_access(v_elodie_mommy_home_id, v_grandma_id, NULL, FALSE);

    RAISE NOTICE 'Added Grandma as family_member';

    -- ============================================
    -- 9. CREATE CHILD SPACE CONTACTS
    -- ============================================
    -- Responsible adults visible per child_space

    -- June at DaddyHome: Daddy is visible
    INSERT INTO child_space_contacts (child_space_id, user_id, share_phone, share_email, share_whatsapp, note)
    VALUES (v_june_daddy_home_id, v_daddy_id, TRUE, TRUE, FALSE, 'Primary contact at DaddyHome')
    ON CONFLICT (child_space_id, user_id) DO NOTHING;

    -- June at MommyHome: Mommy is visible
    INSERT INTO child_space_contacts (child_space_id, user_id, share_phone, share_email, share_whatsapp, note)
    VALUES (v_june_mommy_home_id, v_mommy_id, TRUE, TRUE, FALSE, 'Primary contact at MommyHome')
    ON CONFLICT (child_space_id, user_id) DO NOTHING;

    -- June at PatrickHome: Patrick and Mommy are visible
    INSERT INTO child_space_contacts (child_space_id, user_id, share_phone, share_email, share_whatsapp, share_note, note)
    VALUES
        (v_june_patrick_home_id, v_patrick_id, TRUE, TRUE, TRUE, TRUE, 'Usually home in evenings'),
        (v_june_patrick_home_id, v_mommy_id, TRUE, TRUE, FALSE, FALSE, NULL)
    ON CONFLICT (child_space_id, user_id) DO NOTHING;

    -- Elodie at MommyHome
    INSERT INTO child_space_contacts (child_space_id, user_id, share_phone, share_email, share_whatsapp, note)
    VALUES (v_elodie_mommy_home_id, v_mommy_id, TRUE, TRUE, FALSE, 'Primary contact')
    ON CONFLICT (child_space_id, user_id) DO NOTHING;

    -- Elodie at PatrickHome
    INSERT INTO child_space_contacts (child_space_id, user_id, share_phone, share_email, share_whatsapp, note)
    VALUES (v_elodie_patrick_home_id, v_patrick_id, TRUE, TRUE, TRUE, 'Primary contact')
    ON CONFLICT (child_space_id, user_id) DO NOTHING;

    RAISE NOTICE 'Created child space contacts';

    -- ============================================
    -- 10. CREATE ITEMS
    -- ============================================

    -- June's items at various homes
    INSERT INTO items_v2 (child_space_id, name, category, status, created_by)
    VALUES
        -- June at DaddyHome
        (v_june_daddy_home_id, 'June''s Purple Backpack', 'bags', 'at_home', v_daddy_id),
        (v_june_daddy_home_id, 'June''s Teddy Bear', 'toys', 'at_home', v_daddy_id),

        -- June at MommyHome
        (v_june_mommy_home_id, 'June''s Pink Raincoat', 'clothing', 'at_home', v_mommy_id),
        (v_june_mommy_home_id, 'June''s Homework Folder', 'school', 'in_bag', v_mommy_id),

        -- June at PatrickHome
        (v_june_patrick_home_id, 'June''s Art Supplies', 'toys', 'at_home', v_patrick_id),
        (v_june_patrick_home_id, 'June''s Swimming Goggles', 'sports', 'at_home', v_patrick_id);

    -- Elodie's items (Daddy should NOT see these!)
    INSERT INTO items_v2 (child_space_id, name, category, status, created_by)
    VALUES
        -- Elodie at MommyHome
        (v_elodie_mommy_home_id, 'Elodie''s Blankie', 'comfort', 'at_home', v_mommy_id),
        (v_elodie_mommy_home_id, 'Elodie''s Sippy Cup', 'essentials', 'at_home', v_mommy_id),

        -- Elodie at PatrickHome
        (v_elodie_patrick_home_id, 'Elodie''s Doll', 'toys', 'at_home', v_patrick_id),
        (v_elodie_patrick_home_id, 'Elodie''s Stroller Toy', 'toys', 'at_home', v_patrick_id);

    RAISE NOTICE 'Created items';

    -- ============================================
    -- 11. CREATE CHILD STAYS (SCHEDULE)
    -- ============================================

    INSERT INTO child_stays (child_id, home_id, start_at, end_at, created_by)
    VALUES
        -- June's schedule
        (v_june_id, v_daddy_home_id,
            NOW() + INTERVAL '0 days',
            NOW() + INTERVAL '3 days',
            v_daddy_id),
        (v_june_id, v_mommy_home_id,
            NOW() + INTERVAL '3 days',
            NOW() + INTERVAL '7 days',
            v_mommy_id),
        (v_june_id, v_patrick_home_id,
            NOW() + INTERVAL '7 days',
            NOW() + INTERVAL '10 days',
            v_patrick_id),

        -- Elodie's schedule (no DaddyHome)
        (v_elodie_id, v_mommy_home_id,
            NOW() + INTERVAL '0 days',
            NOW() + INTERVAL '5 days',
            v_mommy_id),
        (v_elodie_id, v_patrick_home_id,
            NOW() + INTERVAL '5 days',
            NOW() + INTERVAL '10 days',
            v_patrick_id);

    RAISE NOTICE 'Created child stays (schedule)';

    RAISE NOTICE '============================================';
    RAISE NOTICE 'SEED DATA COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Users created: Daddy, Mommy, Patrick, Nanny Sarah, Grandma';
    RAISE NOTICE 'Children created: June, Elodie';
    RAISE NOTICE 'Homes created: DaddyHome, MommyHome, PatrickHome';
    RAISE NOTICE '';
    RAISE NOTICE 'Test scenarios:';
    RAISE NOTICE '- Daddy can see June (guardian)';
    RAISE NOTICE '- Daddy CANNOT see Elodie (no access)';
    RAISE NOTICE '- Daddy can see June items at PatrickHome';
    RAISE NOTICE '- Daddy can see Patrick as contact for June at PatrickHome';
    RAISE NOTICE '- Nanny Sarah can see June items at MommyHome and PatrickHome';
    RAISE NOTICE '- Grandma can see both children at MommyHome only';

END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after the seed script to verify data

-- 1. Show all guardian assignments
SELECT '1. Guardian assignments' AS test,
       p.name AS user_name,
       p.label AS user_label,
       c.name AS child_name,
       cg.guardian_role
FROM child_guardians cg
JOIN profiles p ON p.id = cg.user_id
JOIN children_v2 c ON c.id = cg.child_id
ORDER BY c.name, cg.guardian_role;

-- 2. Show all child_access entries (who can see which child)
SELECT '2. Child access entries' AS test,
       p.name AS user_name,
       p.label AS user_label,
       c.name AS child_name,
       ca.role_type,
       ca.helper_type,
       ca.access_level
FROM child_access ca
JOIN profiles p ON p.id = ca.user_id
JOIN children_v2 c ON c.id = ca.child_id
ORDER BY c.name, ca.role_type DESC, p.name;

-- 3. Show child_spaces (which child is at which home)
SELECT '3. Child spaces' AS test,
       c.name AS child_name,
       h.name AS home_name
FROM child_spaces cs
JOIN children_v2 c ON c.id = cs.child_id
JOIN homes_v2 h ON h.id = cs.home_id
ORDER BY c.name, h.name;

-- 4. Show June's items at PatrickHome
SELECT '4. June items at PatrickHome' AS test,
       i.name AS item_name,
       i.category,
       i.status
FROM items_v2 i
JOIN child_spaces cs ON cs.id = i.child_space_id
JOIN children_v2 c ON c.id = cs.child_id
JOIN homes_v2 h ON h.id = cs.home_id
WHERE c.name = 'June' AND h.name = 'PatrickHome';

-- 5. Show responsible adults for June at PatrickHome
SELECT '5. June contacts at PatrickHome' AS test,
       p.name,
       p.label,
       CASE WHEN csc.share_phone THEN p.phone ELSE '[hidden]' END AS phone,
       CASE WHEN csc.share_note THEN csc.note ELSE '[hidden]' END AS note
FROM child_space_contacts csc
JOIN profiles p ON p.id = csc.user_id
JOIN child_spaces cs ON cs.id = csc.child_space_id
JOIN children_v2 c ON c.id = cs.child_id
JOIN homes_v2 h ON h.id = cs.home_id
WHERE c.name = 'June' AND h.name = 'PatrickHome';

-- 6. Show Elodie's items (the first guardian should NOT have access)
SELECT '6. Elodie items (first user should NOT see via RLS)' AS test,
       i.name AS item_name,
       h.name AS home_name
FROM items_v2 i
JOIN child_spaces cs ON cs.id = i.child_space_id
JOIN children_v2 c ON c.id = cs.child_id
JOIN homes_v2 h ON h.id = cs.home_id
WHERE c.name = 'Elodie';

-- 7. Permission overrides
SELECT '7. Permission overrides' AS test,
       p.name AS user_name,
       c.name AS child_name,
       cpo.can_view_calendar,
       cpo.can_edit_calendar,
       cpo.can_view_items,
       cpo.can_edit_items,
       cpo.can_manage_helpers
FROM child_permission_overrides cpo
JOIN profiles p ON p.id = cpo.user_id
JOIN children_v2 c ON c.id = cpo.child_id
ORDER BY c.name, p.name;

-- ============================================
-- DONE: Seed Data Created
-- ============================================
