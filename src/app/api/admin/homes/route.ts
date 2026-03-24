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

    try {
        let query = supabaseAdmin
            .from('homes')
            .select(`
                id,
                name,
                address,
                photo_url,
                notes,
                created_at,
                created_by
            `)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        const { data: homes, error } = await query;

        if (error) {
            throw error;
        }

        // Get member counts and child counts for each home
        const homeIds = homes?.map(h => h.id) || [];

        const { data: memberships } = await supabaseAdmin
            .from('home_memberships')
            .select('home_id')
            .in('home_id', homeIds);

        const { data: childSpaces } = await supabaseAdmin
            .from('child_spaces')
            .select('home_id')
            .in('home_id', homeIds);

        const { data: petSpaces } = await supabaseAdmin
            .from('pet_spaces')
            .select('home_id')
            .in('home_id', homeIds);

        const homesWithCounts = homes?.map(home => ({
            ...home,
            memberCount: memberships?.filter(m => m.home_id === home.id).length || 0,
            childCount: childSpaces?.filter(c => c.home_id === home.id).length || 0,
            petCount: petSpaces?.filter(p => p.home_id === home.id).length || 0,
        })) || [];

        return NextResponse.json({
            homes: homesWithCounts,
            total: homesWithCounts.length,
        });
    } catch (error) {
        console.error('Error fetching homes:', error);
        return NextResponse.json({ error: 'Failed to fetch homes' }, { status: 500 });
    }
}
