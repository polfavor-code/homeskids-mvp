import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getAdminClient(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return { error: 'Server configuration error', status: 500 };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return { error: 'Invalid token', status: 401 };
    }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        return { error: 'Access denied', status: 403 };
    }

    return { supabaseAdmin };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await getAdminClient(request);
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabaseAdmin } = result;
    const { id } = await params;

    try {
        const body = await request.json();
        const { action, password } = body;

        if (action === 'send_reset') {
            // Get user email
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('email')
                .eq('id', id)
                .single();

            if (!profile?.email) {
                return NextResponse.json({ error: 'User has no email' }, { status: 400 });
            }

            // Send password reset email
            // Note: This uses the standard Supabase password recovery
            // The user will receive an email with a reset link
            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
            });

            if (error) {
                throw error;
            }

            return NextResponse.json({ success: true, message: 'Password reset email sent' });
        } else if (action === 'set_password') {
            if (!password || password.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
            }

            // Set new password directly
            const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
                password,
            });

            if (error) {
                throw error;
            }

            return NextResponse.json({ success: true, message: 'Password updated successfully' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error with password action:', error);
        return NextResponse.json({ error: 'Failed to process password action' }, { status: 500 });
    }
}
