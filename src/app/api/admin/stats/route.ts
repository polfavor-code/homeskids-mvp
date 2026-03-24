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
            supabaseAdmin.from('homes').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('children').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('pets').select('*', { count: 'exact', head: true }),
        ]);

        // Get recent users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: newUsersCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString());

        // Get parent/caregiver counts (unique users with guardian/helper roles)
        const { data: childAccessData } = await supabaseAdmin
            .from('child_access')
            .select('user_id, role_type');

        const parentUserIds = new Set(childAccessData?.filter(r => r.role_type === 'guardian').map(r => r.user_id) || []);
        const caregiverUserIds = new Set(childAccessData?.filter(r => r.role_type === 'helper').map(r => r.user_id) || []);
        // Remove parents from caregiver count (user who is both parent and caregiver counts as parent)
        parentUserIds.forEach(id => caregiverUserIds.delete(id));

        // Get user signup timeline (last 30 days) with role breakdown
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentUsers } = await supabaseAdmin
            .from('profiles')
            .select('id, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        // Get child_access for recent users to determine their roles
        const recentUserIds = recentUsers?.map(u => u.id) || [];
        const { data: recentUserAccess } = recentUserIds.length > 0
            ? await supabaseAdmin
                .from('child_access')
                .select('user_id, role_type, helper_type')
                .in('user_id', recentUserIds)
            : { data: [] };

        // Build a map of user roles
        const userRoleMap = new Map<string, { isParent: boolean; isCaregiver: boolean; helperType: string | null }>();
        recentUserAccess?.forEach(access => {
            const existing = userRoleMap.get(access.user_id) || { isParent: false, isCaregiver: false, helperType: null };
            if (access.role_type === 'guardian') {
                existing.isParent = true;
            } else if (access.role_type === 'helper') {
                existing.isCaregiver = true;
                existing.helperType = access.helper_type;
            }
            userRoleMap.set(access.user_id, existing);
        });

        // Aggregate users by day with role breakdown
        const usersByDay: Record<string, { total: number; parents: number; caregivers: number; other: number }> = {};

        // Initialize all days in the range
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            usersByDay[dateKey] = { total: 0, parents: 0, caregivers: 0, other: 0 };
        }

        // Count users per day by role
        recentUsers?.forEach(user => {
            const dateKey = user.created_at.split('T')[0];
            if (usersByDay[dateKey] !== undefined) {
                usersByDay[dateKey].total++;

                const roles = userRoleMap.get(user.id);
                if (roles?.isParent) {
                    usersByDay[dateKey].parents++;
                } else if (roles?.isCaregiver) {
                    usersByDay[dateKey].caregivers++;
                } else {
                    usersByDay[dateKey].other++;
                }
            }
        });

        // Convert to array for chart
        const signupTimeline = Object.entries(usersByDay).map(([date, counts]) => ({
            date,
            total: counts.total,
            parents: counts.parents,
            caregivers: counts.caregivers,
            other: counts.other,
            label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }));

        return NextResponse.json({
            stats: {
                users: usersResult.count || 0,
                households: homesResult.count || 0,
                children: childrenResult.count || 0,
                pets: petsResult.count || 0,
                newUsersThisWeek: newUsersCount || 0,
                parents: parentUserIds.size,
                caregivers: caregiverUserIds.size,
                signupTimeline,
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
