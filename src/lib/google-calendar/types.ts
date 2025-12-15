// ============================================
// Google Calendar Integration Types
// ============================================

// ============================================
// OAuth & Connection Types
// ============================================

export interface GoogleCalendarConnection {
    id: string;
    userId: string;
    googleAccountEmail: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date;
    grantedScopes: string[];
    connectedAt: Date;
    revokedAt: Date | null;
}

export interface GoogleCalendarConnectionRow {
    id: string;
    user_id: string;
    google_account_email: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string;
    granted_scopes: string[];
    connected_at: string;
    revoked_at: string | null;
}

// ============================================
// Calendar Source Types
// ============================================

export interface GoogleCalendarSource {
    id: string;
    userId: string;
    connectionId: string;
    googleCalendarId: string;
    googleCalendarName: string;
    googleCalendarColor: string | null;
    isPrimary: boolean;
    childId: string;
    active: boolean;
    syncToken: string | null;
    lastSyncedAt: Date | null;
    lastSyncError: string | null;
}

export interface GoogleCalendarSourceRow {
    id: string;
    user_id: string;
    connection_id: string;
    google_calendar_id: string;
    google_calendar_name: string;
    google_calendar_color: string | null;
    is_primary: boolean;
    child_id: string;
    active: boolean;
    sync_token: string | null;
    last_synced_at: string | null;
    last_sync_error: string | null;
}

// ============================================
// Google API Response Types
// ============================================

export interface GoogleCalendarListItem {
    id: string;
    summary: string;
    description?: string;
    primary?: boolean;
    backgroundColor?: string;
    foregroundColor?: string;
    accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
    selected?: boolean;
}

export interface GoogleCalendarEvent {
    id: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    htmlLink: string;
    summary?: string;
    description?: string;
    location?: string;
    start: {
        date?: string;      // All-day event (YYYY-MM-DD)
        dateTime?: string;  // Specific time (ISO 8601)
        timeZone?: string;
    };
    end: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    recurrence?: string[];  // RRULE strings
    recurringEventId?: string;
    originalStartTime?: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    updated: string;
    created: string;
    creator?: {
        email: string;
        displayName?: string;
        self?: boolean;
    };
    organizer?: {
        email: string;
        displayName?: string;
        self?: boolean;
    };
}

export interface GoogleCalendarEventsResponse {
    kind: string;
    etag: string;
    summary: string;
    updated: string;
    timeZone: string;
    accessRole: string;
    nextPageToken?: string;
    nextSyncToken?: string;
    items: GoogleCalendarEvent[];
}

// ============================================
// Mapping Rule Types
// ============================================

export type MatchType = 'event_id' | 'title_exact' | 'title_contains';
export type ResultingEventType = 'home_day' | 'event';
export type CandidateReason = 'all_day' | 'multi_day' | 'recurring' | 'title_match';

export interface CalendarEventMapping {
    id: string;
    source: 'google' | 'apple' | 'outlook';
    googleCalendarId: string | null;
    childId: string;
    matchType: MatchType;
    matchValue: string;
    homeId: string | null;
    resultingEventType: ResultingEventType;
    autoConfirm: boolean;
    priority: number;
    active: boolean;
    createdBy: string;
    createdAt: Date;
}

export interface CalendarEventMappingRow {
    id: string;
    source: string;
    google_calendar_id: string | null;
    child_id: string;
    match_type: string;
    match_value: string;
    home_id: string | null;
    resulting_event_type: string;
    auto_confirm: boolean;
    priority: number;
    active: boolean;
    created_by: string;
    created_at: string;
}

// ============================================
// Home Stay Candidate Types
// ============================================

export interface HomeStayCandidate {
    eventId: string;
    title: string;
    calendarName: string;
    calendarId: string;
    childId: string;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    recurrenceRule: string | null;
    candidateReason: CandidateReason;
    occurrenceCount?: number;
}

export interface CandidateGroup {
    title: string;
    calendarId: string;
    calendarName: string;
    childId: string;
    candidates: HomeStayCandidate[];
    recurrenceInfo?: string;
    suggestedMatchType: MatchType;
}

// ============================================
// Sync Types
// ============================================

export interface SyncResult {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    errors: string[];
    nextSyncToken?: string;
}

export interface ImportedEventUpdate {
    eventId: string;
    changes: {
        title?: string;
        startAt?: Date;
        endAt?: Date;
        allDay?: boolean;
        status?: string;
    };
    requiresReconfirmation: boolean;
}

// ============================================
// UI State Types
// ============================================

export interface CalendarSelectionState {
    calendars: GoogleCalendarListItem[];
    selectedCalendars: Map<string, string>; // calendarId -> childId
    loading: boolean;
    error: string | null;
}

export interface MappingWizardState {
    step: 'loading' | 'candidates' | 'mapping' | 'complete';
    candidateGroups: CandidateGroup[];
    currentGroupIndex: number;
    mappings: CreateMappingPayload[];
}

// ============================================
// API Payloads
// ============================================

export interface CreateMappingPayload {
    childId: string;
    googleCalendarId: string;
    matchType: MatchType;
    matchValue: string;
    homeId: string | null;
    resultingEventType: ResultingEventType;
    autoConfirm?: boolean;
}

export interface SaveCalendarSourcesPayload {
    calendars: {
        googleCalendarId: string;
        googleCalendarName: string;
        googleCalendarColor?: string;
        isPrimary: boolean;
        childId: string;
    }[];
}

// ============================================
// Helper Functions
// ============================================

export function connectionRowToConnection(row: GoogleCalendarConnectionRow): GoogleCalendarConnection {
    return {
        id: row.id,
        userId: row.user_id,
        googleAccountEmail: row.google_account_email,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        tokenExpiresAt: new Date(row.token_expires_at),
        grantedScopes: row.granted_scopes,
        connectedAt: new Date(row.connected_at),
        revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    };
}

export function sourceRowToSource(row: GoogleCalendarSourceRow): GoogleCalendarSource {
    return {
        id: row.id,
        userId: row.user_id,
        connectionId: row.connection_id,
        googleCalendarId: row.google_calendar_id,
        googleCalendarName: row.google_calendar_name,
        googleCalendarColor: row.google_calendar_color,
        isPrimary: row.is_primary,
        childId: row.child_id,
        active: row.active,
        syncToken: row.sync_token,
        lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
        lastSyncError: row.last_sync_error,
    };
}

export function mappingRowToMapping(row: CalendarEventMappingRow): CalendarEventMapping {
    return {
        id: row.id,
        source: row.source as 'google' | 'apple' | 'outlook',
        googleCalendarId: row.google_calendar_id,
        childId: row.child_id,
        matchType: row.match_type as MatchType,
        matchValue: row.match_value,
        homeId: row.home_id,
        resultingEventType: row.resulting_event_type as ResultingEventType,
        autoConfirm: row.auto_confirm,
        priority: row.priority,
        active: row.active,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
    };
}

/**
 * Parse Google event dates to JavaScript Dates
 */
export function parseGoogleEventDates(event: GoogleCalendarEvent): { startAt: Date; endAt: Date; allDay: boolean } {
    const allDay = !!event.start.date;

    let startAt: Date;
    let endAt: Date;

    if (allDay) {
        // All-day events use date strings (YYYY-MM-DD)
        // Parse as UTC midnight by appending 'Z' to avoid local timezone issues
        // Google end dates are exclusive (e.g., single day Dec 16 = start: Dec 16, end: Dec 17)
        startAt = new Date(event.start.date + 'T00:00:00Z');
        
        // For end, use the actual end date Google provides (which is exclusive)
        // and set it to UTC midnight of that day (so Dec 17 00:00:00Z for a Dec 16 event)
        // This ensures end > start always
        endAt = new Date(event.end.date + 'T00:00:00Z');
        
        // If somehow end <= start (shouldn't happen but safety check), add 1 day in milliseconds
        if (endAt <= startAt) {
            endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
        }
    } else {
        startAt = new Date(event.start.dateTime!);
        endAt = new Date(event.end.dateTime!);
        
        // Safety check for timed events too
        if (endAt <= startAt) {
            endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // Add 1 hour
        }
    }

    return { startAt, endAt, allDay };
}

/**
 * Check if an event qualifies as a Home Stay candidate
 */
export function isHomeStayCandidate(event: GoogleCalendarEvent): { isCandidate: boolean; reason: CandidateReason | null } {
    // All-day events are candidates
    if (event.start.date) {
        return { isCandidate: true, reason: 'all_day' };
    }
    
    // Multi-day events (>= 24 hours)
    if (event.start.dateTime && event.end.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (durationHours >= 24) {
            return { isCandidate: true, reason: 'multi_day' };
        }
    }
    
    // Recurring events
    if (event.recurrence && event.recurrence.length > 0) {
        return { isCandidate: true, reason: 'recurring' };
    }
    
    return { isCandidate: false, reason: null };
}

/**
 * Generate human-readable recurrence description
 */
export function describeRecurrence(rrule: string): string {
    if (!rrule) return '';
    
    // Simple parsing for common patterns
    const freqMatch = rrule.match(/FREQ=(\w+)/);
    const byDayMatch = rrule.match(/BYDAY=([^;]+)/);
    
    if (!freqMatch) return 'Recurring';
    
    const freq = freqMatch[1];
    const days = byDayMatch ? byDayMatch[1].split(',') : [];
    
    const dayNames: Record<string, string> = {
        'MO': 'Mon', 'TU': 'Tue', 'WE': 'Wed', 'TH': 'Thu',
        'FR': 'Fri', 'SA': 'Sat', 'SU': 'Sun'
    };
    
    if (freq === 'WEEKLY' && days.length > 0) {
        const dayList = days.map(d => dayNames[d] || d).join(', ');
        return `Every ${dayList}`;
    }
    
    if (freq === 'DAILY') return 'Every day';
    if (freq === 'WEEKLY') return 'Every week';
    if (freq === 'MONTHLY') return 'Every month';
    
    return 'Recurring';
}

// ============================================
// Constants
// ============================================

export const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];

export const SYNC_RANGE = {
    PAST_MONTHS: 6,
    FUTURE_MONTHS: 12,
};
