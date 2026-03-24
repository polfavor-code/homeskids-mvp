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
    const species = searchParams.get('species') || 'all';

    try {
        let query = supabaseAdmin
            .from('pets')
            .select('*')
            .order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        if (species !== 'all') {
            query = query.eq('species', species);
        }

        const { data: pets, error } = await query;

        if (error) {
            throw error;
        }

        // Get owner counts and home counts for each pet
        const petIds = pets?.map(p => p.id) || [];

        if (petIds.length === 0) {
            return NextResponse.json({
                pets: [],
                total: 0,
            });
        }

        const { data: petAccess } = await supabaseAdmin
            .from('pet_access')
            .select('pet_id, role_type')
            .in('pet_id', petIds);

        const { data: petSpaces } = await supabaseAdmin
            .from('pet_spaces')
            .select('pet_id')
            .in('pet_id', petIds);

        const petsWithCounts = pets?.map(pet => {
            const access = petAccess?.filter(a => a.pet_id === pet.id) || [];
            return {
                ...pet,
                ownerCount: access.filter(a => a.role_type === 'owner').length,
                caretakerCount: access.filter(a => a.role_type === 'caretaker').length,
                homeCount: petSpaces?.filter(s => s.pet_id === pet.id).length || 0,
            };
        }) || [];

        return NextResponse.json({
            pets: petsWithCounts,
            total: petsWithCounts.length,
        });
    } catch (error) {
        console.error('Error fetching pets:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pets';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
