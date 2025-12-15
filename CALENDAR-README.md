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

---

# Google Calendar Integration - MVP Phase 2

## Overview

One-way sync from Google Calendar into Homes.kids with explicit user-defined mapping rules. Events are imported as regular calendar events, and users create rules to convert specific events into Home Stays.

## Key Principles

1. **No automatic guessing** - All semantic meaning (Home Stay vs Event) is assigned via explicit user mapping rules
2. **One-way sync** - Events flow from Google → Homes.kids, never the other way
3. **Read-only imports** - Imported events cannot be edited in Homes.kids
4. **Confirmation still required** - Home Stays created from imports still need confirmation

## Setup

### 1. Google Cloud Console

1. Create a project at https://console.cloud.google.com
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `https://yourdomain.com/api/google-calendar/callback`
5. Note your Client ID and Client Secret

### 2. Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Run Migration

```bash
# In Supabase SQL Editor, run:
supabase-migration-013-google-calendar.sql
```

## User Flow

### 1. Connect Google Account
- Go to Settings → Integrations
- Click "Connect Google Calendar"
- Authorize read-only calendar access
- Redirected back to calendar selection

### 2. Select Calendars
- See list of all calendars in Google account
- Select which calendars to import
- Map each calendar to ONE child
- Example: "June's Schedule" → June

### 3. Initial Import
- Events from past 6 months to future 12 months are imported
- All-day and multi-day events are flagged as potential Home Stays
- Events appear in the child's calendar as regular events

### 4. Create Mapping Rules
- Review detected Home Stay candidates
- For each event type (e.g., "Daddy Days"):
  - Select which home it represents
  - Choose to apply to all events with same title
- Rules are applied immediately and to future syncs

### 5. Ongoing Sync
- Google Calendar changes sync automatically
- New events matching rules become Home Stays
- Home Stays still require confirmation from destination home member

## How Mapping Rules Work

### Match Types
- **Event ID**: Matches exactly one specific event
- **Title Exact**: Matches all events with exact title match
- **Title Contains**: Matches all events containing a keyword

### Example Rules
```
"Daddy Days" in "June's Calendar" → Paul's Home (Home Stay)
"Swimming Lessons" → Keep as Event
"Grandma visit" → Grandma's Home (Home Stay, auto-confirm)
```

### Rule Priority
1. Event ID matches take highest priority
2. Exact title matches next
3. Contains matches last

## Database Tables

```sql
-- OAuth tokens
google_calendar_connections (
  id, user_id, google_account_email,
  access_token, refresh_token, token_expires_at,
  granted_scopes, connected_at, revoked_at
)

-- Calendar to child mapping
google_calendar_sources (
  id, user_id, connection_id,
  google_calendar_id, google_calendar_name,
  child_id, active, sync_token, last_synced_at
)

-- Rules for converting events
calendar_event_mappings (
  id, source, google_calendar_id, child_id,
  match_type, match_value,
  home_id, resulting_event_type,
  auto_confirm, active, created_by
)

-- Extended calendar_events fields
source: 'manual' | 'google',
external_provider, external_calendar_id,
external_event_id, external_html_link,
is_home_stay_candidate, candidate_reason,
mapping_rule_id, is_read_only
```

## API / Server Actions

```typescript
// OAuth
getGoogleOAuthUrl()
getGoogleCalendarConnectionStatus()
disconnectGoogleCalendar()

// Calendars
fetchGoogleCalendars()
saveCalendarSources(payload)
getCalendarSources()

// Sync
syncCalendarSource(sourceId)
syncAllCalendarSources()
performInitialImport()

// Mappings
getHomeStayCandidates(childId?)
createMappingRule(payload)
getMappingRules(childId?)
deleteMappingRule(mappingId)
ignoreCandidates(eventIds)
ignoreCandidatesByTitle(title, calendarId, childId)
```

## UI Components

```
src/app/settings/integrations/
├── page.tsx                          # Main integrations page
└── google-calendar/
    ├── select/page.tsx               # Calendar selection
    ├── map/page.tsx                  # Mapping wizard
    └── mappings/page.tsx             # Manage mapping rules
```

## Permissions & Safety

- Only parents/guardians can:
  - Connect Google Calendar
  - Create mapping rules
  - Confirm imported Home Stays
- Non-parents can view imported events but not map or confirm
- Imported events are read-only (no edit/delete in Homes.kids)

## UI Indicators

- Imported events show a small Google icon
- Event detail panel shows "Imported from Google Calendar"
- "View in Google Calendar" link opens event in new tab
- Read-only notice if user tries to edit

## Not Included (Future Phases)
- Combined view across all children
- Apple Calendar / Outlook integration
- Two-way sync (optional)
- Email/push notifications
- Recurring event patterns

## File Locations

```
src/
├── lib/calendar/
│   ├── types.ts          # TypeScript types
│   ├── actions.ts        # Server actions
│   ├── CalendarContext.tsx
│   └── index.ts
├── lib/google-calendar/
│   ├── types.ts          # Google Calendar types
│   ├── oauth.ts          # OAuth flow
│   ├── sync.ts           # Sync engine
│   ├── mappings.ts       # Mapping rules
│   └── index.ts
├── components/calendar/   # UI components
├── app/calendar/page.tsx  # Main page
├── app/api/google-calendar/callback/route.ts  # OAuth callback
├── app/settings/integrations/
│   ├── page.tsx
│   └── google-calendar/
│       ├── select/page.tsx
│       ├── map/page.tsx
│       └── mappings/page.tsx

supabase-migration-012-calendar-events.sql     # Phase 1 migration
supabase-migration-013-google-calendar.sql     # Phase 2 migration
```
