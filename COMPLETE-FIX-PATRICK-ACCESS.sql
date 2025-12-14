-- ============================================
-- COMPLETE FIX FOR PATRICK'S ACCESS TO JUNE
-- ============================================
-- This script will:
-- 1. Create the accept_invite function (bypasses RLS)
-- 2. Debug and fix Patrick's current access
-- 3. Mark Paul Somers invite as pending again
-- ============================================

-- ============================================
-- STEP 1: Create the accept_invite function
-- ============================================
CREATE OR REPLACE FUNCTION accept_invite(
    p_invite_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite RECORD;
    v_is_guardian BOOLEAN;
BEGIN
    SELECT * INTO v_invite FROM invites WHERE id = p_invite_id AND status = 'pending';
    
    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invite not found or already accepted');
    END IF;
    
    v_is_guardian := v_invite.invitee_role IN ('parent', 'step_parent');
    
    IF v_is_guardian THEN
        INSERT INTO child_guardians (child_id, user_id, guardian_role)
        VALUES (v_invite.child_id, p_user_id, v_invite.invitee_role)
        ON CONFLICT (child_id, user_id) DO NOTHING;
    END IF;
    
    INSERT INTO child_access (child_id, user_id, role_type, helper_type, access_level)
    VALUES (
        v_invite.child_id, p_user_id,
        CASE WHEN v_is_guardian THEN 'guardian' ELSE 'helper' END,
        CASE WHEN NOT v_is_guardian THEN v_invite.invitee_role ELSE NULL END,
        CASE WHEN v_is_guardian THEN 'manage' ELSE 'view' END
    )
    ON CONFLICT (child_id, user_id) DO UPDATE SET
        role_type = EXCLUDED.role_type, 
        helper_type = EXCLUDED.helper_type, 
        access_level = EXCLUDED.access_level;
    
    IF v_is_guardian THEN
        INSERT INTO child_permission_overrides (
            child_id, user_id,
            can_view_calendar, can_edit_calendar,
            can_view_items, can_edit_items,
            can_upload_photos, can_add_notes,
            can_view_contacts, can_manage_helpers
        ) VALUES (
            v_invite.child_id, p_user_id,
            TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
        )
        ON CONFLICT (child_id, user_id) DO UPDATE SET
            can_view_calendar = TRUE, can_edit_calendar = TRUE,
            can_view_items = TRUE, can_edit_items = TRUE,
            can_upload_photos = TRUE, can_add_notes = TRUE,
            can_view_contacts = TRUE, can_manage_helpers = TRUE;
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE, 
        'child_id', v_invite.child_id, 
        'is_guardian', v_is_guardian
    );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invite TO authenticated;

-- ============================================
-- STEP 2: Grant Patrick access to June NOW
-- ============================================
DO $$
DECLARE
    v_patrick_id UUID;
    v_june_id UUID;
BEGIN
    -- Find Patrick
    SELECT id INTO v_patrick_id 
    FROM auth.users 
    WHERE email ILIKE '%patrick%' 
    LIMIT 1;
    
    -- Find June
    SELECT id INTO v_june_id 
    FROM children 
    WHERE name ILIKE '%june%' 
    LIMIT 1;
    
    IF v_patrick_id IS NULL THEN
        RAISE NOTICE 'ERROR: Could not find Patrick in auth.users';
        RETURN;
    END IF;
    
    IF v_june_id IS NULL THEN
        RAISE NOTICE 'ERROR: Could not find June in children table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Patrick ID: %, June ID: %', v_patrick_id, v_june_id;
    
    -- Add to child_guardians
    INSERT INTO child_guardians (child_id, user_id, guardian_role)
    VALUES (v_june_id, v_patrick_id, 'step_parent')
    ON CONFLICT (child_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Added Patrick to child_guardians';
    
    -- Add to child_access
    INSERT INTO child_access (child_id, user_id, role_type, access_level)
    VALUES (v_june_id, v_patrick_id, 'guardian', 'manage')
    ON CONFLICT (child_id, user_id) DO UPDATE SET 
        role_type = 'guardian', 
        access_level = 'manage';
    
    RAISE NOTICE 'Added Patrick to child_access';
    
    -- Add permission overrides (full guardian permissions)
    INSERT INTO child_permission_overrides (
        child_id, user_id,
        can_view_calendar, can_edit_calendar,
        can_view_items, can_edit_items,
        can_upload_photos, can_add_notes,
        can_view_contacts, can_manage_helpers
    ) VALUES (
        v_june_id, v_patrick_id,
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
    )
    ON CONFLICT (child_id, user_id) DO UPDATE SET
        can_view_calendar = TRUE, can_edit_calendar = TRUE,
        can_view_items = TRUE, can_edit_items = TRUE,
        can_upload_photos = TRUE, can_add_notes = TRUE,
        can_view_contacts = TRUE, can_manage_helpers = TRUE;
    
    RAISE NOTICE 'Added Patrick permission overrides';
    RAISE NOTICE 'SUCCESS: Patrick now has full access to June';
END $$;

-- ============================================
-- STEP 3: Restore Paul Somers invite as pending
-- ============================================
UPDATE invites 
SET 
    status = 'pending',
    accepted_at = NULL,
    accepted_by = NULL
WHERE invitee_name ILIKE '%paul%somers%' 
  AND child_id IN (SELECT id FROM children WHERE name ILIKE '%june%');

-- ============================================
-- STEP 4: Verify the changes
-- ============================================
-- Check Patrick's access
SELECT 
    'Patrick child_access' as check_name,
    ca.role_type,
    ca.access_level,
    c.name as child_name
FROM child_access ca
JOIN children c ON c.id = ca.child_id
JOIN auth.users u ON u.id = ca.user_id
WHERE u.email ILIKE '%patrick%'
  AND c.name ILIKE '%june%';

-- Check Patrick's guardian status
SELECT 
    'Patrick guardian' as check_name,
    cg.guardian_role,
    c.name as child_name
FROM child_guardians cg
JOIN children c ON c.id = cg.child_id
JOIN auth.users u ON u.id = cg.user_id
WHERE u.email ILIKE '%patrick%'
  AND c.name ILIKE '%june%';

-- Check Patrick's permissions
SELECT 
    'Patrick permissions' as check_name,
    cpo.*
FROM child_permission_overrides cpo
JOIN children c ON c.id = cpo.child_id
JOIN auth.users u ON u.id = cpo.user_id
WHERE u.email ILIKE '%patrick%'
  AND c.name ILIKE '%june%';

-- Check Paul Somers invite status
SELECT 
    'Paul Somers invite' as check_name,
    i.status,
    i.invitee_name,
    i.invitee_role,
    c.name as child_name
FROM invites i
JOIN children c ON c.id = i.child_id
WHERE i.invitee_name ILIKE '%paul%somers%';

-- ============================================
-- DONE
-- ============================================
-- After running this script:
-- 1. Patrick should see June's full profile (photo, birthdate, gender)
-- 2. Paul Somers should reappear in pending invites
-- 3. Future invite acceptances will use the accept_invite function
-- 4. Patrick can save dietary needs and other health data for June
-- ============================================

-- ============================================
-- FIX: Update children table RLS to use V2 child_access
-- ============================================
-- The children table RLS was using old V1 family_members-based access
-- Patrick has child_access but NOT family_members, so he can't read children

DROP POLICY IF EXISTS "Family members can view children" ON children;
DROP POLICY IF EXISTS "Family members can insert children" ON children;
DROP POLICY IF EXISTS "Family members can update children" ON children;
DROP POLICY IF EXISTS "Family members can delete children" ON children;
DROP POLICY IF EXISTS "Users with child access can view children" ON children;
DROP POLICY IF EXISTS "Guardians can update children" ON children;

-- SELECT: Anyone with child_access can view
CREATE POLICY "Users with child access can view children"
ON children FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = children.id 
        AND child_access.user_id = auth.uid()
    )
);

-- UPDATE: Guardians can update
CREATE POLICY "Guardians can update children"
ON children FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = children.id 
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- INSERT: Authenticated users can insert (needed for onboarding)
CREATE POLICY "Authenticated users can insert children"
ON children FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: Guardians can delete
CREATE POLICY "Guardians can delete children"
ON children FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = children.id 
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- ============================================
-- BONUS: Fix dietary_needs RLS for V2 permissions
-- ============================================
-- The dietary_needs table uses old V1 family-based RLS
-- Update to V2 child-centric RLS so Patrick can save dietary data

DROP POLICY IF EXISTS "Family members can view dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can insert dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can update dietary needs" ON dietary_needs;
DROP POLICY IF EXISTS "Family members can delete dietary needs" ON dietary_needs;

CREATE POLICY "Users with child access can view dietary needs"
ON dietary_needs FOR SELECT
USING (
    child_id IS NOT NULL 
    AND has_child_access(child_id, auth.uid())
);

CREATE POLICY "Guardians can insert dietary needs"
ON dietary_needs FOR INSERT
WITH CHECK (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can update dietary needs"
ON dietary_needs FOR UPDATE
USING (
    child_id IS NOT NULL 
    AND (
        is_guardian(child_id, auth.uid())
        OR can_manage_helpers(child_id, auth.uid())
    )
);

CREATE POLICY "Guardians can delete dietary needs"
ON dietary_needs FOR DELETE
USING (
    child_id IS NOT NULL 
    AND is_guardian(child_id, auth.uid())
);

-- ============================================
-- FIX: Update documents table RLS to use V2 child_access
-- ============================================
-- The documents table RLS was using old V1 family_id-based access
-- Now uses V2 child_access so all caregivers with access can manage documents

DROP POLICY IF EXISTS "Family members can view documents" ON documents;
DROP POLICY IF EXISTS "Family members can insert documents" ON documents;
DROP POLICY IF EXISTS "Family members can update documents" ON documents;
DROP POLICY IF EXISTS "Family members can delete documents" ON documents;
DROP POLICY IF EXISTS "Users can view their family's documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents for their family" ON documents;
DROP POLICY IF EXISTS "Users can update their family's documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their family's documents" ON documents;
DROP POLICY IF EXISTS "Users with child access can view documents" ON documents;
DROP POLICY IF EXISTS "Guardians can insert documents" ON documents;
DROP POLICY IF EXISTS "Guardians can update documents" ON documents;
DROP POLICY IF EXISTS "Guardians can delete documents" ON documents;

-- SELECT: Anyone with child_access can view
CREATE POLICY "Users with child access can view documents"
ON documents FOR SELECT
USING (
    child_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = documents.child_id 
        AND child_access.user_id = auth.uid()
    )
);

-- INSERT: Guardians can insert
CREATE POLICY "Guardians can insert documents"
ON documents FOR INSERT
WITH CHECK (
    child_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = documents.child_id 
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- UPDATE: Guardians can update
CREATE POLICY "Guardians can update documents"
ON documents FOR UPDATE
USING (
    child_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = documents.child_id 
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- DELETE: Guardians can delete
CREATE POLICY "Guardians can delete documents"
ON documents FOR DELETE
USING (
    child_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id = documents.child_id 
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- ============================================
-- FIX: Update documents STORAGE RLS to use V2 child_access
-- ============================================
-- Storage bucket uses child_id as folder name now

DROP POLICY IF EXISTS "Users can upload documents to family folder" ON storage.objects;
DROP POLICY IF EXISTS "Family members can view documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents in family folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents from family folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to child folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents in child folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents in child folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents in child folder" ON storage.objects;

-- Storage: Upload documents (guardians only)
CREATE POLICY "Users can upload documents to child folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id::text = (storage.foldername(name))[1]
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- Storage: View documents (anyone with child access)
CREATE POLICY "Users can view documents in child folder"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id::text = (storage.foldername(name))[1]
        AND child_access.user_id = auth.uid()
    )
);

-- Storage: Update documents (guardians only)
CREATE POLICY "Users can update documents in child folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id::text = (storage.foldername(name))[1]
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- Storage: Delete documents (guardians only)
CREATE POLICY "Users can delete documents in child folder"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM child_access 
        WHERE child_access.child_id::text = (storage.foldername(name))[1]
        AND child_access.user_id = auth.uid()
        AND child_access.role_type = 'guardian'
    )
);

-- ============================================
-- FINAL VERIFICATION
-- ============================================
SELECT 'All RLS policies updated for V2 child_access system' as status;
