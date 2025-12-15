/**
 * Apple Calendar Sync API Route
 * ==============================
 * Handles manual sync requests and background job triggers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncIcsSource, syncDueIcsSources } from '@/lib/apple-calendar/sync';

// Service role client for background operations
function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !serviceKey) {
        console.error('[Sync API] Missing service role credentials');
        throw new Error('Missing Supabase service role credentials');
    }
    
    return createClient(url, serviceKey);
}

// Client with user's auth token
function getUserClient(authHeader: string | null) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    return createClient(url, anonKey, {
        global: {
            headers: authHeader ? { Authorization: authHeader } : {},
        },
    });
}

// Rate limiting check
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/apple-calendar/sync
 * 
 * Body options:
 * - { sourceId: string } - Sync a specific source (user-triggered)
 * - { batch: true } - Sync all due sources (cron job)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Check for cron job trigger
        if (body.batch === true) {
            // Verify cron secret for batch jobs (fail closed)
            const cronSecret = request.headers.get('x-cron-secret');
            const expectedSecret = process.env.CRON_SECRET;
            
            if (!expectedSecret) {
                console.error('[Sync API] CRON_SECRET not configured');
                return NextResponse.json(
                    { 
                        error: 'Server configuration error',
                        message: 'Cron secret not configured'
                    },
                    { status: 503 }
                );
            }
            
            if (cronSecret !== expectedSecret) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
            
            const result = await syncDueIcsSources();
            
            return NextResponse.json({
                success: true,
                syncedCount: result.syncedCount,
                errors: result.errors,
            });
        }
        
        // Manual sync for a specific source
        const { sourceId } = body;
        
        if (!sourceId) {
            return NextResponse.json(
                { error: 'sourceId is required' },
                { status: 400 }
            );
        }
        
        // Use service role to bypass RLS for reading encrypted data
        let supabase;
        try {
            supabase = getServiceClient();
        } catch (e) {
            console.error('[Sync API] Service client error:', e);
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }
        
        console.log('[Sync API] Looking for source:', sourceId);
        
        // Get source details - first just the external source
        const { data: source, error: sourceError } = await supabase
            .from('external_calendar_sources')
            .select('*')
            .eq('id', sourceId)
            .eq('provider', 'ics')
            .single();
        
        console.log('[Sync API] External source query result:', { found: !!source, error: sourceError?.message });
        
        if (sourceError || !source) {
            console.error('[Sync API] Source not found. Error:', sourceError?.message, 'Code:', sourceError?.code);
            return NextResponse.json(
                { error: 'Source not found', details: sourceError?.message, code: sourceError?.code },
                { status: 404 }
            );
        }
        
        // Get ICS source separately
        const { data: icsData, error: icsError } = await supabase
            .from('ics_sources')
            .select('*')
            .eq('source_id', sourceId)
            .single();
        
        console.log('[Sync API] ICS source query result:', { found: !!icsData, error: icsError?.message });
        
        // Check rate limit for manual sync
        if (source.last_synced_at) {
            const lastSync = new Date(source.last_synced_at);
            if (Date.now() - lastSync.getTime() < MIN_SYNC_INTERVAL_MS) {
                return NextResponse.json(
                    { error: 'Please wait a few minutes before syncing again' },
                    { status: 429 }
                );
            }
        }
        
        if (icsError || !icsData) {
            console.error('[Sync API] ICS source not found:', icsError);
            return NextResponse.json(
                { error: 'ICS configuration not found', details: icsError?.message },
                { status: 404 }
            );
        }
        
        console.log('[Sync API] Starting sync for:', source.display_name);
        
        // Perform sync
        const result = await syncIcsSource(
            sourceId,
            source.user_id,
            source.child_id,
            icsData.ics_url_encrypted,
            icsData.etag,
            icsData.last_modified
        );
        
        if (!result.success) {
            return NextResponse.json({
                success: false,
                errors: result.errors,
            }, { status: 500 });
        }
        
        return NextResponse.json({
            success: true,
            created: result.created,
            updated: result.updated,
            deleted: result.deleted,
            candidatesFound: result.candidatesFound,
            notModified: result.notModified,
        });
    } catch (error) {
        console.error('Apple Calendar sync error:', error);
        return NextResponse.json(
            { error: 'Sync failed' },
            { status: 500 }
        );
    }
}
