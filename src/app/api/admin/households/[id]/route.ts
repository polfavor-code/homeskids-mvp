import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getAdminClient(request: NextRequest) {
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

    return { supabaseAdmin, adminUser: user };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await getAdminClient(request);
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabaseAdmin } = result;
    const { id } = await params;

    try {
        // Get household (home) details
        const { data: household, error: householdError } = await supabaseAdmin
            .from('homes')
            .select('*')
            .eq('id', id)
            .single();

        if (householdError || !household) {
            return NextResponse.json({ error: 'Household not found' }, { status: 404 });
        }

        // Get all members of this household
        const { data: memberships } = await supabaseAdmin
            .from('home_memberships')
            .select(`
                id,
                user_id,
                is_home_admin,
                created_at,
                profiles (
                    id,
                    name,
                    email,
                    phone,
                    avatar_url,
                    avatar_initials,
                    avatar_color
                )
            `)
            .eq('home_id', id);

        // Get children in this household
        const { data: childSpaces } = await supabaseAdmin
            .from('child_spaces')
            .select(`
                id,
                child_id,
                created_at,
                children (
                    id,
                    name,
                    dob,
                    avatar_url,
                    notes
                )
            `)
            .eq('home_id', id);

        // Get child IDs to fetch their access records
        const childIds = childSpaces?.map(cs => cs.child_id) || [];

        // Get child_access records for these children
        const { data: childAccessRecords } = childIds.length > 0
            ? await supabaseAdmin
                .from('child_access')
                .select(`
                    id,
                    user_id,
                    child_id,
                    role_type,
                    helper_type,
                    access_level,
                    profiles (
                        id,
                        name,
                        email,
                        avatar_url,
                        avatar_initials,
                        avatar_color
                    )
                `)
                .in('child_id', childIds)
            : { data: [] };

        // Get pets in this household
        const { data: petSpaces } = await supabaseAdmin
            .from('pet_spaces')
            .select(`
                id,
                pet_id,
                created_at,
                pets (
                    id,
                    name,
                    species,
                    breed,
                    dob,
                    avatar_url,
                    avatar_initials,
                    avatar_color,
                    notes
                )
            `)
            .eq('home_id', id);

        // Calculate member roles based on child_access
        const memberUserIds = memberships?.map(m => m.user_id) || [];

        // Build members with their household roles
        const members = memberships?.map(membership => {
            const userChildAccess = childAccessRecords?.filter(ca => ca.user_id === membership.user_id) || [];
            const isParent = userChildAccess.some(ca => ca.role_type === 'guardian');
            const isCaregiver = userChildAccess.some(ca => ca.role_type === 'helper');
            const helperTypes = Array.from(new Set(userChildAccess.filter(ca => ca.helper_type).map(ca => ca.helper_type)));

            // Determine primary household role
            let householdRole: 'parent' | 'caregiver' | 'member' = 'member';
            if (isParent) {
                householdRole = 'parent';
            } else if (isCaregiver) {
                householdRole = 'caregiver';
            }

            return {
                id: membership.id,
                userId: membership.user_id,
                isHomeAdmin: membership.is_home_admin,
                householdRole,
                helperTypes,
                joinedAt: membership.created_at,
                profile: membership.profiles,
                childrenCount: userChildAccess.length,
            };
        }) || [];

        // Build children with their caregivers
        const children = childSpaces?.map(cs => {
            const childAccessList = childAccessRecords?.filter(ca => ca.child_id === cs.child_id) || [];
            const parents = childAccessList.filter(ca => ca.role_type === 'guardian');
            const caregivers = childAccessList.filter(ca => ca.role_type === 'helper');

            // Handle relation data (might be single object or array)
            const childData = cs.children as unknown as { id: string; name: string; dob: string | null; avatar_url: string | null; notes: string | null } | null;

            return {
                id: cs.child_id,
                addedAt: cs.created_at,
                name: childData?.name || 'Unknown',
                dob: childData?.dob || null,
                avatar_url: childData?.avatar_url || null,
                notes: childData?.notes || null,
                age: childData?.dob ? calculateAge(childData.dob) : null,
                parents: parents.map(p => ({
                    userId: p.user_id,
                    profile: p.profiles,
                    accessLevel: p.access_level,
                })),
                caregivers: caregivers.map(c => ({
                    userId: c.user_id,
                    profile: c.profiles,
                    helperType: c.helper_type,
                    accessLevel: c.access_level,
                })),
            };
        }) || [];

        // Build pets data
        const pets = petSpaces?.map(ps => {
            const petData = ps.pets as unknown as { id: string; name: string; species: string; breed: string | null; dob: string | null; avatar_url: string | null; avatar_initials: string | null; avatar_color: string | null; notes: string | null } | null;
            return {
                id: ps.pet_id,
                addedAt: ps.created_at,
                name: petData?.name || 'Unknown',
                species: petData?.species || 'unknown',
                breed: petData?.breed || null,
                dob: petData?.dob || null,
                avatar_url: petData?.avatar_url || null,
                avatar_initials: petData?.avatar_initials || null,
                avatar_color: petData?.avatar_color || null,
                notes: petData?.notes || null,
            };
        }) || [];

        // Calculate summary counts
        const parentCount = members.filter(m => m.householdRole === 'parent').length;
        const caregiverCount = members.filter(m => m.householdRole === 'caregiver').length;

        return NextResponse.json({
            household: {
                ...household,
                parentCount,
                caregiverCount,
                childCount: children.length,
                petCount: pets.length,
                memberCount: members.length,
                homeCount: 1,
            },
            members,
            children,
            pets,
            homes: [{
                id: household.id,
                name: household.name,
                address: household.address,
                photo_url: household.photo_url,
            }],
        });
    } catch (error) {
        console.error('Error fetching household:', error);
        return NextResponse.json({ error: 'Failed to fetch household' }, { status: 500 });
    }
}

function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// POST handler for household actions (restore, etc.)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await getAdminClient(request);
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabaseAdmin } = result;
    const { id } = await params;

    try {
        const body = await request.json();
        const { action, guardianUserId } = body;

        if (action === 'restore') {
            // Restore an archived household
            // Requires assigning a new guardian

            if (!guardianUserId) {
                return NextResponse.json(
                    { error: 'A guardian user ID is required to restore a household' },
                    { status: 400 }
                );
            }

            // Verify the guardian user exists
            const { data: guardianProfile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('id, name, email')
                .eq('id', guardianUserId)
                .single();

            if (profileError || !guardianProfile) {
                return NextResponse.json(
                    { error: 'Guardian user not found' },
                    { status: 404 }
                );
            }

            // Update household status to active and clear archived_at
            const { error: updateError } = await supabaseAdmin
                .from('homes')
                .update({
                    status: 'active',
                    archived_at: null
                })
                .eq('id', id);

            if (updateError) {
                throw updateError;
            }

            // Add the guardian as a home member
            const { error: memberError } = await supabaseAdmin
                .from('home_memberships')
                .upsert({
                    home_id: id,
                    user_id: guardianUserId,
                    is_home_admin: true,
                }, {
                    onConflict: 'home_id,user_id',
                });

            if (memberError) {
                console.error('Error adding home membership:', memberError);
            }

            // Get children in this household and add guardian access
            const { data: childSpaces } = await supabaseAdmin
                .from('child_spaces')
                .select('child_id')
                .eq('home_id', id);

            const childIds = childSpaces?.map(cs => cs.child_id) || [];

            for (const childId of childIds) {
                const { error: childAccessError } = await supabaseAdmin
                    .from('child_access')
                    .upsert({
                        user_id: guardianUserId,
                        child_id: childId,
                        role_type: 'guardian',
                        access_level: 'full',
                    }, {
                        onConflict: 'user_id,child_id',
                    });

                if (childAccessError) {
                    console.error(`Error adding child access for child ${childId}:`, childAccessError);
                }
            }

            // Get pets in this household and add guardian access
            const { data: petSpaces } = await supabaseAdmin
                .from('pet_spaces')
                .select('pet_id')
                .eq('home_id', id);

            const petIds = petSpaces?.map(ps => ps.pet_id) || [];

            for (const petId of petIds) {
                const { error: petAccessError } = await supabaseAdmin
                    .from('pet_access')
                    .upsert({
                        user_id: guardianUserId,
                        pet_id: petId,
                        role_type: 'guardian',
                        access_level: 'full',
                    }, {
                        onConflict: 'user_id,pet_id',
                    });

                if (petAccessError) {
                    console.error(`Error adding pet access for pet ${petId}:`, petAccessError);
                }
            }

            return NextResponse.json({
                success: true,
                message: `Household restored with ${guardianProfile.name || guardianProfile.email} as guardian`,
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error processing household action:', error);
        return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
    }
}

// DELETE handler for permanently deleting a household
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await getAdminClient(request);
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabaseAdmin } = result;
    const { id } = await params;

    try {
        // Check if household exists and is archived
        const { data: household, error: fetchError } = await supabaseAdmin
            .from('homes')
            .select('id, name, status, archived_at')
            .eq('id', id)
            .single();

        if (fetchError || !household) {
            return NextResponse.json({ error: 'Household not found' }, { status: 404 });
        }

        // Only allow permanent deletion of archived households
        // Check both status field and archived_at for compatibility
        const isArchived = household.status === 'archived' || household.archived_at !== null;
        if (!isArchived) {
            return NextResponse.json(
                { error: 'Only archived households can be permanently deleted. Archive the household first.' },
                { status: 400 }
            );
        }

        // Get children in this household
        const { data: childSpaces } = await supabaseAdmin
            .from('child_spaces')
            .select('child_id')
            .eq('home_id', id);

        const childIds = childSpaces?.map(cs => cs.child_id) || [];

        // Get pets in this household
        const { data: petSpaces } = await supabaseAdmin
            .from('pet_spaces')
            .select('pet_id')
            .eq('home_id', id);

        const petIds = petSpaces?.map(ps => ps.pet_id) || [];

        // Delete child_spaces (removes children from home)
        if (childIds.length > 0) {
            await supabaseAdmin
                .from('child_spaces')
                .delete()
                .eq('home_id', id);

            // Delete the children themselves (only if not in other homes)
            for (const childId of childIds) {
                const { data: otherSpaces } = await supabaseAdmin
                    .from('child_spaces')
                    .select('id')
                    .eq('child_id', childId)
                    .neq('home_id', id)
                    .limit(1);

                if (!otherSpaces || otherSpaces.length === 0) {
                    // Child is only in this home, delete access and child
                    await supabaseAdmin
                        .from('child_access')
                        .delete()
                        .eq('child_id', childId);

                    await supabaseAdmin
                        .from('children')
                        .delete()
                        .eq('id', childId);
                }
            }
        }

        // Delete pet_spaces (removes pets from home)
        if (petIds.length > 0) {
            await supabaseAdmin
                .from('pet_spaces')
                .delete()
                .eq('home_id', id);

            // Delete the pets themselves (only if not in other homes)
            for (const petId of petIds) {
                const { data: otherPetSpaces } = await supabaseAdmin
                    .from('pet_spaces')
                    .select('id')
                    .eq('pet_id', petId)
                    .neq('home_id', id)
                    .limit(1);

                if (!otherPetSpaces || otherPetSpaces.length === 0) {
                    // Pet is only in this home, delete access and pet
                    await supabaseAdmin
                        .from('pet_access')
                        .delete()
                        .eq('pet_id', petId);

                    await supabaseAdmin
                        .from('pets')
                        .delete()
                        .eq('id', petId);
                }
            }
        }

        // Delete home memberships
        await supabaseAdmin
            .from('home_memberships')
            .delete()
            .eq('home_id', id);

        // Delete the home itself
        const { error: deleteError } = await supabaseAdmin
            .from('homes')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
            message: `Household "${household.name}" permanently deleted`,
            deletedChildren: childIds.length,
            deletedPets: petIds.length,
        });
    } catch (error) {
        console.error('Error deleting household:', error);
        return NextResponse.json({ error: 'Failed to delete household' }, { status: 500 });
    }
}
