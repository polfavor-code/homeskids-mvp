-- ============================================
-- DIAGNOSE & FIX: Patrick connected to wrong June
-- ============================================
-- Patrick is seeing a different "June" child record than Mommy and Paul
-- This script will find duplicates and fix Patrick's access

-- ============================================
-- STEP 1: Find all "June" children and who has access
-- ============================================
SELECT 
    c.id as child_id,
    c.name as child_name,
    c.dob,
    c.avatar_url,
    c.created_at,
    u.email as user_email,
    ca.role_type,
    ca.access_level
FROM children c
LEFT JOIN child_access ca ON ca.child_id = c.id
LEFT JOIN auth.users u ON u.id = ca.user_id
WHERE c.name ILIKE '%june%'
ORDER BY c.created_at, u.email;

-- ============================================
-- STEP 2: Find which June has documents (the "real" one)
-- ============================================
SELECT 
    c.id as child_id,
    c.name,
    COUNT(d.id) as document_count,
    COUNT(i.id) as item_count
FROM children c
LEFT JOIN documents d ON d.child_id = c.id
LEFT JOIN child_spaces cs ON cs.child_id = c.id
LEFT JOIN items i ON i.child_space_id = cs.id
WHERE c.name ILIKE '%june%'
GROUP BY c.id, c.name;

-- ============================================
-- STEP 3: Find the "correct" June (the one with most data/oldest)
-- ============================================
-- The correct June should be the one that:
-- 1. Has documents/items, OR
-- 2. Has Mommy (Ellis) connected, OR  
-- 3. Was created first

-- ============================================
-- STEP 4: Fix Patrick's access - move to correct June
-- ============================================
DO $$
DECLARE
    v_patrick_id UUID;
    v_correct_june_id UUID;
    v_wrong_june_id UUID;
    v_mommy_id UUID;
BEGIN
    -- Find Patrick
    SELECT id INTO v_patrick_id 
    FROM auth.users 
    WHERE email ILIKE '%patrick%' 
    LIMIT 1;
    
    -- Find Mommy (Ellis)
    SELECT id INTO v_mommy_id 
    FROM auth.users 
    WHERE email ILIKE '%ellis%' OR email ILIKE '%mommy%'
    LIMIT 1;
    
    -- Find the June that Mommy has access to (this is the correct one)
    SELECT ca.child_id INTO v_correct_june_id
    FROM child_access ca
    JOIN children c ON c.id = ca.child_id
    WHERE ca.user_id = v_mommy_id
    AND c.name ILIKE '%june%'
    LIMIT 1;
    
    -- Find the June that Patrick currently has access to
    SELECT ca.child_id INTO v_wrong_june_id
    FROM child_access ca
    JOIN children c ON c.id = ca.child_id
    WHERE ca.user_id = v_patrick_id
    AND c.name ILIKE '%june%'
    LIMIT 1;
    
    RAISE NOTICE 'Patrick ID: %', v_patrick_id;
    RAISE NOTICE 'Mommy ID: %', v_mommy_id;
    RAISE NOTICE 'Correct June ID (Mommy''s): %', v_correct_june_id;
    RAISE NOTICE 'Wrong June ID (Patrick''s current): %', v_wrong_june_id;
    
    IF v_correct_june_id IS NULL THEN
        RAISE NOTICE 'ERROR: Could not find correct June (Mommy''s child)';
        RETURN;
    END IF;
    
    IF v_wrong_june_id = v_correct_june_id THEN
        RAISE NOTICE 'Patrick is already connected to the correct June!';
        RETURN;
    END IF;
    
    IF v_wrong_june_id IS NOT NULL THEN
        RAISE NOTICE 'Removing Patrick from wrong June...';
        
        -- Remove Patrick's access to wrong June
        DELETE FROM child_guardians WHERE user_id = v_patrick_id AND child_id = v_wrong_june_id;
        DELETE FROM child_permission_overrides WHERE user_id = v_patrick_id AND child_id = v_wrong_june_id;
        DELETE FROM child_access WHERE user_id = v_patrick_id AND child_id = v_wrong_june_id;
        
        -- Remove child_space_access for wrong June
        DELETE FROM child_space_access 
        WHERE user_id = v_patrick_id 
        AND child_space_id IN (SELECT id FROM child_spaces WHERE child_id = v_wrong_june_id);
        
        -- Remove home_memberships for wrong June's homes
        DELETE FROM home_memberships
        WHERE user_id = v_patrick_id
        AND home_id IN (SELECT home_id FROM child_spaces WHERE child_id = v_wrong_june_id);
    END IF;
    
    -- Add Patrick to correct June
    RAISE NOTICE 'Adding Patrick to correct June...';
    
    -- child_guardians
    INSERT INTO child_guardians (child_id, user_id, guardian_role)
    VALUES (v_correct_june_id, v_patrick_id, 'step_parent')
    ON CONFLICT (child_id, user_id) DO NOTHING;
    
    -- child_access
    INSERT INTO child_access (child_id, user_id, role_type, access_level)
    VALUES (v_correct_june_id, v_patrick_id, 'guardian', 'manage')
    ON CONFLICT (child_id, user_id) DO UPDATE SET 
        role_type = 'guardian', 
        access_level = 'manage';
    
    -- child_permission_overrides (full permissions)
    INSERT INTO child_permission_overrides (
        child_id, user_id,
        can_view_calendar, can_edit_calendar,
        can_view_items, can_edit_items,
        can_upload_photos, can_add_notes,
        can_view_contacts, can_manage_helpers
    ) VALUES (
        v_correct_june_id, v_patrick_id,
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
    )
    ON CONFLICT (child_id, user_id) DO UPDATE SET
        can_view_calendar = TRUE, can_edit_calendar = TRUE,
        can_view_items = TRUE, can_edit_items = TRUE,
        can_upload_photos = TRUE, can_add_notes = TRUE,
        can_view_contacts = TRUE, can_manage_helpers = TRUE;
    
    -- Add Patrick to correct June's child_spaces and homes
    INSERT INTO child_space_access (child_space_id, user_id)
    SELECT cs.id, v_patrick_id
    FROM child_spaces cs
    WHERE cs.child_id = v_correct_june_id
    ON CONFLICT (child_space_id, user_id) DO NOTHING;
    
    INSERT INTO home_memberships (home_id, user_id)
    SELECT cs.home_id, v_patrick_id
    FROM child_spaces cs
    WHERE cs.child_id = v_correct_june_id
    ON CONFLICT (home_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'SUCCESS: Patrick now connected to correct June!';
END $$;

-- ============================================
-- STEP 5: Verify the fix
-- ============================================
SELECT 
    'After fix' as status,
    c.id as child_id,
    c.name as child_name,
    u.email as user_email,
    ca.role_type
FROM children c
JOIN child_access ca ON ca.child_id = c.id
JOIN auth.users u ON u.id = ca.user_id
WHERE c.name ILIKE '%june%'
ORDER BY c.id, u.email;

-- ============================================
-- STEP 6: Clean up orphaned/duplicate June if exists
-- ============================================
-- Check if any June has no users connected and can be deleted
SELECT 
    c.id,
    c.name,
    c.created_at,
    (SELECT COUNT(*) FROM child_access ca WHERE ca.child_id = c.id) as user_count,
    (SELECT COUNT(*) FROM documents d WHERE d.child_id = c.id) as doc_count,
    (SELECT COUNT(*) FROM child_spaces cs JOIN items i ON i.child_space_id = cs.id WHERE cs.child_id = c.id) as item_count
FROM children c
WHERE c.name ILIKE '%june%';

-- Optional: Delete orphaned June (uncomment if safe)
-- DELETE FROM children 
-- WHERE name ILIKE '%june%' 
-- AND id NOT IN (SELECT DISTINCT child_id FROM child_access);
