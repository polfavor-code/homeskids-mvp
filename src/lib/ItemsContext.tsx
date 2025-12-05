"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Item, MOCK_ITEMS } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";

export type MissingMessage = {
    id: string;
    itemId: string;
    authorCaregiverId: string; // or "system"
    text: string;
    createdAt: string; // ISO string
};

interface ItemsContextType {
    items: Item[];
    isLoaded: boolean;
    addItem: (item: Omit<Item, "id">) => Promise<{ success: boolean; error?: string; item?: Item }>;
    updateItemLocation: (
        itemId: string,
        newLocation: { caregiverId?: string; homeId?: string; toBeFound?: boolean }
    ) => void;
    updateItemRequested: (itemId: string, requested: boolean) => void;
    updateItemPacked: (itemId: string, packed: boolean) => void;
    updateItemName: (itemId: string, newName: string) => Promise<void>;
    updateItemNotes: (itemId: string, notes: string) => Promise<void>;
    updateItemCategory: (itemId: string, category: string) => Promise<void>;
    updateItemPhoto: (itemId: string, photoUrl: string | null) => Promise<void>;
    missingMessages: MissingMessage[];
    addMissingMessage: (message: {
        itemId: string;
        authorCaregiverId: string;
        text: string;
    }) => void;
    getMissingMessagesForItem: (itemId: string) => MissingMessage[];
    markItemFound: (itemId: string) => void;
    deleteItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Item[]>([]);
    const [missingMessages, setMissingMessages] = useState<MissingMessage[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch items from Supabase and subscribe to auth changes
    useEffect(() => {
        let realtimeChannel: any = null;
        let isMounted = true;

        const fetchItems = async () => {
            try {
                // Use getSession for more reliable auth state on initial load
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;

                if (!user) {
                    if (isMounted) {
                        setItems([]);
                        setIsLoaded(true);
                    }
                    return;
                }

                // Get user's family
                const { data: familyMember } = await supabase
                    .from("family_members")
                    .select("family_id")
                    .eq("user_id", user.id)
                    .limit(1);

                if (familyMember && familyMember.length > 0) {
                    const familyId = familyMember[0].family_id;

                    // Fetch items for this family
                    const { data: itemsData } = await supabase
                        .from("items")
                        .select("*")
                        .eq("family_id", familyId);

                    if (itemsData && isMounted) {
                        const mappedItems: Item[] = itemsData.map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            category: item.category,
                            locationCaregiverId: item.location_caregiver_id || (item.location_invite_id ? `pending-${item.location_invite_id}` : null),
                            locationHomeId: item.location_home_id || null, // NEW: home-based location
                            isRequestedForNextVisit: item.is_requested_for_next_visit,
                            isPacked: item.is_packed,
                            isMissing: item.is_missing,
                            photoUrl: item.photo_url,
                            notes: item.notes,
                        }));
                        setItems(mappedItems);

                        // Self-healing: Check for items assigned to my invite and claim them
                        // This fixes "Unknown Location" if items were added while I was pending
                        const itemsToClaim = mappedItems.filter(i => i.locationCaregiverId && i.locationCaregiverId.startsWith("pending-"));
                        if (itemsToClaim.length > 0) {
                            // We need to check if any of these pending invites belong to ME (by email)
                            // This is a background task, don't block
                            (async () => {
                                try {
                                    const { data: myProfile } = await supabase
                                        .from("profiles")
                                        .select("email")
                                        .eq("id", user.id)
                                        .single();

                                    if (myProfile?.email) {
                                        // Find invites for my email
                                        const { data: myInvites } = await supabase
                                            .from("invites")
                                            .select("id")
                                            .eq("email", myProfile.email);

                                        if (myInvites && myInvites.length > 0) {
                                            const myInviteIds = myInvites.map((inv: any) => inv.id);
                                            const itemsToUpdate = itemsToClaim.filter(item => {
                                                const inviteId = item.locationCaregiverId?.replace("pending-", "");
                                                return inviteId && myInviteIds.includes(inviteId);
                                            });

                                            if (itemsToUpdate.length > 0) {
                                                console.log("Found items to claim from invites:", itemsToUpdate.length);
                                                // Update these items to point to me
                                                const itemIds = itemsToUpdate.map(i => i.id);
                                                await supabase
                                                    .from("items")
                                                    .update({
                                                        location_caregiver_id: user.id,
                                                        location_invite_id: null
                                                    })
                                                    .in("id", itemIds);

                                                // Refresh items to reflect changes
                                                fetchItems();
                                            }
                                        }
                                    }
                                } catch (err) {
                                    console.error("Error claiming items:", err);
                                }
                            })();
                        }
                    }

                    // Setup Realtime subscription for this family's items
                    if (!realtimeChannel) {
                        realtimeChannel = supabase
                            .channel('items-changes')
                            .on(
                                'postgres_changes',
                                {
                                    event: '*',
                                    schema: 'public',
                                    table: 'items',
                                    filter: `family_id=eq.${familyId}`
                                },
                                (payload) => {
                                    console.log('Realtime change received:', payload);
                                    // Simple strategy: Re-fetch all items to ensure consistency
                                    // This handles INSERT, UPDATE, and DELETE correctly
                                    fetchItems();
                                }
                            )
                            .subscribe();
                    }
                } else if (isMounted) {
                    setItems([]);
                }
            } catch (error) {
                console.error("Failed to load items:", error);
            } finally {
                if (isMounted) {
                    setIsLoaded(true);
                }
            }
        };

        // Fetch immediately on mount
        fetchItems();

        // Subscribe to auth state changes for updates
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Items: Auth state changed:", event);
            // Reset loading state when auth changes
            if (isMounted) {
                // Clear existing realtime subscription on auth change
                if (realtimeChannel) {
                    supabase.removeChannel(realtimeChannel);
                    realtimeChannel = null;
                }
                setIsLoaded(false);
                fetchItems();
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
            authSubscription.unsubscribe();
            if (realtimeChannel) {
                supabase.removeChannel(realtimeChannel);
            }
        };
    }, []);

    const addItem = async (item: Omit<Item, "id">): Promise<{ success: boolean; error?: string; item?: Item }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                const errorMsg = "No user found. Please log in.";
                console.error(errorMsg);
                return { success: false, error: errorMsg };
            }

            // Get user's family
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .single();

            if (!familyMember) {
                const errorMsg = "User not in a family. Please complete onboarding.";
                console.error(errorMsg);
                return { success: false, error: errorMsg };
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
                    location_home_id: item.locationHomeId || null, // NEW: home-based location
                    notes: item.notes,
                    family_id: familyMember.family_id,
                    photo_url: item.photoUrl,
                    is_missing: item.isMissing,
                })
                .select()
                .single();

            if (error) {
                const errorMsg = `Failed to create item: ${error.message}`;
                console.error("Error adding item:", error);
                return { success: false, error: errorMsg };
            }

            if (!data) {
                const errorMsg = "No data returned from server.";
                console.error(errorMsg);
                return { success: false, error: errorMsg };
            }

            const newItem: Item = {
                id: data.id,
                name: data.name,
                category: data.category,
                locationCaregiverId: data.location_caregiver_id || (data.location_invite_id ? `pending-${data.location_invite_id}` : null),
                locationHomeId: data.location_home_id || null,
                notes: data.notes,
                photoUrl: data.photo_url,
                isRequestedForNextVisit: false,
                isPacked: false,
                isMissing: item.isMissing,
            };
            // Immediately update local state for instant feedback
            setItems((prev) => [...prev, newItem]);
            return { success: true, item: newItem };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to add item. Please try again.";
            console.error("Failed to add item:", error);
            return { success: false, error: errorMsg };
        }
    };

    const updateItemLocation = async (
        itemId: string,
        newLocation: { caregiverId?: string; homeId?: string; toBeFound?: boolean }
    ) => {
        try {
            const updates: any = {};

            if (newLocation.toBeFound) {
                updates.is_missing = true;
                updates.is_requested_for_next_visit = false;
                updates.is_packed = false;
            } else if (newLocation.homeId) {
                // NEW: home-based location (primary method)
                updates.location_home_id = newLocation.homeId;
                updates.is_missing = false;
                updates.is_requested_for_next_visit = false;
                updates.is_packed = false;
                // Clear legacy caregiver location if setting home
                if (newLocation.caregiverId) {
                    updates.location_caregiver_id = newLocation.caregiverId;
                }
            } else if (newLocation.caregiverId) {
                // Legacy: caregiver-based location (fallback)
                updates.location_caregiver_id = newLocation.caregiverId;
                updates.is_missing = false;
                updates.is_requested_for_next_visit = false;
                updates.is_packed = false;
            }

            // Skip database update if no changes were specified
            if (Object.keys(updates).length === 0) {
                console.warn("updateItemLocation called with no valid changes");
                return;
            }

            // Immediately update local state for instant feedback
            setItems((prev) =>
                prev.map((item) => {
                    if (item.id !== itemId) return item;
                    return {
                        ...item,
                        isMissing: newLocation.toBeFound || false,
                        locationCaregiverId: newLocation.caregiverId || item.locationCaregiverId,
                        locationHomeId: newLocation.homeId || item.locationHomeId,
                        isRequestedForNextVisit: false,
                        isPacked: false,
                    };
                })
            );

            const { error } = await supabase
                .from("items")
                .update(updates)
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item location:", error);
        }
    };

    const updateItemRequested = async (itemId: string, requested: boolean) => {
        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, isRequestedForNextVisit: requested } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({ is_requested_for_next_visit: requested })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item request status:", error);
        }
    };

    const updateItemPacked = async (itemId: string, packed: boolean) => {
        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, isPacked: packed } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({ is_packed: packed })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item packed status:", error);
        }
    };

    const updateItemName = async (itemId: string, newName: string) => {
        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, name: newName } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({ name: newName })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item name:", error);
            throw error;
        }
    };

    const updateItemNotes = async (itemId: string, notes: string) => {
        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, notes: notes || undefined } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({ notes: notes || null })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item notes:", error);
            throw error;
        }
    };

    const updateItemCategory = async (itemId: string, category: string) => {
        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, category } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({ category })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item category:", error);
            throw error;
        }
    };

    const updateItemPhoto = async (itemId: string, photoUrl: string | null) => {
        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, photoUrl: photoUrl || undefined } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({ photo_url: photoUrl })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item photo:", error);
            throw error;
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

    const markItemFound = async (itemId: string) => {
        // Optimistic update - immediately update local state
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

        // Update database
        try {
            await supabase
                .from("items")
                .update({ is_missing: false })
                .eq("id", itemId);
        } catch (error) {
            console.error("Failed to mark item as found:", error);
        }
    };

    const deleteItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
        // Optimistically remove from local state
        const previousItems = items;
        setItems((prev) => prev.filter((item) => item.id !== itemId));

        try {
            // 1. Delete associated missing messages first (cleanup)
            await supabase
                .from("missing_messages")
                .delete()
                .eq("item_id", itemId);

            // 2. Delete the item
            const { error, count } = await supabase
                .from("items")
                .delete({ count: 'exact' })
                .eq("id", itemId);

            if (error) throw error;

            if (count === 0) {
                // Rollback optimistic update
                setItems(previousItems);
                return {
                    success: false,
                    error: "Permission denied. Please run this SQL in Supabase: create policy \"Enable delete for family members\" on items for delete using (family_id in (select family_id from family_members where user_id = auth.uid()));"
                };
            }

            return { success: true };
        } catch (error) {
            // Rollback optimistic update
            setItems(previousItems);
            const errorMsg = error instanceof Error ? error.message : "Failed to delete item";
            console.error("Failed to delete item:", error);
            return { success: false, error: errorMsg };
        }
    };

    return (
        <ItemsContext.Provider
            value={{
                items,
                isLoaded,
                addItem,
                updateItemLocation,
                updateItemRequested,
                updateItemPacked,
                updateItemName,
                updateItemNotes,
                updateItemCategory,
                updateItemPhoto,
                missingMessages,
                addMissingMessage,
                getMissingMessagesForItem,
                markItemFound,
                deleteItem,
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
