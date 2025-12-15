/**
 * Calendar Sync Cron Job
 * =======================
 * Runs every 10 minutes to sync ICS calendars that are due.
 * 
 * For Vercel: Add to vercel.json with crons config.
 * Schedule: every 10 minutes
 * Path: /api/cron/sync-calendars
 * 
 * Environment variable required:
 * - CRON_SECRET: Secret key to authenticate cron requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncDueIcsSources } from '@/lib/apple-calendar/sync';

export const maxDuration = 60; // 60 seconds timeout for cron jobs

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        // For Vercel Cron, check the authorization header
        if (cronSecret) {
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
