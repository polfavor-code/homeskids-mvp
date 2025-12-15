/**
 * Calendar Server Actions
 * =======================
 * Server-side functions for calendar operations.
 * These enforce permission checks on top of RLS.
 */

import { supabase } from '../supabase';
import {
    CalendarEvent,
    CalendarEventDisplay,
    CalendarEventRow,
    CreateEventPayload,
    CreateHomeDayPayload,
    CreateTravelPayload,
    UpdateEventPayload,
    ListEventsFilter,
    rowToEvent,
    getHomeColor,
    EventStatus,
} from './types';

// ============================================
// LIST EVENTS
// ============================================

export async function listChildEvents(
    filter: ListEventsFilter
): Promise<{ events: CalendarEventDisplay[]; error?: string }> {
    const { childId, rangeStart, rangeEnd, eventTypes, statuses, includeRejected } = filter;

    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { events: [], error: 'Not authenticated' };
        }

        // Build query
        let query = supabase
            .from('calendar_events')
            .select(`
                *,
                homes (id, name),
                created_by_profile:profiles!calendar_events_created_by_fkey (id, name),
                proposed_by_profile:profiles!calendar_events_proposed_by_fkey (id, name),
                confirmed_by_profile:profiles!calendar_events_confirmed_by_fkey (id, name),
                rejected_by_profile:profiles!calendar_events_rejected_by_fkey (id, name)
            `)
            .eq('child_id', childId)
            .eq('is_deleted', false)
            .gte('end_at', rangeStart.toISOString())
            .lte('start_at', rangeEnd.toISOString())
            .order('start_at', { ascending: true });

        // Filter by event types
        if (eventTypes && eventTypes.length > 0) {
            query = query.in('event_type', eventTypes);
        }

        // Filter by statuses (default: exclude rejected)
        if (statuses && statuses.length > 0) {
            query = query.in('status', statuses);
        } else if (!includeRejected) {
            query = query.neq('status', 'rejected');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching events:', error);
            return { events: [], error: error.message };
        }

        // Check if user is guardian for permission flags
        const { data: guardianCheck } = await supabase
            .from('child_guardians')
            .select('id')
            .eq('child_id', childId)
            .eq('user_id', user.id)
            .single();
        
        const isGuardian = !!guardianCheck;

        // Get all unique home IDs for travel events to fetch their names
        const travelHomeIds = new Set<string>();
        (data || []).forEach((row: any) => {
            if (row.event_type === 'travel') {
                if (row.from_home_id) travelHomeIds.add(row.from_home_id);
                if (row.to_home_id) travelHomeIds.add(row.to_home_id);
            }
        });

        // Fetch travel home names if needed
        let travelHomeNames: Record<string, string> = {};
        if (travelHomeIds.size > 0) {
            const { data: travelHomes } = await supabase
                .from('homes')
                .select('id, name')
                .in('id', Array.from(travelHomeIds));
            if (travelHomes) {
                travelHomes.forEach((h: any) => {
                    travelHomeNames[h.id] = h.name;
                });
            }
        }

        // Transform to display format
        const events: CalendarEventDisplay[] = await Promise.all(
            (data || []).map(async (row: any) => {
                const event = rowToEvent(row as CalendarEventRow);
                
                // Check if user can confirm this event
                let canConfirm = false;
                let eligibleConfirmers: { userId: string; userName: string }[] = [];
                
                if (event.eventType === 'home_day' && event.status === 'proposed') {
                    const { data: canConfirmResult } = await supabase
                        .rpc('can_confirm_home_day', { 
                            p_event_id: event.id, 
                            p_user_id: user.id 
                        });
                    canConfirm = canConfirmResult === true;

                    // Get eligible confirmers for pending proposals
                    const { data: confirmers } = await supabase
                        .rpc('get_eligible_confirmers', { p_event_id: event.id });
                    eligibleConfirmers = (confirmers || []).map((c: any) => ({
                        userId: c.user_id,
                        userName: c.user_name,
                    }));
                }

                // Get travel home names
                const fromHomeName = event.fromHomeId 
                    ? travelHomeNames[event.fromHomeId] || event.fromLocation || undefined
                    : event.fromLocation || undefined;
                const toHomeName = event.toHomeId 
                    ? travelHomeNames[event.toHomeId] || event.toLocation || undefined
                    : event.toLocation || undefined;

                return {
                    ...event,
                    homeName: row.homes?.name,
                    homeColor: row.homes?.name ? getHomeColor(row.homes.name) : undefined,
                    // Travel-specific display fields
                    fromHomeName,
                    fromHomeColor: event.fromHomeId && travelHomeNames[event.fromHomeId] 
                        ? getHomeColor(travelHomeNames[event.fromHomeId]) 
                        : undefined,
                    toHomeName,
                    toHomeColor: event.toHomeId && travelHomeNames[event.toHomeId] 
                        ? getHomeColor(travelHomeNames[event.toHomeId]) 
                        : undefined,
                    createdByName: row.created_by_profile?.name,
                    proposedByName: row.proposed_by_profile?.name,
                    confirmedByName: row.confirmed_by_profile?.name,
                    rejectedByName: row.rejected_by_profile?.name,
                    canConfirm,
                    canReject: canConfirm, // Same logic for reject
                    canEdit: !event.isReadOnly && (event.createdBy === user.id || isGuardian),
                    canDelete: !event.isReadOnly && isGuardian,
                    eligibleConfirmers,
                } as CalendarEventDisplay;
            })
        );

        return { events };
    } catch (err) {
        console.error('Error in listChildEvents:', err);
        return { events: [], error: 'Failed to fetch events' };
    }
}

// ============================================
// CREATE EVENT
// ============================================

export async function createEvent(
    payload: CreateEventPayload
): Promise<{ event?: CalendarEventDisplay; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: 'Not authenticated' };
        }

        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                child_id: payload.childId,
                title: payload.title,
                description: payload.description || null,
                start_at: payload.startAt.toISOString(),
                end_at: payload.endAt.toISOString(),
                all_day: payload.allDay ?? true,
                timezone: payload.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                event_type: 'event',
                status: 'confirmed', // Regular events are always confirmed
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating event:', error);
            return { error: error.message };
        }

        const event = rowToEvent(data as CalendarEventRow);
        return {
            event: {
                ...event,
                createdByName: user.email?.split('@')[0] || 'You',
                canEdit: true,
                canDelete: true,
            },
        };
    } catch (err) {
        console.error('Error in createEvent:', err);
        return { error: 'Failed to create event' };
    }
}

// ============================================
// CREATE HOME DAY PROPOSAL
// ============================================

export async function createHomeDayProposal(
    payload: CreateHomeDayPayload
): Promise<{ event?: CalendarEventDisplay; error?: string; autoConfirmed?: boolean }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: 'Not authenticated' };
        }

        // Get home info for title
        const { data: homeData } = await supabase
            .from('homes')
            .select('name')
            .eq('id', payload.homeId)
            .single();

        const homeName = homeData?.name || 'Home';
        const title = payload.title || `${homeName}`;

        // Check if there are other members at the destination home (for auto-confirm logic)
        // Confirmer should be someone at the destination home, not just any guardian
        const { data: homeMembers } = await supabase
            .from('home_memberships')
            .select('user_id')
            .eq('home_id', payload.homeId);
        
        // Filter out current user to see if there are OTHER home members
        const otherHomeMembers = (homeMembers || []).filter(m => m.user_id !== user.id);
        const noOtherHomeMembers = otherHomeMembers.length === 0;

        // Create the home day event
        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                child_id: payload.childId,
                title,
                description: null,
                start_at: payload.startAt.toISOString(),
                end_at: payload.endAt.toISOString(),
                all_day: payload.allDay ?? true,
                timezone: payload.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                event_type: 'home_day',
                home_id: payload.homeId,
                status: noOtherHomeMembers ? 'confirmed' : 'proposed', // Auto-confirm if no other home members
                proposed_by: user.id,
                confirmed_by: noOtherHomeMembers ? user.id : null,
                confirmed_at: noOtherHomeMembers ? new Date().toISOString() : null,
                proposal_reason: payload.proposalReason || null,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating home day:', error);
            return { error: error.message };
        }

        const event = rowToEvent(data as CalendarEventRow);
        return {
            event: {
                ...event,
                homeName,
                homeColor: getHomeColor(homeName),
                createdByName: user.email?.split('@')[0] || 'You',
                proposedByName: user.email?.split('@')[0] || 'You',
                canEdit: true,
                canDelete: true,
            },
            autoConfirmed: noOtherHomeMembers,
        };
    } catch (err) {
        console.error('Error in createHomeDayProposal:', err);
        return { error: 'Failed to create home day' };
    }
}

// ============================================
// CREATE TRAVEL EVENT
// ============================================

export async function createTravelEvent(
    payload: CreateTravelPayload
): Promise<{ event?: CalendarEventDisplay; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: 'Not authenticated' };
        }

        // Get home names for title generation
        let fromName = payload.fromLocation || 'Unknown';
        let toName = payload.toLocation || 'Unknown';
        let fromColor: string | undefined;
        let toColor: string | undefined;

        if (payload.fromHomeId) {
            const { data: fromHome } = await supabase
                .from('homes')
                .select('name')
                .eq('id', payload.fromHomeId)
                .single();
            if (fromHome) {
                fromName = fromHome.name;
                fromColor = getHomeColor(fromHome.name);
            }
        }

        if (payload.toHomeId) {
            const { data: toHome } = await supabase
                .from('homes')
                .select('name')
                .eq('id', payload.toHomeId)
                .single();
            if (toHome) {
                toName = toHome.name;
                toColor = getHomeColor(toHome.name);
            }
        }

        // Generate default title if not provided
        const title = payload.title || `Travel: ${fromName} → ${toName}`;

        // Create the travel event
        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                child_id: payload.childId,
                title,
                description: payload.notes || null,
                start_at: payload.startAt.toISOString(),
                end_at: payload.endAt.toISOString(),
                all_day: payload.allDay ?? false, // Travel usually has specific times
                timezone: payload.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                event_type: 'travel',
                status: 'confirmed', // Travel events are always confirmed
                from_home_id: payload.fromHomeId || null,
                from_location: payload.fromLocation || null,
                to_home_id: payload.toHomeId || null,
                to_location: payload.toLocation || null,
                travel_with: payload.travelWith || null,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating travel event:', error);
            return { error: error.message };
        }

        const event = rowToEvent(data as CalendarEventRow);
        return {
            event: {
                ...event,
                fromHomeName: fromName,
                fromHomeColor: fromColor,
                toHomeName: toName,
                toHomeColor: toColor,
                createdByName: user.email?.split('@')[0] || 'You',
                canEdit: true,
                canDelete: true,
            },
        };
    } catch (err) {
        console.error('Error in createTravelEvent:', err);
        return { error: 'Failed to create travel event' };
    }
}

// ============================================
// CONFIRM HOME DAY
// ============================================

export async function confirmHomeDay(
    eventId: string
): Promise<{ success: boolean; event?: CalendarEventDisplay; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Check if user can confirm
        const { data: canConfirm, error: checkError } = await supabase
            .rpc('can_confirm_home_day', { 
                p_event_id: eventId, 
                p_user_id: user.id 
            });

        if (checkError) {
            console.error('Error checking confirm permission:', checkError);
            return { success: false, error: checkError.message };
        }

        if (!canConfirm) {
            return { success: false, error: 'You cannot confirm this home day' };
        }

        // Update the event
        const { data, error } = await supabase
            .from('calendar_events')
            .update({
                status: 'confirmed',
                confirmed_by: user.id,
                confirmed_at: new Date().toISOString(),
            })
            .eq('id', eventId)
            .select(`
                *,
                homes (id, name),
                created_by_profile:profiles!calendar_events_created_by_fkey (id, name),
                proposed_by_profile:profiles!calendar_events_proposed_by_fkey (id, name)
            `)
            .single();

        if (error) {
            console.error('Error confirming home day:', error);
            return { success: false, error: error.message };
        }

        const event = rowToEvent(data as CalendarEventRow);
        return {
            success: true,
            event: {
                ...event,
                homeName: data.homes?.name,
                homeColor: data.homes?.name ? getHomeColor(data.homes.name) : undefined,
                createdByName: data.created_by_profile?.name,
                proposedByName: data.proposed_by_profile?.name,
                confirmedByName: user.email?.split('@')[0] || 'You',
            },
        };
    } catch (err) {
        console.error('Error in confirmHomeDay:', err);
        return { success: false, error: 'Failed to confirm home day' };
    }
}

// ============================================
// REJECT HOME DAY
// ============================================

export async function rejectHomeDay(
    eventId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Check if user can reject (same as confirm)
        const { data: canReject, error: checkError } = await supabase
            .rpc('can_confirm_home_day', { 
                p_event_id: eventId, 
                p_user_id: user.id 
            });

        if (checkError) {
            console.error('Error checking reject permission:', checkError);
            return { success: false, error: checkError.message };
        }

        if (!canReject) {
            return { success: false, error: 'You cannot reject this home day' };
        }

        // Update the event
        const { error } = await supabase
            .from('calendar_events')
            .update({
                status: 'rejected',
                rejected_by: user.id,
                rejected_at: new Date().toISOString(),
                proposal_reason: reason || null,
            })
            .eq('id', eventId);

        if (error) {
            console.error('Error rejecting home day:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Error in rejectHomeDay:', err);
        return { success: false, error: 'Failed to reject home day' };
    }
}

// ============================================
// UPDATE EVENT
// ============================================

export async function updateEvent(
    eventId: string,
    payload: UpdateEventPayload
): Promise<{ event?: CalendarEventDisplay; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: 'Not authenticated' };
        }

        // Build update object
        const updates: Record<string, any> = {};
        if (payload.title !== undefined) updates.title = payload.title;
        if (payload.description !== undefined) updates.description = payload.description;
        if (payload.startAt !== undefined) updates.start_at = payload.startAt.toISOString();
        if (payload.endAt !== undefined) updates.end_at = payload.endAt.toISOString();
        if (payload.allDay !== undefined) updates.all_day = payload.allDay;

        const { data, error } = await supabase
            .from('calendar_events')
            .update(updates)
            .eq('id', eventId)
            .select(`
                *,
                homes (id, name)
            `)
            .single();

        if (error) {
            console.error('Error updating event:', error);
            return { error: error.message };
        }

        const event = rowToEvent(data as CalendarEventRow);
        return {
            event: {
                ...event,
                homeName: data.homes?.name,
                homeColor: data.homes?.name ? getHomeColor(data.homes.name) : undefined,
                canEdit: true,
            },
        };
    } catch (err) {
        console.error('Error in updateEvent:', err);
        return { error: 'Failed to update event' };
    }
}

// ============================================
// DELETE EVENT (soft delete)
// ============================================

export async function deleteEvent(
    eventId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Soft delete
        const { error } = await supabase
            .from('calendar_events')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: user.id,
            })
            .eq('id', eventId);

        if (error) {
            console.error('Error deleting event:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Error in deleteEvent:', err);
        return { success: false, error: 'Failed to delete event' };
    }
}

// ============================================
// GET PENDING NOTIFICATIONS
// ============================================

export async function getPendingNotifications(): Promise<{
    notifications: any[];
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { notifications: [], error: 'Not authenticated' };
        }

        const { data, error } = await supabase
            .from('calendar_notifications')
            .select(`
                *,
                calendar_events (
                    id, title, start_at, end_at, event_type, status,
                    homes (id, name)
                )
            `)
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return { notifications: [], error: error.message };
        }

        return { notifications: data || [] };
    } catch (err) {
        console.error('Error in getPendingNotifications:', err);
        return { notifications: [], error: 'Failed to fetch notifications' };
    }
}

// ============================================
// MARK NOTIFICATION AS READ
// ============================================

export async function markNotificationRead(
    notificationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('calendar_notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification read:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Error in markNotificationRead:', err);
        return { success: false, error: 'Failed to mark notification read' };
    }
}
