import { supabase } from "../supabase";
import { 
    GoogleCalendarConnection, 
    GoogleCalendarConnectionRow,
    connectionRowToConnection,
    GOOGLE_CALENDAR_SCOPES 
} from "./types";

// ============================================
// Configuration (client-safe values only)
// ============================================

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`
    : 'http://localhost:3000/api/google-calendar/callback';

// ============================================
// Generate OAuth URL (client-side safe)
// ============================================

export async function getGoogleOAuthUrl(): Promise<{ url: string | null; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { url: null, error: 'Not authenticated' };
        }
        
        if (!GOOGLE_CLIENT_ID) {
            return { url: null, error: 'Google Calendar is not configured' };
        }
        
        // Create state parameter with user ID for security
        const state = btoa(JSON.stringify({
            userId: user.id,
            timestamp: Date.now(),
        })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: GOOGLE_CALENDAR_SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent', // Always show consent to get refresh token
            state: state,
        });
        
        const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        
        return { url, error: null };
    } catch (err) {
        console.error('Error generating OAuth URL:', err);
        return { url: null, error: 'Failed to generate OAuth URL' };
    }
}

// ============================================
// Get Connection Status
// ============================================

export async function getGoogleCalendarConnectionStatus(): Promise<{
    connected: boolean;
    connection: GoogleCalendarConnection | null;
    error: string | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { connected: false, connection: null, error: 'Not authenticated' };
        }
        
        const { data, error } = await supabase
            .from('google_calendar_connections')
            .select('*')
            .eq('user_id', user.id)
            .is('revoked_at', null)
            .single();
        
        if (error || !data) {
            return { connected: false, connection: null, error: null };
        }
        
        return { 
            connected: true, 
            connection: connectionRowToConnection(data as GoogleCalendarConnectionRow),
            error: null 
        };
    } catch (err) {
        console.error('Error getting connection status:', err);
        return { connected: false, connection: null, error: 'Failed to check connection' };
    }
}

// ============================================
// Get Valid Access Token (refreshes if needed via API)
// ============================================

export async function getValidAccessToken(): Promise<{ 
    accessToken: string | null; 
    connectionId: string | null; 
    error: string | null 
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { accessToken: null, connectionId: null, error: 'Not authenticated' };
        }
        
        // Get the connection
        const { data: connection, error: fetchError } = await supabase
            .from('google_calendar_connections')
            .select('*')
            .eq('user_id', user.id)
            .is('revoked_at', null)
            .single();
        
        if (fetchError || !connection) {
            return { accessToken: null, connectionId: null, error: 'No Google Calendar connected' };
        }
        
        // Check if token is still valid (with 5 minute buffer)
        const expiresAt = new Date(connection.token_expires_at);
        const bufferTime = 5 * 60 * 1000; // 5 minutes
        
        if (expiresAt.getTime() - Date.now() > bufferTime) {
            // Token is still valid
            return { accessToken: connection.access_token, connectionId: connection.id, error: null };
        }
        
        // Token expired - need to refresh via API
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
            return { accessToken: null, connectionId: connection.id, error: 'No session - please log in again' };
        }
        
        const refreshResponse = await fetch('/api/google-calendar/refresh', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ connectionId: connection.id }),
        });
        
        if (!refreshResponse.ok) {
            const errorData = await refreshResponse.json().catch(() => ({}));
            const errorMessage = errorData.error || 'Token refresh failed - please reconnect';
            return { accessToken: null, connectionId: connection.id, error: errorMessage };
        }
        
        const refreshData = await refreshResponse.json();
        return { accessToken: refreshData.accessToken, connectionId: connection.id, error: null };
    } catch (err) {
        console.error('Error getting valid access token:', err);
        return { accessToken: null, connectionId: null, error: 'Failed to get access token' };
    }
}

// ============================================
// Disconnect Google Calendar
// ============================================

export async function disconnectGoogleCalendar(): Promise<{ success: boolean; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Mark as revoked in our database
        const { error } = await supabase
            .from('google_calendar_connections')
            .update({ revoked_at: new Date().toISOString() })
            .eq('user_id', user.id);
        
        if (error) {
            return { success: false, error: 'Failed to disconnect' };
        }
        
        // Deactivate all calendar sources
        await supabase
            .from('google_calendar_sources')
            .update({ active: false })
            .eq('user_id', user.id);
        
        return { success: true, error: null };
    } catch (err) {
        console.error('Error disconnecting Google Calendar:', err);
        return { success: false, error: 'Failed to disconnect' };
    }
}
