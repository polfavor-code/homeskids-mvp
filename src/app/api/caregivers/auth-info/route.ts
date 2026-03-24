import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    let userIds: string[];
    try {
        const body = await request.json();
        userIds = body.userIds;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'userIds array required' }, { status: 400 });
        }

        // Limit to prevent abuse
        if (userIds.length > 50) {
            return NextResponse.json({ error: 'Maximum 50 users per request' }, { status: 400 });
        }

        // Validate each userId is a non-empty string matching UUID format
        for (const userId of userIds) {
            if (typeof userId !== 'string' || !userId.trim()) {
                return NextResponse.json({ error: 'Invalid userIds: all items must be non-empty strings' }, { status: 400 });
            }
            if (!UUID_REGEX.test(userId)) {
                return NextResponse.json({ error: 'Invalid userIds: all items must be valid UUIDs' }, { status: 400 });
            }
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Authorization check: caller must be admin OR share a home/child relationship with requested users
    const isAdmin = user.user_metadata?.is_admin === true;

    if (!isAdmin) {
        // Get homes the caller has access to
        const { data: callerHomes } = await supabaseAdmin
            .from('home_memberships')
            .select('home_id')
            .eq('user_id', user.id);

        const callerHomeIds = callerHomes?.map(h => h.home_id) || [];

        if (callerHomeIds.length === 0) {
            // No home access means can't see any other users
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get all users who share homes with the caller
        const { data: sharedHomeUsers } = await supabaseAdmin
            .from('home_memberships')
            .select('user_id')
            .in('home_id', callerHomeIds);

        const allowedUserIds = new Set(sharedHomeUsers?.map(u => u.user_id) || []);
        allowedUserIds.add(user.id); // Caller can always see themselves

        // Check if all requested userIds are in the allowed set
        const unauthorizedIds = userIds.filter(id => !allowedUserIds.has(id));
        if (unauthorizedIds.length > 0) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    try {
        // Fetch auth data for each user
        const authInfoMap: Record<string, { lastSignInAt: string | null }> = {};

        await Promise.all(
            userIds.map(async (userId) => {
                try {
                    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
                    authInfoMap[userId] = {
                        lastSignInAt: authUser?.last_sign_in_at || null,
                    };
                } catch {
                    // If we can't fetch this user, set null
                    authInfoMap[userId] = { lastSignInAt: null };
                }
            })
        );

        return NextResponse.json({ authInfo: authInfoMap });
    } catch (error) {
        console.error('Error fetching auth info:', error);
        return NextResponse.json({ error: 'Failed to fetch auth info' }, { status: 500 });
    }
}
