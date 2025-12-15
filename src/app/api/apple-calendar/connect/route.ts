/**
 * Apple Calendar Connect API Route
 * =================================
 * Server-side endpoint for connecting ICS calendars.
 * Handles encryption which requires server-side env vars.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt, hashString, normalizeIcsUrl, maskIcsUrl, isValidIcsUrl } from '@/lib/encryption';

const ICS_RATE_LIMITS = {
    DEFAULT_REFRESH_MINUTES: 30,
};

// Create Supabase client with user's auth
function getSupabaseClient(authHeader: string | null) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    return createClient(url, anonKey, {
        global: {
            headers: authHeader ? { Authorization: authHeader } : {},
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const supabase = getSupabaseClient(authHeader);
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }
        
        const body = await request.json();
        const { icsUrl, childId, displayName } = body;
        
        if (!icsUrl || !childId) {
            return NextResponse.json(
                { success: false, error: 'icsUrl and childId are required' },
                { status: 400 }
            );
        }
        
        // Validate URL
        const validation = isValidIcsUrl(icsUrl);
        if (!validation.valid) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }
        
        // Normalize and hash URL for deduplication
        const normalizedUrl = normalizeIcsUrl(icsUrl);
        const urlHash = hashString(normalizedUrl);
        
        // Encrypt the URL (this requires server-side ENCRYPTION_KEY)
        let encryptedUrl: string;
        try {
            encryptedUrl = encrypt(normalizedUrl);
        } catch (encryptError) {
            console.error('[Apple Calendar API] Encryption failed:', encryptError);
            return NextResponse.json(
                { success: false, error: 'Server configuration error. ENCRYPTION_KEY not set.' },
                { status: 500 }
            );
        }
        
        const maskedUrl = maskIcsUrl(normalizedUrl);
        
        // Check for duplicate URL for this child
        const { data: existingSource } = await supabase
            .from('ics_sources')
            .select('source_id, external_calendar_sources!inner(child_id, active)')
            .eq('ics_url_hash', urlHash)
            .eq('external_calendar_sources.child_id', childId);
        
        if (existingSource && existingSource.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const active = existingSource.find((s: any) => s.external_calendar_sources?.active);
            if (active) {
                return NextResponse.json(
                    { success: false, error: 'This calendar is already connected for this child' },
                    { status: 400 }
                );
            }
        }
        
        // Create the external calendar source
        const calendarName = displayName?.trim() || 'iCloud Calendar';
        
        console.log('[Apple Calendar API] Creating external source for child:', childId);
        
        const { data: source, error: sourceError } = await supabase
            .from('external_calendar_sources')
            .insert({
                user_id: user.id,
                child_id: childId,
                provider: 'ics',
                display_name: calendarName,
                active: true,
            })
            .select()
            .single();
        
        if (sourceError || !source) {
            console.error('[Apple Calendar API] Failed to create external source:', sourceError);
            if (sourceError?.code === '42P01') {
                return NextResponse.json(
                    { success: false, error: 'Database not set up. Please run migration 014.' },
                    { status: 500 }
                );
            }
            return NextResponse.json(
                { success: false, error: sourceError?.message || 'Failed to connect calendar' },
                { status: 500 }
            );
        }
        
        console.log('[Apple Calendar API] Created source:', source.id);
        
        // Create the ICS source record
        const { error: icsError } = await supabase
            .from('ics_sources')
            .insert({
                source_id: source.id,
                ics_url_encrypted: encryptedUrl,
                ics_url_hash: urlHash,
                refresh_interval_minutes: ICS_RATE_LIMITS.DEFAULT_REFRESH_MINUTES,
                next_run_at: new Date().toISOString(),
            });
        
        if (icsError) {
            console.error('[Apple Calendar API] Failed to create ICS source:', icsError);
            // Rollback the external source
            await supabase.from('external_calendar_sources').delete().eq('id', source.id);
            return NextResponse.json(
                { success: false, error: 'Failed to connect calendar' },
                { status: 500 }
            );
        }
        
        console.log('[Apple Calendar API] Successfully connected calendar');
        
        // Return success - initial sync will happen via separate call
        return NextResponse.json({
            success: true,
            sourceId: source.id,
            displayName: calendarName,
            maskedUrl,
        });
    } catch (error) {
        console.error('[Apple Calendar API] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to connect calendar' },
            { status: 500 }
        );
    }
}
