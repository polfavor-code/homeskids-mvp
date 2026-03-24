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
            .from('children')
            .select(`
                id,
                name,
                dob,
                avatar_url,
                notes,
                created_at,
                created_by
            `)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data: children, error } = await query;

        if (error) {
            throw error;
        }

        // Get guardian and home counts for each child
        const childIds = children?.map(c => c.id) || [];

        const { data: childAccess } = await supabaseAdmin
            .from('child_access')
            .select('child_id, role_type')
            .in('child_id', childIds);

        const { data: childSpaces } = await supabaseAdmin
            .from('child_spaces')
            .select('child_id')
            .in('child_id', childIds);

        const childrenWithCounts = children?.map(child => {
            const access = childAccess?.filter(a => a.child_id === child.id) || [];
            const age = child.dob ? calculateAge(child.dob) : null;

            return {
                ...child,
                age,
                guardianCount: access.filter(a => a.role_type === 'guardian').length,
                helperCount: access.filter(a => a.role_type === 'helper').length,
                homeCount: childSpaces?.filter(s => s.child_id === child.id).length || 0,
            };
        }) || [];

        return NextResponse.json({
            children: childrenWithCounts,
            total: childrenWithCounts.length,
        });
    } catch (error) {
        console.error('Error fetching children:', error);
        return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }
}

function calculateAge(dob: string): number {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
