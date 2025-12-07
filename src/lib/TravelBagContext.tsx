"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase, FEATURES } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

// Types
export interface TravelBag {
    id: string;
    familyId: string;
    childId: string | null;
    fromHomeId: string | null;
    toHomeId: string | null;
    status: "packing" | "in_transit" | "completed" | "canceled";
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
}

export interface UntrackedExtras {
    id: string;
    travelBagId: string;
    everydayClothes: boolean;
    underwearSocks: boolean;
    pajamas: boolean;
    schoolUniform: boolean;
    toiletries: boolean;
    outerwear: boolean;
    note: string | null;
    updatedByCaregiverId: string | null;
    updatedAt: string;
}

interface TravelBagContextType {
    currentBag: TravelBag | null;
    untrackedExtras: UntrackedExtras | null;
    isLoaded: boolean;
    isPacker: boolean; // true if current user is at the packing home

    // Get or create a bag for the current packing session
    getOrCreateCurrentBag: (fromHomeId: string, toHomeId: string) => Promise<TravelBag | null>;

    // Update untracked extras
    updateUntrackedExtras: (updates: Partial<Omit<UntrackedExtras, "id" | "travelBagId" | "updatedAt">>) => Promise<void>;

    // Complete the current bag (clears extras for next session)
    completeBag: () => Promise<void>;
}

const TravelBagContext = createContext<TravelBagContextType | undefined>(undefined);

export function TravelBagProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currentBag, setCurrentBag] = useState<TravelBag | null>(null);
    const [untrackedExtras, setUntrackedExtras] = useState<UntrackedExtras | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPacker, setIsPacker] = useState(false);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [currentCaregiverId, setCurrentCaregiverId] = useState<string | null>(null);

    // Get family ID and caregiver ID on mount
    useEffect(() => {
        async function loadUserContext() {
            if (!user) {
                setFamilyId(null);
                setCurrentCaregiverId(null);
                setIsLoaded(true);
                return;
            }

            try {
                const { data: memberData } = await supabase
                    .from("family_members")
                    .select("family_id, id")
                    .eq("user_id", user.id)
                    .single();

                if (memberData) {
                    setFamilyId(memberData.family_id);
                    setCurrentCaregiverId(memberData.id);
                }
            } catch (error) {
                console.error("Error loading user context:", error);
            }
            setIsLoaded(true);
        }

        loadUserContext();
    }, [user]);

    // Get or create a travel bag for the current session
    const getOrCreateCurrentBag = useCallback(async (fromHomeId: string, toHomeId: string): Promise<TravelBag | null> => {
        if (!familyId || !FEATURES.TRAVEL_BAGS) return null;

        try {
            // First, check if there's an existing packing bag for this route
            const { data: existingBag, error: fetchError } = await supabase
                .from("travel_bags")
                .select("*")
                .eq("family_id", familyId)
                .eq("from_home_id", fromHomeId)
                .eq("to_home_id", toHomeId)
                .eq("status", "packing")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (existingBag && !fetchError) {
                const bag = mapTravelBag(existingBag);
                setCurrentBag(bag);

                // Load extras for this bag
                await loadExtrasForBag(existingBag.id);

                return bag;
            }

            // No existing bag, create a new one
            const { data: newBag, error: createError } = await supabase
                .from("travel_bags")
                .insert({
                    family_id: familyId,
                    from_home_id: fromHomeId,
                    to_home_id: toHomeId,
                    status: "packing",
                })
                .select()
                .single();

            if (createError) {
                console.error("Error creating travel bag:", createError);
                return null;
            }

            const bag = mapTravelBag(newBag);
            setCurrentBag(bag);
            setUntrackedExtras(null); // New bag has no extras yet

            return bag;
        } catch (error) {
            console.error("Error in getOrCreateCurrentBag:", error);
            return null;
        }
    }, [familyId]);

    // Load extras for a bag
    const loadExtrasForBag = async (bagId: string) => {
        try {
            const { data, error } = await supabase
                .from("travel_bag_untracked_extras")
                .select("*")
                .eq("travel_bag_id", bagId)
                .single();

            if (data && !error) {
                setUntrackedExtras(mapUntrackedExtras(data));
            } else {
                setUntrackedExtras(null);
            }
        } catch (error) {
            // No extras row yet, that's fine
            setUntrackedExtras(null);
        }
    };

    // Update untracked extras (lazy create if needed)
    const updateUntrackedExtras = useCallback(async (updates: Partial<Omit<UntrackedExtras, "id" | "travelBagId" | "updatedAt">>) => {
        if (!currentBag || !currentCaregiverId || !FEATURES.TRAVEL_BAGS) return;

        try {
            if (untrackedExtras) {
                // Update existing row
                const { data, error } = await supabase
                    .from("travel_bag_untracked_extras")
                    .update({
                        ...mapExtrasToDb(updates),
                        updated_by_caregiver_id: currentCaregiverId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("travel_bag_id", currentBag.id)
                    .select()
                    .single();

                if (data && !error) {
                    setUntrackedExtras(mapUntrackedExtras(data));
                }
            } else {
                // Create new row
                const { data, error } = await supabase
                    .from("travel_bag_untracked_extras")
                    .insert({
                        travel_bag_id: currentBag.id,
                        ...mapExtrasToDb(updates),
                        updated_by_caregiver_id: currentCaregiverId,
                    })
                    .select()
                    .single();

                if (data && !error) {
                    setUntrackedExtras(mapUntrackedExtras(data));
                }
            }
        } catch (error) {
            console.error("Error updating untracked extras:", error);
        }
    }, [currentBag, untrackedExtras, currentCaregiverId]);

    // Complete the current bag
    const completeBag = useCallback(async () => {
        if (!currentBag || !FEATURES.TRAVEL_BAGS) return;

        try {
            await supabase
                .from("travel_bags")
                .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                })
                .eq("id", currentBag.id);

            setCurrentBag(null);
            setUntrackedExtras(null);
        } catch (error) {
            console.error("Error completing bag:", error);
        }
    }, [currentBag]);

    return (
        <TravelBagContext.Provider
            value={{
                currentBag,
                untrackedExtras,
                isLoaded,
                isPacker,
                getOrCreateCurrentBag,
                updateUntrackedExtras,
                completeBag,
            }}
        >
            {children}
        </TravelBagContext.Provider>
    );
}

export function useTravelBag() {
    const context = useContext(TravelBagContext);
    if (context === undefined) {
        throw new Error("useTravelBag must be used within a TravelBagProvider");
    }
    return context;
}

// Helper functions to map between DB and TypeScript
function mapTravelBag(data: any): TravelBag {
    return {
        id: data.id,
        familyId: data.family_id,
        childId: data.child_id,
        fromHomeId: data.from_home_id,
        toHomeId: data.to_home_id,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at,
    };
}

function mapUntrackedExtras(data: any): UntrackedExtras {
    return {
        id: data.id,
        travelBagId: data.travel_bag_id,
        everydayClothes: data.extras_everyday_clothes || false,
        underwearSocks: data.extras_underwear_socks || false,
        pajamas: data.extras_pajamas || false,
        schoolUniform: data.extras_school_uniform || false,
        toiletries: data.extras_toiletries || false,
        outerwear: data.extras_outerwear || false,
        note: data.note,
        updatedByCaregiverId: data.updated_by_caregiver_id,
        updatedAt: data.updated_at,
    };
}

function mapExtrasToDb(updates: Partial<Omit<UntrackedExtras, "id" | "travelBagId" | "updatedAt">>): any {
    const dbUpdates: any = {};

    if (updates.everydayClothes !== undefined) dbUpdates.extras_everyday_clothes = updates.everydayClothes;
    if (updates.underwearSocks !== undefined) dbUpdates.extras_underwear_socks = updates.underwearSocks;
    if (updates.pajamas !== undefined) dbUpdates.extras_pajamas = updates.pajamas;
    if (updates.schoolUniform !== undefined) dbUpdates.extras_school_uniform = updates.schoolUniform;
    if (updates.toiletries !== undefined) dbUpdates.extras_toiletries = updates.toiletries;
    if (updates.outerwear !== undefined) dbUpdates.extras_outerwear = updates.outerwear;
    if (updates.note !== undefined) dbUpdates.note = updates.note;
    if (updates.updatedByCaregiverId !== undefined) dbUpdates.updated_by_caregiver_id = updates.updatedByCaregiverId;

    return dbUpdates;
}
