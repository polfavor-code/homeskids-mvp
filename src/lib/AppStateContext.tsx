"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

export type ChildProfile = {
    id: string;
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
    relationship?: string; // parent, nanny, babysitter, grandparent, etc.
    phone?: string;
    accessibleHomeIds: string[]; // Derived from home_access table
    status: CaregiverStatus; // Derived: active if has homes, inactive if no homes, pending if invite
    inviteToken?: string; // Only for pending caregivers - used to generate invite link
    inviteId?: string; // The invite ID for pending caregivers
    pendingHomeIds?: string[]; // Home IDs selected during invite (for pending caregivers)
};

export type HomeProfile = {
    id: string;
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
};

interface AppStateContextType {
    child: ChildProfile | null;
    caregivers: CaregiverProfile[];
    homes: HomeProfile[];
    currentJuneCaregiverId: string; // Legacy: will be deprecated
    currentHomeId: string; // NEW: current home where child is located
    onboardingCompleted: boolean;
    setChild: (child: ChildProfile) => void;
    setCaregivers: (caregivers: CaregiverProfile[]) => void;
    setHomes: (homes: HomeProfile[]) => void;
    setCurrentJuneCaregiverId: (id: string) => void; // Legacy: will be deprecated
    setCurrentHomeId: (id: string) => void; // NEW: set current home
    setOnboardingCompleted: (completed: boolean) => void;
    refreshData: () => Promise<void>;
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

            if (childrenData) {
                const childAvatarUrl = await getAvatarUrl(childrenData.avatar_url);
                setChild({
                    id: childrenData.id,
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
            try {
                const { data, error } = await supabase
                    .from("home_access")
                    .select("caregiver_id, home_id, homes!inner(family_id)")
                    .eq("homes.family_id", familyId);

                if (!error) {
                    homeAccessData = data;
                }
            } catch (e) {
                // home_access table may not exist yet - that's OK, we'll use legacy
                console.log("home_access table not available, using legacy accessible_caregiver_ids");
            }

            // 3b. Get homes data for fallback to legacy accessible_caregiver_ids
            const { data: homesDataForAccess } = await supabase
                .from("homes")
                .select("id, accessible_caregiver_ids")
                .eq("family_id", familyId);

            // Build a map of caregiver_id -> home_ids for quick lookup
            // Uses BOTH new home_access table AND legacy accessible_caregiver_ids array
            const caregiverHomeMap = new Map<string, string[]>();

            // First, populate from new home_access table if available
            if (homeAccessData && homeAccessData.length > 0) {
                for (const ha of homeAccessData) {
                    const existing = caregiverHomeMap.get(ha.caregiver_id) || [];
                    if (!existing.includes(ha.home_id)) {
                        existing.push(ha.home_id);
                    }
                    caregiverHomeMap.set(ha.caregiver_id, existing);
                }
            }

            // Also populate from legacy accessible_caregiver_ids (for backwards compatibility)
            if (homesDataForAccess) {
                for (const home of homesDataForAccess) {
                    const caregiverIds = home.accessible_caregiver_ids || [];
                    for (const caregiverId of caregiverIds) {
                        const existing = caregiverHomeMap.get(caregiverId) || [];
                        if (!existing.includes(home.id)) {
                            existing.push(home.id);
                        }
                        caregiverHomeMap.set(caregiverId, existing);
                    }
                }
            }

            console.log("🏠 DEBUG - Caregiver home map:", Object.fromEntries(caregiverHomeMap));

            // Build caregivers with avatar URLs and derived status
            const realCaregivers: CaregiverProfile[] = [];
            if (members) {
                for (const m of members as any[]) {
                    const avatarUrl = await getAvatarUrl(m.profiles.avatar_url);
                    const accessibleHomeIds = caregiverHomeMap.get(m.profiles.id) || [];
                    // Status is derived: active if has homes, inactive if no homes
                    const derivedStatus: CaregiverStatus = accessibleHomeIds.length > 0 ? "active" : "inactive";

                    console.log(`👤 DEBUG - Caregiver ${m.profiles.name}: homes=${accessibleHomeIds.length}, status=${derivedStatus}`);

                    realCaregivers.push({
                        id: m.profiles.id,
                        name: m.profiles.name || "Unknown",
                        label: m.profiles.label || m.profiles.name || (m.profiles.id === user.id ? "Me" : "Co-Parent"),
                        avatarInitials: m.profiles.avatar_initials || m.profiles.name?.[0] || "?",
                        avatarColor: m.profiles.avatar_color || "bg-gray-500",
                        avatarUrl: avatarUrl,
                        isCurrentUser: m.profiles.id === user.id,
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

            console.log("🔍 DEBUG - Pending invites query:", { pendingInvites, invitesError, familyId });

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

            console.log("🔍 DEBUG - Pending caregivers:", pendingCaregivers);
            console.log("🔍 DEBUG - Real caregivers:", realCaregivers);

            // Merge real and pending caregivers, removing duplicates by label
            const allCaregivers = [...realCaregivers, ...pendingCaregivers];

            // Deduplicate by label (keep first occurrence)
            const uniqueCaregivers = allCaregivers.filter((caregiver, index, self) =>
                index === self.findIndex((c) => c.label === caregiver.label)
            );

            console.log("🔍 DEBUG - Unique caregivers after dedup:", uniqueCaregivers);
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
                    });
                }
                setHomes(loadedHomes);

                // Set default current home (prefer primary home, then first home)
                const primaryHome = loadedHomes.find(h => h.isPrimary);
                const defaultHome = primaryHome || loadedHomes[0];
                if (defaultHome) {
                    setCurrentHomeId(defaultHome.id);
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
                            name: newHome.name,
                            ownerCaregiverId: newHome.owner_caregiver_id,
                            accessibleCaregiverIds: [caregiver.id],
                            isPrimary: newHome.is_primary || false,
                            timeZone: newHome.time_zone || 'auto',
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

    return (
        <AppStateContext.Provider
            value={{
                child,
                caregivers,
                homes,
                currentJuneCaregiverId, // Legacy
                currentHomeId, // NEW
                onboardingCompleted,
                setChild,
                setCaregivers,
                setHomes,
                setCurrentJuneCaregiverId, // Legacy
                setCurrentHomeId, // NEW
                setOnboardingCompleted,
                refreshData,
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
