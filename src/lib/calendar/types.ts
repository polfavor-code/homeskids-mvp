/**
 * Calendar Types for Homes.kids
 * ==============================
 * TypeScript types for calendar events, home days, and related operations.
 */

// Event type discriminator
export type EventType = 'home_day' | 'event';

// Status for home day confirmation workflow
export type EventStatus = 'confirmed' | 'proposed' | 'rejected';

// Event source (manual or external)
export type EventSource = 'manual' | 'google' | 'apple' | 'outlook' | 'ics';

// Calendar event as stored in database
export interface CalendarEvent {
    id: string;
    childId: string;
    
    // Event details
    title: string;
    description: string | null;
    
    // Timing
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    timezone: string | null;
    
    // Type and status
    eventType: EventType;
    homeId: string | null;
    status: EventStatus;
    
    // Proposal/confirmation tracking
    proposedBy: string | null;
    confirmedBy: string | null;
    confirmedAt: Date | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
    proposalReason: string | null;
    
    // External event tracking (for Google Calendar imports)
    source: EventSource;
    externalProvider: string | null;
    externalCalendarId: string | null;
    externalEventId: string | null;
    externalHtmlLink: string | null;
    isReadOnly: boolean;
    
    // Audit
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

// Raw database row shape (snake_case)
export interface CalendarEventRow {
    id: string;
    child_id: string;
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    all_day: boolean;
    timezone: string | null;
    event_type: EventType;
    home_id: string | null;
    status: EventStatus;
    proposed_by: string | null;
    confirmed_by: string | null;
    confirmed_at: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
    proposal_reason: string | null;
    is_deleted: boolean;
    source: EventSource;
    external_provider: string | null;
    external_calendar_id: string | null;
    external_event_id: string | null;
    external_html_link: string | null;
    is_read_only: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// Enriched event with home and user info for display
export interface CalendarEventDisplay extends CalendarEvent {
    // Home info (for home_day)
    homeName?: string;
    homeColor?: string;
    
    // User info
    createdByName?: string;
    proposedByName?: string;
    confirmedByName?: string;
    rejectedByName?: string;
    
    // UI state
    canConfirm?: boolean;
    canReject?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    
    // Eligible confirmers (for pending home days)
    eligibleConfirmers?: { userId: string; userName: string }[];
}

// Payload for creating a regular event
export interface CreateEventPayload {
    childId: string;
    title: string;
    description?: string;
    startAt: Date;
    endAt: Date;
    allDay?: boolean;
    timezone?: string;
}

// Payload for creating a home day proposal
export interface CreateHomeDayPayload {
    childId: string;
    homeId: string;
    startAt: Date;
    endAt: Date;
    allDay?: boolean;
    title?: string; // Optional custom title, defaults to home name
    proposalReason?: string;
    timezone?: string;
}

// Payload for updating an event
export interface UpdateEventPayload {
    title?: string;
    description?: string;
    startAt?: Date;
    endAt?: Date;
    allDay?: boolean;
}

// Filter options for listing events
export interface ListEventsFilter {
    childId: string;
    rangeStart: Date;
    rangeEnd: Date;
    eventTypes?: EventType[];
    statuses?: EventStatus[];
    includeRejected?: boolean;
}

// Notification types
export type NotificationType = 'proposal' | 'confirmed' | 'rejected';

export interface CalendarNotification {
    id: string;
    eventId: string;
    userId: string;
    notificationType: NotificationType;
    isRead: boolean;
    createdAt: Date;
    
    // Enriched data
    event?: CalendarEventDisplay;
}

// API response types
export interface ListEventsResponse {
    events: CalendarEventDisplay[];
    error?: string;
}

export interface CreateEventResponse {
    event?: CalendarEventDisplay;
    error?: string;
}

export interface ConfirmHomeDayResponse {
    success: boolean;
    event?: CalendarEventDisplay;
    error?: string;
}

export interface DeleteEventResponse {
    success: boolean;
    error?: string;
}

// Home colors for visual distinction
export const HOME_COLORS: Record<string, string> = {
    default: '#4CA1AF', // teal
    daddy: '#3B82F6',   // blue
    mommy: '#EC4899',   // pink
    grandma: '#8B5CF6', // purple
    grandpa: '#F59E0B', // amber
};

// Get a color for a home based on name
export function getHomeColor(homeName: string): string {
    const name = homeName.toLowerCase();
    if (name.includes('dad') || name.includes('daddy') || name.includes('father')) {
        return HOME_COLORS.daddy;
    }
    if (name.includes('mom') || name.includes('mommy') || name.includes('mother')) {
        return HOME_COLORS.mommy;
    }
    if (name.includes('grandma') || name.includes('grandmother') || name.includes('nana')) {
        return HOME_COLORS.grandma;
    }
    if (name.includes('grandpa') || name.includes('grandfather') || name.includes('papa')) {
        return HOME_COLORS.grandpa;
    }
    return HOME_COLORS.default;
}

// Convert database row to CalendarEvent
export function rowToEvent(row: CalendarEventRow): CalendarEvent {
    return {
        id: row.id,
        childId: row.child_id,
        title: row.title,
        description: row.description,
        startAt: new Date(row.start_at),
        endAt: new Date(row.end_at),
        allDay: row.all_day,
        timezone: row.timezone,
        eventType: row.event_type,
        homeId: row.home_id,
        status: row.status,
        proposedBy: row.proposed_by,
        confirmedBy: row.confirmed_by,
        confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : null,
        rejectedBy: row.rejected_by,
        rejectedAt: row.rejected_at ? new Date(row.rejected_at) : null,
        proposalReason: row.proposal_reason,
        source: row.source || 'manual',
        externalProvider: row.external_provider,
        externalCalendarId: row.external_calendar_id,
        externalEventId: row.external_event_id,
        externalHtmlLink: row.external_html_link,
        isReadOnly: row.is_read_only || false,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

// Date utility functions for calendar
export function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

export function getWeekEnd(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() + (6 - day);
    d.setDate(diff);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

export function formatDateRange(start: Date, end: Date, allDay: boolean): string {
    const startStr = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
    
    if (isSameDay(start, end)) {
        if (allDay) {
            return startStr;
        }
        const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        return `${startStr}, ${timeStr}`;
    }
    
    const endStr = end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
    
    return `${startStr} - ${endStr}`;
}

export function getDaysInMonth(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    
    // Add days from previous month to fill first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        days.push(d);
    }
    
    // Add all days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push(new Date(year, month, d));
    }
    
    // Add days from next month to complete last week
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
        days.push(new Date(year, month + 1, i));
    }
    
    return days;
}
