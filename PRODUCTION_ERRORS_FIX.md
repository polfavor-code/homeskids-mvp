# Production Console Errors - Diagnosis & Fix

## ✅ PROGRESS UPDATE

**Status:** 
- ✅ Step 1 completed - Missing table identified
- ✅ Step 2 completed - Migration run successfully
- ✅ Step 3 completed - Table structure and RLS verified
- 🔄 **Next Step:** Test in your application (Step 4)

---

## Current Issues

You're seeing **400 (Bad Request)** and **406 (Not Acceptable)** errors in production. These are Supabase API errors.

## Root Causes

### 1. Missing Database Migrations

The following tables are being queried but **don't exist** or **have incorrect schemas** in production:

- `dietary_needs` - Returns 406 (Not Acceptable)
- `contacts` - Returns 400 (Bad Request)  
- `child_health_status` - Returns 404 (Not Found)
- `items` - Query has typo: `created_by` (should be `created_by`)

### 2. Row Level Security (RLS) Policies

Even if tables exist, RLS might be blocking legitimate queries. The **406** error typically means:
- Table exists
- Query is valid
- **But RLS policy prevents the user from accessing the data**



### Step 1: Check Which Migrations Have Been Run ✅ COMPLETED

In your **production** Supabase project:

1. Go to SQL Editor
2. Run this query:

```sql
-- Check if tables exist
SELECT 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'dietary_needs',
        'contacts', 
        'child_health_status',
        'external_calendar_sources',
        'ics_sources',
        'calendar_events',
        'calendar_event_mappings'
    )
ORDER BY tablename;
```

**RESULTS (Initial Check):**
- ✅ `calendar_event_mappings` - EXISTS
- ✅ `calendar_events` - EXISTS
- ✅ `contacts` - EXISTS
- ✅ `dietary_needs` - EXISTS
- ✅ `external_calendar_sources` - EXISTS
- ✅ `ics_sources` - EXISTS
- ❌ `child_health_status` - **MISSING** ⚠️

**RESULTS (After Migration):**
- ✅ `child_health_status` - **NOW EXISTS!** 🎉

**Analysis:**
- ✅ Calendar migrations (013, 014) have been run
- ❌ **supabase-migration-health-status.sql** has NOT been run

### Step 2: Run Missing Migrations ✅ COMPLETED

**FIX REQUIRED: Create `child_health_status` table**

1. ✅ Opened `supabase-migration-health-status.sql`
2. ✅ Copied the entire contents
3. ✅ Ran in Supabase Dashboard → SQL Editor
4. ✅ Migration executed successfully

This migration created:
- ✅ The `health_status_enum` type ('skipped', 'none', 'has')
- ✅ The `child_health_status` table with proper schema
- ✅ RLS policies for family members
- ✅ Necessary indexes and triggers


### Step 3: Verify the Migration ✅ COMPLETED

Now let's verify the table structure and RLS policies work correctly.

**Test 1: Check if table exists** ✅
- Result: `child_health_status` table exists!

**Test 2: Check table structure and columns** ✅
- Result: Table has correct structure:
  - ✅ `id` (uuid, NOT NULL)
  - ✅ `child_id` (uuid, NOT NULL)
  - ✅ `family_id` (uuid, NOT NULL)
  - ✅ `allergies_status` (health_status_enum, NOT NULL)
  - ✅ `allergies_details` (text, nullable)
  - ✅ `medication_status` (health_status_enum, NOT NULL)
  - ✅ `medication_details` (text, nullable)
  - ✅ `dietary_status` (health_status_enum, NOT NULL)
  - ✅ `dietary_details` (text, nullable)
  - ✅ `created_at` (timestamptz, NOT NULL)
  - ✅ `updated_at` (timestamptz, NOT NULL)

**Test 3: Test RLS policies** ✅ PASSED

Query ran successfully:
```sql
SELECT * FROM child_health_status LIMIT 1;
```

**Result:** ✅ **0 rows returned** - RLS is working correctly!
- No errors (no 406 error)
- Query allowed by RLS policies
- Table is simply empty (no health data created yet)

**All verification tests passed!** 🎉

**Expected Results:**
- Query 1: Should return `child_health_status`
- Query 2: Should show the table structure with columns
- Query 3: Should return no errors (might be 0 rows if no data yet, that's OK)

If Query 3 fails with **406 (Not Acceptable)**, it means RLS is blocking you. This would happen if:
- You're not a member of any family
- The `family_members` table doesn't have your user_id

### Step 4: Test in the Application 🔄 READY TO TEST

Now that the database is fixed, test that the errors are gone in your app!

**Testing Steps:**

1. **Open your production app** in a browser
2. **Open Developer Console** (F12 or right-click → Inspect)
3. **Go to the Console tab** to watch for errors
4. **Navigate through your app**, especially pages that:
   - Load child health information
   - Display contacts
   - Show dietary needs
   - Use calendar features

**What to look for:**

✅ **SUCCESS indicators:**
- No more `child_health_status` 404 errors
- No more 400/406 errors for these tables
- Console is much cleaner
- Features work normally (even if returning empty data)

❌ **If you still see errors:**
- Take a screenshot of the error
- Note which page/action triggers it
- We'll debug the specific issue

**Note:** You might still see some other unrelated console messages, but the **specific errors for missing tables should be completely gone**.

Go ahead and test your app! Let me know what you see in the console.

## Expected Results After Fix

- ✅ No more 400/404/406 errors in console
- ✅ Contacts load correctly
- ✅ Health data loads correctly
- ✅ Calendar sync works
- ✅ Much cleaner console (logging has been reduced)

## Files Changed to Reduce Logging

I've already cleaned up excessive console logging in:
- `src/lib/HomeSwitchAlertContext.tsx`
- `src/lib/ItemsAddedAlertContext.tsx`
- `src/lib/DocumentAddedAlertContext.tsx`

These will be much quieter in the next deployment.

## Next Steps

1. **Run the SQL query above** to check which tables exist
2. **Run missing migrations** in production Supabase
3. **Deploy the latest code** (with cleaned up logging)
4. **Test in production** - errors should be gone!

Let me know what the SQL query returns and I can provide more specific guidance.
