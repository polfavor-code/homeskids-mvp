import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
    // Check required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    try {
        const { connectionId } = await request.json();
        
        if (!connectionId) {
            return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
        }
        
        // Get the connection
        const { data: connection, error: fetchError } = await supabaseAdmin
            .from('google_calendar_connections')
            .select('*')
            .eq('id', connectionId)
            .single();
        
        if (fetchError || !connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }
        
        if (!connection.refresh_token) {
            return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
        }
        
        // Request new access token from Google
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: connection.refresh_token,
                grant_type: 'refresh_token',
            }),
        });
        
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Token refresh failed:', errorText);
            
            // Mark connection as revoked if refresh fails
            await supabaseAdmin
                .from('google_calendar_connections')
                .update({ revoked_at: new Date().toISOString() })
                .eq('id', connectionId);
            
            return NextResponse.json({ error: 'Token refresh failed - please reconnect' }, { status: 401 });
        }
        
        const tokens = await tokenResponse.json();
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        
        // Update stored token
        await supabaseAdmin
            .from('google_calendar_connections')
            .update({
                access_token: tokens.access_token,
                token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', connectionId);
        
        return NextResponse.json({ accessToken: tokens.access_token });
    } catch (err) {
        console.error('Token refresh error:', err);
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
    }
}
