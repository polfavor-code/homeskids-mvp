# Calendar Feature - MVP Phase 1

## Overview

The Calendar feature allows caregivers to manage schedules and events for children in the Homes.kids app. Each child has their own calendar visible to connected caregivers.

## Key Features

### 1. Calendar Views
- **Month View**: Grid-based calendar showing events as chips on each day
- **Agenda View**: Chronological list of events with filters

### 2. Event Types

#### Home Days 🏠
- Represent where a child will be staying
- Require confirmation from another guardian (co-parent workflow)
- Visual color coding based on home name (Daddy's = blue, Mommy's = pink, etc.)
- Status: Proposed → Confirmed/Rejected

#### Regular Events 📅
- General calendar events (activities, appointments, etc.)
- Auto-confirmed on creation
- No approval workflow needed

### 3. Quick Add Flow
The "Add" button opens a modal with two large options:
1. **Home Day** - Fast flow to schedule where child will be
2. **Event** - Add an activity or reminder

## Home Day Confirmation Workflow

### Standard Flow (Multiple Guardians)
1. Guardian A creates a Home Day → Status: `proposed`
2. Guardian B receives notification (in-app)
3. Guardian B can **Confirm** or **Reject**
4. On confirm: Status → `confirmed`, child location can change
5. On reject: Status → `rejected`, event hidden by default

### Edge Case: Single Guardian
When only one guardian exists for a child:
- Home Days are **auto-confirmed** immediately
- No waiting for approval needed
- This prevents blocking single-parent households

### Who Can Confirm/Reject
- Only guardians (parents/stepparents) can confirm or reject
- The proposer cannot confirm their own proposal (unless single guardian)
- Helpers (nannies, grandparents, etc.) can view but not confirm

## Data Model

### Tables

```sql
-- Main events table
calendar_events (
  id, child_id, title, description,
  start_at, end_at, all_day, timezone,
  event_type: 'home_day' | 'event',
  home_id (for home_days),
  status: 'confirmed' | 'proposed' | 'rejected',
  proposed_by, confirmed_by, confirmed_at,
  rejected_by, rejected_at, proposal_reason,
  created_by, created_at, updated_at,
  is_deleted, deleted_at, deleted_by
)

-- Notifications for in-app alerts
calendar_notifications (
  id, event_id, user_id,
  notification_type: 'proposal' | 'confirmed' | 'rejected',
  is_read, created_at
)
```

### RLS Policies
- Events visible to caregivers with `can_view_calendar` permission
- Only guardians can create Home Days
- Users with `can_edit_calendar` can create regular events
- Guardians can confirm/reject Home Days (via helper function)

## Setup Instructions

### 1. Run Migration
Execute the SQL migration to create tables and RLS:
```bash
# In Supabase SQL Editor, run:
supabase-migration-012-calendar-events.sql
```

### 2. Enable Feature Flag
In `src/lib/supabase.ts`, ensure:
```typescript
CALENDAR: true,
```

### 3. Verify
- Navigate to `/calendar` in the app
- Should see the calendar UI instead of placeholder

## API / Server Actions

```typescript
// List events for a child in date range
listChildEvents(filter: ListEventsFilter)

// Create a regular event (auto-confirmed)
createEvent(payload: CreateEventPayload)

// Create a Home Day (proposed, needs confirmation)
createHomeDayProposal(payload: CreateHomeDayPayload)

// Confirm a pending Home Day
confirmHomeDay(eventId: string)

// Reject a pending Home Day
rejectHomeDay(eventId: string, reason?: string)

// Update an event
updateEvent(eventId: string, payload: UpdateEventPayload)

// Soft-delete an event
deleteEvent(eventId: string)
```

## UI Components

```
src/components/calendar/
├── CalendarHeader.tsx    # View toggle, navigation, add button
├── CalendarFilters.tsx   # Agenda view filters
├── MonthView.tsx         # Month grid calendar
├── AgendaView.tsx        # Chronological list view
├── EventChip.tsx         # Event display chip
├── AddEventModal.tsx     # Quick add modal
├── EventDetailPanel.tsx  # Slide-in panel with confirm/reject
└── index.ts              # Exports
```

## Acceptance Criteria ✓

- [x] Parent can add Home Day in < 10 seconds
- [x] Other parent sees it as Pending
- [x] Other parent can Confirm or Reject
- [x] After confirmation, status is Confirmed
- [x] Only child's caregivers can see events (RLS)
- [x] Non-parent cannot confirm/reject
- [x] Single guardian auto-confirm works

## Not Included (Future Phases)
- Combined view across all children
- External calendar sync (Google, Apple)
- Email/push notifications
- Recurring events
- Timezone conversion display

## File Locations

```
src/
├── lib/calendar/
│   ├── types.ts          # TypeScript types
│   ├── actions.ts        # Server actions
│   ├── CalendarContext.tsx
│   └── index.ts
├── components/calendar/   # UI components
├── app/calendar/page.tsx  # Main page

supabase-v2-migration-012-calendar-events.sql  # Database migration
```
