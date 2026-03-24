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
                created_at
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

        if (userIds.length === 0) {
            return NextResponse.json({
                users: [],
                total: 0,
            });
        }

        // Get child_access data with child info for role filtering
        const { data: childAccessData, error: childAccessError } = await supabaseAdmin
            .from('child_access')
            .select('user_id, child_id, role_type, helper_type')
            .in('user_id', userIds);

        if (childAccessError) {
            console.error('Error fetching child_access:', childAccessError);
            throw new Error(`child_access query failed: ${childAccessError.message}`);
        }

        // Get home memberships with home info
        const { data: homeMemberships, error: homeMembershipsError } = await supabaseAdmin
            .from('home_memberships')
            .select(`
                user_id,
                home_id,
                is_home_admin,
                homes (
                    id,
                    name
                )
            `)
            .in('user_id', userIds);

        if (homeMembershipsError) {
            console.error('Error fetching home_memberships:', homeMembershipsError);
            throw new Error(`home_memberships query failed: ${homeMembershipsError.message}`);
        }

        // Get child_spaces to map children to households
        const childIds = Array.from(new Set(childAccessData?.map(ca => ca.child_id) || []));
        const { data: childSpaces, error: childSpacesError } = childIds.length > 0
            ? await supabaseAdmin
                .from('child_spaces')
                .select('child_id, home_id')
                .in('child_id', childIds)
            : { data: [], error: null };

        if (childSpacesError) {
            console.error('Error fetching child_spaces:', childSpacesError);
            throw new Error(`child_spaces query failed: ${childSpacesError.message}`);
        }

        // Get pet access counts
        const { data: petAccess, error: petAccessError } = await supabaseAdmin
            .from('pet_access')
            .select('user_id')
            .in('user_id', userIds);

        if (petAccessError) {
            console.error('Error fetching pet_access:', petAccessError);
            throw new Error(`pet_access query failed: ${petAccessError.message}`);
        }

        // Get auth users for last_sign_in_at
        const { data: { users: authUsers }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000, // Adjust if you have more users
        });

        if (authUsersError) {
            console.error('Error fetching auth users:', authUsersError);
            // Don't throw - continue without last_sign_in_at data
        }

        // Create a map for quick lookup
        const authUsersMap = new Map(authUsers?.map(u => [u.id, u]) || []);

        // Build user data with counts and household roles
        const usersWithData = profiles?.map(profile => {
            const userChildAccess = childAccessData?.filter(ca => ca.user_id === profile.id) || [];
            const userHomeMemberships = homeMemberships?.filter(hm => hm.user_id === profile.id) || [];
            const petCount = petAccess?.filter(pa => pa.user_id === profile.id).length || 0;
            const childCount = userChildAccess.length;

            // Determine primary role (for backwards compatibility)
            const isGuardian = userChildAccess.some(ca => ca.role_type === 'guardian');
            const isHelper = userChildAccess.some(ca => ca.role_type === 'helper');
            const helperTypes = Array.from(new Set(userChildAccess.filter(ca => ca.helper_type).map(ca => ca.helper_type)));

            // Build household roles - role per household
            const householdRoles: Array<{
                householdId: string;
                householdName: string;
                role: 'parent' | 'caregiver' | 'member';
                isHomeAdmin: boolean;
                helperTypes: string[];
            }> = [];

            userHomeMemberships.forEach(membership => {
                // Skip orphaned memberships (where home was deleted)
                const homeData = membership.homes as unknown as { id: string; name: string } | null;
                if (!homeData) return;

                const homeId = membership.home_id;
                const homeName = homeData.name || 'Unknown';

                // Find children in this household
                const childrenInHome = childSpaces?.filter(cs => cs.home_id === homeId).map(cs => cs.child_id) || [];

                // Find user's roles for children in this household
                const userRolesInHome = userChildAccess.filter(ca => childrenInHome.includes(ca.child_id));
                const isParentInHome = userRolesInHome.some(ca => ca.role_type === 'guardian');
                const isCaregiverInHome = userRolesInHome.some(ca => ca.role_type === 'helper');
                const homeHelperTypes = Array.from(new Set(userRolesInHome.filter(ca => ca.helper_type).map(ca => ca.helper_type)));

                let role: 'parent' | 'caregiver' | 'member' = 'member';
                if (isParentInHome) {
                    role = 'parent';
                } else if (isCaregiverInHome) {
                    role = 'caregiver';
                }

                householdRoles.push({
                    householdId: homeId,
                    householdName: homeName,
                    role,
                    isHomeAdmin: membership.is_home_admin ?? false,
                    helperTypes: homeHelperTypes,
                });
            });

            // Get auth data for this user
            const authUser = authUsersMap.get(profile.id);

            return {
                ...profile,
                homeCount: householdRoles.length,
                childCount,
                petCount,
                isGuardian,
                isHelper,
                helperTypes,
                hasAccess: childCount > 0 || householdRoles.length > 0 || petCount > 0,
                householdRoles,
                last_sign_in_at: authUser?.last_sign_in_at || null,
            };
        }) || [];

        // Apply role filter
        let filteredUsers = usersWithData;
        if (roleFilter === 'guardians' || roleFilter === 'parents') {
            filteredUsers = usersWithData.filter(u => u.isGuardian || u.householdRoles.some(hr => hr.role === 'parent'));
        } else if (roleFilter === 'helpers' || roleFilter === 'caregivers') {
            filteredUsers = usersWithData.filter(u =>
                (u.isHelper && !u.isGuardian) ||
                (u.householdRoles.some(hr => hr.role === 'caregiver') && !u.householdRoles.some(hr => hr.role === 'parent'))
            );
        } else if (roleFilter === 'no-access') {
            filteredUsers = usersWithData.filter(u => !u.hasAccess);
        }

        return NextResponse.json({
            users: filteredUsers,
            total: filteredUsers.length,
        });
    } catch (error: unknown) {
        console.error('Error fetching users:', error);
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String((error as { message: unknown }).message);
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: `Failed to fetch users: ${errorMessage}` }, { status: 500 });
    }
}
