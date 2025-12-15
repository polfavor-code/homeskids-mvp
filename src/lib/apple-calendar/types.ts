/**
 * Apple/iCloud Calendar Integration Types
 * ========================================
 * Types for ICS URL-based calendar import.
 */

// ============================================
// External Calendar Source Types
// ============================================

export interface ExternalCalendarSource {
    id: string;
    userId: string;
    childId: string;
    provider: 'google' | 'ics';
    displayName: string;
    active: boolean;
    lastSyncedAt: Date | null;
    lastSyncStatus: 'ok' | 'error' | null;
    lastSyncError: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExternalCalendarSourceRow {
    id: string;
    user_id: string;
    child_id: string;
    provider: 'google' | 'ics';
    display_name: string;
    active: boolean;
    last_synced_at: string | null;
    last_sync_status: 'ok' | 'error' | null;
    last_sync_error: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// ICS Source Types
// ============================================

export interface IcsSource {
    sourceId: string;
    icsUrlEncrypted: string;
    icsUrlHash: string;
    etag: string | null;
    lastModified: string | null;
    refreshIntervalMinutes: number;
    nextRunAt: Date | null;
    revokedAt: Date | null;
}

export interface IcsSourceRow {
    source_id: string;
    ics_url_encrypted: string;
    ics_url_hash: string;
    etag: string | null;
    last_modified: string | null;
    refresh_interval_minutes: number;
    next_run_at: string | null;
    revoked_at: string | null;
}

// Combined view for UI
export interface IcsCalendarSource extends ExternalCalendarSource {
    maskedUrl: string;
    etag: string | null;
    lastModified: string | null;
    refreshIntervalMinutes: number;
    nextRunAt: Date | null;
}

// ============================================
// ICS Event Types (parsed from ICS file)
// ============================================

export interface IcsEvent {
    uid: string;
    summary: string;
    description: string | null;
    location: string | null;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    timezone: string | null;
    recurrenceRule: string | null;
    lastModified: Date | null;
    sequence: number;
}

export interface IcsParseResult {
    events: IcsEvent[];
    calendarName: string | null;
    timezone: string | null;
    error: string | null;
}

// ============================================
// Sync Types
// ============================================

export interface IcsSyncResult {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    candidatesFound: number;
    errors: string[];
    notModified?: boolean;
}

export interface IcsFetchResult {
    data: string | null;
    etag: string | null;
    lastModified: string | null;
    notModified: boolean;
    error: string | null;
}

// ============================================
// API Payloads
// ============================================

export interface ConnectIcsCalendarPayload {
    icsUrl: string;
    childId: string;
    displayName?: string;
}

export interface ConnectIcsCalendarResponse {
    success: boolean;
    sourceId?: string;
    displayName?: string;
    maskedUrl?: string;
    initialImport?: {
        eventsImported: number;
        candidatesFound: number;
    };
    error?: string;
}

export interface IcsSourceDisplay {
    id: string;
    childId: string;
    childName: string;
    displayName: string;
    maskedUrl: string;
    active: boolean;
    lastSyncedAt: Date | null;
    lastSyncStatus: 'ok' | 'error' | null;
    lastSyncError: string | null;
}

// ============================================
// Safe Error Messages
// ============================================

export const ICS_ERROR_MESSAGES: Record<string, string> = {
    UNREACHABLE: 'Calendar link unreachable',
    EXPIRED: 'Calendar link expired, replace it',
    AUTH_REQUIRED: 'Calendar requires login, use a public iCloud link',
    INVALID_FORMAT: 'Invalid calendar format',
    TOO_LARGE: 'Calendar file too large',
    TOO_MANY_EVENTS: 'Too many recurring events. Use a smaller calendar.',
    TIMEOUT: 'Calendar took too long to load',
    UNKNOWN: 'Could not sync calendar',
};

// ============================================
// Helper Functions
// ============================================

export function sourceRowToSource(row: ExternalCalendarSourceRow): ExternalCalendarSource {
    return {
        id: row.id,
        userId: row.user_id,
        childId: row.child_id,
        provider: row.provider,
        displayName: row.display_name,
        active: row.active,
        lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
        lastSyncStatus: row.last_sync_status,
        lastSyncError: row.last_sync_error,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export function icsSourceRowToIcsSource(row: IcsSourceRow): IcsSource {
    return {
        sourceId: row.source_id,
        icsUrlEncrypted: row.ics_url_encrypted,
        icsUrlHash: row.ics_url_hash,
        etag: row.etag,
        lastModified: row.last_modified,
        refreshIntervalMinutes: row.refresh_interval_minutes,
        nextRunAt: row.next_run_at ? new Date(row.next_run_at) : null,
        revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    };
}

// ============================================
// Candidate Detection Heuristics
// ============================================

// Keywords that suggest a home stay
export const HOME_STAY_KEYWORDS = [
    // Parents
    'daddy', 'dad', 'father', 'papa', 'dada',
    'mommy', 'mom', 'mother', 'mama', 'mummy', 'mum',
    // Grandparents
    'grandma', 'grandmother', 'nana', 'granny', 'oma',
    'grandpa', 'grandfather', 'gramps', 'granddad', 'opa',
    // Other relatives
    'aunt', 'auntie', 'uncle',
    // Generic
    'home', 'house', 'stay', 'custody',
];

/**
 * Check if an ICS event qualifies as a Home Stay candidate
 */
export function isIcsHomeStayCandidate(event: IcsEvent): { 
    isCandidate: boolean; 
    reason: 'all_day' | 'multi_day' | 'recurring' | 'title_match' | null 
} {
    // All-day events are candidates
    if (event.allDay) {
        return { isCandidate: true, reason: 'all_day' };
    }
    
    // Multi-day events (>= 24 hours)
    const durationMs = event.endAt.getTime() - event.startAt.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours >= 24) {
        return { isCandidate: true, reason: 'multi_day' };
    }
    
    // Recurring events
    if (event.recurrenceRule) {
        return { isCandidate: true, reason: 'recurring' };
    }
    
    // Title match
    const titleLower = event.summary.toLowerCase();
    for (const keyword of HOME_STAY_KEYWORDS) {
        if (titleLower.includes(keyword)) {
            return { isCandidate: true, reason: 'title_match' };
        }
    }
    
    return { isCandidate: false, reason: null };
}

// ============================================
// Sync Range Constants
// ============================================

export const ICS_SYNC_RANGE = {
    PAST_MONTHS: 6,
    FUTURE_MONTHS: 12,
    MAX_OCCURRENCES: 2000, // Hard cap for recurring event expansion
};

// ============================================
// Rate Limiting
// ============================================

export const ICS_RATE_LIMITS = {
    MIN_SYNC_INTERVAL_MINUTES: 5, // No more than once per 5 minutes per source
    DEFAULT_REFRESH_MINUTES: 30,
    MAX_SOURCES_PER_RUN: 10, // Avoid stampede
};
