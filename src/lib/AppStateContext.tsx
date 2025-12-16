"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

// localStorage key prefixes - will be combined with user ID for isolation
const STORAGE_PREFIX = "homeskids";
const STORAGE_KEY_CHILD_SUFFIX = "active_child_id";
const STORAGE_KEY_HOME_SUFFIX = "active_home_id";
const STORAGE_KEY_LAST_USER = "homeskids_last_user_id";

// Helper to get user-specific storage keys
const getStorageKey = (userId: string | undefined, suffix: string) => {
    if (!userId) return null;
    return `${STORAGE_PREFIX}_${userId}_${suffix}`;
};

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

// Child role mapping for pending invites (per-child role info)
export type ChildRoleMapping = {
    childId: string;
    childName: string;
    role: string;
    label: string; // What child calls them
};

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
    // For pending caregivers: role per child
    childRoles?: ChildRoleMapping[];
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
    status: 'active' | 'inactive';
};

// ChildHome with full status info (for UI that shows both active and inactive)
export type ChildHomeWithStatus = {
    childSpaceId: string;
    homeId: string;
    homeName: string;
    status: 'active' | 'inactive';
    createdAt?: string;
    updatedAt?: string;
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

// Info about the invite that the current user accepted (if any)
export type InviteInfo = {
    inviterName: string;
    inviterId: string;
    childName: string;
    hasOwnHome: boolean; // Whether they were asked to create their own home
} | null;

interface AppStateContextType {
    // V2: User can have access to multiple children
    children: ChildProfile[];
    currentChild: ChildProfile | null;
    currentChildId: string;
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
    pendingHomes: HomeProfile[]; // V1 compatibility: homes with no caregivers (pending setup)
    childSpaces: ChildSpace[];

    // Current home (where child is now)
    currentHomeId: string;
    setCurrentHomeId: (homeId: string) => void;
    currentHome: HomeProfile | null;
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

    // Info about the invite the current user accepted (null if created own account)
    inviteInfo: InviteInfo;

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

    // Child-first context selection
    needsChildSelection: boolean; // True if user has multiple children and none selected
    needsHomeSelection: boolean;  // True if user has access to multiple homes for this child and none selected
    clearChildSelection: () => void;  // Clear child selection (triggers re-prompt)
    clearHomeSelection: () => void;   // Clear home selection only
    getHomesForChild: (childId: string) => HomeProfile[]; // Get ALL homes for a specific child
    getAccessibleHomesForChild: (childId: string) => HomeProfile[]; // Get homes USER can access for a child
    accessibleHomes: HomeProfile[]; // Homes the current user can access for the current child
    
    // Child-Home linking helpers
    getChildHomesWithStatus: (childId: string) => Promise<ChildHomeWithStatus[]>; // Get all homes for a child with status
    toggleChildHomeStatus: (childId: string, homeId: string, newStatus: 'active' | 'inactive') => Promise<{ success: boolean; error?: string }>;
    linkChildToHome: (childId: string, homeId: string, inviteId?: string) => Promise<{ success: boolean; error?: string }>;
    getHomeChildrenWithStatus: (homeId: string) => Promise<{ childId: string; childName: string; childAvatarUrl?: string; status: 'active' | 'inactive' }[]>;
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
    
    // Track previous user to detect user changes
    const prevUserIdRef = useRef<string | null>(null);

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
    
    // All child spaces (for all children) - needed for home lookup before child is selected
    const [allChildSpaces, setAllChildSpaces] = useState<ChildSpace[]>([]);
    
    // Info about the invite the current user accepted (null if created own account)
    const [inviteInfo, setInviteInfo] = useState<InviteInfo>(null);
    
    // Clear all state when user changes (prevents data leakage between users)
    useEffect(() => {
        const currentUserId = user?.id || null;
        const prevUserId = prevUserIdRef.current;
        
        // If user changed (including logout/login with different user)
        if (prevUserId !== null && prevUserId !== currentUserId) {
            console.log("[AppState] User changed, clearing state", { prevUserId, currentUserId });
            // Clear all state
            setChildrenList([]);
            setCurrentChildIdState("");
            setCaregivers([]);
            setHomes([]);
            setChildSpaces([]);
            setCurrentHomeIdState("");
            setContacts([]);
            setOnboardingCompleted(false);
            setIsLoaded(false);
            setAllChildSpaces([]);
            setUpcomingStays([]);
            setInviteInfo(null);
        }
        
        prevUserIdRef.current = currentUserId;
    }, [user?.id]);

    // Derived: current child
    const currentChild = childrenList.find(c => c.id === currentChildId) || null;

    // Derived: current child_space
    const currentChildSpace = childSpaces.find(
        cs => cs.childId === currentChildId && cs.homeId === currentHomeId
    ) || null;

    // Derived: current user's caregiver profile
    const currentUserCaregiver = caregivers.find(c => c.isCurrentUser);

    // Derived: is child at user's home?
    // Check if the current home is owned by the current user
    const currentHome = homes.find(h => h.id === currentHomeId) || null;
    const isChildAtUserHome = !!(
        currentHomeId &&
        currentUserCaregiver &&
        currentHome?.ownerCaregiverId === currentUserCaregiver.id
    );

    // Derived: current user's permissions
    const currentUserPermissions = {
        isGuardian: currentUserCaregiver?.roleType === "guardian",
        canManageHelpers: currentUserCaregiver?.canManageHelpers || false,
        canEditCalendar: currentUserCaregiver?.canEditCalendar || false,
        canEditItems: currentUserCaregiver?.canEditItems || false,
        canViewContacts: currentUserCaregiver?.canViewContacts || false,
    };
    
    // Derived: homes the current user has access to (filtered by user access, not all homes for child)
    // - Guardians have access to all homes for the child
    // - Helpers only have access to homes via their accessibleHomeIds
    const accessibleHomes = homes.filter(home => {
        // If no current user caregiver info yet, assume all homes accessible (will refine when loaded)
        if (!currentUserCaregiver) return true;
        // Check if this home is in the user's accessible homes
        return currentUserCaregiver.accessibleHomeIds.includes(home.id);
    });
    
    // Derived: needs child selection (multiple children, none selected)
    const needsChildSelection = childrenList.length > 1 && !currentChildId;
    
    // Derived: needs home selection (user has access to multiple homes for this child, none selected)
    // IMPORTANT: Use accessibleHomes.length, not homes.length
    const needsHomeSelection = !!currentChildId && accessibleHomes.length > 1 && !currentHomeId;

    // Get ALL homes for a specific child (using allChildSpaces)
    const getHomesForChild = useCallback((childId: string): HomeProfile[] => {
        const childSpaceIds = allChildSpaces
            .filter(cs => cs.childId === childId)
            .map(cs => cs.homeId);
        return homes.filter(h => childSpaceIds.includes(h.id));
    }, [allChildSpaces, homes]);

    // Get homes the CURRENT USER can access for a specific child
    // This filters by both child AND user access
    const getAccessibleHomesForChild = useCallback((childId: string): HomeProfile[] => {
        const childHomes = getHomesForChild(childId);
        // If no current user caregiver info, return all (will be refined when loaded)
        if (!currentUserCaregiver) return childHomes;
        // Filter by user's accessible home IDs
        return childHomes.filter(h => currentUserCaregiver.accessibleHomeIds.includes(h.id));
    }, [getHomesForChild, currentUserCaregiver]);

    const setCurrentChildId = useCallback((childId: string) => {
        setCurrentChildIdState(childId);
        // Persist to user-specific localStorage
        if (typeof window !== "undefined" && user?.id) {
            const childKey = getStorageKey(user.id, STORAGE_KEY_CHILD_SUFFIX);
            const homeKey = getStorageKey(user.id, STORAGE_KEY_HOME_SUFFIX);
            if (childKey) localStorage.setItem(childKey, childId);
            if (homeKey) localStorage.removeItem(homeKey);
        }
        // Always clear home when switching children
        // The home auto-selection will be handled by refreshData() based on user access
        setCurrentHomeIdState("");
    }, [user?.id]);

    const setCurrentHomeId = useCallback((homeId: string) => {
        setCurrentHomeIdState(homeId);
        // Persist to user-specific localStorage
        if (typeof window !== "undefined" && user?.id) {
            const homeKey = getStorageKey(user.id, STORAGE_KEY_HOME_SUFFIX);
            if (homeKey) localStorage.setItem(homeKey, homeId);
        }
    }, [user?.id]);
    
    const clearChildSelection = useCallback(() => {
        setCurrentChildIdState("");
        setCurrentHomeIdState("");
        if (typeof window !== "undefined" && user?.id) {
            const childKey = getStorageKey(user.id, STORAGE_KEY_CHILD_SUFFIX);
            const homeKey = getStorageKey(user.id, STORAGE_KEY_HOME_SUFFIX);
            if (childKey) localStorage.removeItem(childKey);
            if (homeKey) localStorage.removeItem(homeKey);
        }
    }, [user?.id]);
    
    const clearHomeSelection = useCallback(() => {
        setCurrentHomeIdState("");
        if (typeof window !== "undefined" && user?.id) {
            const homeKey = getStorageKey(user.id, STORAGE_KEY_HOME_SUFFIX);
            if (homeKey) localStorage.removeItem(homeKey);
        }
    }, [user?.id]);

    const refreshData = async () => {
        if (!user) {
            setChildrenList([]);
            setCaregivers([]);
            setHomes([]);
            setChildSpaces([]);
            setAllChildSpaces([]);
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
                        avatar_url,
                        gender
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

            // Build children list (deduplicated by child name to handle duplicate DB entries)
            // Also build a map of child name -> all child IDs with that name (for loading invites)
            const loadedChildren: ChildProfile[] = [];
            const seenChildNames = new Set<string>();
            const childNameToAllIds: Record<string, string[]> = {};
            
            console.log("📊 Raw childAccessData:", JSON.stringify(childAccessData, null, 2));
            
            for (const ca of childAccessData as any[]) {
                console.log("📊 Processing child_access entry:", {
                    child_id: ca.child_id,
                    hasChildren: !!ca.children,
                    childData: ca.children
                });
                
                const childName = ca.children?.name?.toLowerCase().trim();
                if (ca.children && childName) {
                    // Track all IDs for this child name (for invite loading)
                    if (!childNameToAllIds[childName]) {
                        childNameToAllIds[childName] = [];
                    }
                    childNameToAllIds[childName].push(ca.children.id);
                    
                    // Only add to visible list if not already seen
                    if (!seenChildNames.has(childName)) {
                        seenChildNames.add(childName);
                        const avatarUrl = await getAvatarUrl(ca.children.avatar_url);
                        console.log("📊 Child avatar_url:", ca.children.avatar_url, "-> signed:", avatarUrl);
                        loadedChildren.push({
                            id: ca.children.id,
                            name: ca.children.name,
                            avatarInitials: ca.children.name?.[0]?.toUpperCase() || "?",
                            avatarUrl,
                            dob: ca.children.dob,
                            gender: ca.children.gender,
                        });
                    }
                } else {
                    console.log("📊 WARNING: child_access entry has no children data - RLS may be blocking");
                }
            }
            setChildrenList(loadedChildren);
            
            // Load stored selections from user-specific localStorage
            const childKey = getStorageKey(user.id, STORAGE_KEY_CHILD_SUFFIX);
            const homeKey = getStorageKey(user.id, STORAGE_KEY_HOME_SUFFIX);
            let storedChildId = "";
            let storedHomeId = "";
            if (typeof window !== "undefined" && childKey && homeKey) {
                storedChildId = localStorage.getItem(childKey) || "";
                storedHomeId = localStorage.getItem(homeKey) || "";
            }
            
            // Validate stored child ID - must be in loaded children
            const storedChildValid = storedChildId && loadedChildren.some(c => c.id === storedChildId);
            
            // Determine active child ID based on selection logic:
            // 1. If stored child is valid, use it
            // 2. If exactly 1 child, auto-select it
            // 3. If multiple children, require selection (leave empty)
            let activeChildId = "";
            if (storedChildValid) {
                activeChildId = storedChildId;
            } else if (loadedChildren.length === 1) {
                activeChildId = loadedChildren[0].id;
                // Persist the auto-selection
                if (typeof window !== "undefined" && childKey) {
                    localStorage.setItem(childKey, activeChildId);
                }
            }
            // If multiple children and no valid stored selection, leave empty to trigger selector
            
            if (activeChildId && activeChildId !== currentChildId) {
                setCurrentChildIdState(activeChildId);
            } else if (!activeChildId && currentChildId) {
                // Clear invalid selection
                setCurrentChildIdState("");
                if (typeof window !== "undefined" && childKey) {
                    localStorage.removeItem(childKey);
                }
            }

            // 2. Get ALL child_spaces for all children (needed for home lookup)
            // Filter by status='active' to only show active child-home links
            const allChildIds = loadedChildren.map(c => c.id);
            const { data: allChildSpacesData } = await supabase
                .from("child_spaces")
                .select(`
                    id,
                    child_id,
                    home_id,
                    status,
                    homes (
                        id,
                        name,
                        address,
                        photo_url,
                        notes,
                        owner_caregiver_id
                    )
                `)
                .in("child_id", allChildIds)
                .eq("status", "active");
                
            // Build all child spaces list
            const loadedAllChildSpaces: ChildSpace[] = [];
            if (allChildSpacesData) {
                for (const cs of allChildSpacesData as any[]) {
                    loadedAllChildSpaces.push({
                        id: cs.id,
                        childId: cs.child_id,
                        homeId: cs.home_id,
                        homeName: cs.homes?.name || "Unknown",
                        status: cs.status || "active",
                    });
                }
            }
            setAllChildSpaces(loadedAllChildSpaces);

            // If no active child, we still need to load homes for all children
            // but we can skip the detailed child-specific loading
            if (!activeChildId) {
                // Load all unique homes from all child spaces
                const uniqueHomeIds = Array.from(new Set(loadedAllChildSpaces.map(cs => cs.homeId)));
                const allHomes: HomeProfile[] = [];
                if (allChildSpacesData) {
                    const seenHomeIds = new Set<string>();
                    for (const cs of allChildSpacesData as any[]) {
                        if (cs.homes && !seenHomeIds.has(cs.homes.id)) {
                            seenHomeIds.add(cs.homes.id);
                            const photoUrl = await getAvatarUrl(cs.homes.photo_url);
                            allHomes.push({
                                id: cs.homes.id,
                                name: cs.homes.name,
                                address: cs.homes.address,
                                photoUrl,
                                notes: cs.homes.notes,
                                childSpaceId: cs.id,
                                ownerCaregiverId: cs.homes.owner_caregiver_id, // Populate owner
                                status: "active" as HomeStatus,
                                isPrimary: false,
                                accessibleCaregiverIds: [],
                            });
                        }
                    }
                }
                setHomes(allHomes);
                setChildSpaces([]);
                setIsLoaded(true);
                
                // Check onboarding status
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("onboarding_completed")
                    .eq("id", user.id)
                    .single();
                setOnboardingCompleted(profileData?.onboarding_completed || false);
                return;
            }

            // 3. Get child_spaces for the current child (only active links)
            const childIdToUse = activeChildId;

            const { data: childSpacesData } = await supabase
                .from("child_spaces")
                .select(`
                    id,
                    child_id,
                    home_id,
                    status,
                    homes (
                        id,
                        name,
                        address,
                        photo_url,
                        notes,
                        owner_caregiver_id
                    )
                `)
                .eq("child_id", childIdToUse)
                .eq("status", "active");

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
                        status: cs.status || "active",
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
                            ownerCaregiverId: cs.homes.owner_caregiver_id, // Populate owner for isChildAtUserHome check
                            // V1 compatibility fields
                            status: "active" as HomeStatus,
                            isPrimary: loadedHomes.length === 0, // First home is primary
                            accessibleCaregiverIds: [], // Will be populated below
                        });
                    }
                }
            }

            // Get home_memberships to find which users are connected to each home
            // Store at higher scope so we can use it for caregiver access derivation
            let membershipsByHome: Record<string, string[]> = {};
            if (homeIds.length > 0) {
                const { data: homeMemberships } = await supabase
                    .from("home_memberships")
                    .select("home_id, user_id")
                    .in("home_id", homeIds);

                if (homeMemberships) {
                    // Group memberships by home_id
                    membershipsByHome = homeMemberships.reduce((acc, hm) => {
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

            // Auto-hide homes with 0 caregivers connected
            for (const home of loadedHomes) {
                if (!home.accessibleCaregiverIds || home.accessibleCaregiverIds.length === 0) {
                    home.status = "hidden";
                }
            }

            setChildSpaces(loadedChildSpaces);
            setHomes(loadedHomes);

            // Determine which homes the current user can access
            // - Guardians have access to all homes for the child
            // - Helpers only have access to homes via home_memberships
            const userChildAccess = childAccessData?.find((ca: any) => ca.child_id === childIdToUse);
            const isUserGuardian = userChildAccess?.role_type === "guardian";
            
            const userAccessibleHomes = isUserGuardian 
                ? loadedHomes  // Guardians can access all homes
                : loadedHomes.filter(h => h.accessibleCaregiverIds?.includes(user.id));

            // Validate stored home ID - must be in user's ACCESSIBLE homes
            const storedHomeValid = storedHomeId && userAccessibleHomes.some(h => h.id === storedHomeId);
            
            // Determine active home ID based on selection logic:
            // 1. If stored home is valid and accessible, use it
            // 2. Otherwise, auto-select the first accessible home
            // Home selection is non-blocking - always auto-select to avoid blocking login
            let activeHomeId = "";
            if (storedHomeValid) {
                activeHomeId = storedHomeId;
            } else if (userAccessibleHomes.length >= 1) {
                activeHomeId = userAccessibleHomes[0].id;
                // Persist the auto-selection
                if (typeof window !== "undefined" && homeKey) {
                    localStorage.setItem(homeKey, activeHomeId);
                }
            }
            
            if (activeHomeId && activeHomeId !== currentHomeId) {
                setCurrentHomeIdState(activeHomeId);
            } else if (!activeHomeId && currentHomeId) {
                // Clear invalid selection
                setCurrentHomeIdState("");
                if (typeof window !== "undefined" && homeKey) {
                    localStorage.removeItem(homeKey);
                }
            }

            // 4. Get all caregivers for this child
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

                    // Determine accessible child_spaces:
                    // - GUARDIANS get access to ALL homes for the child (this is the key fix!)
                    // - Helpers: use explicit child_space_access records if they have any
                    // - Otherwise: derive from home_memberships
                    let accessibleChildSpaceIds: string[];
                    
                    if (ca.role_type === "guardian") {
                        // Guardians can access ALL homes linked to this child
                        accessibleChildSpaceIds = loadedChildSpaces.map(cs => cs.id);
                    } else if (userSpaceAccess.length > 0) {
                        // Helper has explicit child_space_access records - use those
                        accessibleChildSpaceIds = userSpaceAccess.map((sa: any) => sa.child_space_id);
                    } else {
                        // Fall back to deriving from home_memberships
                        // Check which homes this user has access to via home_memberships
                        const userHomeIds = Object.entries(membershipsByHome)
                            .filter(([_, userIds]) => (userIds as string[]).includes(ca.user_id))
                            .map(([homeId]) => homeId);
                        
                        // Map home IDs to child_space IDs
                        accessibleChildSpaceIds = loadedChildSpaces
                            .filter(cs => userHomeIds.includes(cs.homeId))
                            .map(cs => cs.id);
                    }

                    // V1 compatibility: derive accessibleHomeIds from child_space_ids
                    const accessibleHomeIds = accessibleChildSpaceIds.map((csId: string) => {
                        const cs = loadedChildSpaces.find(c => c.id === csId);
                        return cs?.homeId;
                    }).filter(Boolean) as string[];

                    // Derive status from home access
                    // Active = connected to >= 1 home for this child
                    // Inactive = connected to 0 homes for this child
                    const caregiverStatus: CaregiverStatus = accessibleHomeIds.length > 0 ? "active" : "inactive";
                    
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
                        status: caregiverStatus,
                    });
                }
            }
            // Also load pending invites from invites
            // Get all child IDs for the current child's name (to handle duplicate DB entries)
            const currentChildName = loadedChildren.find(c => c.id === childIdToUse)?.name?.toLowerCase().trim();
            const allChildIdsForName = currentChildName ? (childNameToAllIds[currentChildName] || [childIdToUse]) : [childIdToUse];
            
            const { data: pendingInvites, error: pendingInvitesError } = await supabase
                .from("invites")
                .select("*")
                .in("child_id", allChildIdsForName)
                .eq("status", "pending");

            if (pendingInvitesError) {
                console.error("Error loading pending invites:", pendingInvitesError);
            }

            console.log("[AppState] Loaded pending invites:", pendingInvites?.length || 0, "for child IDs:", allChildIdsForName);

            if (pendingInvites && pendingInvites.length > 0) {
                // Group invites by invitee name to collect all child roles
                const invitesByName: Record<string, any[]> = {};
                for (const invite of pendingInvites) {
                    const inviteeName = invite.invitee_name?.toLowerCase().trim();
                    if (!inviteeName) continue;
                    if (!invitesByName[inviteeName]) {
                        invitesByName[inviteeName] = [];
                    }
                    invitesByName[inviteeName].push(invite);
                }
                
                // Create one caregiver entry per unique invitee name with all their child roles
                for (const inviteeName of Object.keys(invitesByName)) {
                    const invites = invitesByName[inviteeName];
                    const firstInvite = invites[0];
                    
                    // Build child roles array (deduplicated by child name)
                    const childRoles: ChildRoleMapping[] = [];
                    const seenChildNames = new Set<string>();
                    
                    for (const invite of invites) {
                        // Find the child name for this invite's child_id
                        const childName = loadedChildren.find(c => c.id === invite.child_id)?.name 
                            || (childAccessData as any[]).find(ca => ca.children?.id === invite.child_id)?.children?.name
                            || "Child";
                        const childNameLower = childName.toLowerCase().trim();
                        
                        // Skip if we've already added this child (dedup by name)
                        if (seenChildNames.has(childNameLower)) continue;
                        seenChildNames.add(childNameLower);
                        
                        childRoles.push({
                            childId: invite.child_id,
                            childName: childName,
                            role: invite.invitee_role || "caregiver",
                            label: invite.invitee_label || invite.invitee_name || "Caregiver",
                        });
                    }
                    
                    // Use the first invite's label as the primary label
                    const primaryLabel = firstInvite.invitee_label || firstInvite.invitee_name || "Pending";
                    
                    loadedCaregivers.push({
                        id: `pending-${firstInvite.id}`,
                        name: firstInvite.invitee_name || "Pending",
                        label: primaryLabel,
                        avatarInitials: primaryLabel[0].toUpperCase(),
                        avatarColor: "#D97706", // Amber color for pending
                        isCurrentUser: false,
                        roleType: firstInvite.invitee_role === "parent" || firstInvite.invitee_role === "step_parent" ? "guardian" : "helper",
                        helperType: firstInvite.invitee_role !== "parent" && firstInvite.invitee_role !== "step_parent" ? firstInvite.invitee_role : undefined,
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
                        relationship: firstInvite.invitee_role,
                        accessibleHomeIds: firstInvite.home_id ? [firstInvite.home_id] : [],
                        pendingHomeIds: firstInvite.home_id ? [firstInvite.home_id] : [],
                        status: "pending" as CaregiverStatus,
                        inviteToken: firstInvite.token,
                        childRoles: childRoles,
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

            // 5b. Load invite info if user was invited (for no-home-access empty state)
            const { data: acceptedInvite } = await supabase
                .from("invites")
                .select(`
                    invited_by,
                    has_own_home,
                    child_id,
                    children (name),
                    inviter:profiles!invited_by (name, label)
                `)
                .eq("accepted_by", user.id)
                .eq("status", "accepted")
                .order("accepted_at", { ascending: false })
                .limit(1)
                .single();

            if (acceptedInvite) {
                const inviterProfile = acceptedInvite.inviter as any;
                const childData = acceptedInvite.children as any;
                setInviteInfo({
                    inviterName: inviterProfile?.label || inviterProfile?.name || "Someone",
                    inviterId: acceptedInvite.invited_by,
                    childName: childData?.name || "your child",
                    hasOwnHome: acceptedInvite.has_own_home || false,
                });
            } else {
                setInviteInfo(null);
            }

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

    // Track current home ID in a ref to avoid stale closure issues in realtime callback
    const currentHomeIdRef = useRef<string>(currentHomeId);
    useEffect(() => {
        currentHomeIdRef.current = currentHomeId;
    }, [currentHomeId]);

    // Realtime subscription for child's current_home_id changes
    // This ensures all connected users see the same home state
    useEffect(() => {
        if (!user || !currentChildId) return;

        console.log("[AppState] Setting up child home sync subscription for:", {
            userId: user.id,
            childId: currentChildId,
            currentHomeId: currentHomeIdRef.current
        });

        const channelName = `child-home-sync-${currentChildId}-${Date.now()}`;
        
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "children",
                    filter: `id=eq.${currentChildId}`,
                },
                (payload) => {
                    console.log("[AppState] Received realtime update for children table:", payload);
                    const newData = payload.new as any;
                    const newHomeId = newData?.current_home_id;
                    
                    console.log("[AppState] New home ID from realtime:", newHomeId, "Current:", currentHomeIdRef.current);
                    
                    // If the home changed, update local state to match
                    // Use ref to get current value without stale closure
                    if (newHomeId && newHomeId !== currentHomeIdRef.current) {
                        console.log("[AppState] Child home changed via realtime - updating state:", newHomeId);
                        setCurrentHomeIdState(newHomeId);
                        // Persist to localStorage
                        if (typeof window !== "undefined" && user?.id) {
                            const homeKey = getStorageKey(user.id, STORAGE_KEY_HOME_SUFFIX);
                            if (homeKey) localStorage.setItem(homeKey, newHomeId);
                        }
                        // Refresh data to get updated items, etc.
                        refreshData();
                    } else {
                        console.log("[AppState] Ignoring realtime update - no change or same home");
                    }
                }
            )
            .subscribe((status) => {
                console.log("[AppState] Child home sync subscription status:", status, "for child:", currentChildId);
            });

        return () => {
            console.log("[AppState] Removing child home sync channel for:", currentChildId);
            supabase.removeChannel(channel);
        };
    }, [user, currentChildId]);

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
    const pendingHomes = homes.filter(h => h.status === "hidden");
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

            // Update the child's current_home_id in the database
            // This triggers realtime updates for all connected users
            console.log("[AppState] Updating child current_home_id:", {
                childId: currentChildId,
                newHomeId: targetHomeId
            });
            const { error: updateChildError, data: updateData } = await supabase
                .from("children")
                .update({ current_home_id: targetHomeId })
                .eq("id", currentChildId)
                .select();
            
            if (updateChildError) {
                console.error("[AppState] Error updating child current_home_id:", updateChildError);
            } else {
                console.log("[AppState] Successfully updated child current_home_id:", updateData);
            }

            // Update local state and persist
            setCurrentHomeIdState(targetHomeId);
            if (typeof window !== "undefined" && user?.id) {
                const homeKey = getStorageKey(user.id, STORAGE_KEY_HOME_SUFFIX);
                if (homeKey) localStorage.setItem(homeKey, targetHomeId);
            }
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

    // ==========================================
    // Child-Home Linking Helpers
    // ==========================================
    
    // Get all homes for a child with their status (active and inactive)
    const getChildHomesWithStatus = useCallback(async (childId: string): Promise<ChildHomeWithStatus[]> => {
        try {
            const { data, error } = await supabase
                .from("child_spaces")
                .select(`
                    id,
                    home_id,
                    status,
                    created_at,
                    updated_at,
                    homes (
                        id,
                        name
                    )
                `)
                .eq("child_id", childId)
                .order("status", { ascending: false }); // Active first
            
            if (error) {
                console.error("Error fetching child homes with status:", error);
                return [];
            }
            
            return (data || []).map((cs: any) => ({
                childSpaceId: cs.id,
                homeId: cs.home_id,
                homeName: cs.homes?.name || "Unknown",
                status: cs.status || "active",
                createdAt: cs.created_at,
                updatedAt: cs.updated_at,
            }));
        } catch (err) {
            console.error("Error in getChildHomesWithStatus:", err);
            return [];
        }
    }, []);
    
    // Toggle a child-home link status (activate or deactivate)
    const toggleChildHomeStatus = useCallback(async (
        childId: string, 
        homeId: string, 
        newStatus: 'active' | 'inactive'
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            // First check if link exists
            const { data: existing, error: fetchError } = await supabase
                .from("child_spaces")
                .select("id, status")
                .eq("child_id", childId)
                .eq("home_id", homeId)
                .single();
            
            if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 = not found
                console.error("Error checking existing child_space:", fetchError);
                return { success: false, error: fetchError.message };
            }
            
            if (existing) {
                // Update existing
                const { error: updateError } = await supabase
                    .from("child_spaces")
                    .update({ status: newStatus })
                    .eq("id", existing.id);
                
                if (updateError) {
                    console.error("Error updating child_space status:", updateError);
                    return { success: false, error: updateError.message };
                }
            } else if (newStatus === "active") {
                // Create new link (only if activating)
                const { error: insertError } = await supabase
                    .from("child_spaces")
                    .insert({
                        child_id: childId,
                        home_id: homeId,
                        status: "active",
                    });
                
                if (insertError) {
                    console.error("Error creating child_space:", insertError);
                    return { success: false, error: insertError.message };
                }
            } else {
                return { success: false, error: "Cannot deactivate a link that doesn't exist" };
            }
            
            // Refresh data to update UI
            await refreshData();
            return { success: true };
        } catch (err) {
            console.error("Error in toggleChildHomeStatus:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [refreshData]);
    
    // Link a child to a home (create or reactivate)
    const linkChildToHome = useCallback(async (
        childId: string, 
        homeId: string, 
        inviteId?: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            // Check if link exists
            const { data: existing, error: fetchError } = await supabase
                .from("child_spaces")
                .select("id, status")
                .eq("child_id", childId)
                .eq("home_id", homeId)
                .single();
            
            if (fetchError && fetchError.code !== "PGRST116") {
                console.error("Error checking existing child_space:", fetchError);
                return { success: false, error: fetchError.message };
            }
            
            if (existing) {
                // Reactivate existing link
                const { error: updateError } = await supabase
                    .from("child_spaces")
                    .update({ status: "active" })
                    .eq("id", existing.id);
                
                if (updateError) {
                    console.error("Error reactivating child_space:", updateError);
                    return { success: false, error: updateError.message };
                }
            } else {
                // Create new link
                const insertData: any = {
                    child_id: childId,
                    home_id: homeId,
                    status: "active",
                };
                if (inviteId) {
                    insertData.created_by_invite_id = inviteId;
                }
                
                const { error: insertError } = await supabase
                    .from("child_spaces")
                    .insert(insertData);
                
                if (insertError) {
                    console.error("Error creating child_space:", insertError);
                    return { success: false, error: insertError.message };
                }
            }

            // Ensure the current user has a home_membership for this home
            // This is needed so guardians can see homes they link to their children
            // (especially when linking a home from another child's space)
            // We use a security definer function to bypass RLS restrictions
            if (user) {
                const { error: membershipError } = await supabase
                    .rpc("ensure_guardian_home_membership", {
                        p_home_id: homeId,
                        p_user_id: user.id
                    });
                
                if (membershipError) {
                    // Log but don't fail - the child_spaces link was created successfully
                    console.warn("Could not ensure home_membership for user:", membershipError);
                }
            }
            
            // Refresh data to update UI
            await refreshData();
            return { success: true };
        } catch (err) {
            console.error("Error in linkChildToHome:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, refreshData]);
    
    // Get all children for a home with their status
    const getHomeChildrenWithStatus = useCallback(async (homeId: string): Promise<{ childId: string; childName: string; childAvatarUrl?: string; status: 'active' | 'inactive' }[]> => {
        try {
            const { data, error } = await supabase
                .from("child_spaces")
                .select(`
                    id,
                    child_id,
                    status,
                    children (
                        id,
                        name,
                        avatar_url
                    )
                `)
                .eq("home_id", homeId)
                .order("status", { ascending: false }); // Active first
            
            if (error) {
                console.error("Error fetching home children with status:", error);
                return [];
            }
            
            const result: { childId: string; childName: string; childAvatarUrl?: string; status: 'active' | 'inactive' }[] = [];
            
            for (const cs of (data || []) as any[]) {
                let avatarUrl: string | undefined;
                if (cs.children?.avatar_url) {
                    avatarUrl = await getAvatarUrl(cs.children.avatar_url);
                }
                result.push({
                    childId: cs.child_id,
                    childName: cs.children?.name || "Unknown",
                    childAvatarUrl: avatarUrl,
                    status: cs.status || "active",
                });
            }
            
            return result;
        } catch (err) {
            console.error("Error in getHomeChildrenWithStatus:", err);
            return [];
        }
    }, []);

    return (
        <AppStateContext.Provider
            value={{
                // V2 interface
                children: childrenList,
                currentChild,
                currentChildId,
                setCurrentChildId,
                caregivers,
                setCaregivers,
                homes,
                setHomes,
                childSpaces,
                currentHomeId,
                setCurrentHomeId,
                currentHome,
                currentChildSpace,
                isChildAtUserHome,
                currentUserPermissions,
                contacts,
                inviteInfo,
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
                pendingHomes,
                currentJuneCaregiverId,
                setCurrentJuneCaregiverId,
                switchChildHomeAndMovePackedItems,
                // Child-first context selection
                needsChildSelection,
                needsHomeSelection,
                clearChildSelection,
                clearHomeSelection,
                getHomesForChild,
                getAccessibleHomesForChild,
                accessibleHomes,
                // Child-Home linking helpers
                getChildHomesWithStatus,
                toggleChildHomeStatus,
                linkChildToHome,
                getHomeChildrenWithStatus,
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
