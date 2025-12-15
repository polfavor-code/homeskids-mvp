# No-Home Flow Implementation

## Overview
Implemented child-centric item management where homes are optional, not required.

## Changes Made

### 1. Label Updates ✅
**File:** `src/app/items/page.tsx`

- Changed "Unknown Location" → "No home yet"
- Location shows "No home yet" when no homes exist
- Treats unassigned items as an explicit state (not null ambiguity)

```typescript
// Before
return "Unknown Location";

// After
if (homes.length === 0) {
    return "No home yet";
}
return "No home yet"; // for items without home when homes exist
```

### 2. Non-Blocking Item Creation ✅
**File:** `src/app/items/page.tsx`

- "+ New item" button always visible
- Items can be created without any homes
- New items show "No home yet" until assigned

### 3. Soft Nudge Banner ✅
**File:** `src/app/items/page.tsx`

**Features:**
- Only shows when NO homes exist
- Dismissible (stores in localStorage)
- Non-blocking inline notice
- Amber/warm color scheme (not scary)
- Clear CTAs: "Add a home" (primary) and "Later" (secondary)

**UI Details:**
- Appears between tabs and home filter
- Icon + clear message
- Respects user dismissal permanently

### 4. First Home Assignment Prompt ✅
**File:** `src/components/FirstHomeAssignmentPrompt.tsx`

**Triggers when:**
- First home is created (homes.length === 1)
- Unassigned items exist
- Not shown before (localStorage check)

**Features:**
- Modal overlay (non-intrusive)
- Shows count of unassigned items
- Two actions:
  - "Assign all" - assigns all items to new home
  - "Review later" - dismisses permanently
- One-time only (never shown again after dismissal)

**Technical:**
- Updates `child_space_id` for all unassigned items
- Stores dismissal in localStorage
- Refreshes page after assignment

### 5. Home Filter Hiding ✅
**File:** `src/app/items/page.tsx`

- Home filter dropdown only shows when `homes.length > 0`
- When no homes exist, all items shown by default
- No confusing filter UI when there's nothing to filter

### 6. Location Resolution Fix ✅
**File:** `src/lib/ItemsContext.tsx`

- Fixed "Unknown Location" bug
- Uses SQL JOIN to get home info with items
- More efficient query (one query vs multiple)

```typescript
// Now uses JOIN for reliable location data
.select(`
    *,
    child_spaces!inner(
        id,
        home_id
    )
`)
```

## User Flow

### Scenario 1: No Homes Exist
1. User creates items
2. Items show "No home yet"
3. Soft banner suggests adding a home (dismissible)
4. User can continue using app normally

### Scenario 2: First Home Added
1. User adds their first home
2. If unassigned items exist → Modal prompts
3. User chooses "Assign all" or "Review later"
4. Items now show proper home name

### Scenario 3: Multiple Homes
1. Normal operation
2. Home filter visible
3. Items assigned to specific homes

## Mental Model
- **Items belong to the child first**
- **Homes are an organizing layer** (optional)
- **No blocking flows** (always allow item creation)
- **Soft nudges** (never scary warnings)

## Files Modified
1. `src/app/items/page.tsx` - Main items list logic and UI
2. `src/lib/ItemsContext.tsx` - Item location resolution
3. `src/components/FirstHomeAssignmentPrompt.tsx` - New component

## localStorage Keys
- `noHomeBannerDismissed` - Banner dismissal state
- `firstHomeAssignmentDone` - First home prompt shown

## Testing Checklist
- [ ] Create items when no homes exist
- [ ] Items show "No home yet" label
- [ ] Banner appears and is dismissible
- [ ] Banner stays dismissed after page reload
- [ ] Add first home triggers assignment prompt
- [ ] "Assign all" updates all items correctly
- [ ] "Review later" dismisses prompt permanently
- [ ] Home filter hidden when no homes
- [ ] Home filter visible when homes exist
- [ ] Multiple homes work normally

## Design Philosophy
✅ Child-centric (items belong to child)
✅ Progressive disclosure (homes added when needed)
✅ Non-blocking (never prevent core actions)
✅ Respectful of user choice (dismissible, one-time prompts)
✅ Clear labels ("No home yet" vs "Unknown Location")
