"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

// ==============================================
// V2 TYPES - Child-Centric Permission Model
// (with backward-compatible interface for V1 components)
// ==============================================

export type ChildProfile = {
    id: string;
    familyId?: string; // V1 compatibility
    name: string;
    avatarInitials: string;
    avatarUrl?: string;
    dob?: string;
    gender?: "boy" | "girl" | null; // V1 compatibility
};

// Role types for guardians and helpers
export type GuardianRole = "parent" | "stepparent";
export type HelperType = "family_member" | "friend" | "nanny";
export type RoleType = "guardian" | "helper";
export type AccessLevel = "view" | "contribute" | "manage";
export type CaregiverStatus = "active" | "inactive" | "pending"; // V1 compatibility
export type HomeStatus = "active" | "hidden"; // V1 compatibility

export type CaregiverProfile = {
    id: string;
    name: string;
    label: string;
    avatarInitials: string;
    avatarColor: string;
    avatarUrl?: string;
    isCurrentUser: boolean;
    // V2: role information
    roleType: RoleType;
    guardianRole?: GuardianRole; // Only for guardians
    helperType?: HelperType; // Only for helpers
    accessLevel: AccessLevel;
    // V2: permission capabilities
    canViewCalendar: boolean;
    canEditCalendar: boolean;
    canViewItems: boolean;
    canEditItems: boolean;
    canUploadPhotos: boolean;
    canAddNotes: boolean;
    canViewContacts: boolean;
    canManageHelpers: boolean;
    // V2: which child_spaces this user can access
    accessibleChildSpaceIds: string[];
    phone?: string;
    // V1 compatibility
    relationship?: string;
    accessibleHomeIds: string[];
    status: CaregiverStatus;
    inviteToken?: string;
    inviteId?: string;
    pendingHomeIds?: string[];
};

export type HomeProfile = {
    id: string;
    familyId?: string; // V1 compatibility
    name: string;
    address?: string;
    addressStreet?: string; // V1 compatibility
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
    addressCountry?: string;
    addressLat?: number;
    addressLng?: number;
    photoUrl?: string;
    notes?: string;
    ownerCaregiverId?: string; // V1 compatibility
    accessibleCaregiverIds?: string[]; // V1 compatibility
    timeZone?: string;
    homePhone?: string;
    emergencyContact?: string;
    wifiName?: string;
    wifiPassword?: string;
    isPrimary?: boolean;
    status: HomeStatus; // V1 compatibility
    // V2: child_space_id for this home+child combination
    childSpaceId?: string;
};

// V2: Child Space - the key concept linking child to home
export type ChildSpace = {
    id: string;
    childId: string;
    homeId: string;
    homeName: string;
};

// V2: Contact for a child_space (responsible adult)
export type ChildSpaceContact = {
    id: string;
    childSpaceId: string;
    userId: string;
    userName: string;
    userLabel: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    note?: string;
    isActive: boolean;
};

// Result type for switching home and moving items (V1 compatibility)
export interface SwitchHomeResult {
    success: boolean;
    movedCount: number;
    fromHomeName: string;
    toHomeName: string;
    childName: string;
    movedItems: { id: string; name: string; photoUrl?: string }[];
    movedAnyItems: boolean;
    alreadyAtHome?: boolean;
    error?: string;
}

interface AppStateContextType {
    // V2: User can have access to multiple children
    children: ChildProfile[];
    currentChild: ChildProfile | null;
    setCurrentChildId: (childId: string) => void;

    // V1 compatibility: single child alias
    child: ChildProfile | null;
    setChild: (child: ChildProfile) => void;

    // Caregivers for current child
    caregivers: CaregiverProfile[];
    setCaregivers: (caregivers: CaregiverProfile[]) => void;

    // Homes where current child stays
    homes: HomeProfile[];
    setHomes: (homes: HomeProfile[]) => void;
    activeHomes: HomeProfile[]; // V1 compatibility: only active homes
    hiddenHomes: HomeProfile[]; // V1 compatibility: only hidden homes
    childSpaces: ChildSpace[];

    // Current home (where child is now)
    currentHomeId: string;
    setCurrentHomeId: (homeId: string) => void;
    currentChildSpace: ChildSpace | null;

    // V1 compatibility: legacy caregiver ID
    currentJuneCaregiverId: string;
    setCurrentJuneCaregiverId: (id: string) => void;

    // Is child at one of current user's homes?
    isChildAtUserHome: boolean;

    // Current user's permissions for current child
    currentUserPermissions: {
        isGuardian: boolean;
        canManageHelpers: boolean;
        canEditCalendar: boolean;
        canEditItems: boolean;
        canViewContacts: boolean;
    };

    // Contacts for current child_space
    contacts: ChildSpaceContact[];

    // Onboarding
    onboardingCompleted: boolean;
    setOnboardingCompleted: (completed: boolean) => void;

    // Actions
    refreshData: () => Promise<void>;
    switchChildHome: (targetHomeId: string) => Promise<{ success: boolean; error?: string }>;
    // V1 compatibility
    switchChildHomeAndMovePackedItems: (targetHomeId: string) => Promise<SwitchHomeResult>;

    // Contextual bag visibility (F10 requirement)
    // Shows bag/packing for a home only when:
    // - Child is currently at that home, OR
    // - There's an upcoming stay at that home within N days
    shouldShowBagForHome: (homeId: string) => boolean;
    getRelevantHomesForBag: () => HomeProfile[]; // Homes where bag should be visible
    upcomingStays: { homeId: string; homeName: string; startAt: Date; endAt: Date }[];

    isLoaded: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Helper to get signed URL for avatar
async function getAvatarUrl(avatarPath: string | null | undefined): Promise<string | undefined> {
    if (!avatarPath) return undefined;
    try {
        const { data, error } = await supabase.storage
            .from("avatars")
            .createSignedUrl(avatarPath, 3600);
        if (error) return undefined;
        return data.signedUrl;
    } catch {
        return undefined;
    }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    // State
    const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
    const [currentChildId, setCurrentChildIdState] = useState<string>("");
    const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
    const [homes, setHomes] = useState<HomeProfile[]>([]);
    const [childSpaces, setChildSpaces] = useState<ChildSpace[]>([]);
    const [currentHomeId, setCurrentHomeIdState] = useState<string>("");
    const [contacts, setContacts] = useState<ChildSpaceContact[]>([]);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    // Contextual bag visibility: upcoming stays within N days
    const [upcomingStays, setUpcomingStays] = useState<{ homeId: string; homeName: string; startAt: Date; endAt: Date }[]>([]);
    const BAG_VISIBILITY_DAYS = 7; // Show bag for homes with stays within next 7 days

    // Derived: current child
    const currentChild = childrenList.find(c => c.id === currentChildId) || null;

    // Derived: current child_space
    const currentChildSpace = childSpaces.find(
        cs => cs.childId === currentChildId && cs.homeId === currentHomeId
    ) || null;

    // Derived: current user's caregiver profile
    const currentUserCaregiver = caregivers.find(c => c.isCurrentUser);

    // Derived: is child at user's home?
    const isChildAtUserHome = !!(
        currentHomeId &&
        currentUserCaregiver &&
        currentUserCaregiver.accessibleChildSpaceIds.includes(currentChildSpace?.id || "")
    );

    // Derived: current user's permissions
    const currentUserPermissions = {
        isGuardian: currentUserCaregiver?.roleType === "guardian",
        canManageHelpers: currentUserCaregiver?.canManageHelpers || false,
        canEditCalendar: currentUserCaregiver?.canEditCalendar || false,
        canEditItems: currentUserCaregiver?.canEditItems || false,
        canViewContacts: currentUserCaregiver?.canViewContacts || false,
    };

    const setCurrentChildId = (childId: string) => {
        setCurrentChildIdState(childId);
        // Reset home when switching children
        const firstChildSpace = childSpaces.find(cs => cs.childId === childId);
        if (firstChildSpace) {
            setCurrentHomeIdState(firstChildSpace.homeId);
        }
    };

    const setCurrentHomeId = (homeId: string) => {
        setCurrentHomeIdState(homeId);
    };

    const refreshData = async () => {
        if (!user) {
            setChildrenList([]);
            setCaregivers([]);
            setHomes([]);
            setChildSpaces([]);
            setContacts([]);
            setOnboardingCompleted(false);
            setIsLoaded(true);
            return;
        }

        setIsLoaded(false);

        try {
            // 1. Get all children this user has access to
            const { data: childAccessData, error: childAccessError } = await supabase
                .from("child_access")
                .select(`
                    child_id,
                    role_type,
                    helper_type,
                    access_level,
                    children (
                        id,
                        name,
                        dob,
                        avatar_url
                    )
                `)
                .eq("user_id", user.id);

            if (childAccessError) {
                console.error("Error fetching child access:", childAccessError);
                // Check onboarding status even if no child access
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("onboarding_completed")
                    .eq("id", user.id)
                    .single();
                setOnboardingCompleted(profileData?.onboarding_completed || false);
                setIsLoaded(true);
                return;
            }

            if (!childAccessData || childAccessData.length === 0) {
                // No children - check onboarding status
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("onboarding_completed")
                    .eq("id", user.id)
                    .single();
                setOnboardingCompleted(profileData?.onboarding_completed || false);
                setIsLoaded(true);
                return;
            }

            // Build children list
            const loadedChildren: ChildProfile[] = [];
            for (const ca of childAccessData as any[]) {
                if (ca.children) {
                    const avatarUrl = await getAvatarUrl(ca.children.avatar_url);
                    loadedChildren.push({
                        id: ca.children.id,
                        name: ca.children.name,
                        avatarInitials: ca.children.name?.[0]?.toUpperCase() || "?",
                        avatarUrl,
                        dob: ca.children.dob,
                    });
                }
            }
            setChildrenList(loadedChildren);

            // Set current child if not set
            const activeChildId = currentChildId || loadedChildren[0]?.id;
            if (activeChildId && !currentChildId) {
                setCurrentChildIdState(activeChildId);
            }

            // 2. Get child_spaces for the current child
            const childIdToUse = activeChildId || loadedChildren[0]?.id;
            if (!childIdToUse) {
                setIsLoaded(true);
                return;
            }

            const { data: childSpacesData } = await supabase
                .from("child_spaces")
                .select(`
                    id,
                    child_id,
                    home_id,
                    homes (
                        id,
                        name,
                        address,
                        photo_url,
                        notes
                    )
                `)
                .eq("child_id", childIdToUse);

            const loadedChildSpaces: ChildSpace[] = [];
            const loadedHomes: HomeProfile[] = [];
            const homeIds: string[] = [];

            if (childSpacesData) {
                for (const cs of childSpacesData as any[]) {
                    loadedChildSpaces.push({
                        id: cs.id,
                        childId: cs.child_id,
                        homeId: cs.home_id,
                        homeName: cs.homes?.name || "Unknown",
                    });

                    if (cs.homes) {
                        homeIds.push(cs.homes.id);
                        const photoUrl = await getAvatarUrl(cs.homes.photo_url);
                        loadedHomes.push({
                            id: cs.homes.id,
                            name: cs.homes.name,
                            address: cs.homes.address,
                            photoUrl,
                            notes: cs.homes.notes,
                            childSpaceId: cs.id,
                            // V1 compatibility fields
                            status: "active" as HomeStatus,
                            isPrimary: loadedHomes.length === 0, // First home is primary
                            accessibleCaregiverIds: [], // Will be populated below
                        });
                    }
                }
            }

            // Get home_memberships to find which users are connected to each home
            if (homeIds.length > 0) {
                const { data: homeMemberships } = await supabase
                    .from("home_memberships")
                    .select("home_id, user_id")
                    .in("home_id", homeIds);

                if (homeMemberships) {
                    // Group memberships by home_id
                    const membershipsByHome = homeMemberships.reduce((acc, hm) => {
                        if (!acc[hm.home_id]) acc[hm.home_id] = [];
                        acc[hm.home_id].push(hm.user_id);
                        return acc;
                    }, {} as Record<string, string[]>);

                    // Update homes with their caregiver IDs
                    for (const home of loadedHomes) {
                        home.accessibleCaregiverIds = membershipsByHome[home.id] || [];
                    }
                }
            }

            setChildSpaces(loadedChildSpaces);
            setHomes(loadedHomes);

            // Set current home if not set
            if (!currentHomeId && loadedHomes.length > 0) {
                setCurrentHomeIdState(loadedHomes[0].id);
            }

            // 3. Get all caregivers for this child
            const { data: allChildAccess } = await supabase
                .from("child_access")
                .select(`
                    user_id,
                    role_type,
                    helper_type,
                    access_level,
                    profiles (
                        id,
                        name,
                        label,
                        avatar_initials,
                        avatar_color,
                        avatar_url,
                        phone
                    )
                `)
                .eq("child_id", childIdToUse);

            // Get permission overrides for all users
            const { data: permissionOverrides } = await supabase
                .from("child_permission_overrides")
                .select("*")
                .eq("child_id", childIdToUse);

            // Get child_space_access for all users
            const childSpaceIds = loadedChildSpaces.map(cs => cs.id);
            const { data: spaceAccessData } = await supabase
                .from("child_space_access")
                .select("*")
                .in("child_space_id", childSpaceIds);

            // Build caregivers list
            const loadedCaregivers: CaregiverProfile[] = [];
            if (allChildAccess) {
                for (const ca of allChildAccess as any[]) {
                    if (!ca.profiles) continue;

                    const avatarUrl = await getAvatarUrl(ca.profiles.avatar_url);
                    const isCurrentUser = ca.user_id === user.id;

                    // Get permission overrides for this user
                    const override = permissionOverrides?.find(
                        (po: any) => po.user_id === ca.user_id
                    );

                    // Get child_space_access for this user
                    const userSpaceAccess = spaceAccessData?.filter(
                        (sa: any) => sa.user_id === ca.user_id
                    ) || [];

                    // Guardians have access to all child_spaces
                    const accessibleChildSpaceIds = ca.role_type === "guardian"
                        ? childSpaceIds
                        : userSpaceAccess.map((sa: any) => sa.child_space_id);

                    // V1 compatibility: derive accessibleHomeIds from child_space_ids
                    const accessibleHomeIds = accessibleChildSpaceIds.map((csId: string) => {
                        const cs = loadedChildSpaces.find(c => c.id === csId);
                        return cs?.homeId;
                    }).filter(Boolean) as string[];

                    loadedCaregivers.push({
                        id: ca.profiles.id,
                        name: ca.profiles.name || "Unknown",
                        label: ca.profiles.label || ca.profiles.name || "Unknown",
                        avatarInitials: ca.profiles.avatar_initials || ca.profiles.name?.[0] || "?",
                        avatarColor: ca.profiles.avatar_color || "bg-gray-500",
                        avatarUrl,
                        isCurrentUser,
                        roleType: ca.role_type,
                        guardianRole: ca.role_type === "guardian" ? "parent" : undefined,
                        helperType: ca.helper_type,
                        accessLevel: ca.access_level,
                        canViewCalendar: override?.can_view_calendar ?? (ca.role_type === "guardian"),
                        canEditCalendar: override?.can_edit_calendar ?? (ca.role_type === "guardian"),
                        canViewItems: override?.can_view_items ?? true,
                        canEditItems: override?.can_edit_items ?? (ca.role_type === "guardian"),
                        canUploadPhotos: override?.can_upload_photos ?? (ca.role_type === "guardian"),
                        canAddNotes: override?.can_add_notes ?? (ca.role_type === "guardian"),
                        canViewContacts: override?.can_view_contacts ?? (ca.role_type === "guardian"),
                        canManageHelpers: override?.can_manage_helpers ?? (ca.role_type === "guardian"),
                        accessibleChildSpaceIds,
                        phone: ca.profiles.phone,
                        // V1 compatibility fields
                        relationship: ca.role_type === "guardian" ? "parent" : ca.helper_type,
                        accessibleHomeIds,
                        status: "active" as CaregiverStatus,
                    });
                }
            }
            // Also load pending invites from invites
            const { data: pendingInvites, error: pendingInvitesError } = await supabase
                .from("invites")
                .select("*")
                .eq("child_id", childIdToUse)
                .eq("status", "pending");

            if (pendingInvitesError) {
                console.error("Error loading pending invites:", pendingInvitesError);
            }

            console.log("[AppState] Loaded pending invites:", pendingInvites?.length || 0, "for child:", childIdToUse);

            if (pendingInvites && pendingInvites.length > 0) {
                for (const invite of pendingInvites) {
                    loadedCaregivers.push({
                        id: `pending-${invite.id}`,
                        name: invite.invitee_name || "Pending",
                        label: invite.invitee_label || invite.invitee_name || "Pending",
                        avatarInitials: (invite.invitee_label || invite.invitee_name || "P")[0].toUpperCase(),
                        avatarColor: "#D97706", // Amber color for pending
                        isCurrentUser: false,
                        roleType: invite.invitee_role === "parent" || invite.invitee_role === "step_parent" ? "guardian" : "helper",
                        helperType: invite.invitee_role !== "parent" && invite.invitee_role !== "step_parent" ? invite.invitee_role : undefined,
                        accessLevel: "manage",
                        canViewCalendar: true,
                        canEditCalendar: false,
                        canViewItems: true,
                        canEditItems: false,
                        canUploadPhotos: false,
                        canAddNotes: false,
                        canViewContacts: false,
                        canManageHelpers: false,
                        accessibleChildSpaceIds: [],
                        relationship: invite.invitee_role,
                        accessibleHomeIds: invite.home_id ? [invite.home_id] : [],
                        pendingHomeIds: invite.home_id ? [invite.home_id] : [],
                        status: "pending" as CaregiverStatus,
                        inviteToken: invite.token,
                    });
                }
            }

            setCaregivers(loadedCaregivers);

            // 4. Get contacts for current child_space
            const currentCs = loadedChildSpaces.find(cs => cs.homeId === (currentHomeId || loadedHomes[0]?.id));
            if (currentCs) {
                const { data: contactsData } = await supabase
                    .from("child_space_contacts")
                    .select(`
                        id,
                        child_space_id,
                        user_id,
                        is_active,
                        share_phone,
                        share_email,
                        share_whatsapp,
                        share_note,
                        note,
                        profiles (
                            id,
                            name,
                            label,
                            phone,
                            email,
                            whatsapp
                        )
                    `)
                    .eq("child_space_id", currentCs.id)
                    .eq("is_active", true);

                const loadedContacts: ChildSpaceContact[] = [];
                if (contactsData) {
                    for (const c of contactsData as any[]) {
                        loadedContacts.push({
                            id: c.id,
                            childSpaceId: c.child_space_id,
                            userId: c.user_id,
                            userName: c.profiles?.name || "Unknown",
                            userLabel: c.profiles?.label || c.profiles?.name || "Unknown",
                            phone: c.share_phone ? c.profiles?.phone : undefined,
                            email: c.share_email ? c.profiles?.email : undefined,
                            whatsapp: c.share_whatsapp ? c.profiles?.whatsapp : undefined,
                            note: c.share_note ? c.note : undefined,
                            isActive: c.is_active,
                        });
                    }
                }
                setContacts(loadedContacts);
            }

            // 5. Check onboarding status
            const { data: profileData } = await supabase
                .from("profiles")
                .select("onboarding_completed")
                .eq("id", user.id)
                .single();
            setOnboardingCompleted(profileData?.onboarding_completed || false);

            // 6. Fetch upcoming stays for contextual bag visibility
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + BAG_VISIBILITY_DAYS);

            const { data: staysData } = await supabase
                .from("child_stays")
                .select("id, home_id, start_at, end_at")
                .eq("child_id", childIdToUse)
                .gte("end_at", now.toISOString())
                .lte("start_at", futureDate.toISOString())
                .order("start_at", { ascending: true });

            if (staysData) {
                const loadedStays = staysData.map((stay: any) => ({
                    homeId: stay.home_id,
                    homeName: loadedHomes.find(h => h.id === stay.home_id)?.name || "Unknown",
                    startAt: new Date(stay.start_at),
                    endAt: new Date(stay.end_at),
                }));
                setUpcomingStays(loadedStays);
            } else {
                setUpcomingStays([]);
            }

        } catch (error) {
            console.error("Error fetching app state:", error);
        } finally {
            setIsLoaded(true);
        }
    };

    // Switch child to a different home
    const switchChildHome = async (targetHomeId: string): Promise<{ success: boolean; error?: string }> => {
        if (currentHomeId === targetHomeId) {
            return { success: true };
        }

        try {
            setCurrentHomeIdState(targetHomeId);
            // TODO: Handle item transfers when switching homes
            await refreshData();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    };

    useEffect(() => {
        refreshData();
    }, [user]);

    // Contextual bag visibility helpers (F10 requirement)
    // Show bag/packing for a home only when:
    // - Child is currently at that home, OR
    // - There's an upcoming stay at that home within N days
    const shouldShowBagForHome = (homeId: string): boolean => {
        // If child is currently at this home, show bag
        if (currentHomeId === homeId) return true;

        // If there's an upcoming stay at this home, show bag
        return upcomingStays.some(stay => stay.homeId === homeId);
    };

    // Get all homes where bag should be visible
    const getRelevantHomesForBag = (): HomeProfile[] => {
        return homes.filter(home => shouldShowBagForHome(home.id));
    };

    // V1 compatibility: computed values
    const activeHomes = homes.filter(h => h.status === "active");
    const hiddenHomes = homes.filter(h => h.status === "hidden");
    const currentJuneCaregiverId = currentUserCaregiver?.id || "";

    // V1 compatibility: setters that update the internal state
    const setChild = (child: ChildProfile) => {
        // For V1 compatibility, if child is set, update children list
        setChildrenList(prev => {
            const exists = prev.find(c => c.id === child.id);
            if (exists) {
                return prev.map(c => c.id === child.id ? child : c);
            }
            return [...prev, child];
        });
        setCurrentChildIdState(child.id);
    };

    const setCurrentJuneCaregiverId = (_id: string) => {
        // Legacy no-op - caregivers are derived from child_access
    };

    // V1 compatibility: switch home with item movement
    const switchChildHomeAndMovePackedItems = async (targetHomeId: string): Promise<SwitchHomeResult> => {
        const oldHomeId = currentHomeId;
        const fromHome = homes.find(h => h.id === oldHomeId);
        const toHome = homes.find(h => h.id === targetHomeId);
        const childName = currentChild?.name || "Child";

        // Already at this home
        if (oldHomeId === targetHomeId) {
            return {
                success: true,
                movedCount: 0,
                fromHomeName: toHome?.name || "",
                toHomeName: toHome?.name || "",
                childName,
                movedItems: [],
                movedAnyItems: false,
                alreadyAtHome: true,
            };
        }

        try {
            // Get current child_space for the target home
            const targetChildSpace = childSpaces.find(
                cs => cs.childId === currentChildId && cs.homeId === targetHomeId
            );

            if (!targetChildSpace) {
                return {
                    success: false,
                    movedCount: 0,
                    fromHomeName: fromHome?.name || "",
                    toHomeName: toHome?.name || "",
                    childName,
                    movedItems: [],
                    movedAnyItems: false,
                    error: "Target child space not found",
                };
            }

            // Get current child_space
            const currentCs = childSpaces.find(
                cs => cs.childId === currentChildId && cs.homeId === oldHomeId
            );

            // Find packed items in current child_space
            let packedItems: any[] = [];
            let movedItems: { id: string; name: string; photoUrl?: string }[] = [];

            if (currentCs) {
                const { data: items } = await supabase
                    .from("items")
                    .select("id, name, photo_url")
                    .eq("child_space_id", currentCs.id)
                    .eq("is_packed", true);

                packedItems = items || [];
                movedItems = packedItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    photoUrl: item.photo_url,
                }));

                // Move packed items to target child_space
                if (packedItems.length > 0) {
                    const itemIds = packedItems.map(item => item.id);
                    await supabase
                        .from("items")
                        .update({
                            child_space_id: targetChildSpace.id,
                            is_packed: false,
                            is_requested_for_next_visit: false,
                            is_request_canceled: false,
                        })
                        .in("id", itemIds);
                }

                // Reset flags for remaining items at old location
                await supabase
                    .from("items")
                    .update({
                        is_packed: false,
                        is_requested_for_next_visit: false,
                        is_request_canceled: false,
                    })
                    .eq("child_space_id", currentCs.id);
            }

            // Update local state
            setCurrentHomeIdState(targetHomeId);
            await refreshData();

            return {
                success: true,
                movedCount: packedItems.length,
                fromHomeName: fromHome?.name || "Unknown",
                toHomeName: toHome?.name || "Unknown",
                childName,
                movedItems,
                movedAnyItems: packedItems.length > 0,
            };
        } catch (error) {
            console.error("Error switching home:", error);
            return {
                success: false,
                movedCount: 0,
                fromHomeName: fromHome?.name || "",
                toHomeName: toHome?.name || "",
                childName,
                movedItems: [],
                movedAnyItems: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    };

    return (
        <AppStateContext.Provider
            value={{
                // V2 interface
                children: childrenList,
                currentChild,
                setCurrentChildId,
                caregivers,
                setCaregivers,
                homes,
                setHomes,
                childSpaces,
                currentHomeId,
                setCurrentHomeId,
                currentChildSpace,
                isChildAtUserHome,
                currentUserPermissions,
                contacts,
                onboardingCompleted,
                setOnboardingCompleted,
                refreshData,
                switchChildHome,
                // Contextual bag visibility
                shouldShowBagForHome,
                getRelevantHomesForBag,
                upcomingStays,
                isLoaded,
                // V1 compatibility
                child: currentChild,
                setChild,
                activeHomes,
                hiddenHomes,
                currentJuneCaregiverId,
                setCurrentJuneCaregiverId,
                switchChildHomeAndMovePackedItems,
            }}
        >
            {children}
        </AppStateContext.Provider>
    );
}

export function useAppState() {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error("useAppState must be used within an AppStateProvider");
    }
    return context;
}
