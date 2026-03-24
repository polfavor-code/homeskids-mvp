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
    const status = searchParams.get('status') || 'active'; // 'active', 'archived', or 'all'

    const groupBy = searchParams.get('groupBy') || 'none'; // 'household' or 'none'

    try {
        // Get all households (homes)
        let query = supabaseAdmin
            .from('homes')
            .select(`
                id,
                name,
                address,
                photo_url,
                notes,
                status,
                archived_at,
                created_at,
                created_by,
                household_name
            `)
            .order('household_name', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        // Filter by status (using both status field and archived_at for compatibility)
        if (status === 'active') {
            query = query.or('status.eq.active,status.is.null')
                .is('archived_at', null);
        } else if (status === 'archived') {
            query = query.or('status.eq.archived,archived_at.not.is.null');
        }
        // For 'all', no filter needed

        if (search) {
            query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,household_name.ilike.%${search}%`);
        }

        const { data: households, error } = await query;

        if (error) {
            throw error;
        }

        const householdIds = households?.map(h => h.id) || [];

        if (householdIds.length === 0) {
            return NextResponse.json({
                households: [],
                total: 0,
            });
        }

        // Get home memberships with user details
        const { data: memberships } = await supabaseAdmin
            .from('home_memberships')
            .select('home_id, user_id, is_home_admin')
            .in('home_id', householdIds);

        // Get all children in these households via child_spaces
        const { data: childSpaces } = await supabaseAdmin
            .from('child_spaces')
            .select('home_id, child_id')
            .in('home_id', householdIds);

        // Get child IDs to find their access records
        const childIds = Array.from(new Set(childSpaces?.map(cs => cs.child_id) || []));

        // Get child_access to determine user roles per household
        // Parents = users with guardian role for children in this household
        // Caregivers = users with helper role for children in this household
        const { data: childAccess } = childIds.length > 0
            ? await supabaseAdmin
                .from('child_access')
                .select('user_id, child_id, role_type')
                .in('child_id', childIds)
            : { data: [] };

        // Get pet spaces
        const { data: petSpaces } = await supabaseAdmin
            .from('pet_spaces')
            .select('home_id')
            .in('home_id', householdIds);

        // Build household data with counts
        const householdsWithCounts = households?.map(household => {
            // Children in this household
            const householdChildIds = childSpaces
                ?.filter(cs => cs.home_id === household.id)
                .map(cs => cs.child_id) || [];

            // Get unique parents (guardians) for children in this household
            const parentUserIds = new Set<string>();
            const caregiverUserIds = new Set<string>();

            childAccess?.forEach(ca => {
                if (householdChildIds.includes(ca.child_id)) {
                    if (ca.role_type === 'guardian') {
                        parentUserIds.add(ca.user_id);
                    } else if (ca.role_type === 'helper') {
                        caregiverUserIds.add(ca.user_id);
                    }
                }
            });

            // Remove any parent from caregiver count (if someone is both)
            parentUserIds.forEach(id => caregiverUserIds.delete(id));

            // Members in this household
            const householdMemberships = memberships?.filter(m => m.home_id === household.id) || [];

            return {
                ...household,
                status: household.status || 'active',
                parentCount: parentUserIds.size,
                caregiverCount: caregiverUserIds.size,
                childCount: householdChildIds.length,
                petCount: petSpaces?.filter(ps => ps.home_id === household.id).length || 0,
                memberCount: householdMemberships.length,
                homeCount: 1,
            };
        }) || [];

        // If groupBy=household, aggregate homes under their household_name
        if (groupBy === 'household') {
            const groupedMap = new Map<string, {
                household_name: string;
                homes: typeof householdsWithCounts;
                parentCount: number;
                caregiverCount: number;
                childCount: number;
                petCount: number;
                memberCount: number;
                homeCount: number;
                created_at: string;
            }>();

            for (const home of householdsWithCounts) {
                const key = home.household_name || 'Ungrouped';
                const existing = groupedMap.get(key);

                if (existing) {
                    existing.homes.push(home);
                    // Aggregate counts (use Sets to avoid double-counting across homes)
                    existing.homeCount += 1;
                    // Note: other counts are already per-home, we'll show the max or union
                } else {
                    groupedMap.set(key, {
                        household_name: key,
                        homes: [home],
                        parentCount: home.parentCount,
                        caregiverCount: home.caregiverCount,
                        childCount: home.childCount,
                        petCount: home.petCount,
                        memberCount: home.memberCount,
                        homeCount: 1,
                        created_at: home.created_at,
                    });
                }
            }

            // Recalculate aggregated counts properly for grouped households
            const grouped = Array.from(groupedMap.values()).map(group => {
                // Get unique children across all homes in this household
                const allHomeIds = group.homes.map(h => h.id);
                const householdChildIds = new Set(
                    childSpaces?.filter(cs => allHomeIds.includes(cs.home_id)).map(cs => cs.child_id) || []
                );

                // Get unique parents/caregivers across all children in household
                const parentUserIds = new Set<string>();
                const caregiverUserIds = new Set<string>();

                childAccess?.forEach(ca => {
                    if (householdChildIds.has(ca.child_id)) {
                        if (ca.role_type === 'guardian') {
                            parentUserIds.add(ca.user_id);
                        } else if (ca.role_type === 'helper') {
                            caregiverUserIds.add(ca.user_id);
                        }
                    }
                });
                parentUserIds.forEach(id => caregiverUserIds.delete(id));

                // Get unique members across all homes
                const memberUserIds = new Set(
                    memberships?.filter(m => allHomeIds.includes(m.home_id)).map(m => m.user_id) || []
                );

                // Get unique pets across all homes
                const petCount = new Set(
                    petSpaces?.filter(ps => allHomeIds.includes(ps.home_id)).map(ps => ps.home_id) || []
                ).size;

                return {
                    ...group,
                    parentCount: parentUserIds.size,
                    caregiverCount: caregiverUserIds.size,
                    childCount: householdChildIds.size,
                    petCount,
                    memberCount: memberUserIds.size,
                    homeCount: group.homes.length,
                };
            });

            return NextResponse.json({
                households: grouped,
                total: grouped.length,
                groupedBy: 'household',
            });
        }

        return NextResponse.json({
            households: householdsWithCounts,
            total: householdsWithCounts.length,
        });
    } catch (error) {
        console.error('Error fetching households:', error);
        return NextResponse.json({ error: 'Failed to fetch households' }, { status: 500 });
    }
}
