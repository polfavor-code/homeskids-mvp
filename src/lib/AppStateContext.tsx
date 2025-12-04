"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

export type ChildProfile = {
    id: string;
    name: string;
    avatarInitials: string;
};

export type CaregiverProfile = {
    id: string;
    name: string;
    label: string;
    avatarInitials: string;
    avatarColor: string;
    isCurrentUser: boolean;
};

interface AppStateContextType {
    child: ChildProfile | null;
    caregivers: CaregiverProfile[];
    currentJuneCaregiverId: string;
    onboardingCompleted: boolean;
    setChild: (child: ChildProfile) => void;
    setCaregivers: (caregivers: CaregiverProfile[]) => void;
    setCurrentJuneCaregiverId: (id: string) => void;
    setOnboardingCompleted: (completed: boolean) => void;
    refreshData: () => Promise<void>;
    isLoaded: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

/**
 * Provides application-level child and caregiver state to descendant components via AppStateContext.
 *
 * Initializes local state, loads/fetches child, caregivers, pending invites, and onboarding status from the backend for the current user, exposes setters, a `refreshData` function to reload state, and an `isLoaded` flag indicating initial load completion.
 *
 * @returns A React context provider element that supplies the AppStateContext value to `children`.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [child, setChild] = useState<ChildProfile | null>(null);
    const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
    const [currentJuneCaregiverId, setCurrentJuneCaregiverId] = useState<string>("");
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshData = async () => {
        if (!user) {
            setChild(null);
            setCaregivers([]);
            setOnboardingCompleted(false);
            setIsLoaded(true);
            return;
        }


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
                setChild({
                    id: childrenData.id,
                    name: childrenData.name,
                    avatarInitials: childrenData.avatar_initials || childrenData.name[0],
                });
            }

            // 3. Get caregivers (profiles linked to family)
            const { data: members } = await supabase
                .from("family_members")
                .select("user_id, role, profiles(*)")
                .eq("family_id", familyId);

            const realCaregivers: CaregiverProfile[] = members ? members.map((m: any) => ({
                id: m.profiles.id,
                name: m.profiles.name || "Unknown",
                label: m.profiles.label || m.profiles.name || (m.profiles.id === user.id ? "Me" : "Co-Parent"),
                avatarInitials: m.profiles.avatar_initials || m.profiles.name?.[0] || "?",
                avatarColor: m.profiles.avatar_color || "bg-gray-500",
                isCurrentUser: m.profiles.id === user.id,
            })) : [];

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

            // 4. Check if onboarding is completed
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
                currentJuneCaregiverId,
                onboardingCompleted,
                setChild,
                setCaregivers,
                setCurrentJuneCaregiverId,
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