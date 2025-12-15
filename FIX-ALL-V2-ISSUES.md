# Fix All V2 Issues - Complete Migration Guide

## Overview
Your app is using V2 child-centric permissions, but several database tables still have V1 family-based schema. This causes multiple errors when adding health data and contacts.

## Issues Fixed
- ✅ Health tables missing `child_id` and requiring `family_id`
- ✅ Health tables using V1 family-based RLS policies
- ✅ Medications table missing file upload columns
- ✅ Contacts table missing `child_id` and detailed address columns
- ✅ Contacts table using V1 family-based RLS policies

## Required Migrations (Run in Order)

### 1. Fix Health Tables - Make family_id Nullable
**File:** `fix-all-health-tables-family-id.sql`

This makes `family_id` nullable in all health tables so V2 code can work without it.

**Run this first!**

### 2. Fix Health Tables - Add File Upload Support
**File:** `fix-medications-add-file-columns.sql`

Adds `file_path`, `file_type`, and `file_size` columns to medications table for prescription photo uploads.

### 3. Fix Health Tables - Update RLS Policies
**File:** `fix-health-rls-aggressive.sql`

Updates RLS policies for allergies, medications, and dietary_needs to use V2 child-access permissions.

**Important:** This is the aggressive version that recreates everything from scratch. Use this one!

### 4. Fix Contacts Table
**File:** `fix-contacts-table-v2.sql`

- Adds `child_id` column
- Makes `family_id` nullable
- Adds address detail columns (street, city, state, zip, lat, lng)
- Adds `phone_country_code`, `connected_with`, `avatar_url`
- Updates RLS policies to V2

## How to Apply

### Using Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. For each migration file (in order):
   - Click "New query"
   - Copy the entire file contents
   - Paste into the editor
   - Click **Run**
   - Verify the output shows success

### Migration Order

```sql
-- 1. Fix health tables family_id
-- Run: fix-all-health-tables-family-id.sql

-- 2. Add medication file support
-- Run: fix-medications-add-file-columns.sql

-- 3. Fix health table RLS
-- Run: fix-health-rls-aggressive.sql

-- 4. Fix contacts table
-- Run: fix-contacts-table-v2.sql
```

## Verification

After running all migrations, verify by trying to:

1. ✅ Add an allergy → Should work
2. ✅ Add a medication (with or without photo) → Should work
3. ✅ Add dietary needs → Should work
4. ✅ Add a contact with full address → Should work

## What Each Migration Does

### fix-all-health-tables-family-id.sql
- Makes `family_id` nullable in: `allergies`, `medications`, `dietary_needs`, `child_health_status`
- Allows V2 code to insert without providing `family_id`

### fix-medications-add-file-columns.sql
- Adds `file_path` (storage path to prescription photo)
- Adds `file_type` (MIME type like image/jpeg)
- Adds `file_size` (size in bytes)

### fix-health-rls-aggressive.sql
- Recreates helper functions: `has_child_access()`, `is_guardian()`
- Drops ALL existing policies dynamically
- Creates new V2 policies with unique names
- Allows any user with `child_access` to add/edit health data
- Only guardians can delete

### fix-contacts-table-v2.sql
- Adds `child_id` column (required for V2)
- Makes `family_id` nullable
- Adds detailed address columns for Google Maps integration
- Adds phone country code for international numbers
- Updates RLS to use `child_access`

## Troubleshooting

### "Policy already exists" Error
The aggressive migration (`fix-health-rls-aggressive.sql`) handles this by dynamically dropping ALL policies. Use that one.

### "Function does not exist" Error
The aggressive migration recreates all helper functions. Make sure you run `fix-health-rls-aggressive.sql`.

### Still Getting RLS Errors
Check that your user has `child_access` records:

```sql
SELECT 
    ca.child_id,
    c.name as child_name,
    ca.role_type,
    ca.access_level
FROM child_access ca
JOIN children_v2 c ON c.id = ca.child_id
WHERE ca.user_id = auth.uid();
```

If no results, your user doesn't have access to any children in V2 model.

## After Migration

All features should work:
- ✅ Health → Allergies
- ✅ Health → Medications (with photo uploads)
- ✅ Health → Dietary Needs
- ✅ Contacts (with full address and map integration)

## Notes

- These migrations are safe to run on production
- They don't delete or modify existing data
- Only add columns and update policies
- Family_id fields remain for backwards compatibility (but are nullable)
