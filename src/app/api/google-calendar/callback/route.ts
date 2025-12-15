import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GOOGLE_CALENDAR_SCOPES } from '@/lib/google-calendar/types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`
    : 'http://localhost:3000/api/google-calendar/callback';

export async function GET(request: NextRequest) {
    // Check required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables');
        return NextResponse.redirect(
            new URL('/settings/integrations?error=Server+configuration+error', request.url)
        );
    }
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth environment variables');
        return NextResponse.redirect(
            new URL('/settings/integrations?error=Google+Calendar+not+configured', request.url)
        );
    }
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
        console.error('OAuth error:', error);
        return NextResponse.redirect(
            new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
        );
    }
    
    // Validate required params
    if (!code || !state) {
        return NextResponse.redirect(
            new URL('/settings/integrations?error=missing_params', request.url)
        );
    }
    
    try {
        // Decode and validate state
        const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
        const userId = stateData.userId;
        const timestamp = stateData.timestamp;
        
        // Check state isn't too old (10 minutes max)
        if (Date.now() - timestamp > 10 * 60 * 1000) {
            return NextResponse.redirect(
                new URL('/settings/integrations?error=OAuth+state+expired', request.url)
            );
        }
        
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: GOOGLE_REDIRECT_URI,
            }),
        });
        
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Token exchange failed:', errorText);
            return NextResponse.redirect(
                new URL('/settings/integrations?error=Failed+to+exchange+code+for+tokens', request.url)
            );
        }
        
        const tokens = await tokenResponse.json();
        
        // Get user info to get email
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
            },
        });
        
        if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            console.error('Failed to get user info:', userInfoResponse.status, errorText);
            return NextResponse.redirect(
                new URL('/settings/integrations?error=Failed+to+get+Google+user+info', request.url)
            );
        }
        
        const userInfo = await userInfoResponse.json();
        // Note: Not logging email (PII) - user info retrieved successfully
        
        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        
        // Store in database using admin client
        const { error: dbError } = await supabaseAdmin
            .from('google_calendar_connections')
            .upsert({
                user_id: userId,
                google_account_email: userInfo.email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || null,
                token_expires_at: expiresAt.toISOString(),
                granted_scopes: tokens.scope?.split(' ') || GOOGLE_CALENDAR_SCOPES,
                connected_at: new Date().toISOString(),
                revoked_at: null,
            }, {
                onConflict: 'user_id',
            });
        
        if (dbError) {
            console.error('Failed to store connection:', dbError);
            return NextResponse.redirect(
                new URL('/settings/integrations?error=Failed+to+store+connection', request.url)
            );
        }
        
        // Success - redirect to calendar selection page
        return NextResponse.redirect(
            new URL('/settings/integrations/google-calendar/select', request.url)
        );
    } catch (err) {
        console.error('OAuth callback error:', err);
        return NextResponse.redirect(
            new URL('/settings/integrations?error=OAuth+callback+failed', request.url)
        );
    }
}
