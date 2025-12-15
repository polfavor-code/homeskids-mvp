/**
 * ICS Parser for Homes.kids
 * =========================
 * Parses ICS (iCalendar) files into structured events.
 * Handles VEVENT components with basic recurrence expansion.
 */

import { IcsEvent, IcsParseResult, ICS_SYNC_RANGE } from './types';

// ============================================
// ICS Parsing
// ============================================

/**
 * Parse an ICS string into events.
 */
export function parseIcs(icsContent: string): IcsParseResult {
    try {
        const lines = unfoldLines(icsContent);
        const calendarName = extractProperty(lines, 'X-WR-CALNAME') || 
                            extractProperty(lines, 'PRODID') ||
                            null;
        const calendarTimezone = extractProperty(lines, 'X-WR-TIMEZONE') || null;
        
        const events: IcsEvent[] = [];
        const vevents = extractComponents(lines, 'VEVENT');
        
        for (const vevent of vevents) {
            try {
                const event = parseVevent(vevent, calendarTimezone);
                if (event) {
                    // Expand recurring events if needed
                    const expanded = expandRecurrence(event);
                    events.push(...expanded);
                }
            } catch (eventError) {
                console.error('Error parsing VEVENT:', eventError);
                // Skip malformed events but continue parsing
            }
        }
        
        return {
            events,
            calendarName,
            timezone: calendarTimezone,
            error: null,
        };
    } catch (error) {
        console.error('Error parsing ICS:', error);
        return {
            events: [],
            calendarName: null,
            timezone: null,
            error: error instanceof Error ? error.message : 'Failed to parse ICS',
        };
    }
}

/**
 * Unfold wrapped lines in ICS content.
 * Lines starting with space/tab are continuations.
 */
function unfoldLines(content: string): string[] {
    // Normalize line endings
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    
    const unfolded: string[] = [];
    let currentLine = '';
    
    for (const line of lines) {
        if (line.startsWith(' ') || line.startsWith('\t')) {
            // Continuation line
            currentLine += line.substring(1);
        } else {
            if (currentLine) {
                unfolded.push(currentLine);
            }
            currentLine = line;
        }
    }
    
    if (currentLine) {
        unfolded.push(currentLine);
    }
    
    return unfolded;
}

/**
 * Extract a property value from ICS lines.
 */
function extractProperty(lines: string[], propName: string): string | null {
    const prefix = propName + ':';
    const prefixWithParams = propName + ';';
    
    for (const line of lines) {
        if (line.startsWith(prefix)) {
            return line.substring(prefix.length).trim();
        }
        if (line.startsWith(prefixWithParams)) {
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1) {
                return line.substring(colonIdx + 1).trim();
            }
        }
    }
    
    return null;
}

/**
 * Extract all components of a given type.
 */
function extractComponents(lines: string[], componentType: string): string[][] {
    const components: string[][] = [];
    let currentComponent: string[] | null = null;
    let depth = 0;
    
    const beginMarker = `BEGIN:${componentType}`;
    const endMarker = `END:${componentType}`;
    
    for (const line of lines) {
        if (line === beginMarker) {
            if (depth === 0) {
                currentComponent = [];
            }
            depth++;
        }
        
        if (currentComponent !== null && depth > 0) {
            currentComponent.push(line);
        }
        
        if (line === endMarker) {
            depth--;
            if (depth === 0 && currentComponent !== null) {
                components.push(currentComponent);
                currentComponent = null;
            }
        }
    }
    
    return components;
}

/**
 * Parse a VEVENT component into an IcsEvent.
 */
function parseVevent(lines: string[], defaultTimezone: string | null): IcsEvent | null {
    const uid = extractProperty(lines, 'UID');
    const summary = extractProperty(lines, 'SUMMARY') || 'Untitled Event';
    const description = extractProperty(lines, 'DESCRIPTION');
    const location = extractProperty(lines, 'LOCATION');
    const rrule = extractProperty(lines, 'RRULE');
    const sequence = parseInt(extractProperty(lines, 'SEQUENCE') || '0', 10);
    
    // Parse dates
    const dtstart = parseDateProperty(lines, 'DTSTART', defaultTimezone);
    const dtend = parseDateProperty(lines, 'DTEND', defaultTimezone);
    const duration = extractProperty(lines, 'DURATION');
    
    if (!dtstart || !uid) {
        return null;
    }
    
    // Calculate end time
    let endAt: Date;
    let allDay = dtstart.allDay;
    
    if (dtend) {
        endAt = dtend.date;
        allDay = allDay && dtend.allDay;
    } else if (duration) {
        endAt = addDuration(dtstart.date, duration);
    } else {
        // Default: 1 hour for timed, next day for all-day
        if (allDay) {
            endAt = new Date(dtstart.date);
            endAt.setDate(endAt.getDate() + 1);
        } else {
            endAt = new Date(dtstart.date);
            endAt.setHours(endAt.getHours() + 1);
        }
    }
    
    // Parse last modified
    const lastModifiedStr = extractProperty(lines, 'LAST-MODIFIED');
    const lastModified = lastModifiedStr ? parseIcsDateTime(lastModifiedStr) : null;
    
    return {
        uid,
        summary: unescapeIcs(summary),
        description: description ? unescapeIcs(description) : null,
        location: location ? unescapeIcs(location) : null,
        startAt: dtstart.date,
        endAt,
        allDay,
        timezone: dtstart.timezone || defaultTimezone,
        recurrenceRule: rrule,
        lastModified,
        sequence,
    };
}

/**
 * Parse a date property (DTSTART, DTEND) with parameters.
 */
function parseDateProperty(
    lines: string[], 
    propName: string, 
    defaultTimezone: string | null
): { date: Date; allDay: boolean; timezone: string | null } | null {
    // Find the line with the property
    let propertyLine: string | null = null;
    for (const line of lines) {
        if (line.startsWith(propName + ':') || line.startsWith(propName + ';')) {
            propertyLine = line;
            break;
        }
    }
    
    if (!propertyLine) {
        return null;
    }
    
    // Parse parameters and value
    const colonIdx = propertyLine.indexOf(':');
    const params = propertyLine.substring(0, colonIdx);
    const value = propertyLine.substring(colonIdx + 1).trim();
    
    // Check for VALUE=DATE (all-day event)
    const allDay = params.includes('VALUE=DATE') && !params.includes('VALUE=DATE-TIME');
    
    // Extract timezone from TZID parameter
    const tzidMatch = params.match(/TZID=([^;:]+)/);
    const timezone = tzidMatch ? tzidMatch[1] : null;
    
    // Parse the date value
    const date = parseIcsDateTime(value, allDay);
    
    if (!date) {
        return null;
    }
    
    return {
        date,
        allDay,
        timezone: timezone || defaultTimezone,
    };
}

/**
 * Parse an ICS date-time string.
 */
function parseIcsDateTime(value: string, allDay = false): Date | null {
    if (!value) return null;
    
    // Remove any quotes
    value = value.replace(/"/g, '').trim();
    
    if (allDay || value.length === 8) {
        // All-day: YYYYMMDD
        const year = parseInt(value.substring(0, 4), 10);
        const month = parseInt(value.substring(4, 6), 10) - 1;
        const day = parseInt(value.substring(6, 8), 10);
        return new Date(year, month, day);
    }
    
    // Date-time: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const isUtc = value.endsWith('Z');
    const dateStr = isUtc ? value.slice(0, -1) : value;
    
    if (dateStr.length < 15) return null;
    
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    const hour = parseInt(dateStr.substring(9, 11), 10);
    const minute = parseInt(dateStr.substring(11, 13), 10);
    const second = parseInt(dateStr.substring(13, 15), 10);
    
    if (isUtc) {
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    
    return new Date(year, month, day, hour, minute, second);
}

/**
 * Add a duration string (e.g., P1D, PT1H30M) to a date.
 */
function addDuration(date: Date, duration: string): Date {
    const result = new Date(date);
    
    // Parse ISO 8601 duration: P[n]Y[n]M[n]DT[n]H[n]M[n]S
    const dayMatch = duration.match(/(\d+)D/);
    const hourMatch = duration.match(/(\d+)H/);
    const minuteMatch = duration.match(/(\d+)M(?![^T]*$)/); // M before T is months, after is minutes
    const secondMatch = duration.match(/(\d+)S/);
    const weekMatch = duration.match(/(\d+)W/);
    
    if (weekMatch) {
        result.setDate(result.getDate() + parseInt(weekMatch[1], 10) * 7);
    }
    if (dayMatch) {
        result.setDate(result.getDate() + parseInt(dayMatch[1], 10));
    }
    if (hourMatch) {
        result.setHours(result.getHours() + parseInt(hourMatch[1], 10));
    }
    if (minuteMatch) {
        result.setMinutes(result.getMinutes() + parseInt(minuteMatch[1], 10));
    }
    if (secondMatch) {
        result.setSeconds(result.getSeconds() + parseInt(secondMatch[1], 10));
    }
    
    return result;
}

/**
 * Unescape ICS text content.
 */
function unescapeIcs(text: string): string {
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

// ============================================
// Recurrence Expansion
// ============================================

/**
 * Expand a recurring event into individual occurrences.
 * Limited to the sync range to avoid explosion.
 */
function expandRecurrence(event: IcsEvent): IcsEvent[] {
    if (!event.recurrenceRule) {
        return [event];
    }
    
    // Parse the RRULE
    const rule = parseRrule(event.recurrenceRule);
    if (!rule) {
        return [event];
    }
    
    // Calculate sync window
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setMonth(windowStart.getMonth() - ICS_SYNC_RANGE.PAST_MONTHS);
    const windowEnd = new Date(now);
    windowEnd.setMonth(windowEnd.getMonth() + ICS_SYNC_RANGE.FUTURE_MONTHS);
    
    const occurrences: IcsEvent[] = [];
    const duration = event.endAt.getTime() - event.startAt.getTime();
    
    // Generate occurrences
    let currentDate = new Date(event.startAt);
    let count = 0;
    
    while (count < ICS_SYNC_RANGE.MAX_OCCURRENCES) {
        // Check if we've passed the end
        if (rule.until && currentDate > rule.until) break;
        if (rule.count && count >= rule.count) break;
        if (currentDate > windowEnd) break;
        
        // Only include occurrences within the window
        if (currentDate >= windowStart) {
            const occurrence: IcsEvent = {
                ...event,
                // Create unique ID for this occurrence
                uid: `${event.uid}_${currentDate.toISOString()}`,
                startAt: new Date(currentDate),
                endAt: new Date(currentDate.getTime() + duration),
            };
            occurrences.push(occurrence);
        }
        
        // Move to next occurrence
        currentDate = getNextOccurrence(currentDate, rule);
        count++;
    }
    
    return occurrences.length > 0 ? occurrences : [event];
}

interface RruleParams {
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval: number;
    until: Date | null;
    count: number | null;
    byDay: string[] | null;
    byMonthDay: number[] | null;
}

/**
 * Parse an RRULE string into parameters.
 */
function parseRrule(rrule: string): RruleParams | null {
    const params: Partial<RruleParams> = {
        interval: 1,
        until: null,
        count: null,
        byDay: null,
        byMonthDay: null,
    };
    
    const parts = rrule.split(';');
    
    for (const part of parts) {
        const [key, value] = part.split('=');
        
        switch (key) {
            case 'FREQ':
                if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(value)) {
                    params.freq = value as RruleParams['freq'];
                }
                break;
            case 'INTERVAL':
                params.interval = parseInt(value, 10) || 1;
                break;
            case 'UNTIL':
                params.until = parseIcsDateTime(value);
                break;
            case 'COUNT':
                params.count = parseInt(value, 10);
                break;
            case 'BYDAY':
                params.byDay = value.split(',');
                break;
            case 'BYMONTHDAY':
                params.byMonthDay = value.split(',').map(d => parseInt(d, 10));
                break;
        }
    }
    
    if (!params.freq) {
        return null;
    }
    
    return params as RruleParams;
}

/**
 * Get the next occurrence date based on recurrence rule.
 */
function getNextOccurrence(current: Date, rule: RruleParams): Date {
    const next = new Date(current);
    
    switch (rule.freq) {
        case 'DAILY':
            next.setDate(next.getDate() + rule.interval);
            break;
            
        case 'WEEKLY':
            if (rule.byDay && rule.byDay.length > 0) {
                // Find next matching day
                const dayMap: Record<string, number> = {
                    'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3,
                    'TH': 4, 'FR': 5, 'SA': 6
                };
                const targetDays = rule.byDay.map(d => dayMap[d.replace(/[0-9-]/g, '')]).filter(d => d !== undefined);
                
                do {
                    next.setDate(next.getDate() + 1);
                } while (!targetDays.includes(next.getDay()));
            } else {
                next.setDate(next.getDate() + 7 * rule.interval);
            }
            break;
            
        case 'MONTHLY':
            if (rule.byMonthDay && rule.byMonthDay.length > 0) {
                // Find next matching day in current or next month
                const targetDay = rule.byMonthDay[0];
                if (next.getDate() >= targetDay) {
                    next.setMonth(next.getMonth() + rule.interval);
                }
                next.setDate(targetDay);
            } else {
                next.setMonth(next.getMonth() + rule.interval);
            }
            break;
            
        case 'YEARLY':
            next.setFullYear(next.getFullYear() + rule.interval);
            break;
    }
    
    return next;
}

// ============================================
// Date Formatting for ICS
// ============================================

/**
 * Format a date as ICS date-time string.
 */
export function formatIcsDateTime(date: Date, utc = true): string {
    if (utc) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        const h = String(date.getUTCHours()).padStart(2, '0');
        const min = String(date.getUTCMinutes()).padStart(2, '0');
        const s = String(date.getUTCSeconds()).padStart(2, '0');
        return `${y}${m}${d}T${h}${min}${s}Z`;
    }
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}${m}${da}T${h}${min}${s}`;
}
