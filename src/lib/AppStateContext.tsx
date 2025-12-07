"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, FEATURES } from "./supabase";
import { useAuth } from "./AuthContext";

export type ChildProfile = {
    id: string;
    familyId: string;
    name: string;
    avatarInitials: string;
    avatarUrl?: string; // URL from Supabase storage
    gender?: "boy" | "girl" | null;
};

// Status is now derived from home connections:
// - active = connected to >= 1 home in the family
// - inactive = connected to 0 homes in the family
// - pending = invite not yet accepted
export type CaregiverStatus = "active" | "inactive" | "pending";

export type CaregiverProfile = {
    id: string;
    name: string;
    label: string;
    avatarInitials: string;
    avatarColor: string;
    avatarUrl?: string; // URL from Supabase storage
    isCurrentUser: boolean;
    relationship?: string; // parent, step_parent, family_member, nanny, babysitter, family_friend, other
    phone?: string;
    accessibleHomeIds: string[]; // Derived from home_access table
    status: CaregiverStatus; // Derived: active if has homes, inactive if no homes, pending if invite
    inviteToken?: string; // Only for pending caregivers - used to generate invite link
    inviteId?: string; // The invite ID for pending caregivers
    pendingHomeIds?: string[]; // Home IDs selected during invite (for pending caregivers)
};

export type HomeStatus = "active" | "hidden";

export type HomeProfile = {
    id: string;
    familyId: string;
    name: string;
    photoUrl?: string;
    address?: string;
    notes?: string;
    ownerCaregiverId?: string;
    accessibleCaregiverIds?: string[];
    timeZone?: string;
    homePhone?: string;
    emergencyContact?: string;
    wifiName?: string;
    wifiPassword?: string;
    isPrimary?: boolean;
    status: HomeStatus; // "active" or "hidden"
};

// Result type for switching home and moving items
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
    child: ChildProfile | null;
    caregivers: CaregiverProfile[];
    homes: HomeProfile[]; // All homes (active + hidden)
    activeHomes: HomeProfile[]; // Only active homes (for dashboard, bag flows)
    hiddenHomes: HomeProfile[]; // Only hidden homes (for settings)
    currentJuneCaregiverId: string; // Legacy: will be deprecated
    currentHomeId: string; // NEW: current home where child is located
    isChildAtUserHome: boolean; // True if child's current home is one of the logged-in user's homes
    onboardingCompleted: boolean;
    setChild: (child: ChildProfile) => void;
    setCaregivers: (caregivers: CaregiverProfile[]) => void;
    setHomes: (homes: HomeProfile[]) => void;
    setCurrentJuneCaregiverId: (id: string) => void; // Legacy: will be deprecated
    setCurrentHomeId: (id: string) => void; // NEW: set current home
    setOnboardingCompleted: (completed: boolean) => void;
    refreshData: () => Promise<void>;
    switchChildHomeAndMovePackedItems: (targetHomeId: string) => Promise<SwitchHomeResult>;
    isLoaded: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Helper to get signed URL for avatar
async function getAvatarUrl(avatarPath: string | null | undefined): Promise<string | undefined> {
    if (!avatarPath) return undefined;
    try {
        const { data, error } = await supabase.storage
            .from("avatars")
            .createSignedUrl(avatarPath, 3600); // 1 hour expiry
        if (error) {
            console.error("Error getting avatar URL:", error);
            return undefined;
        }
        return data.signedUrl;
    } catch (err) {
        console.error("Failed to get avatar URL:", err);
        return undefined;
    }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [child, setChild] = useState<ChildProfile | null>(null);
    const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
    const [homes, setHomes] = useState<HomeProfile[]>([]);
    const [currentJuneCaregiverId, setCurrentJuneCaregiverId] = useState<string>(""); // Legacy
    const [currentHomeId, setCurrentHomeId] = useState<string>(""); // NEW: current home
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshData = async () => {
        if (!user) {
            setChild(null);
            setCaregivers([]);
            setHomes([]);
            setOnboardingCompleted(false);
            setIsLoaded(true);
            return;
        }

        // Reset isLoaded to show loading state during refresh
        setIsLoaded(false);

        try {
            // 1. Get user's family
            const { data: familyMembers, error: fmError } = await supabase
                .from("family_members")
                .select("family_id, role")
                .eq("user_id", user.id)
                .limit(1);

            if (fmError || !familyMembers || familyMembers.length === 0) {
                console.log("No family found for user, likely needs onboarding");
                setOnboardingCompleted(false);
                return;
            }

            const familyId = familyMembers[0].family_id;

            // 2. Get child
            const { data: childrenData } = await supabase
                .from("children")
                .select("*")
                .eq("family_id", familyId)
                .limit(1)
                .single();

            // Store child's current_home_id for later use when setting currentHomeId
            let childCurrentHomeId: string | null = null;

            if (childrenData) {
                const childAvatarUrl = await getAvatarUrl(childrenData.avatar_url);
                childCurrentHomeId = childrenData.current_home_id || null;
                setChild({
                    id: childrenData.id,
                    familyId: familyId,
                    name: childrenData.name,
                    avatarInitials: childrenData.avatar_initials || childrenData.name[0],
                    avatarUrl: childAvatarUrl,
                    gender: childrenData.gender || null,
                });
            }

            // 3. Get caregivers (profiles linked to family)
            const { data: members } = await supabase
                .from("family_members")
                .select("user_id, role, profiles(*)")
                .eq("family_id", familyId);

            // 3a. First, try to get home_access entries (new system)
            let homeAccessData: any[] | null = null;
            if (FEATURES.HOME_ACCESS) {
                try {
                    const { data, error } = await supabase
                        .from("home_access")
                        .select("caregiver_id, home_id, homes!inner(family_id, status)")
                        .eq("homes.family_id", familyId);

                    if (!error) {
                        homeAccessData = data;
                    }
                } catch (e) {
                    // home_access table may not exist yet - that's OK, we'll use legacy
                }
            }

            // 3b. Get homes data for fallback to legacy accessible_caregiver_ids
            const { data: homesDataForAccess } = await supabase
                .from("homes")
                .select("id, accessible_caregiver_ids, status")
                .eq("family_id", familyId);

            // Build a map of caregiver_id -> home_ids for quick lookup (ALL homes)
            // And a separate map for ACTIVE homes only (for caregiver status)
            const caregiverHomeMap = new Map<string, string[]>();
            const caregiverActiveHomeMap = new Map<string, string[]>();

            // Build a set of active home IDs for quick lookup
            const activeHomeIds = new Set<string>();
            if (homesDataForAccess) {
                for (const home of homesDataForAccess) {
                    // Default to "active" if status is null/undefined (backwards compatibility)
                    if ((home.status || "active") === "active") {
                        activeHomeIds.add(home.id);
                    }
                }
            }

            // First, populate from new home_access table if available
            if (homeAccessData && homeAccessData.length > 0) {
                for (const ha of homeAccessData) {
                    // All homes map
                    const existing = caregiverHomeMap.get(ha.caregiver_id) || [];
                    if (!existing.includes(ha.home_id)) {
                        existing.push(ha.home_id);
                    }
                    caregiverHomeMap.set(ha.caregiver_id, existing);

                    // Active homes map (only count active homes for status)
                    if (activeHomeIds.has(ha.home_id)) {
                        const existingActive = caregiverActiveHomeMap.get(ha.caregiver_id) || [];
                        if (!existingActive.includes(ha.home_id)) {
                            existingActive.push(ha.home_id);
                        }
                        caregiverActiveHomeMap.set(ha.caregiver_id, existingActive);
                    }
                }
            }

            // Also populate from legacy accessible_caregiver_ids (for backwards compatibility)
            if (homesDataForAccess) {
                for (const home of homesDataForAccess) {
                    const caregiverIds = home.accessible_caregiver_ids || [];
                    const isActiveHome = activeHomeIds.has(home.id);

                    for (const caregiverId of caregiverIds) {
                        // All homes map
                        const existing = caregiverHomeMap.get(caregiverId) || [];
                        if (!existing.includes(home.id)) {
                            existing.push(home.id);
                        }
                        caregiverHomeMap.set(caregiverId, existing);

                        // Active homes map (only count active homes for status)
                        if (isActiveHome) {
                            const existingActive = caregiverActiveHomeMap.get(caregiverId) || [];
                            if (!existingActive.includes(home.id)) {
                                existingActive.push(home.id);
                            }
                            caregiverActiveHomeMap.set(caregiverId, existingActive);
                        }
                    }
                }
            }


            // Build caregivers with avatar URLs and derived status
            const realCaregivers: CaregiverProfile[] = [];
            if (members) {
                for (const m of members as any[]) {
                    const avatarUrl = await getAvatarUrl(m.profiles.avatar_url);
                    const accessibleHomeIds = caregiverHomeMap.get(m.profiles.id) || [];
                    const accessibleActiveHomeIds = caregiverActiveHomeMap.get(m.profiles.id) || [];
                    // Status is derived: active if has ACTIVE homes, inactive if no active homes
                    const derivedStatus: CaregiverStatus = accessibleActiveHomeIds.length > 0 ? "active" : "inactive";

                    // Check both m.user_id and m.profiles.id for current user match
                    const isCurrentUser = m.user_id === user.id || m.profiles.id === user.id;

                    realCaregivers.push({
                        id: m.profiles.id,
                        name: m.profiles.name || "Unknown",
                        label: m.profiles.label || m.profiles.name || (isCurrentUser ? "Me" : "Parent"),
                        avatarInitials: m.profiles.avatar_initials || m.profiles.name?.[0] || "?",
                        avatarColor: m.profiles.avatar_color || "bg-gray-500",
                        avatarUrl: avatarUrl,
                        isCurrentUser: isCurrentUser,
                        relationship: m.profiles.relationship || m.role,
                        phone: m.profiles.phone,
                        accessibleHomeIds: accessibleHomeIds,
                        status: derivedStatus,
                    });
                }
            }

            // 4. Get pending invites and add them as caregivers
            const { data: pendingInvites, error: invitesError } = await supabase
                .from("invites")
                .select("*")
                .eq("family_id", familyId)
                .eq("status", "pending")
                .order("created_at", { ascending: false }); // Get newest first


            const pendingCaregivers: CaregiverProfile[] = pendingInvites ? pendingInvites
                .filter((invite: any) => invite.invitee_name && invite.invitee_label)
                .map((invite: any) => ({
                    id: `pending-${invite.id}`,
                    name: invite.invitee_name,
                    label: invite.invitee_label,
                    avatarInitials: invite.invitee_name[0].toUpperCase(),
                    avatarColor: "bg-pink-500",
                    isCurrentUser: false,
                    relationship: invite.invitee_role,
                    accessibleHomeIds: [], // Pending caregivers don't have access yet
                    status: "pending" as CaregiverStatus,
                    inviteToken: invite.token, // Store token for invite link generation
                    inviteId: invite.id, // Store invite ID for management
                    pendingHomeIds: invite.home_ids || [], // Home IDs selected during invite
                })) : [];


            // Merge real and pending caregivers, removing duplicates by label
            // Sort so isCurrentUser entries come first (to be preserved during dedup)
            const allCaregivers = [...realCaregivers, ...pendingCaregivers].sort((a, b) => {
                // Current user should come first to be preserved during deduplication
                if (a.isCurrentUser && !b.isCurrentUser) return -1;
                if (!a.isCurrentUser && b.isCurrentUser) return 1;
                return 0;
            });

            // Deduplicate by label (keep first occurrence - which will be isCurrentUser if exists)
            const uniqueCaregivers = allCaregivers.filter((caregiver, index, self) =>
                index === self.findIndex((c) => c.label === caregiver.label)
            );

            setCaregivers(uniqueCaregivers);

            // Set default current caregiver
            if (uniqueCaregivers.length > 0) {
                setCurrentJuneCaregiverId(uniqueCaregivers[0].id);
            }

            // 5. Fetch homes (separate from caregivers)
            const { data: homesData } = await supabase
                .from("homes")
                .select("*")
                .eq("family_id", familyId)
                .order("created_at", { ascending: true });

            if (homesData && homesData.length > 0) {
                const loadedHomes: HomeProfile[] = [];
                for (const h of homesData) {
                    const photoUrl = h.photo_url ? await getAvatarUrl(h.photo_url) : undefined;
                    loadedHomes.push({
                        id: h.id,
                        familyId: h.family_id,
                        name: h.name,
                        photoUrl: photoUrl,
                        address: h.address,
                        notes: h.notes,
                        ownerCaregiverId: h.owner_caregiver_id,
                        accessibleCaregiverIds: h.accessible_caregiver_ids || [],
                        timeZone: h.time_zone || 'auto',
                        homePhone: h.home_phone,
                        emergencyContact: h.emergency_contact,
                        wifiName: h.wifi_name,
                        wifiPassword: h.wifi_password,
                        isPrimary: h.is_primary || false,
                        status: (h.status as HomeStatus) || "active", // Default to "active" for backwards compatibility
                    });
                }
                setHomes(loadedHomes);

                // Set current home - prioritize child's saved current_home_id from database
                const activeLoadedHomes = loadedHomes.filter(h => h.status === "active");

                // Check if child's current_home_id is valid and active
                const childHome = childCurrentHomeId
                    ? activeLoadedHomes.find(h => h.id === childCurrentHomeId)
                    : null;

                if (childHome) {
                    // Use child's saved current home
                    setCurrentHomeId(childHome.id);
                } else {
                    // Fallback: prefer primary ACTIVE home, then first ACTIVE home
                    const primaryHome = activeLoadedHomes.find(h => h.isPrimary);
                    const defaultHome = primaryHome || activeLoadedHomes[0];
                    if (defaultHome) {
                        setCurrentHomeId(defaultHome.id);
                    }
                }
            } else if (realCaregivers.length > 0) {
                // AUTO-CREATE HOMES FALLBACK for legacy accounts
                // If no homes exist but we have caregivers, create homes for each caregiver
                console.log("🏠 No homes found, auto-creating from caregivers...");

                const createdHomes: HomeProfile[] = [];
                for (let i = 0; i < realCaregivers.length; i++) {
                    const caregiver = realCaregivers[i];
                    // Skip pending caregivers
                    if (caregiver.status === "pending") continue;

                    const homeName = `${caregiver.label}'s Home`;
                    const isPrimary = i === 0; // First caregiver's home is primary

                    // Insert home into database
                    const { data: newHome, error: insertError } = await supabase
                        .from("homes")
                        .insert({
                            family_id: familyId,
                            name: homeName,
                            owner_caregiver_id: caregiver.id,
                            accessible_caregiver_ids: [caregiver.id], // Keep for backwards compatibility
                            is_primary: isPrimary,
                            time_zone: 'auto',
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error("Error auto-creating home:", insertError);
                        continue;
                    }

                    if (newHome) {
                        // Create home_access entry for this caregiver
                        await supabase
                            .from("home_access")
                            .insert({
                                home_id: newHome.id,
                                caregiver_id: caregiver.id,
                            })
                            .single();

                        createdHomes.push({
                            id: newHome.id,
                            familyId: newHome.family_id,
                            name: newHome.name,
                            ownerCaregiverId: newHome.owner_caregiver_id,
                            accessibleCaregiverIds: [caregiver.id],
                            isPrimary: newHome.is_primary || false,
                            timeZone: newHome.time_zone || 'auto',
                            status: "active" as HomeStatus,
                        });

                        // Update caregiver's accessibleHomeIds
                        caregiver.accessibleHomeIds = [newHome.id];
                        caregiver.status = "active"; // Now has a home

                        // Also migrate items from this caregiver to the new home
                        const { error: migrateError } = await supabase
                            .from("items")
                            .update({ location_home_id: newHome.id })
                            .eq("location_caregiver_id", caregiver.id)
                            .eq("family_id", familyId);

                        if (migrateError) {
                            console.error("Error migrating items to home:", migrateError);
                        } else {
                            console.log(`✅ Migrated items from ${caregiver.label} to ${homeName}`);
                        }
                    }
                }

                setHomes(createdHomes);

                // Set default current home
                if (createdHomes.length > 0) {
                    const primaryHome = createdHomes.find(h => h.isPrimary);
                    setCurrentHomeId(primaryHome?.id || createdHomes[0].id);
                }

                console.log("🏠 Auto-created homes:", createdHomes);
            } else {
                setHomes([]);
            }

            // 6. Check if onboarding is completed
            const { data: profileData } = await supabase
                .from("profiles")
                .select("onboarding_completed")
                .eq("id", user.id)
                .single();

            setOnboardingCompleted(profileData?.onboarding_completed || false);

        } catch (error) {
            console.error("Error fetching app state:", error);
        } finally {
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        refreshData();
    }, [user]);

    // Computed: active and hidden homes
    const activeHomes = homes.filter(h => h.status === "active");
    const hiddenHomes = homes.filter(h => h.status === "hidden");

    // Computed: Is the child currently at one of the logged-in user's homes?
    // This is used to determine whether to show "Request to pack" actions
    const currentUserCaregiver = caregivers.find(c => c.isCurrentUser);
    const currentHome = homes.find(h => h.id === currentHomeId);
    const isChildAtUserHome = !!(
        currentHomeId &&
        currentUserCaregiver &&
        currentHome && (
            // Check if user has access to the current home
            currentUserCaregiver.accessibleHomeIds?.includes(currentHomeId) ||
            // Or if user owns the current home
            currentHome.ownerCaregiverId === currentUserCaregiver.id
        )
    );

    // Switch child's home and move packed items atomically
    const switchChildHomeAndMovePackedItems = async (targetHomeId: string): Promise<SwitchHomeResult> => {
        const oldHomeId = currentHomeId;
        const fromHome = homes.find(h => h.id === oldHomeId);
        const toHome = homes.find(h => h.id === targetHomeId);
        const childName = child?.name || "Child";

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
            // 1. Update child's current_home_id in database
            if (child?.id) {
                const { error: childUpdateError } = await supabase
                    .from("children")
                    .update({ current_home_id: targetHomeId })
                    .eq("id", child.id);

                if (childUpdateError) {
                    console.error("Error updating child home:", childUpdateError);
                }
            }

            // 2. Find items that are PACKED at the current (old) home
            // First try by location_home_id, then fallback to caregiver_id for legacy items
            let { data: packedItems, error: itemsQueryError } = await supabase
                .from("items")
                .select("id, name, photo_url, location_home_id, location_caregiver_id")
                .eq("location_home_id", oldHomeId)
                .eq("is_packed", true);

            // Fallback: try by caregiver_id for legacy items
            if ((!packedItems || packedItems.length === 0) && fromHome?.ownerCaregiverId) {
                const { data: legacyPackedItems, error: legacyError } = await supabase
                    .from("items")
                    .select("id, name, photo_url, location_home_id, location_caregiver_id")
                    .eq("location_caregiver_id", fromHome.ownerCaregiverId)
                    .eq("is_packed", true);

                if (!legacyError && legacyPackedItems && legacyPackedItems.length > 0) {
                    packedItems = legacyPackedItems;
                }
            }

            let movedItems: { id: string; name: string; photoUrl?: string }[] = [];
            let movedCount = 0;

            if (itemsQueryError) {
                console.error("Error finding packed items:", itemsQueryError);
            }

            const itemsToMove = packedItems || [];
            movedCount = itemsToMove.length;
            movedItems = itemsToMove.map(item => ({
                id: item.id,
                name: item.name,
                photoUrl: item.photo_url,
            }));

            // 3. If there are packed items, move them FIRST, then create history
            if (movedCount > 0) {
                const itemIds = itemsToMove.map(item => item.id);

                // Move items to new home and reset their status
                const { error: itemsUpdateError } = await supabase
                    .from("items")
                    .update({
                        location_home_id: targetHomeId,
                        is_packed: false,
                        is_requested_for_next_visit: false,
                        is_request_canceled: false,
                    })
                    .in("id", itemIds);

                if (itemsUpdateError) {
                    console.error("Error moving items:", itemsUpdateError);
                }

                // Create transfer record for history (optional - tables may not exist yet)
                const familyId = fromHome?.familyId;
                if (familyId && FEATURES.BAG_TRANSFERS) {
                    try {
                        const { data: transferRecord, error: transferCreateError } = await supabase
                            .from("bag_transfers")
                            .insert({
                                family_id: familyId,
                                child_id: child?.id,
                                from_home_id: oldHomeId,
                                to_home_id: targetHomeId,
                                status: "delivered",
                                packed_at: new Date().toISOString(),
                                delivered_at: new Date().toISOString(),
                            })
                            .select("id")
                            .single();

                        if (!transferCreateError && transferRecord) {
                            const transferItemsToInsert = itemsToMove.map(item => ({
                                bag_transfer_id: transferRecord.id,
                                item_id: item.id,
                            }));

                            await supabase
                                .from("bag_transfer_items")
                                .insert(transferItemsToInsert);
                        }
                    } catch (e) {
                        // bag_transfers tables may not exist yet - that's OK
                    }
                }
            }

            // 4. Reset ALL requested/packed flags for items at the OLD home only
            // (items that weren't packed but might have been requested)
            const { error: resetError } = await supabase
                .from("items")
                .update({
                    is_packed: false,
                    is_requested_for_next_visit: false,
                    is_request_canceled: false,
                })
                .eq("location_home_id", oldHomeId);

            if (resetError) {
                console.error("Error resetting item flags:", resetError);
            }

            // 6. Update local state
            setCurrentHomeId(targetHomeId);

            // 7. Refresh data to get updated items
            await refreshData();

            return {
                success: true,
                movedCount,
                fromHomeName: fromHome?.name || "Unknown",
                toHomeName: toHome?.name || "Unknown",
                childName,
                movedItems,
                movedAnyItems: movedCount > 0,
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
                child,
                caregivers,
                homes,
                activeHomes,
                hiddenHomes,
                currentJuneCaregiverId, // Legacy
                currentHomeId, // NEW
                isChildAtUserHome, // True if child is at logged-in user's home
                onboardingCompleted,
                setChild,
                setCaregivers,
                setHomes,
                setCurrentJuneCaregiverId, // Legacy
                setCurrentHomeId, // NEW
                setOnboardingCompleted,
                refreshData,
                switchChildHomeAndMovePackedItems,
                isLoaded,
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
