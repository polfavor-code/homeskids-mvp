import { supabase } from "../supabase";
import { getValidAccessToken } from "./oauth";
import {
    GoogleCalendarListItem,
    GoogleCalendarEvent,
    GoogleCalendarEventsResponse,
    GoogleCalendarSource,
    GoogleCalendarSourceRow,
    sourceRowToSource,
    parseGoogleEventDates,
    isHomeStayCandidate,
    SyncResult,
    SYNC_RANGE,
    SaveCalendarSourcesPayload,
} from "./types";

// ============================================
// Fetch User's Calendars
// ============================================

export async function fetchGoogleCalendars(): Promise<{
    calendars: GoogleCalendarListItem[];
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { calendars: [], error: 'Not authenticated' };
        }
        
        const { accessToken, error: tokenError } = await getValidAccessToken();
        
        if (tokenError || !accessToken) {
            return { calendars: [], error: tokenError || 'No access token' };
        }
        
        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/users/me/calendarList',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Failed to fetch calendars:', error);
            return { calendars: [], error: 'Failed to fetch calendars' };
        }
        
        const data = await response.json();
        
        const calendars: GoogleCalendarListItem[] = (data.items || []).map((item: any) => ({
            id: item.id,
            summary: item.summary || item.id,
            description: item.description,
            primary: item.primary || false,
            backgroundColor: item.backgroundColor,
            foregroundColor: item.foregroundColor,
            accessRole: item.accessRole,
            selected: item.selected,
        }));
        
        // Sort: primary first, then alphabetically
        calendars.sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return a.summary.localeCompare(b.summary);
        });
        
        return { calendars, error: null };
    } catch (err) {
        console.error('Error fetching calendars:', err);
        return { calendars: [], error: 'Failed to fetch calendars' };
    }
}

// ============================================
// Save Calendar Sources
// ============================================

export async function saveCalendarSources(
    payload: SaveCalendarSourcesPayload
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Get the connection
        const { data: connection } = await supabase
            .from('google_calendar_connections')
            .select('id')
            .eq('user_id', user.id)
            .is('revoked_at', null)
            .single();
        
        if (!connection) {
            return { success: false, error: 'No Google Calendar connection found' };
        }
        
        // Deactivate existing sources for this user
        await supabase
            .from('google_calendar_sources')
            .update({ active: false })
            .eq('user_id', user.id);
        
        // Insert or update new sources
        for (const calendar of payload.calendars) {
            const { error } = await supabase
                .from('google_calendar_sources')
                .upsert({
                    user_id: user.id,
                    connection_id: connection.id,
                    google_calendar_id: calendar.googleCalendarId,
                    google_calendar_name: calendar.googleCalendarName,
                    google_calendar_color: calendar.googleCalendarColor,
                    is_primary: calendar.isPrimary,
                    child_id: calendar.childId,
                    active: true,
                }, {
                    onConflict: 'user_id,google_calendar_id',
                });
            
            if (error) {
                console.error('Failed to save calendar source:', error);
                return { success: false, error: 'Failed to save calendar selection' };
            }
        }
        
        return { success: true, error: null };
    } catch (err) {
        console.error('Error saving calendar sources:', err);
        return { success: false, error: 'Failed to save calendar selection' };
    }
}

// ============================================
// Get Calendar Sources
// ============================================

export async function getCalendarSources(): Promise<{
    sources: GoogleCalendarSource[];
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { sources: [], error: 'Not authenticated' };
        }
        
        const { data, error } = await supabase
            .from('google_calendar_sources')
            .select('*')
            .eq('user_id', user.id)
            .eq('active', true);
        
        if (error) {
            return { sources: [], error: 'Failed to fetch calendar sources' };
        }
        
        return {
            sources: (data || []).map((row: GoogleCalendarSourceRow) => sourceRowToSource(row)),
            error: null,
        };
    } catch (err) {
        console.error('Error getting calendar sources:', err);
        return { sources: [], error: 'Failed to get calendar sources' };
    }
}

// ============================================
// Fetch Events from Google Calendar
// ============================================

async function fetchGoogleEvents(
    accessToken: string,
    calendarId: string,
    syncToken?: string | null
): Promise<{
    events: GoogleCalendarEvent[];
    nextSyncToken: string | null;
    error: string | null;
}> {
    try {
        const allEvents: GoogleCalendarEvent[] = [];
        let pageToken: string | undefined;
        let nextSyncToken: string | null = null;
        
        // Calculate time range
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - SYNC_RANGE.PAST_MONTHS);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + SYNC_RANGE.FUTURE_MONTHS);
        
        do {
            const params = new URLSearchParams({
                maxResults: '250',
                singleEvents: 'true', // Expand recurring events
                orderBy: 'startTime',
            });
            
            if (syncToken) {
                // Incremental sync
                params.set('syncToken', syncToken);
            } else {
                // Full sync with time bounds
                params.set('timeMin', timeMin.toISOString());
                params.set('timeMax', timeMax.toISOString());
            }
            
            if (pageToken) {
                params.set('pageToken', pageToken);
            }
            
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
            
            if (response.status === 410) {
                // Sync token expired - need full sync
                return fetchGoogleEvents(accessToken, calendarId, null);
            }
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Failed to fetch events:', error);
                return { events: [], nextSyncToken: null, error: 'Failed to fetch events' };
            }
            
            const data: GoogleCalendarEventsResponse = await response.json();
            
            allEvents.push(...data.items);
            pageToken = data.nextPageToken;
            nextSyncToken = data.nextSyncToken || null;
            
        } while (pageToken);
        
        return { events: allEvents, nextSyncToken, error: null };
    } catch (err) {
        console.error('Error fetching Google events:', err);
        return { events: [], nextSyncToken: null, error: 'Failed to fetch events' };
    }
}

// ============================================
// Sync Calendar Source
// ============================================

export async function syncCalendarSource(
    sourceId: string
): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [],
    };
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            result.errors.push('Not authenticated');
            return result;
        }
        
        // Get the calendar source
        const { data: source } = await supabase
            .from('google_calendar_sources')
            .select('*, google_calendar_connections(*)')
            .eq('id', sourceId)
            .single();
        
        if (!source) {
            result.errors.push('Calendar source not found');
            return result;
        }
        
        // Get valid access token
        const { accessToken, error: tokenError } = await getValidAccessToken();
        
        if (tokenError || !accessToken) {
            result.errors.push(tokenError || 'No access token');
            return result;
        }
        
        // Fetch events from Google
        console.log(`[Google Sync] Fetching events for calendar: ${source.google_calendar_name} (${source.google_calendar_id})`);
        
        const { events, nextSyncToken, error: fetchError } = await fetchGoogleEvents(
            accessToken,
            source.google_calendar_id,
            source.sync_token
        );
        
        console.log(`[Google Sync] Fetched ${events.length} events`);
        
        if (fetchError) {
            console.error(`[Google Sync] Fetch error: ${fetchError}`);
            result.errors.push(fetchError);
            
            // Update source with error
            await supabase
                .from('google_calendar_sources')
                .update({ last_sync_error: fetchError })
                .eq('id', sourceId);
            
            return result;
        }
        
        // Log each event for debugging
        events.forEach(e => {
            console.log(`[Google Sync] Event: "${e.summary}" on ${e.start?.date || e.start?.dateTime}`);
        });
        
        // Process each event
        for (const googleEvent of events) {
            try {
                if (googleEvent.status === 'cancelled') {
                    // Soft delete the event
                    const { data: existing } = await supabase
                        .from('calendar_events')
                        .select('id')
                        .eq('external_event_id', googleEvent.id)
                        .eq('child_id', source.child_id)
                        .single();
                    
                    if (existing) {
                        await supabase
                            .from('calendar_events')
                            .update({
                                is_deleted: true,
                                deleted_at: new Date().toISOString(),
                            })
                            .eq('id', existing.id);
                        result.deleted++;
                    }
                    continue;
                }
                
                // Parse dates
                const { startAt, endAt, allDay } = parseGoogleEventDates(googleEvent);
                
                // Check if home stay candidate
                const { isCandidate, reason } = isHomeStayCandidate(googleEvent);
                
                // Check for existing event
                const { data: existing } = await supabase
                    .from('calendar_events')
                    .select('id, external_updated_at, mapping_rule_id, event_type, status')
                    .eq('external_event_id', googleEvent.id)
                    .eq('child_id', source.child_id)
                    .single();
                
                // Check if there's a mapping rule for this event
                const { data: mappingId } = await supabase.rpc('find_event_mapping', {
                    p_child_id: source.child_id,
                    p_google_calendar_id: source.google_calendar_id,
                    p_external_event_id: googleEvent.id,
                    p_title: googleEvent.summary || '',
                });
                
                // Get mapping details if exists
                let eventType = 'event';
                let homeId: string | null = null;
                let status = 'confirmed';
                let autoConfirm = false;
                
                if (mappingId) {
                    const { data: mapping } = await supabase
                        .from('calendar_event_mappings')
                        .select('*')
                        .eq('id', mappingId)
                        .single();
                    
                    if (mapping) {
                        eventType = mapping.resulting_event_type;
                        homeId = mapping.home_id;
                        autoConfirm = mapping.auto_confirm;
                        
                        if (eventType === 'home_day') {
                            status = autoConfirm ? 'confirmed' : 'proposed';
                        }
                    }
                }
                
                const eventData = {
                    child_id: source.child_id,
                    title: googleEvent.summary || 'Untitled Event',
                    description: googleEvent.description || null,
                    start_at: startAt.toISOString(),
                    end_at: endAt.toISOString(),
                    all_day: allDay,
                    timezone: googleEvent.start.timeZone || null,
                    event_type: eventType,
                    home_id: homeId,
                    status: status,
                    source: 'google',
                    external_provider: 'google',
                    external_calendar_id: source.google_calendar_id,
                    external_event_id: googleEvent.id,
                    external_updated_at: googleEvent.updated,
                    external_html_link: googleEvent.htmlLink,
                    is_home_stay_candidate: isCandidate,
                    candidate_reason: reason,
                    mapping_rule_id: mappingId || null,
                    is_read_only: true,
                    recurrence_rule: googleEvent.recurrence?.[0] || null,
                    is_deleted: false,
                };
                
                if (existing) {
                    // Check if Google event was updated
                    const existingUpdated = new Date(existing.external_updated_at || 0);
                    const googleUpdated = new Date(googleEvent.updated);
                    
                    if (googleUpdated > existingUpdated) {
                        // Event was updated - check if we need to reset confirmation
                        let newStatus = status;
                        if (existing.event_type === 'home_day' && existing.status === 'confirmed') {
                            // If dates changed, require re-confirmation
                            newStatus = 'proposed';
                        }
                        
                        const { error: updateError } = await supabase
                            .from('calendar_events')
                            .update({
                                ...eventData,
                                status: newStatus,
                                confirmed_by: newStatus === 'proposed' ? null : undefined,
                                confirmed_at: newStatus === 'proposed' ? null : undefined,
                            })
                            .eq('id', existing.id);
                        
                        if (updateError) {
                            console.error(`[Google Sync] Failed to update event "${googleEvent.summary}":`, updateError);
                        } else {
                            console.log(`[Google Sync] Updated event: "${googleEvent.summary}"`);
                            result.updated++;
                        }
                    }
                } else {
                    // New event
                    console.log(`[Google Sync] Inserting new event: "${googleEvent.summary}" for child: ${source.child_id}`);
                    
                    const { error: insertError } = await supabase
                        .from('calendar_events')
                        .insert({
                            ...eventData,
                            created_by: user.id,
                            proposed_by: eventType === 'home_day' ? user.id : null,
                        });
                    
                    if (insertError) {
                        console.error(`[Google Sync] Failed to insert event "${googleEvent.summary}":`, insertError);
                        result.errors.push(`Failed to insert: ${googleEvent.summary}`);
                    } else {
                        console.log(`[Google Sync] Successfully inserted: "${googleEvent.summary}"`);
                        result.created++;
                    }
                }
            } catch (eventErr) {
                console.error('Error processing event:', googleEvent.id, eventErr);
                result.errors.push(`Failed to process event: ${googleEvent.summary || googleEvent.id}`);
            }
        }
        
        // Update source with sync info
        await supabase
            .from('google_calendar_sources')
            .update({
                sync_token: nextSyncToken,
                last_synced_at: new Date().toISOString(),
                last_sync_error: null,
            })
            .eq('id', sourceId);
        
        result.success = true;
        result.nextSyncToken = nextSyncToken || undefined;
        
        console.log(`[Google Sync] Completed. Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}, Errors: ${result.errors.length}`);
        
        return result;
    } catch (err) {
        console.error('Error syncing calendar source:', err);
        result.errors.push('Sync failed unexpectedly');
        return result;
    }
}

// ============================================
// Sync All Active Sources for User
// ============================================

export async function syncAllCalendarSources(): Promise<{
    results: { sourceId: string; sourceName: string; result: SyncResult }[];
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { results: [], error: 'Not authenticated' };
        }
        
        const { data: sources } = await supabase
            .from('google_calendar_sources')
            .select('id, google_calendar_name')
            .eq('user_id', user.id)
            .eq('active', true);
        
        if (!sources || sources.length === 0) {
            return { results: [], error: 'No active calendar sources' };
        }
        
        const results: { sourceId: string; sourceName: string; result: SyncResult }[] = [];
        
        for (const source of sources) {
            const result = await syncCalendarSource(source.id);
            results.push({
                sourceId: source.id,
                sourceName: source.google_calendar_name,
                result,
            });
        }
        
        return { results, error: null };
    } catch (err) {
        console.error('Error syncing all calendar sources:', err);
        return { results: [], error: 'Failed to sync calendars' };
    }
}

// ============================================
// Initial Import (after calendar selection)
// ============================================

export async function performInitialImport(): Promise<{
    success: boolean;
    totalCreated: number;
    candidatesFound: number;
    error: string | null;
}> {
    try {
        const { results, error } = await syncAllCalendarSources();
        
        if (error) {
            return { success: false, totalCreated: 0, candidatesFound: 0, error };
        }
        
        let totalCreated = 0;
        for (const r of results) {
            totalCreated += r.result.created;
        }
        
        // Count candidates
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, totalCreated: 0, candidatesFound: 0, error: 'Not authenticated' };
        }
        
        const { count } = await supabase
            .from('calendar_events')
            .select('*', { count: 'exact', head: true })
            .eq('source', 'google')
            .eq('is_home_stay_candidate', true)
            .is('mapping_rule_id', null);
        
        return {
            success: true,
            totalCreated,
            candidatesFound: count || 0,
            error: null,
        };
    } catch (err) {
        console.error('Error performing initial import:', err);
        return { success: false, totalCreated: 0, candidatesFound: 0, error: 'Import failed' };
    }
}
