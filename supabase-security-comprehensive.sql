-- ============================================
-- COMPREHENSIVE SECURITY SETUP FOR HOMES.KIDS
-- ============================================
-- This file contains all RLS policies and storage security
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT: Review each section before running
-- Some policies may already exist - DROP statements handle this
-- ============================================

-- ============================================
-- SECTION 1: CORE TABLE RLS POLICIES
-- ============================================

-- --------------------------------------------
-- 1.1 PROFILES TABLE RLS
-- --------------------------------------------
-- Users can only read/update their own profile
-- Other users' profiles are readable only if in same family

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view family member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Users can view profiles of people in their family
CREATE POLICY "Users can view family member profiles" ON profiles
FOR SELECT USING (
    id IN (
        SELECT fm2.user_id
        FROM family_members fm1
        JOIN family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid()
    )
);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- --------------------------------------------
-- 1.2 FAMILIES TABLE RLS
-- --------------------------------------------
-- Only family members can view/modify their family

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view family" ON families;
DROP POLICY IF EXISTS "Family members can update family" ON families;
DROP POLICY IF EXISTS "Authenticated users can create family" ON families;

-- Family members can view their family
CREATE POLICY "Family members can view family" ON families
FOR SELECT USING (
    id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- Family members can update their family
CREATE POLICY "Family members can update family" ON families
FOR UPDATE USING (
    id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- Authenticated users can create a family (during onboarding)
CREATE POLICY "Authenticated users can create family" ON families
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- --------------------------------------------
-- 1.3 FAMILY_MEMBERS TABLE RLS
-- --------------------------------------------
-- Core permission table - must be carefully protected

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own family memberships" ON family_members;
DROP POLICY IF EXISTS "Users can view co-members in family" ON family_members;
DROP POLICY IF EXISTS "Family members can add new members" ON family_members;
DROP POLICY IF EXISTS "Users can update own membership" ON family_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON family_members;

-- Users can view their own family memberships
CREATE POLICY "Users can view own family memberships" ON family_members
FOR SELECT USING (user_id = auth.uid());

-- Users can view other members in their families
CREATE POLICY "Users can view co-members in family" ON family_members
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- Family members can add new members to their family (invites)
CREATE POLICY "Family members can add new members" ON family_members
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
    OR
    -- Allow users to add themselves (accepting invite)
    user_id = auth.uid()
);

-- Users can update their own membership
CREATE POLICY "Users can update own membership" ON family_members
FOR UPDATE USING (user_id = auth.uid());

-- --------------------------------------------
-- 1.4 CHILDREN TABLE RLS
-- --------------------------------------------
-- Only family members can access children data

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view children" ON children;
DROP POLICY IF EXISTS "Family members can insert children" ON children;
DROP POLICY IF EXISTS "Family members can update children" ON children;
DROP POLICY IF EXISTS "Family members can delete children" ON children;

CREATE POLICY "Family members can view children" ON children
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert children" ON children
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update children" ON children
FOR UPDATE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete children" ON children
FOR DELETE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 1.5 ITEMS TABLE RLS
-- --------------------------------------------
-- Only family members can access items

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view items" ON items;
DROP POLICY IF EXISTS "Family members can insert items" ON items;
DROP POLICY IF EXISTS "Family members can update items" ON items;
DROP POLICY IF EXISTS "Family members can delete items" ON items;

CREATE POLICY "Family members can view items" ON items
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert items" ON items
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update items" ON items
FOR UPDATE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete items" ON items
FOR DELETE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 1.6 INVITES TABLE RLS
-- --------------------------------------------
-- Family members can manage invites, anyone can view by token

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view invites" ON invites;
DROP POLICY IF EXISTS "Anyone can view invite by token" ON invites;
DROP POLICY IF EXISTS "Family members can create invites" ON invites;
DROP POLICY IF EXISTS "Family members can update invites" ON invites;
DROP POLICY IF EXISTS "Anyone can update invite status" ON invites;

-- Family members can view all invites for their family
CREATE POLICY "Family members can view invites" ON invites
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- Anyone (including unauthenticated for invite page) can view invite by token
-- Note: This allows the invite page to load invite details
CREATE POLICY "Anyone can view invite by token" ON invites
FOR SELECT USING (true);

-- Family members can create invites
CREATE POLICY "Family members can create invites" ON invites
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- Family members can update invites (cancel, etc)
CREATE POLICY "Family members can update invites" ON invites
FOR UPDATE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 1.7 HOMES TABLE RLS
-- --------------------------------------------
-- Family members can view all homes in their family
-- Users with home_access can also see the home

ALTER TABLE homes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view homes" ON homes;
DROP POLICY IF EXISTS "Family members can insert homes" ON homes;
DROP POLICY IF EXISTS "Family members can update homes" ON homes;
DROP POLICY IF EXISTS "Family members can delete homes" ON homes;

CREATE POLICY "Family members can view homes" ON homes
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert homes" ON homes
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update homes" ON homes
FOR UPDATE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete homes" ON homes
FOR DELETE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 1.8 HOME_ACCESS TABLE RLS
-- --------------------------------------------
-- Users can view their own home access records
-- Family members can manage access for homes in their family

ALTER TABLE home_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own home access" ON home_access;
DROP POLICY IF EXISTS "Family members can view home access" ON home_access;
DROP POLICY IF EXISTS "Family members can manage home access" ON home_access;
DROP POLICY IF EXISTS "Family members can delete home access" ON home_access;

-- Users can view their own home access
CREATE POLICY "Users can view own home access" ON home_access
FOR SELECT USING (user_id = auth.uid());

-- Family members can view all home access in their family (via homes)
CREATE POLICY "Family members can view home access" ON home_access
FOR SELECT USING (
    home_id IN (
        SELECT h.id FROM homes h
        JOIN family_members fm ON fm.family_id = h.family_id
        WHERE fm.user_id = auth.uid()
    )
);

-- Family members can create home access for homes in their family
CREATE POLICY "Family members can manage home access" ON home_access
FOR INSERT WITH CHECK (
    home_id IN (
        SELECT h.id FROM homes h
        JOIN family_members fm ON fm.family_id = h.family_id
        WHERE fm.user_id = auth.uid()
    )
);

-- Family members can update home access for homes in their family
CREATE POLICY "Family members can update home access" ON home_access
FOR UPDATE USING (
    home_id IN (
        SELECT h.id FROM homes h
        JOIN family_members fm ON fm.family_id = h.family_id
        WHERE fm.user_id = auth.uid()
    )
);

-- Family members can delete home access for homes in their family
CREATE POLICY "Family members can delete home access" ON home_access
FOR DELETE USING (
    home_id IN (
        SELECT h.id FROM homes h
        JOIN family_members fm ON fm.family_id = h.family_id
        WHERE fm.user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 1.9 CONTACTS TABLE RLS
-- --------------------------------------------
-- Only family members can access contacts

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view contacts" ON contacts;
DROP POLICY IF EXISTS "Family members can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Family members can update contacts" ON contacts;
DROP POLICY IF EXISTS "Family members can delete contacts" ON contacts;

CREATE POLICY "Family members can view contacts" ON contacts
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert contacts" ON contacts
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update contacts" ON contacts
FOR UPDATE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete contacts" ON contacts
FOR DELETE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 1.10 DOCUMENTS TABLE RLS
-- --------------------------------------------
-- Only family members can access documents

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view documents" ON documents;
DROP POLICY IF EXISTS "Family members can insert documents" ON documents;
DROP POLICY IF EXISTS "Family members can update documents" ON documents;
DROP POLICY IF EXISTS "Family members can delete documents" ON documents;

CREATE POLICY "Family members can view documents" ON documents
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert documents" ON documents
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update documents" ON documents
FOR UPDATE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete documents" ON documents
FOR DELETE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 1.11 TRAVEL_BAGS TABLE RLS
-- --------------------------------------------
-- Only family members can access travel bags

ALTER TABLE travel_bags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view travel_bags" ON travel_bags;
DROP POLICY IF EXISTS "Family members can insert travel_bags" ON travel_bags;
DROP POLICY IF EXISTS "Family members can update travel_bags" ON travel_bags;
DROP POLICY IF EXISTS "Family members can delete travel_bags" ON travel_bags;

CREATE POLICY "Family members can view travel_bags" ON travel_bags
FOR SELECT USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can insert travel_bags" ON travel_bags
FOR INSERT WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can update travel_bags" ON travel_bags
FOR UPDATE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Family members can delete travel_bags" ON travel_bags
FOR DELETE USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- ============================================
-- SECTION 2: STORAGE BUCKET RLS POLICIES
-- ============================================

-- --------------------------------------------
-- 2.1 AVATARS BUCKET - FAMILY-SCOPED ACCESS
-- --------------------------------------------
-- Avatars are stored in family folders: {family_id}/{user_id}-{timestamp}.{ext}
-- This prevents cross-family access

-- First, create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Family members can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar to family folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatar in family folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatar from family folder" ON storage.objects;

-- NEW: Family-scoped avatar access
-- Upload: User can upload to their family's avatar folder
CREATE POLICY "Users can upload avatar to family folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Read: Users can only read avatars from their family
CREATE POLICY "Family members can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Update: Users can update avatars in their family folder
CREATE POLICY "Users can update avatar in family folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Delete: Users can delete avatars from their family folder
CREATE POLICY "Users can delete avatar from family folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 2.2 ITEM-PHOTOS BUCKET - FAMILY-SCOPED ACCESS
-- --------------------------------------------
-- Item photos stored in family folders: {family_id}/{filename}

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can upload item photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view item photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload item photos to family folder" ON storage.objects;
DROP POLICY IF EXISTS "Family members can view item photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update item photos in family folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete item photos from family folder" ON storage.objects;

-- Upload: Users can upload to their family's item-photos folder
CREATE POLICY "Users can upload item photos to family folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'item-photos' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Read: Users can only read item photos from their family
CREATE POLICY "Family members can view item photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'item-photos' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Update: Users can update item photos in their family folder
CREATE POLICY "Users can update item photos in family folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'item-photos' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Delete: Users can delete item photos from their family folder
CREATE POLICY "Users can delete item photos from family folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'item-photos' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- --------------------------------------------
-- 2.3 DOCUMENTS BUCKET - FAMILY-SCOPED ACCESS
-- --------------------------------------------
-- Documents stored in family folders: {family_id}/{filename}

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can upload documents to family folder" ON storage.objects;
DROP POLICY IF EXISTS "Family members can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents in family folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents from family folder" ON storage.objects;

-- Upload: Users can upload to their family's documents folder
CREATE POLICY "Users can upload documents to family folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Read: Users can only read documents from their family
CREATE POLICY "Family members can view documents storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Update: Users can update documents in their family folder
CREATE POLICY "Users can update documents in family folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- Delete: Users can delete documents from their family folder
CREATE POLICY "Users can delete documents from family folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
);

-- ============================================
-- SECTION 3: VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify RLS is enabled on all tables

-- Check RLS status on all relevant tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'profiles',
    'families',
    'family_members',
    'children',
    'items',
    'homes',
    'home_access',
    'contacts',
    'invites',
    'documents',
    'travel_bags'
)
ORDER BY tablename;

-- List all policies on tables
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- DONE!
-- ============================================
-- After running this SQL:
-- 1. Update your app code to use family-folder structure for avatars
-- 2. Update your app code to use family-folder structure for item-photos
-- 3. Test all CRUD operations still work
-- 4. Test that cross-family access is blocked
-- ============================================
