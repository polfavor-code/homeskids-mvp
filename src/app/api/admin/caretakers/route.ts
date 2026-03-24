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
    const roleFilter = searchParams.get('role') || 'all';

    try {
        // Get all child_access records with user and child data
        let query = supabaseAdmin
            .from('child_access')
            .select(`
                *,
                profiles (*),
                children_v2 (*)
            `)
            .order('created_at', { ascending: false });

        // Apply role filter
        if (roleFilter === 'guardians') {
            query = query.eq('role_type', 'guardian');
        } else if (roleFilter === 'helpers') {
            query = query.eq('role_type', 'helper');
        } else if (roleFilter !== 'all') {
            // Filter by specific helper type
            query = query.eq('helper_type', roleFilter);
        }

        const { data: accessRecords, error } = await query;

        if (error) {
            throw error;
        }

        // Get home memberships for each user
        const userIds = Array.from(new Set(accessRecords?.map(a => a.user_id) || []));

        if (userIds.length === 0) {
            return NextResponse.json({
                caretakers: [],
                total: 0,
            });
        }

        const { data: homeMemberships } = await supabaseAdmin
            .from('home_memberships')
            .select(`
                user_id,
                homes_v2 (*)
            `)
            .in('user_id', userIds);

        // Enrich access records with home data
        const enrichedRecords = accessRecords?.map(record => {
            const userHomes = homeMemberships?.filter(hm => hm.user_id === record.user_id) || [];
            return {
                ...record,
                homes: userHomes.map(hm => hm.homes_v2),
            };
        }) || [];

        return NextResponse.json({
            caretakers: enrichedRecords,
            total: enrichedRecords.length,
        });
    } catch (error) {
        console.error('Error fetching caretakers:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch caretakers';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
