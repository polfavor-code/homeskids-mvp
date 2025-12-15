/**
 * Calendar Sync Cron Job
 * =======================
 * Runs daily at 6 AM to sync ICS calendars that are due.
 * 
 * For Vercel: Add to vercel.json with crons config.
 * Schedule: 0 6 * * * (daily at 6 AM)
 * Path: /api/cron/sync-calendars
 * 
 * Environment variable REQUIRED (fail closed):
 * - CRON_SECRET: Secret key to authenticate cron requests
 *   The endpoint will return 503 if this is not configured.
 * 
 * Security: This endpoint requires authentication via:
 * - Bearer token in Authorization header, OR
 * - x-cron-secret header
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncDueIcsSources } from '@/lib/apple-calendar/sync';

export const maxDuration = 60; // 60 seconds timeout for cron jobs

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret (fail closed: require secret to be configured)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        // Fail closed: CRON_SECRET must be configured
        if (!cronSecret) {
            console.error('[Cron] CRON_SECRET environment variable is not configured');
            return NextResponse.json(
                { 
                    error: 'Server configuration error',
                    message: 'Cron secret not configured. Set CRON_SECRET environment variable.'
                },
                { status: 503 }
            );
        }
        
        // Verify authorization (Bearer token or x-cron-secret header)
        const expectedAuth = `Bearer ${cronSecret}`;
        if (authHeader !== expectedAuth) {
            // Also check x-cron-secret header for manual triggers
            const xCronSecret = request.headers.get('x-cron-secret');
            if (xCronSecret !== cronSecret) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }
        
        console.log('[Cron] Starting calendar sync job');
        
        // Sync all due ICS sources
        const icsResult = await syncDueIcsSources();
        
        console.log(`[Cron] Completed. ICS synced: ${icsResult.syncedCount}`);
        
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ics: {
                syncedCount: icsResult.syncedCount,
                errors: icsResult.errors,
            },
        });
    } catch (error) {
        console.error('[Cron] Calendar sync failed:', error);
        return NextResponse.json(
            { error: 'Cron job failed' },
            { status: 500 }
        );
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}
