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

    return { supabaseAdmin, adminUser: user };
}

export async function GET(
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
        // Get user profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get child access data
        const { data: childAccess } = await supabaseAdmin
            .from('child_access')
            .select(`
                id,
                role_type,
                helper_type,
                access_level,
                child_id,
                children_v2 (
                    id,
                    name,
                    avatar_url
                )
            `)
            .eq('user_id', id);

        // Get home memberships
        const { data: homeMemberships } = await supabaseAdmin
            .from('home_memberships')
            .select(`
                id,
                is_home_admin,
                home_id,
                homes_v2 (
                    id,
                    name,
                    address
                )
            `)
            .eq('user_id', id);

        // Get pet access
        const { data: petAccess } = await supabaseAdmin
            .from('pet_access')
            .select(`
                id,
                role_type,
                access_level,
                pet_id,
                pets (
                    id,
                    name,
                    species,
                    avatar_url
                )
            `)
            .eq('user_id', id);

        // Get auth user data (for email confirmation status)
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(id);

        return NextResponse.json({
            user: {
                ...profile,
                authUser: authUser ? {
                    email_confirmed_at: authUser.email_confirmed_at,
                    last_sign_in_at: authUser.last_sign_in_at,
                    created_at: authUser.created_at,
                } : null,
                childAccess: childAccess || [],
                homeMemberships: homeMemberships || [],
                petAccess: petAccess || [],
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PATCH(
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
        const { name, email, phone, label, is_admin } = body;

        // Update profile
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (label !== undefined) updateData.label = label;
        if (is_admin !== undefined) updateData.is_admin = is_admin;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', id);

        if (profileError) {
            throw profileError;
        }

        // Update email in auth if changed
        if (email) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                email,
            });

            if (authError) {
                console.error('Error updating auth email:', authError);
                // Continue - profile was updated
            } else {
                // Also update profile email
                await supabaseAdmin
                    .from('profiles')
                    .update({ email: email.toLowerCase() })
                    .eq('id', id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await getAdminClient(request);
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabaseAdmin, adminUser } = result;
    const { id } = await params;

    // Prevent self-deletion
    if (adminUser.id === id) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    try {
        // Delete auth user (this will cascade to profile via trigger or we delete manually)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (authError) {
            console.error('Error deleting auth user:', authError);
            // Try to delete profile anyway
        }

        // Delete profile (should cascade to related tables via foreign keys)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', id);

        if (profileError) {
            throw profileError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
