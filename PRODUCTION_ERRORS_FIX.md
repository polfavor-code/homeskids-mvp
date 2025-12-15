# Production Console Errors - Diagnosis & Fix

## Current Issues

You're seeing **400 (Bad Request)** and **406 (Not Acceptable)** errors in production. These are Supabase API errors.

## Root Causes

### 1. Missing Database Migrations

The following tables are being queried but **don't exist** or **have incorrect schemas** in production:

- `dietary_needs` - Returns 406 (Not Acceptable)
- `contacts` - Returns 400 (Bad Request)  
- `child_health_status` - Returns 404 (Not Found)
- `items` - Query has typo: `created_created_by` (should be `created_by`)

### 2. Row Level Security (RLS) Policies

Even if tables exist, RLS might be blocking legitimate queries. The **406** error typically means:
- Table exists
- Query is valid
- **But RLS policy prevents the user from accessing the data**

### 3. Code Issues

From the console, I can see:
```
created_created_by=neg.abf24302-ec7a-4e27-83f9-ea2e8dda87b2
```

This is a typo - should be `created_by`, not `created_created_by`.

## How to Fix

### Step 1: Check Which Migrations Have Been Run

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

3. Compare the results with these migrations:
   - ✅ Already run: Basic tables (items, children, homes, family_members)
   - ❓ **supabase-migration-013-google-calendar.sql** (calendar tables)
   - ❓ **supabase-migration-014-apple-calendar.sql** (Apple calendar tables)

### Step 2: Run Missing Migrations

**If calendar tables are missing:**

1. Open `supabase-migration-013-google-calendar.sql`
2. Copy the entire contents
3. Go to Supabase Dashboard → SQL Editor
4. Paste and run
5. Repeat for `supabase-migration-014-apple-calendar.sql`

**IMPORTANT**: Run migrations in order (013 before 014).

### Step 3: Fix the `created_created_by` Typo

Search the codebase for any queries using `created_created_by` and fix them to use `created_by`.

### Step 4: Verify RLS Policies

After running migrations, test in production:

```sql
-- Test as your user
SELECT * FROM contacts LIMIT 1;
SELECT * FROM dietary_needs LIMIT 1;
SELECT * FROM child_health_status LIMIT 1;
```

If these fail with 406, the RLS policies need adjustment.

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
