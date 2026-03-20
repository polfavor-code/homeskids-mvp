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
        let query = supabaseAdmin
            .from('profiles')
            .select(`
                id,
                name,
                label,
                email,
                phone,
                avatar_url,
                avatar_initials,
                avatar_color,
                manages_children,
                manages_pets,
                is_admin,
                created_at,
                updated_at
            `)
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
                ...profile,
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
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
