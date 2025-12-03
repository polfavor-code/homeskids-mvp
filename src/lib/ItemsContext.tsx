"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Item, MOCK_ITEMS } from "@/lib/mockData";

export type MissingMessage = {
    id: string;
    itemId: string;
    authorCaregiverId: string; // or "system"
    text: string;
    createdAt: string; // ISO string
};

interface ItemsContextType {
    items: Item[];
    addItem: (item: Item) => void;
    updateItemLocation: (
        itemId: string,
        newLocation: { caregiverId?: string; toBeFound?: boolean }
    ) => void;
    updateItemRequested: (itemId: string, requested: boolean) => void;
    missingMessages: MissingMessage[];
    addMissingMessage: (message: {
        itemId: string;
        authorCaregiverId: string;
        text: string;
    }) => void;
    getMissingMessagesForItem: (itemId: string) => MissingMessage[];
    markItemFound: (itemId: string) => void;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

/**
 * Provides the ItemsContext to descendants and manages items and missing-message state backed by Supabase.
 *
 * The provider loads items for the current user's family, exposes the items array, mutation helpers (addItem, updateItemLocation, updateItemRequested, markItemFound),
 * and missing-message helpers (missingMessages, addMissingMessage, getMissingMessagesForItem), and keeps local state in sync with the backend.
 *
 * @returns A provider element that supplies the ItemsContext to its children
 */
export function ItemsProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Item[]>([]);
    const [missingMessages, setMissingMessages] = useState<MissingMessage[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch items from Supabase on mount
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const { supabase } = await import("@/lib/supabase");
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setIsLoaded(true);
                    return;
                }

                // Get user's family
                const { data: familyMember } = await supabase
                    .from("family_members")
                    .select("family_id")
                    .eq("user_id", user.id)
                    .limit(1);

                if (familyMember && familyMember.length > 0) {
                    // Fetch items for this family
                    const { data: itemsData } = await supabase
                        .from("items")
                        .select("*")
                        .eq("family_id", familyMember[0].family_id);

                    if (itemsData) {
                        const mappedItems: Item[] = itemsData.map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            category: item.category,
                            locationCaregiverId: item.location_caregiver_id || (item.location_invite_id ? `pending-${item.location_invite_id}` : null),
                            isRequestedForNextVisit: item.is_requested_for_next_visit,
                            isPacked: item.is_packed,
                            isMissing: item.is_missing,
                            photoUrl: item.photo_url,
                            notes: item.notes,
                        }));
                        setItems(mappedItems);
                    }
                }
            } catch (error) {
                console.error("Failed to load items:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchItems();
    }, []);

    const addItem = async (item: Omit<Item, "id">) => {
        try {
            const { supabase } = await import("./supabase");
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.error("No user found");
                return;
            }

            // Get user's family
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .single();

            if (!familyMember) {
                console.error("User not in a family");
                return;
            }

            // Handle pending caregivers
            let locationCaregiverId = item.locationCaregiverId;
            let locationInviteId = null;

            if (locationCaregiverId?.startsWith("pending-")) {
                locationInviteId = locationCaregiverId.replace("pending-", "");
                locationCaregiverId = null;
            }

            const { data, error } = await supabase
                .from("items")
                .insert({
                    name: item.name,
                    category: item.category,
                    location_caregiver_id: locationCaregiverId,
                    location_invite_id: locationInviteId,
                    notes: item.notes,
                    family_id: familyMember.family_id,
                    photo_url: item.photoUrl,
                    is_missing: item.isMissing,
                })
                .select()
                .single();

            if (error) {
                console.error("Error adding item:", error);
                return;
            }

            if (data) {
                const newItem: Item = {
                    id: data.id,
                    name: data.name,
                    category: data.category,
                    locationCaregiverId: data.location_caregiver_id || (data.location_invite_id ? `pending-${data.location_invite_id}` : null),
                    notes: data.notes,
                    photoUrl: data.photo_url,
                    isRequestedForNextVisit: false,
                    isPacked: false,
                    isMissing: item.isMissing,
                };
                setItems((prev) => [...prev, newItem]);
            }
        } catch (error) {
            console.error("Failed to add item:", error);
        }
    };

    const updateItemLocation = async (
        itemId: string,
        newLocation: { caregiverId?: string; toBeFound?: boolean }
    ) => {
        try {
            const { supabase } = await import("@/lib/supabase");

            const updates: any = {};

            if (newLocation.toBeFound) {
                updates.is_missing = true;
                updates.is_requested_for_next_visit = false;
                updates.is_packed = false;
            } else if (newLocation.caregiverId) {
                updates.location_caregiver_id = newLocation.caregiverId;
                updates.is_missing = false;
                updates.is_requested_for_next_visit = false;
                updates.is_packed = false;
            }

            const { error } = await supabase
                .from("items")
                .update(updates)
                .eq("id", itemId);

            if (error) throw error;

            // Update local state
            setItems((prev) =>
                prev.map((item) => {
                    if (item.id !== itemId) return item;

                    if (newLocation.toBeFound) {
                        return {
                            ...item,
                            isMissing: true,
                            isRequestedForNextVisit: false,
                            isPacked: false,
                        };
                    } else if (newLocation.caregiverId) {
                        return {
                            ...item,
                            locationCaregiverId: newLocation.caregiverId,
                            isMissing: false,
                            isRequestedForNextVisit: false,
                            isPacked: false,
                        };
                    }

                    return item;
                })
            );
        } catch (error) {
            console.error("Failed to update item location:", error);
        }
    };

    const updateItemRequested = async (itemId: string, requested: boolean) => {
        try {
            const { supabase } = await import("@/lib/supabase");

            const { error } = await supabase
                .from("items")
                .update({ is_requested_for_next_visit: requested })
                .eq("id", itemId);

            if (error) throw error;

            // Update local state
            setItems((prev) =>
                prev.map((item) => {
                    if (item.id !== itemId) return item;
                    return {
                        ...item,
                        isRequestedForNextVisit: requested,
                    };
                })
            );
        } catch (error) {
            console.error("Failed to update item request status:", error);
        }
    };

    const addMissingMessage = (message: {
        itemId: string;
        authorCaregiverId: string;
        text: string;
    }) => {
        const newMessage: MissingMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            itemId: message.itemId,
            authorCaregiverId: message.authorCaregiverId,
            text: message.text,
            createdAt: new Date().toISOString(),
        };
        setMissingMessages((prev) => [...prev, newMessage]);
    };

    const getMissingMessagesForItem = (itemId: string): MissingMessage[] => {
        return missingMessages.filter((msg) => msg.itemId === itemId);
    };

    const markItemFound = (itemId: string) => {
        // Clear missing state
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;
                return {
                    ...item,
                    isMissing: false,
                };
            })
        );

        // Add system message
        addMissingMessage({
            itemId,
            authorCaregiverId: "system",
            text: "Marked as found",
        });
    };

    return (
        <ItemsContext.Provider
            value={{
                items,
                addItem,
                updateItemLocation,
                updateItemRequested,
                missingMessages,
                addMissingMessage,
                getMissingMessagesForItem,
                markItemFound,
            }}
        >
            {children}
        </ItemsContext.Provider>
    );
}

export function useItems() {
    const context = useContext(ItemsContext);
    if (context === undefined) {
        throw new Error("useItems must be used within an ItemsProvider");
    }
    return context;
}