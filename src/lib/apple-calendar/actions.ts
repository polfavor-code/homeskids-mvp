/**
 * Apple/iCloud Calendar Actions
 * ==============================
 * Client-side actions for managing ICS calendar sources.
 */

import { supabase } from '../supabase';
import { isValidIcsUrl } from '../encryption';
import {
    ConnectIcsCalendarPayload,
    ConnectIcsCalendarResponse,
    IcsSourceDisplay,
    ICS_RATE_LIMITS,
} from './types';

// ============================================
// Connect ICS Calendar
// ============================================

export async function connectIcsCalendar(
    payload: ConnectIcsCalendarPayload
): Promise<ConnectIcsCalendarResponse> {
    try {
        // Get auth session for API call
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Call server-side API route (encryption happens there)
        const response = await fetch('/api/apple-calendar/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                icsUrl: payload.icsUrl,
                childId: payload.childId,
                displayName: payload.displayName,
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            return { success: false, error: result.error || 'Failed to connect calendar' };
        }
        
        // Trigger initial sync
        try {
            const syncResponse = await fetch('/api/apple-calendar/sync', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ sourceId: result.sourceId }),
            });
            
            if (syncResponse.ok) {
                const syncResult = await syncResponse.json();
                return {
                    success: true,
                    sourceId: result.sourceId,
                    displayName: result.displayName,
                    maskedUrl: result.maskedUrl,
                    initialImport: {
                        eventsImported: syncResult.created || 0,
                        candidatesFound: syncResult.candidatesFound || 0,
                    },
                };
            }
        } catch (syncError) {
            console.error('Initial sync failed:', syncError);
            // Continue even if initial sync fails
        }
        
        return {
            success: true,
            sourceId: result.sourceId,
            displayName: result.displayName,
            maskedUrl: result.maskedUrl,
        };
    } catch (error) {
        console.error('Error connecting ICS calendar:', error);
        return { success: false, error: 'Failed to connect calendar' };
    }
}

// ============================================
// Get ICS Sources for User
// ============================================

export async function getIcsSources(): Promise<{
    sources: IcsSourceDisplay[];
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { sources: [], error: 'Not authenticated' };
        }
        
        // Get all ICS sources for this user with child info
        // First, get the external sources
        const { data, error } = await supabase
            .from('external_calendar_sources')
            .select(`
                *,
                children (id, name)
            `)
            .eq('user_id', user.id)
            .eq('provider', 'ics')
            .eq('active', true);
        
        if (error) {
            console.error('Failed to fetch ICS sources:', error);
            return { sources: [], error: 'Failed to fetch calendars' };
        }
        
        console.log('[Apple Calendar] Fetched external sources:', data?.length || 0, data);
        
        // Map the sources (ics_sources might not be accessible due to RLS, but that's OK)
        const sources: IcsSourceDisplay[] = (data || []).map(s => ({
            id: s.id,
            childId: s.child_id,
            childName: s.children?.name || 'Unknown',
            displayName: s.display_name,
            maskedUrl: 'webcal://icloud.com/.../****.ics',
            active: s.active,
            lastSyncedAt: s.last_synced_at ? new Date(s.last_synced_at) : null,
            lastSyncStatus: s.last_sync_status,
            lastSyncError: s.last_sync_error,
        }));
        
        console.log('[Apple Calendar] Returning sources:', sources.length);
        
        return { sources, error: null };
    } catch (error) {
        console.error('Error getting ICS sources:', error);
        return { sources: [], error: 'Failed to fetch calendars' };
    }
}

// ============================================
// Disconnect ICS Calendar
// ============================================

export async function disconnectIcsCalendar(
    sourceId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Verify ownership
        const { data: source } = await supabase
            .from('external_calendar_sources')
            .select('id, user_id')
            .eq('id', sourceId)
            .single();
        
        if (!source || source.user_id !== user.id) {
            return { success: false, error: 'Calendar not found' };
        }
        
        // Mark as revoked
        const { error: revokeError } = await supabase
            .from('ics_sources')
            .update({ revoked_at: new Date().toISOString() })
            .eq('source_id', sourceId);
        
        if (revokeError) {
            console.error('Failed to revoke ICS source:', revokeError);
            return { success: false, error: 'Failed to disconnect' };
        }
        
        // Deactivate the external source
        const { error: deactivateError } = await supabase
            .from('external_calendar_sources')
            .update({ active: false })
            .eq('id', sourceId);
        
        if (deactivateError) {
            console.error('Failed to deactivate source:', deactivateError);
        }
        
        // Soft delete all imported events from this source
        const { error: deleteError } = await supabase
            .from('calendar_events')
            .update({ soft_deleted_at: new Date().toISOString() })
            .eq('external_source_id', sourceId);
        
        if (deleteError) {
            console.error('Failed to soft-delete events:', deleteError);
        }
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Error disconnecting ICS calendar:', error);
        return { success: false, error: 'Failed to disconnect' };
    }
}

// ============================================
// Replace ICS URL
// ============================================

export async function replaceIcsUrl(
    sourceId: string,
    newUrl: string
): Promise<{ success: boolean; maskedUrl?: string; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Validate URL
        const validation = isValidIcsUrl(newUrl);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        // Verify ownership
        const { data: source } = await supabase
            .from('external_calendar_sources')
            .select('id, user_id')
            .eq('id', sourceId)
            .single();
        
        if (!source || source.user_id !== user.id) {
            return { success: false, error: 'Calendar not found' };
        }
        
        // Normalize, hash, and encrypt the new URL
        const normalizedUrl = normalizeIcsUrl(newUrl);
        const urlHash = hashString(normalizedUrl);
        const encryptedUrl = encrypt(normalizedUrl);
        const maskedUrl = maskIcsUrl(normalizedUrl);
        
        // Update the ICS source
        const { error: updateError } = await supabase
            .from('ics_sources')
            .update({
                ics_url_encrypted: encryptedUrl,
                ics_url_hash: urlHash,
                etag: null, // Reset conditional fetch headers
                last_modified: null,
                next_run_at: new Date().toISOString(), // Run immediately
            })
            .eq('source_id', sourceId);
        
        if (updateError) {
            console.error('Failed to update ICS URL:', updateError);
            return { success: false, error: 'Failed to update URL' };
        }
        
        // Clear sync error
        const { error: clearError } = await supabase
            .from('external_calendar_sources')
            .update({
                last_sync_error: null,
                last_sync_status: null,
            })
            .eq('id', sourceId);
        
        if (clearError) {
            console.error('Failed to clear sync status:', clearError);
        }
        
        return { success: true, maskedUrl };
    } catch (error) {
        console.error('Error replacing ICS URL:', error);
        return { success: false, error: 'Failed to update URL' };
    }
}

// ============================================
// Manual Sync Now
// ============================================

export async function syncIcsNow(
    sourceId: string
): Promise<{ success: boolean; result?: { created: number; updated: number; deleted: number }; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Verify ownership
        const { data: source } = await supabase
            .from('external_calendar_sources')
            .select('id, user_id, last_synced_at')
            .eq('id', sourceId)
            .single();
        
        if (!source || source.user_id !== user.id) {
            return { success: false, error: 'Calendar not found' };
        }
        
        // Check rate limit
        if (source.last_synced_at) {
            const lastSync = new Date(source.last_synced_at);
            const minInterval = ICS_RATE_LIMITS.MIN_SYNC_INTERVAL_MINUTES * 60 * 1000;
            if (Date.now() - lastSync.getTime() < minInterval) {
                return { success: false, error: 'Please wait a few minutes before syncing again' };
            }
        }
        
        // Trigger sync via API route
        const response = await fetch('/api/apple-calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceId }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || 'Sync failed' };
        }
        
        const result = await response.json();
        
        return {
            success: true,
            result: {
                created: result.created || 0,
                updated: result.updated || 0,
                deleted: result.deleted || 0,
            },
        };
    } catch (error) {
        console.error('Error syncing ICS calendar:', error);
        return { success: false, error: 'Sync failed' };
    }
}

// ============================================
// Check if user has Apple Calendar connected
// ============================================

export async function hasAppleCalendarConnected(): Promise<{
    connected: boolean;
    sources: { id: string; displayName: string; childId: string }[];
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { connected: false, sources: [] };
        }
        
        const { data } = await supabase
            .from('external_calendar_sources')
            .select('id, display_name, child_id')
            .eq('user_id', user.id)
            .eq('provider', 'ics')
            .eq('active', true);
        
        const sources = (data || []).map(s => ({
            id: s.id,
            displayName: s.display_name,
            childId: s.child_id,
        }));
        
        return {
            connected: sources.length > 0,
            sources,
        };
    } catch {
        return { connected: false, sources: [] };
    }
}

// ============================================
// Get ICS candidates for mapping
// ============================================

export async function getIcsCandidates(childId: string): Promise<{
    candidates: {
        eventId: string;
        title: string;
        startAt: Date;
        endAt: Date;
        allDay: boolean;
        candidateReason: string;
        occurrenceCount: number;
    }[];
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { candidates: [], error: 'Not authenticated' };
        }
        
        // Get unmapped candidates
        const { data, error } = await supabase
            .from('calendar_events')
            .select('id, title, start_at, end_at, all_day, candidate_reason, external_event_id')
            .eq('child_id', childId)
            .eq('source', 'ics')
            .eq('is_home_stay_candidate', true)
            .is('mapping_rule_id', null)
            .is('soft_deleted_at', null)
            .order('title');
        
        if (error) {
            return { candidates: [], error: 'Failed to fetch candidates' };
        }
        
        // Group by title to show occurrence count
        const byTitle = new Map<string, typeof data>();
        for (const event of data || []) {
            const existing = byTitle.get(event.title) || [];
            existing.push(event);
            byTitle.set(event.title, existing);
        }
        
        // Take first occurrence of each title
        const candidates = Array.from(byTitle.entries()).map(([title, events]) => ({
            eventId: events[0].id,
            title,
            startAt: new Date(events[0].start_at),
            endAt: new Date(events[0].end_at),
            allDay: events[0].all_day,
            candidateReason: events[0].candidate_reason || 'unknown',
            occurrenceCount: events.length,
        }));
        
        return { candidates, error: null };
    } catch (error) {
        console.error('Error fetching ICS candidates:', error);
        return { candidates: [], error: 'Failed to fetch candidates' };
    }
}
