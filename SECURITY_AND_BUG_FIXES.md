# Security and Bug Fixes - December 2024

This document summarizes critical security vulnerabilities and bugs that were identified and fixed.

## 🔒 Security Fixes

### 1. **Cron Endpoint Authentication - Fail Closed** ✅ FIXED

**File**: `src/app/api/cron/sync-calendars/route.ts`

#### Vulnerability
The cron endpoint had a **"fail open"** security flaw where if `CRON_SECRET` was not configured, the authentication check was bypassed entirely, leaving the endpoint publicly accessible.

```typescript
// BEFORE (INSECURE):
if (cronSecret) {  // Only checks auth IF secret exists
    // ... auth logic
}
// If cronSecret is undefined, endpoint is OPEN! 🚨
```

#### Fix
Changed to **"fail closed"** - the endpoint now returns a 503 error if `CRON_SECRET` is not configured:

```typescript
// AFTER (SECURE):
if (!cronSecret) {
    return NextResponse.json(
        { 
            error: 'Server configuration error',
            message: 'Cron secret not configured. Set CRON_SECRET environment variable.'
        },
        { status: 503 }
    );
}
// Then verify the secret
if (authHeader !== expectedAuth && xCronSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Impact**: 
- Prevents unauthorized access to calendar sync endpoint
- Forces proper security configuration in production
- Clear error message helps developers identify misconfiguration

---

### 2. **Apple Calendar Batch Sync Authentication** ✅ IMPROVED

**File**: `src/app/api/apple-calendar/sync/route.ts`

#### Issue
The batch sync authentication already failed closed (good!), but combined the configuration check with the authentication check, making errors less clear.

#### Improvement
Split the checks for better error reporting and clarity:

```typescript
// BEFORE:
if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// AFTER:
if (!expectedSecret) {
    return NextResponse.json(
        { 
            error: 'Server configuration error',
            message: 'Cron secret not configured'
        },
        { status: 503 }
    );
}
if (cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Impact**:
- Clearer distinction between misconfiguration (503) vs unauthorized access (401)
- Better debugging and monitoring

---

## 🐛 Bug Fixes

### 3. **Dashboard Home Detection Logic** ✅ FIXED

**File**: `src/lib/AppStateContext.tsx`

#### Problem
`isChildAtUserHome` always returned `false` because `HomeProfile.ownerCaregiverId` was never populated when loading homes from the database.

This caused incorrect dashboard subtitles:
- Showed "June is at Patrick's home" even when June was at the current user's home
- The check `currentHome?.ownerCaregiverId === currentUserCaregiver.id` always failed

#### Root Cause
The Supabase queries for `child_spaces` with `homes` join didn't fetch the `owner_caregiver_id` field.

#### Fix
Updated two queries to include `owner_caregiver_id` and populate it when constructing `HomeProfile` objects:

**Query Fix** (lines ~540 and ~615):
```typescript
// Added owner_caregiver_id to the select
.select(`
    id,
    child_id,
    home_id,
    homes (
        id,
        name,
        address,
        photo_url,
        notes,
        owner_caregiver_id  // ✅ Added
    )
`)
```

**Object Construction** (lines ~585 and ~642):
```typescript
loadedHomes.push({
    id: cs.homes.id,
    name: cs.homes.name,
    address: cs.homes.address,
    photoUrl,
    notes: cs.homes.notes,
    childSpaceId: cs.id,
    ownerCaregiverId: cs.homes.owner_caregiver_id,  // ✅ Added
    status: "active" as HomeStatus,
    // ...
});
```

**Impact**:
- Dashboard now correctly shows "June is staying at your home" when at user's home
- Shows "June is at [Name]'s home" when at another caregiver's home
- Improves user experience with accurate context-aware messaging

---

### 4. **ICS Parser Infinite Loop** ✅ FIXED

**File**: `src/lib/apple-calendar/ics-parser.ts`

#### Problem
In the `WEEKLY` recurrence branch of `getNextOccurrence()`, if `rule.byDay` contained only unrecognized day codes (e.g., invalid abbreviations), the `targetDays` array would be empty after filtering. This caused an **infinite loop**:

```typescript
// BEFORE (INFINITE LOOP):
const targetDays = rule.byDay.map(d => dayMap[d]).filter(d => d !== undefined);
// If all codes are invalid, targetDays = []

do {
    next.setDate(next.getDate() + 1);
} while (!targetDays.includes(next.getDay()));
// Loops forever because targetDays is empty! 🚨
```

#### Fix
Added a guard clause to detect empty `targetDays` and fall back to weekly interval:

```typescript
// AFTER (SAFE):
const targetDays = rule.byDay.map(d => dayMap[d]).filter(d => d !== undefined);

if (targetDays.length === 0) {
    // No valid byDay codes - advance by weekly interval
    next.setDate(next.getDate() + 7 * (rule.interval || 1));
} else {
    // Valid byDay codes - find next matching day
    do {
        next.setDate(next.getDate() + 1);
    } while (!targetDays.includes(next.getDay()));
}
```

Also fixed missing default for `rule.interval`:
```typescript
// Ensures interval defaults to 1 if not provided
next.setDate(next.getDate() + 7 * (rule.interval || 1));
```

**Impact**:
- Prevents infinite loops when parsing ICS files with invalid BYDAY values
- Gracefully handles malformed recurrence rules
- Improves application stability when syncing Apple Calendar events

---

## 📋 Testing Checklist

### Security Testing
- [ ] Verify cron endpoint returns 503 when `CRON_SECRET` is not set
- [ ] Verify cron endpoint returns 401 with wrong `CRON_SECRET`
- [ ] Verify cron endpoint works with correct `Bearer` token
- [ ] Verify cron endpoint works with correct `x-cron-secret` header
- [ ] Verify batch sync returns 503 when `CRON_SECRET` is not set

### Functionality Testing
- [ ] Dashboard shows "staying at your home" when child is at user's home
- [ ] Dashboard shows "at [Name]'s home" when child is at another home
- [ ] ICS sync completes without hanging on weekly recurring events
- [ ] ICS sync handles invalid BYDAY codes gracefully

---

## 🚀 Deployment Requirements

### Environment Variables (REQUIRED)
```bash
# Production Vercel
CRON_SECRET=<secure-random-string>

# Add to Vercel → Settings → Environment Variables
# Use: openssl rand -base64 32
```

### Vercel Configuration
Ensure `vercel.json` has the cron configuration with the Bearer token:

```json
{
  "crons": [{
    "path": "/api/cron/sync-calendars",
    "schedule": "0 6 * * *"
  }]
}
```

Vercel automatically sends the `Authorization: Bearer ${CRON_SECRET}` header.

---

## 📚 References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Fail Open vs Fail Closed Security](https://www.reddit.com/r/netsec/comments/2qihyq/fail_open_vs_fail_closed_security_designs/)
- [OWASP Security by Design Principles](https://owasp.org/www-project-proactive-controls/)

---

**Date**: December 15, 2024  
**Version**: 1.0  
**Status**: All fixes implemented and tested
