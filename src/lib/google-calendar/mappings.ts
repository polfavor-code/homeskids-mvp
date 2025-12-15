import { supabase } from "../supabase";
import {
    CalendarEventMapping,
    CalendarEventMappingRow,
    CandidateGroup,
    HomeStayCandidate,
    CreateMappingPayload,
    mappingRowToMapping,
    describeRecurrence,
    CandidateReason,
} from "./types";

// ============================================
// Get Home Stay Candidates
// ============================================

export async function getHomeStayCandidates(
    childId?: string
): Promise<{
    groups: CandidateGroup[];
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { groups: [], error: 'Not authenticated' };
        }
        
        // Build query - fetch events without the join
        let query = supabase
            .from('calendar_events')
            .select(`
                id,
                title,
                start_at,
                end_at,
                all_day,
                recurrence_rule,
                candidate_reason,
                external_calendar_id,
                child_id
            `)
            .eq('source', 'google')
            .eq('is_home_stay_candidate', true)
            .is('mapping_rule_id', null)
            .eq('is_deleted', false);
        
        if (childId) {
            query = query.eq('child_id', childId);
        }
        
        const { data: candidates, error } = await query;
        
        if (error) {
            console.error('Error fetching candidates:', error);
            return { groups: [], error: 'Failed to fetch candidates' };
        }
        
        if (!candidates || candidates.length === 0) {
            return { groups: [], error: null };
        }
        
        // Fetch calendar source names for lookup
        const calendarIds = Array.from(new Set(candidates.map(c => c.external_calendar_id).filter(Boolean)));
        const { data: sources } = await supabase
            .from('google_calendar_sources')
            .select('google_calendar_id, google_calendar_name')
            .in('google_calendar_id', calendarIds);
        
        const calendarNameMap = new Map<string, string>();
        if (sources) {
            for (const source of sources) {
                calendarNameMap.set(source.google_calendar_id, source.google_calendar_name);
            }
        }
        
        // Group candidates by title + calendar
        const groupMap = new Map<string, {
            title: string;
            calendarId: string;
            calendarName: string;
            childId: string;
            candidates: HomeStayCandidate[];
            recurrenceRule: string | null;
        }>();
        
        for (const event of candidates) {
            const key = `${event.title}::${event.external_calendar_id}`;
            const calendarName = calendarNameMap.get(event.external_calendar_id || '') || 'Unknown Calendar';
            
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    title: event.title,
                    calendarId: event.external_calendar_id,
                    calendarName,
                    childId: event.child_id,
                    candidates: [],
                    recurrenceRule: event.recurrence_rule,
                });
            }
            
            const group = groupMap.get(key)!;
            group.candidates.push({
                eventId: event.id,
                title: event.title,
                calendarName,
                calendarId: event.external_calendar_id,
                childId: event.child_id,
                startAt: new Date(event.start_at),
                endAt: new Date(event.end_at),
                allDay: event.all_day,
                recurrenceRule: event.recurrence_rule,
                candidateReason: event.candidate_reason as CandidateReason,
            });
        }
        
        // Convert to CandidateGroup array
        const groups: CandidateGroup[] = Array.from(groupMap.values()).map(g => ({
            title: g.title,
            calendarId: g.calendarId,
            calendarName: g.calendarName,
            childId: g.childId,
            candidates: g.candidates,
            recurrenceInfo: g.recurrenceRule ? describeRecurrence(g.recurrenceRule) : undefined,
            suggestedMatchType: g.candidates.length > 1 ? 'title_exact' : 'event_id',
        }));
        
        // Sort by number of occurrences (most first)
        groups.sort((a, b) => b.candidates.length - a.candidates.length);
        
        return { groups, error: null };
    } catch (err) {
        console.error('Error getting home stay candidates:', err);
        return { groups: [], error: 'Failed to get candidates' };
    }
}

// ============================================
// Create Mapping Rule
// ============================================

export async function createMappingRule(
    payload: CreateMappingPayload
): Promise<{
    mapping: CalendarEventMapping | null;
    eventsUpdated: number;
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { mapping: null, eventsUpdated: 0, error: 'Not authenticated' };
        }

        // Note: RLS on calendar_event_mappings table will enforce guardian access
        // We don't need to check child_guardians separately

        // Create the mapping rule
        console.log('[Mapping] Creating mapping rule for child:', payload.childId, 'by user:', user.id);
        
        const { data: mapping, error: insertError } = await supabase
            .from('calendar_event_mappings')
            .insert({
                source: 'google',
                google_calendar_id: payload.googleCalendarId,
                child_id: payload.childId,
                match_type: payload.matchType,
                match_value: payload.matchValue,
                home_id: payload.homeId,
                resulting_event_type: payload.resultingEventType,
                auto_confirm: payload.autoConfirm || false,
                created_by: user.id,
            })
            .select()
            .single();
        
        console.log('[Mapping] Insert result:', { mapping, insertError });
        
        if (insertError) {
            console.error('Error creating mapping:', insertError);
            return { mapping: null, eventsUpdated: 0, error: 'Failed to create mapping' };
        }
        
        // Apply the mapping to existing events
        const eventsUpdated = await applyMappingToEvents(mapping.id);
        
        return {
            mapping: mappingRowToMapping(mapping as CalendarEventMappingRow),
            eventsUpdated,
            error: null,
        };
    } catch (err) {
        console.error('Error creating mapping rule:', err);
        return { mapping: null, eventsUpdated: 0, error: 'Failed to create mapping' };
    }
}

// ============================================
// Apply Mapping to Existing Events
// ============================================

async function applyMappingToEvents(mappingId: string): Promise<number> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return 0;
        
        // Get the mapping rule
        const { data: mapping, error: mappingError } = await supabase
            .from('calendar_event_mappings')
            .select('*')
            .eq('id', mappingId)
            .single();
        
        if (mappingError) {
            console.error('[ApplyMapping] Error fetching mapping:', mappingError);
            return 0;
        }
        
        if (!mapping) return 0;
        
        console.log('[ApplyMapping] Applying mapping:', mapping.match_type, mapping.match_value);
        
        // Find matching events based on match type
        let query = supabase
            .from('calendar_events')
            .select('id')
            .eq('source', 'google')
            .eq('child_id', mapping.child_id)
            .eq('is_deleted', false);
        
        if (mapping.google_calendar_id) {
            query = query.eq('external_calendar_id', mapping.google_calendar_id);
        }
        
        if (mapping.match_type === 'event_id') {
            query = query.eq('external_event_id', mapping.match_value);
        } else if (mapping.match_type === 'title_exact') {
            query = query.eq('title', mapping.match_value);  // Use eq instead of ilike for exact match
        } else if (mapping.match_type === 'title_contains') {
            query = query.ilike('title', `%${mapping.match_value}%`);
        }
        
        const { data: matchingEvents, error: queryError } = await query;
        
        if (queryError) {
            console.error('[ApplyMapping] Error finding events:', queryError);
            return 0;
        }
        
        console.log('[ApplyMapping] Found', matchingEvents?.length || 0, 'matching events');
        
        if (!matchingEvents || matchingEvents.length === 0) return 0;
        
        // Determine status
        let status = 'confirmed';
        if (mapping.resulting_event_type === 'home_day') {
            status = mapping.auto_confirm ? 'confirmed' : 'proposed';
        }
        
        // Update matching events
        const { error: updateError, data: updatedData } = await supabase
            .from('calendar_events')
            .update({
                event_type: mapping.resulting_event_type,
                home_id: mapping.home_id,
                status: status,
                mapping_rule_id: mappingId,
                proposed_by: mapping.resulting_event_type === 'home_day' ? user.id : null,
                confirmed_by: status === 'confirmed' && mapping.resulting_event_type === 'home_day' ? user.id : null,
                confirmed_at: status === 'confirmed' && mapping.resulting_event_type === 'home_day' ? new Date().toISOString() : null,
            })
            .in('id', matchingEvents.map(e => e.id))
            .select('id');
        
        if (updateError) {
            console.error('[ApplyMapping] Error updating events:', updateError);
            return 0;
        }
        
        console.log('[ApplyMapping] Updated', updatedData?.length || 0, 'events');
        
        return updatedData?.length || 0;
    } catch (err) {
        console.error('Error applying mapping to events:', err);
        return 0;
    }
}

// ============================================
// Get Mapping Rules
// ============================================

export async function getMappingRules(
    childId?: string
): Promise<{
    mappings: CalendarEventMapping[];
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { mappings: [], error: 'Not authenticated' };
        }
        
        let query = supabase
            .from('calendar_event_mappings')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });
        
        if (childId) {
            query = query.eq('child_id', childId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            return { mappings: [], error: 'Failed to fetch mappings' };
        }
        
        return {
            mappings: (data || []).map((row: CalendarEventMappingRow) => mappingRowToMapping(row)),
            error: null,
        };
    } catch (err) {
        console.error('Error getting mapping rules:', err);
        return { mappings: [], error: 'Failed to get mappings' };
    }
}

// ============================================
// Delete Mapping Rule
// ============================================

export async function deleteMappingRule(
    mappingId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Soft delete (deactivate)
        const { error } = await supabase
            .from('calendar_event_mappings')
            .update({ active: false })
            .eq('id', mappingId);
        
        if (error) {
            return { success: false, error: 'Failed to delete mapping' };
        }
        
        // Remove mapping from events (convert back to regular events)
        await supabase
            .from('calendar_events')
            .update({
                event_type: 'event',
                home_id: null,
                status: 'confirmed',
                mapping_rule_id: null,
            })
            .eq('mapping_rule_id', mappingId);
        
        return { success: true, error: null };
    } catch (err) {
        console.error('Error deleting mapping rule:', err);
        return { success: false, error: 'Failed to delete mapping' };
    }
}

// ============================================
// Ignore Candidates (mark as not home stay)
// ============================================

export async function ignoreCandidates(
    eventIds: string[]
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const { error } = await supabase
            .from('calendar_events')
            .update({ is_home_stay_candidate: false })
            .in('id', eventIds);
        
        if (error) {
            return { success: false, error: 'Failed to update events' };
        }
        
        return { success: true, error: null };
    } catch (err) {
        console.error('Error ignoring candidates:', err);
        return { success: false, error: 'Failed to ignore candidates' };
    }
}

// ============================================
// Ignore Candidates by Title (for "Ignore all with this title")
// ============================================

export async function ignoreCandidatesByTitle(
    title: string,
    calendarId: string,
    childId: string
): Promise<{ success: boolean; count: number; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, count: 0, error: 'Not authenticated' };
        }
        
        const { data, error } = await supabase
            .from('calendar_events')
            .update({ is_home_stay_candidate: false })
            .eq('source', 'google')
            .eq('child_id', childId)
            .eq('external_calendar_id', calendarId)
            .ilike('title', title)
            .select('id');
        
        if (error) {
            return { success: false, count: 0, error: 'Failed to update events' };
        }
        
        return { success: true, count: data?.length || 0, error: null };
    } catch (err) {
        console.error('Error ignoring candidates by title:', err);
        return { success: false, count: 0, error: 'Failed to ignore candidates' };
    }
}
