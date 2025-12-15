# Fix Health Tables for V2 Permissions

## The Problem
You're getting this error:
```
null value in column "family_id" of relation "dietary_needs" violates not-null constraint
```

This happens because:
1. Your health tables (`allergies`, `medications`, `dietary_needs`, `child_health_status`) were created with `family_id UUID NOT NULL`
2. Your V2 code uses a child-centric model and doesn't provide `family_id`
3. The database rejects the insert because `family_id` is required but not provided

## The Solution

You need to run **TWO** SQL migrations in your Supabase SQL Editor:

### Step 1: Make family_id Nullable

Run this file: `fix-all-health-tables-family-id.sql`

This migration:
- Makes `family_id` nullable in all health tables
- Allows V2 code to insert records without `family_id`
- Keeps existing records with `family_id` intact

### Step 2: Update RLS Policies to V2

Run this file: `fix-all-health-tables-rls-v2.sql`

This migration:
- Removes old V1 family-based RLS policies
- Adds new V2 child-centric RLS policies
- Uses `has_child_access()`, `is_guardian()`, and `can_manage_helpers()` functions

## How to Apply These Fixes

### Option A: Supabase Dashboard (Recommended for Production)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `fix-all-health-tables-family-id.sql`
5. Click **Run**
6. Verify the output shows all `family_id` columns are now nullable
7. Create another new query
8. Copy and paste the contents of `fix-all-health-tables-rls-v2.sql`
9. Click **Run**
10. Verify the output shows all new policies created

### Option B: Using Supabase CLI (for Local Development)

If you're using local Supabase:

```bash
# Apply the migrations
supabase db reset

# Or apply manually
psql $DATABASE_URL -f fix-all-health-tables-family-id.sql
psql $DATABASE_URL -f fix-all-health-tables-rls-v2.sql
```

## Verify the Fix

After running both migrations, try adding a dietary need again. The error should be gone.

You can verify the fix by running this query:

```sql
-- Check family_id is nullable
SELECT 
    table_name,
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('allergies', 'medications', 'dietary_needs', 'child_health_status')
AND column_name = 'family_id';

-- Should show is_nullable = 'YES' for all tables
```

## What These Migrations Do

### Tables Affected:
- `allergies`
- `medications`
- `dietary_needs`
- `child_health_status`

### Changes:
1. **Schema**: `family_id` column becomes nullable (can be NULL)
2. **RLS Policies**: Use V2 child-access functions instead of V1 family-members
3. **Permissions**: 
   - Anyone with `child_access` can view health data
   - Guardians and users with `can_manage_helpers` can insert/update
   - Only guardians can delete

## Need Help?

If you still get errors after running both migrations:
1. Check that the migrations actually ran (look for success messages)
2. Verify you're connected to the right database (production vs local)
3. Check the browser console for detailed error messages
4. Make sure the V2 helper functions exist (`has_child_access`, `is_guardian`, `can_manage_helpers`)
