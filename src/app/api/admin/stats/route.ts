import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check admin status
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
        // Get counts in parallel
        const [usersResult, homesResult, childrenResult, petsResult] = await Promise.all([
            supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('homes_v2').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('children_v2').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('pets').select('*', { count: 'exact', head: true }),
        ]);

        // Get recent users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: newUsersCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString());

        // Get guardian/helper counts
        const { data: guardianData } = await supabaseAdmin
            .from('child_access')
            .select('role_type');

        const guardianCount = guardianData?.filter(r => r.role_type === 'guardian').length || 0;
        const helperCount = guardianData?.filter(r => r.role_type === 'helper').length || 0;

        return NextResponse.json({
            stats: {
                users: usersResult.count || 0,
                homes: homesResult.count || 0,
                children: childrenResult.count || 0,
                pets: petsResult.count || 0,
                newUsersThisWeek: newUsersCount || 0,
                guardians: guardianCount,
                helpers: helperCount,
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
