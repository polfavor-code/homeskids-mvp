import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function verifyAdmin(request: NextRequest) {
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

    return { supabaseAdmin, user };
}

export async function GET(request: NextRequest) {
    const result = await verifyAdmin(request);
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabaseAdmin } = result;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || 'all';

    try {
        // Get all profiles with their connections
        // Use * to avoid errors from missing columns
        let query = supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data: profiles, error } = await query;

        if (error) {
            throw error;
        }

        // Get connection counts for each user
        const userIds = profiles?.map(p => p.id) || [];

        // If no users, return early
        if (userIds.length === 0) {
            return NextResponse.json({
                users: [],
                total: 0,
            });
        }

        // Get child_access data for role filtering
        const { data: childAccessData } = await supabaseAdmin
            .from('child_access')
            .select('user_id, role_type, helper_type')
            .in('user_id', userIds);

        // Get home membership counts
        const { data: homeMemberships } = await supabaseAdmin
            .from('home_memberships')
            .select('user_id')
            .in('user_id', userIds);

        // Get pet access counts
        const { data: petAccess } = await supabaseAdmin
            .from('pet_access')
            .select('user_id')
            .in('user_id', userIds);

        // Build user data with counts and roles
        const usersWithData = profiles?.map(profile => {
            const userChildAccess = childAccessData?.filter(ca => ca.user_id === profile.id) || [];
            const homeCount = homeMemberships?.filter(hm => hm.user_id === profile.id).length || 0;
            const petCount = petAccess?.filter(pa => pa.user_id === profile.id).length || 0;
            const childCount = userChildAccess.length;

            // Determine primary role
            const isGuardian = userChildAccess.some(ca => ca.role_type === 'guardian');
            const isHelper = userChildAccess.some(ca => ca.role_type === 'helper');
            const helperTypes = Array.from(new Set(userChildAccess.filter(ca => ca.helper_type).map(ca => ca.helper_type)));

            return {
                id: profile.id,
                name: profile.name || null,
                label: profile.label || null,
                email: profile.email || null,
                phone: profile.phone || null,
                avatar_url: profile.avatar_url || null,
                avatar_initials: profile.avatar_initials || null,
                avatar_color: profile.avatar_color || null,
                manages_children: profile.manages_children || false,
                manages_pets: profile.manages_pets || false,
                is_admin: profile.is_admin || false,
                created_at: profile.created_at,
                updated_at: profile.updated_at || null,
                homeCount,
                childCount,
                petCount,
                isGuardian,
                isHelper,
                helperTypes,
                hasAccess: childCount > 0 || homeCount > 0 || petCount > 0,
            };
        }) || [];

        // Apply role filter
        let filteredUsers = usersWithData;
        if (roleFilter === 'guardians') {
            filteredUsers = usersWithData.filter(u => u.isGuardian);
        } else if (roleFilter === 'helpers') {
            filteredUsers = usersWithData.filter(u => u.isHelper && !u.isGuardian);
        } else if (roleFilter === 'no-access') {
            filteredUsers = usersWithData.filter(u => !u.hasAccess);
        }

        return NextResponse.json({
            users: filteredUsers,
            total: filteredUsers.length,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
