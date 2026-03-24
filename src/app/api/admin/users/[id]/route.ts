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

// Helper function to calculate deletion impact
async function getDeletionImpact(supabaseAdmin: ReturnType<typeof createClient>, userId: string) {
    try {
        // Get user's guardian child access (not helper)
        const { data: guardianChildAccess } = await supabaseAdmin
            .from('child_access')
            .select('child_id, children(id, name)')
            .eq('user_id', userId)
            .eq('role_type', 'guardian');

        // Get user's home memberships
        const { data: userHomeMemberships } = await supabaseAdmin
            .from('home_memberships')
            .select('home_id, homes(id, name, status)')
            .eq('user_id', userId);

        const homeIds = userHomeMemberships?.map(m => m.home_id) || [];

        // For each home, check if this user is the last guardian
        const householdsToArchive: Array<{ id: string; name: string; helpersCount: number }> = [];
        const householdsAffected: Array<{ id: string; name: string }> = [];
        let totalCaregiversToRemove = 0;

        for (const homeId of homeIds) {
            // Get home details
            const membership = userHomeMemberships?.find(m => m.home_id === homeId);
            const home = membership?.homes as { id: string; name: string; status: string } | null;

            if (!home || home.status === 'archived') continue;

            householdsAffected.push({ id: home.id, name: home.name });

            // Get all members of this home
            const { data: homeMembers } = await supabaseAdmin
                .from('home_memberships')
                .select('user_id')
                .eq('home_id', homeId);

            const memberIds = homeMembers?.map(m => m.user_id).filter(id => id !== userId) || [];

            // Check if any remaining member is a guardian (has guardian access to any child)
            let hasOtherGuardian = false;

            if (memberIds.length > 0) {
                const { data: otherGuardians } = await supabaseAdmin
                    .from('child_access')
                    .select('user_id')
                    .in('user_id', memberIds)
                    .eq('role_type', 'guardian')
                    .limit(1);

                hasOtherGuardian = (otherGuardians?.length || 0) > 0;
            }

            // If no other guardian, this home will be archived
            if (!hasOtherGuardian) {
                // Count helpers that will lose access
                const { count: helpersCount } = await supabaseAdmin
                    .from('home_memberships')
                    .select('*', { count: 'exact', head: true })
                    .eq('home_id', homeId)
                    .neq('user_id', userId);

                householdsToArchive.push({
                    id: home.id,
                    name: home.name,
                    helpersCount: helpersCount || 0
                });
                totalCaregiversToRemove += helpersCount || 0;
            }
        }

        // Get children that would lose their only guardian
        const childrenAffected: Array<{ id: string; name: string; willLoseAllGuardians: boolean }> = [];

        for (const access of guardianChildAccess || []) {
            const child = access.children as { id: string; name: string } | null;
            if (!child) continue;

            // Check if child has other guardians
            const { data: otherGuardians } = await supabaseAdmin
                .from('child_access')
                .select('user_id')
                .eq('child_id', access.child_id)
                .eq('role_type', 'guardian')
                .neq('user_id', userId);

            childrenAffected.push({
                id: child.id,
                name: child.name,
                willLoseAllGuardians: (otherGuardians?.length || 0) === 0
            });
        }

        // Get user's pet access
        const { data: userPetAccess } = await supabaseAdmin
            .from('pet_access')
            .select('pet_id, role_type, pets(id, name)')
            .eq('user_id', userId);

        const petsAffected: Array<{ id: string; name: string; willLoseAllGuardians: boolean }> = [];

        for (const access of userPetAccess || []) {
            const pet = access.pets as { id: string; name: string } | null;
            if (!pet) continue;

            // Check if pet has other owners/guardians
            const { data: otherOwners } = await supabaseAdmin
                .from('pet_access')
                .select('user_id')
                .eq('pet_id', access.pet_id)
                .eq('role_type', 'guardian')
                .neq('user_id', userId);

            petsAffected.push({
                id: pet.id,
                name: pet.name,
                willLoseAllGuardians: access.role_type === 'guardian' && (otherOwners?.length || 0) === 0
            });
        }

        const isLastGuardianAnywhere = householdsToArchive.length > 0 ||
            childrenAffected.some(c => c.willLoseAllGuardians) ||
            petsAffected.some(p => p.willLoseAllGuardians);

        return NextResponse.json({
            impact: {
                householdsAffected: householdsAffected.length,
                householdsToArchive: householdsToArchive.length,
                householdsToArchiveDetails: householdsToArchive,
                childrenAffected: childrenAffected.length,
                childrenDetails: childrenAffected,
                petsAffected: petsAffected.length,
                petsDetails: petsAffected,
                caregiversToRemove: totalCaregiversToRemove,
                isLastGuardian: isLastGuardianAnywhere
            }
        });
    } catch (error) {
        console.error('Error calculating deletion impact:', error);
        return NextResponse.json({ error: 'Failed to calculate deletion impact' }, { status: 500 });
    }
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

    // Check if this is a deletion impact request
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'deletion-impact') {
        return await getDeletionImpact(supabaseAdmin, id);
    }

    try {
        // Get user profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get child access data
        const { data: childAccess } = await supabaseAdmin
            .from('child_access')
            .select(`
                id,
                role_type,
                helper_type,
                access_level,
                child_id,
                children (
                    id,
                    name,
                    avatar_url
                )
            `)
            .eq('user_id', id);

        // Get home memberships
        const { data: homeMemberships } = await supabaseAdmin
            .from('home_memberships')
            .select(`
                id,
                is_home_admin,
                home_id,
                homes (
                    id,
                    name,
                    address
                )
            `)
            .eq('user_id', id);

        // Get pet access
        const { data: petAccess } = await supabaseAdmin
            .from('pet_access')
            .select(`
                id,
                role_type,
                access_level,
                pet_id,
                pets (
                    id,
                    name,
                    species,
                    avatar_url
                )
            `)
            .eq('user_id', id);

        // Get auth user data (for email confirmation status)
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(id);

        return NextResponse.json({
            user: {
                ...profile,
                authUser: authUser ? {
                    email_confirmed_at: authUser.email_confirmed_at,
                    last_sign_in_at: authUser.last_sign_in_at,
                    created_at: authUser.created_at,
                } : null,
                childAccess: childAccess || [],
                homeMemberships: homeMemberships || [],
                petAccess: petAccess || [],
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PATCH(
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
        const { name, email, phone, label, is_admin } = body;

        // Update profile
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (label !== undefined) updateData.label = label;
        if (is_admin !== undefined) updateData.is_admin = is_admin;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', id);

        if (profileError) {
            throw profileError;
        }

        // Update email in auth if changed
        if (email) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                email,
            });

            if (authError) {
                console.error('Error updating auth email:', authError);
                // Continue - profile was updated
            } else {
                // Also update profile email
                await supabaseAdmin
                    .from('profiles')
                    .update({ email: email.toLowerCase() })
                    .eq('id', id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

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
        const { action, password } = body;

        if (action === 'change_password') {
            if (!password || password.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
            }

            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                password,
            });

            if (passwordError) {
                console.error('Error changing password:', passwordError);
                return NextResponse.json({ error: passwordError.message }, { status: 400 });
            }

            return NextResponse.json({ success: true, message: 'Password changed successfully' });
        }

        if (action === 'send_reset') {
            // Get user email first
            const { data: { user: targetUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);

            if (getUserError || !targetUser?.email) {
                return NextResponse.json({ error: 'Could not find user email' }, { status: 400 });
            }

            const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(targetUser.email, {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/reset-password`,
            });

            if (resetError) {
                console.error('Error sending reset email:', resetError);
                return NextResponse.json({ error: resetError.message }, { status: 400 });
            }

            return NextResponse.json({ success: true, message: 'Password reset email sent' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error in user action:', error);
        return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await getAdminClient(request);
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabaseAdmin, adminUser } = result;
    const { id } = await params;

    // Prevent self-deletion
    if (adminUser.id === id) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    try {
        // Step 1: Identify households that need to be archived
        // Get user's home memberships before deletion
        const { data: userHomeMemberships } = await supabaseAdmin
            .from('home_memberships')
            .select('home_id')
            .eq('user_id', id);

        const homeIds = userHomeMemberships?.map(m => m.home_id) || [];
        const homesToArchive: string[] = [];

        // Check each home to see if this user is the last guardian
        for (const homeId of homeIds) {
            // Get all members of this home except the user being deleted
            const { data: otherMembers } = await supabaseAdmin
                .from('home_memberships')
                .select('user_id')
                .eq('home_id', homeId)
                .neq('user_id', id);

            const otherMemberIds = otherMembers?.map(m => m.user_id) || [];

            // Check if any remaining member is a guardian
            let hasOtherGuardian = false;
            if (otherMemberIds.length > 0) {
                const { data: otherGuardians } = await supabaseAdmin
                    .from('child_access')
                    .select('user_id')
                    .in('user_id', otherMemberIds)
                    .eq('role_type', 'guardian')
                    .limit(1);

                hasOtherGuardian = (otherGuardians?.length || 0) > 0;
            }

            if (!hasOtherGuardian) {
                homesToArchive.push(homeId);
            }
        }

        // Step 2: Clear created_by references that would block profile deletion
        // Set created_by to NULL on homes created by this user
        const { error: homesCreatedByError } = await supabaseAdmin
            .from('homes')
            .update({ created_by: null })
            .eq('created_by', id);

        if (homesCreatedByError) {
            console.error('Error clearing homes created_by:', homesCreatedByError);
        }

        // Set created_by to NULL on children created by this user
        const { error: childrenCreatedByError } = await supabaseAdmin
            .from('children')
            .update({ created_by: null })
            .eq('created_by', id);

        if (childrenCreatedByError) {
            console.error('Error clearing children created_by:', childrenCreatedByError);
        }

        // Set created_by to NULL on pets created by this user
        const { error: petsCreatedByError } = await supabaseAdmin
            .from('pets')
            .update({ created_by: null })
            .eq('created_by', id);

        if (petsCreatedByError) {
            console.error('Error clearing pets created_by:', petsCreatedByError);
        }

        // Clear invite references (invited_by and accepted_by)
        const { error: invitedByError } = await supabaseAdmin
            .from('invites')
            .update({ invited_by: null })
            .eq('invited_by', id);

        if (invitedByError) {
            console.error('Error clearing invites invited_by:', invitedByError);
        }

        const { error: acceptedByError } = await supabaseAdmin
            .from('invites')
            .update({ accepted_by: null })
            .eq('accepted_by', id);

        if (acceptedByError) {
            console.error('Error clearing invites accepted_by:', acceptedByError);
        }

        // Clear calendar_events references
        const calendarFields = ['created_by', 'proposed_by', 'confirmed_by', 'rejected_by', 'deleted_by'];
        for (const field of calendarFields) {
            const { error: calendarError } = await supabaseAdmin
                .from('calendar_events')
                .update({ [field]: null })
                .eq(field, id);

            if (calendarError) {
                console.error(`Error clearing calendar_events ${field}:`, calendarError);
            }
        }

        // Step 3: Delete auth user
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (authError) {
            console.error('Error deleting auth user:', authError);
            // Continue - try to delete profile anyway
        }

        // Step 4: Delete profile (cascades to child_access, pet_access, home_memberships)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', id);

        if (profileError) {
            throw profileError;
        }

        // Step 5: Archive households that no longer have guardians
        for (const homeId of homesToArchive) {
            // Set home archived_at timestamp (consistent with AppStateContext)
            const { error: archiveError } = await supabaseAdmin
                .from('homes')
                .update({
                    status: 'archived',
                    archived_at: new Date().toISOString()
                })
                .eq('id', homeId);

            if (archiveError) {
                console.error(`Error archiving home ${homeId}:`, archiveError);
            }

            // Remove all remaining home memberships (helpers/caregivers)
            const { error: removeMembersError } = await supabaseAdmin
                .from('home_memberships')
                .delete()
                .eq('home_id', homeId);

            if (removeMembersError) {
                console.error(`Error removing members from home ${homeId}:`, removeMembersError);
            }

            // Get children in this home via child_spaces
            const { data: childSpaces } = await supabaseAdmin
                .from('child_spaces')
                .select('child_id')
                .eq('home_id', homeId);

            const childIds = childSpaces?.map(cs => cs.child_id) || [];

            // Remove helper access to children in this home
            if (childIds.length > 0) {
                const { error: removeChildAccessError } = await supabaseAdmin
                    .from('child_access')
                    .delete()
                    .in('child_id', childIds)
                    .eq('role_type', 'helper');

                if (removeChildAccessError) {
                    console.error(`Error removing helper child access for home ${homeId}:`, removeChildAccessError);
                }
            }

            // Get pets in this home
            const { data: pets } = await supabaseAdmin
                .from('pets')
                .select('id')
                .eq('home_id', homeId);

            const petIds = pets?.map(p => p.id) || [];

            // Remove helper access to pets in this home
            if (petIds.length > 0) {
                const { error: removePetAccessError } = await supabaseAdmin
                    .from('pet_access')
                    .delete()
                    .in('pet_id', petIds)
                    .eq('role_type', 'helper');

                if (removePetAccessError) {
                    console.error(`Error removing helper pet access for home ${homeId}:`, removePetAccessError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            archivedHouseholds: homesToArchive.length
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
