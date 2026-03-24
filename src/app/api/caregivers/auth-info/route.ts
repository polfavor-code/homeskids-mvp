import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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
