import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check environment variables
    const envCheck = {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        supabaseUrlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : null,
    };

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({
            error: 'Server configuration error',
            envCheck,
            step: 'env_check',
        }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({
            error: 'No authorization header',
            envCheck,
            hasAuthHeader: !!authHeader,
            authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : null,
            step: 'auth_header',
            hint: 'Make sure you are logged in. Try logging out and back in at /admin/login',
        }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({
            error: 'Invalid token',
            envCheck,
            authError: authError?.message,
            step: 'token_validation',
            hint: 'Your session may have expired. Try logging out and back in.',
        }, { status: 401 });
    }

    // Check profile and is_admin
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, name, is_admin')
        .eq('id', user.id)
        .single();

    if (profileError) {
        return NextResponse.json({
            error: 'Failed to fetch profile',
            envCheck,
            userId: user.id,
            userEmail: user.email,
            profileError: profileError.message,
            step: 'profile_fetch',
            hint: 'Profile not found or error accessing profiles table',
        }, { status: 500 });
    }

    // Check is_admin column exists
    const hasIsAdminColumn = profile && 'is_admin' in profile;

    return NextResponse.json({
        success: true,
        envCheck,
        user: {
            id: user.id,
            email: user.email,
        },
        profile: {
            id: profile?.id,
            email: profile?.email,
            name: profile?.name,
            is_admin: profile?.is_admin,
            hasIsAdminColumn,
        },
        isAdmin: profile?.is_admin === true,
        step: 'complete',
        hint: profile?.is_admin === true
            ? 'You are an admin! Everything looks good.'
            : 'You are NOT marked as admin. Run this SQL in Supabase: UPDATE profiles SET is_admin = true WHERE id = \'' + user.id + '\';',
    });
}
