/**
 * Apple/iCloud Calendar Sync
 * ==========================
 * Fetches ICS feeds and syncs events to Homes.kids calendar.
 */

import { createClient } from '@supabase/supabase-js';
import { decrypt, normalizeIcsUrl } from '../encryption';
import { parseIcs } from './ics-parser';
import {
    IcsSyncResult,
    IcsFetchResult,
    IcsEvent,
    ICS_SYNC_RANGE,
    ICS_ERROR_MESSAGES,
    isIcsHomeStayCandidate,
} from './types';

// Supabase service role client for background jobs
function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !serviceKey) {
        throw new Error('Missing Supabase service role credentials');
    }
    
    return createClient(url, serviceKey);
}

// ============================================
// ICS Fetch
// ============================================

const FETCH_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Fetch an ICS feed with conditional request support.
 */
export async function fetchIcsFeed(
    encryptedUrl: string,
    etag: string | null,
    lastModified: string | null
): Promise<IcsFetchResult> {
    try {
        // Decrypt the URL
        const rawUrl = decrypt(encryptedUrl);
        const url = normalizeIcsUrl(rawUrl);
        
        // Build headers for conditional request
        const headers: HeadersInit = {
            'User-Agent': 'Homes.kids/1.0 (Calendar Sync)',
            'Accept': 'text/calendar, application/ics',
        };
        
        if (etag) {
            headers['If-None-Match'] = etag;
        }
        if (lastModified) {
            headers['If-Modified-Since'] = lastModified;
        }
        
        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        
        const response = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Handle 304 Not Modified
        if (response.status === 304) {
            return {
                data: null,
                etag: response.headers.get('ETag'),
                lastModified: response.headers.get('Last-Modified'),
                notModified: true,
                error: null,
            };
        }
        
        // Handle errors
        if (!response.ok) {
            const status = response.status;
            let error = ICS_ERROR_MESSAGES.UNKNOWN;
            
            if (status === 401 || status === 403) {
                error = ICS_ERROR_MESSAGES.AUTH_REQUIRED;
            } else if (status === 404 || status === 410) {
                error = ICS_ERROR_MESSAGES.EXPIRED;
            } else if (status >= 500) {
                error = ICS_ERROR_MESSAGES.UNREACHABLE;
            }
            
            return { data: null, etag: null, lastModified: null, notModified: false, error };
        }
        
        // Check content length
        const contentLength = response.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
            return {
                data: null,
                etag: null,
                lastModified: null,
                notModified: false,
                error: ICS_ERROR_MESSAGES.TOO_LARGE,
            };
        }
        
        // Read response body
        const data = await response.text();
        
        if (data.length > MAX_RESPONSE_SIZE) {
            return {
                data: null,
                etag: null,
                lastModified: null,
                notModified: false,
                error: ICS_ERROR_MESSAGES.TOO_LARGE,
            };
        }
        
        return {
            data,
            etag: response.headers.get('ETag'),
            lastModified: response.headers.get('Last-Modified'),
            notModified: false,
            error: null,
        };
    } catch (error) {
        console.error('Error fetching ICS feed:', error);
        
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    data: null,
                    etag: null,
                    lastModified: null,
                    notModified: false,
                    error: ICS_ERROR_MESSAGES.TIMEOUT,
                };
            }
        }
        
        return {
            data: null,
            etag: null,
            lastModified: null,
            notModified: false,
            error: ICS_ERROR_MESSAGES.UNREACHABLE,
        };
    }
}

// ============================================
// Event Sync
// ============================================

/**
 * Sync a single ICS source.
 */
export async function syncIcsSource(
    sourceId: string,
    userId: string,
    childId: string,
    encryptedUrl: string,
    etag: string | null,
    lastModified: string | null
): Promise<IcsSyncResult> {
    const result: IcsSyncResult = {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        candidatesFound: 0,
        errors: [],
    };
    
    const supabase = getServiceClient();
    
    try {
        // Fetch the ICS feed
        console.log(`[ICS Sync] Fetching source: ${sourceId}`);
        
        const fetchResult = await fetchIcsFeed(encryptedUrl, etag, lastModified);
        
        if (fetchResult.error) {
            console.error(`[ICS Sync] Fetch error: ${fetchResult.error}`);
            result.errors.push(fetchResult.error);
            
            // Update source with error
            await supabase.rpc('update_ics_sync_status', {
                p_source_id: sourceId,
                p_status: 'error',
                p_error: fetchResult.error,
            });
            
            return result;
        }
        
        if (fetchResult.notModified) {
            console.log(`[ICS Sync] Source not modified (304)`);
            result.success = true;
            result.notModified = true;
            
            // Update last synced timestamp
            await supabase.rpc('update_ics_sync_status', {
                p_source_id: sourceId,
                p_status: 'ok',
                p_etag: fetchResult.etag,
                p_last_modified: fetchResult.lastModified,
            });
            
            return result;
        }
        
        // Parse the ICS content
        console.log(`[ICS Sync] Parsing ICS content`);
        const parseResult = parseIcs(fetchResult.data!);
        
        if (parseResult.error) {
            console.error(`[ICS Sync] Parse error: ${parseResult.error}`);
            result.errors.push(ICS_ERROR_MESSAGES.INVALID_FORMAT);
            
            await supabase.rpc('update_ics_sync_status', {
                p_source_id: sourceId,
                p_status: 'error',
                p_error: ICS_ERROR_MESSAGES.INVALID_FORMAT,
            });
            
            return result;
        }
        
        // Check for too many events
        if (parseResult.events.length > ICS_SYNC_RANGE.MAX_OCCURRENCES) {
            console.warn(`[ICS Sync] Too many events: ${parseResult.events.length}`);
            result.errors.push(ICS_ERROR_MESSAGES.TOO_MANY_EVENTS);
            
            await supabase.rpc('update_ics_sync_status', {
                p_source_id: sourceId,
                p_status: 'error',
                p_error: ICS_ERROR_MESSAGES.TOO_MANY_EVENTS,
            });
            
            return result;
        }
        
        console.log(`[ICS Sync] Processing ${parseResult.events.length} events`);
        
        // Get existing events for this source
        const { data: existingEvents } = await supabase
            .from('calendar_events')
            .select('id, external_event_id, external_updated_at')
            .eq('external_source_id', sourceId)
            .is('soft_deleted_at', null);
        
        const existingMap = new Map(
            (existingEvents || []).map(e => [e.external_event_id, e])
        );
        
        // Track which UIDs we've seen
        const seenUids = new Set<string>();
        
        // Process each event
        for (const icsEvent of parseResult.events) {
            try {
                seenUids.add(icsEvent.uid);
                
                // Check for candidate status
                const { isCandidate, reason } = isIcsHomeStayCandidate(icsEvent);
                if (isCandidate) {
                    result.candidatesFound++;
                }
                
                // Check for mapping rule
                const { data: mappingId } = await supabase.rpc('find_ics_event_mapping', {
                    p_child_id: childId,
                    p_source_id: sourceId,
                    p_external_event_id: icsEvent.uid,
                    p_title: icsEvent.summary,
                });
                
                // Get mapping details
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
                
                // Build event data
                const eventData = {
                    child_id: childId,
                    title: icsEvent.summary,
                    description: icsEvent.description,
                    start_at: icsEvent.startAt.toISOString(),
                    end_at: icsEvent.endAt.toISOString(),
                    all_day: icsEvent.allDay,
                    timezone: icsEvent.timezone,
                    event_type: eventType,
                    home_id: homeId,
                    status,
                    source: 'ics',
                    external_provider: 'ics',
                    external_source_id: sourceId,
                    external_event_id: icsEvent.uid,
                    external_updated_at: icsEvent.lastModified?.toISOString() || new Date().toISOString(),
                    is_home_stay_candidate: isCandidate,
                    candidate_reason: reason,
                    mapping_rule_id: mappingId || null,
                    is_read_only: true,
                    recurrence_rule: icsEvent.recurrenceRule,
                    is_deleted: false,
                    soft_deleted_at: null,
                };
                
                const existing = existingMap.get(icsEvent.uid);
                
                if (existing) {
                    // Update existing event
                    const { error: updateError } = await supabase
                        .from('calendar_events')
                        .update({
                            ...eventData,
                            // Don't overwrite status if it was manually changed
                        })
                        .eq('id', existing.id);
                    
                    if (updateError) {
                        console.error(`[ICS Sync] Failed to update event "${icsEvent.summary}":`, updateError);
                    } else {
                        result.updated++;
                    }
                } else {
                    // Insert new event
                    const { error: insertError } = await supabase
                        .from('calendar_events')
                        .insert({
                            ...eventData,
                            created_by: userId,
                            proposed_by: eventType === 'home_day' ? userId : null,
                        });
                    
                    if (insertError) {
                        console.error(`[ICS Sync] Failed to insert event "${icsEvent.summary}":`, insertError);
                        result.errors.push(`Failed to insert: ${icsEvent.summary}`);
                    } else {
                        result.created++;
                    }
                }
            } catch (eventError) {
                console.error(`[ICS Sync] Error processing event:`, eventError);
                result.errors.push(`Failed to process event: ${icsEvent.summary}`);
            }
        }
        
        // Soft delete events that are no longer in the feed
        const entries = Array.from(existingMap.entries());
        for (const [uid, existing] of entries) {
            if (!seenUids.has(uid)) {
                const { error: deleteError } = await supabase
                    .from('calendar_events')
                    .update({ soft_deleted_at: new Date().toISOString() })
                    .eq('id', existing.id);
                
                if (!deleteError) {
                    result.deleted++;
                }
            }
        }
        
        // Update source with success
        await supabase.rpc('update_ics_sync_status', {
            p_source_id: sourceId,
            p_status: 'ok',
            p_etag: fetchResult.etag,
            p_last_modified: fetchResult.lastModified,
        });
        
        result.success = true;
        
        console.log(`[ICS Sync] Completed. Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}, Candidates: ${result.candidatesFound}`);
        
        return result;
    } catch (error) {
        console.error('[ICS Sync] Unexpected error:', error);
        result.errors.push('Sync failed unexpectedly');
        return result;
    }
}

// ============================================
// Batch Sync (for background job)
// ============================================

/**
 * Sync all ICS sources that are due.
 */
export async function syncDueIcsSources(): Promise<{
    syncedCount: number;
    errors: string[];
}> {
    const supabase = getServiceClient();
    const errors: string[] = [];
    let syncedCount = 0;
    
    try {
        // Get sources due for sync
        const { data: sources, error: fetchError } = await supabase
            .rpc('get_ics_sources_due_for_sync', { p_limit: 10 });
        
        if (fetchError) {
            console.error('[ICS Batch Sync] Failed to get sources:', fetchError);
            return { syncedCount: 0, errors: [fetchError.message] };
        }
        
        if (!sources || sources.length === 0) {
            console.log('[ICS Batch Sync] No sources due for sync');
            return { syncedCount: 0, errors: [] };
        }
        
        console.log(`[ICS Batch Sync] Syncing ${sources.length} sources`);
        
        for (const source of sources) {
            try {
                const result = await syncIcsSource(
                    source.source_id,
                    source.user_id,
                    source.child_id,
                    source.ics_url_encrypted,
                    source.etag,
                    source.last_modified
                );
                
                if (result.success) {
                    syncedCount++;
                } else {
                    errors.push(`Source ${source.display_name}: ${result.errors.join(', ')}`);
                }
            } catch (syncError) {
                console.error(`[ICS Batch Sync] Error syncing source ${source.source_id}:`, syncError);
                errors.push(`Source ${source.display_name}: Sync failed`);
            }
        }
        
        return { syncedCount, errors };
    } catch (error) {
        console.error('[ICS Batch Sync] Unexpected error:', error);
        return { syncedCount, errors: ['Batch sync failed'] };
    }
}
