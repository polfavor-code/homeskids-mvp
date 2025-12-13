"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
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
    cancelItemRequest: (itemId: string) => void; // Requester cancels - keeps packed status, sets isRequestCanceled
    confirmRemoveFromBag: (itemId: string) => void; // Packer confirms removal after cancel
    keepInBag: (itemId: string) => void; // Packer keeps item in bag after cancel
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

    // Store family ID for realtime subscription
    const [familyId, setFamilyId] = useState<string | null>(null);

    // Track if we've successfully loaded items with a valid authenticated user
    // This prevents showing empty/welcome state before items are actually loaded
    const hasCompletedAuthenticatedFetchRef = useRef(false);

    // Fetch items from Supabase
    const fetchItems = useCallback(async () => {
        console.log("Items: fetchItems called");
        try {
            // Use getSession for more reliable auth state on initial load
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            console.log("Items: fetchItems - user:", user?.id, "hasCompletedFetch:", hasCompletedAuthenticatedFetchRef.current);

            if (!user) {
                setItems([]);
                setFamilyId(null);
                // Only mark as loaded if we've previously completed an authenticated fetch
                // This prevents showing welcome screen during initial auth when session isn't ready
                if (hasCompletedAuthenticatedFetchRef.current) {
                    console.log("Items: No user, but had previous authenticated fetch, marking loaded");
                    setIsLoaded(true);
                } else {
                    console.log("Items: No user and no previous fetch, NOT marking loaded (waiting for auth)");
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
                const fId = familyMember[0].family_id;
                setFamilyId(fId);

                // Fetch items for this family
                const { data: itemsData } = await supabase
                    .from("items")
                    .select("*")
                    .eq("family_id", fId);

                if (itemsData) {
                    console.log("Items: Fetched", itemsData.length, "items for family", fId);
                    const mappedItems: Item[] = itemsData.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        category: item.category,
                        locationCaregiverId: item.location_caregiver_id || (item.location_invite_id ? `pending-${item.location_invite_id}` : null),
                        locationHomeId: item.location_home_id || null,
                        isRequestedForNextVisit: item.is_requested_for_next_visit,
                        isPacked: item.is_packed,
                        isMissing: item.is_missing,
                        isRequestCanceled: item.is_request_canceled || false,
                        photoUrl: item.photo_url,
                        notes: item.notes,
                        requestedBy: item.requested_by || null,
                        packedBy: item.packed_by || null,
                    }));
                    setItems(mappedItems);
                    // Mark that we've successfully completed an authenticated fetch
                    hasCompletedAuthenticatedFetchRef.current = true;

                    // Self-healing: Check for items assigned to my invite and claim them
                    const itemsToClaim = mappedItems.filter(i => i.locationCaregiverId && i.locationCaregiverId.startsWith("pending-"));
                    if (itemsToClaim.length > 0) {
                        (async () => {
                            try {
                                const { data: myProfile } = await supabase
                                    .from("profiles")
                                    .select("email")
                                    .eq("id", user.id)
                                    .single();

                                if (myProfile?.email) {
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
                                            const itemIds = itemsToUpdate.map(i => i.id);
                                            await supabase
                                                .from("items")
                                                .update({
                                                    location_caregiver_id: user.id,
                                                    location_invite_id: null
                                                })
                                                .in("id", itemIds);
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
            } else {
                setItems([]);
                setFamilyId(null);
                // Still mark as completed - user is authenticated but not in a family yet
                hasCompletedAuthenticatedFetchRef.current = true;
            }
        } catch (error) {
            console.error("Failed to load items:", error);
            // On error, still mark as loaded to prevent infinite loading
            hasCompletedAuthenticatedFetchRef.current = true;
        } finally {
            console.log("Items: fetchItems complete, setting isLoaded=true");
            setIsLoaded(true);
        }
    }, []);

    // Initial fetch and auth state listener
    useEffect(() => {
        // Don't do initial fetch - wait for auth state to be determined
        // This prevents the race condition where getSession() returns null
        // before the session is restored from storage

        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Items: Auth state changed:", event, "hasSession:", !!session, "userId:", session?.user?.id);

            if (event === "INITIAL_SESSION") {
                // This is the first auth event - session state is now known
                if (!session) {
                    // User is definitely not logged in - mark as loaded with empty items
                    console.log("Items: No session on INITIAL_SESSION, marking loaded");
                    setItems([]);
                    setFamilyId(null);
                    setIsLoaded(true);
                } else {
                    // User is logged in - fetch items
                    console.log("Items: Session exists on INITIAL_SESSION, fetching items");
                    fetchItems();
                }
            } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                // User signed in or token refreshed - fetch items
                console.log("Items: SIGNED_IN/TOKEN_REFRESHED, refetching items");
                setIsLoaded(false);
                fetchItems();
            } else if (event === "SIGNED_OUT") {
                // User signed out - clear items
                console.log("Items: SIGNED_OUT, clearing items");
                setItems([]);
                setFamilyId(null);
                hasCompletedAuthenticatedFetchRef.current = false;
                setIsLoaded(true);
            }
        });

        // Fallback: If no auth event fires within 3 seconds, try to fetch anyway
        // This handles edge cases where auth events might not fire
        const fallbackTimeout = setTimeout(() => {
            if (!hasCompletedAuthenticatedFetchRef.current) {
                console.log("Items: Fallback fetch triggered");
                fetchItems();
            }
        }, 3000);

        return () => {
            authSubscription.unsubscribe();
            clearTimeout(fallbackTimeout);
        };
    }, [fetchItems]);

    // Separate effect for Realtime subscription - depends on familyId
    useEffect(() => {
        if (!familyId) {
            return;
        }

        console.log("Setting up realtime subscription for family:", familyId);

        // Create a unique channel name to avoid conflicts
        const channelName = `items-realtime-${familyId}-${Date.now()}`;

        const channel = supabase
            .channel(channelName)
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
                    // Re-fetch all items to ensure consistency
                    fetchItems();
                }
            )
            .subscribe((status) => {
                console.log("Realtime subscription status:", status);
                if (status === 'SUBSCRIBED') {
                    console.log("Successfully subscribed to items realtime updates");
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error("Realtime subscription error - retrying...");
                    // Retry after a delay
                    setTimeout(() => {
                        channel.subscribe();
                    }, 5000);
                }
            });

        // Cleanup: remove channel when familyId changes or component unmounts
        return () => {
            console.log("Removing realtime channel:", channelName);
            supabase.removeChannel(channel);
        };
    }, [familyId, fetchItems]);

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
                    location_home_id: item.locationHomeId || null,
                    notes: item.notes,
                    family_id: familyMember.family_id,
                    photo_url: item.photoUrl,
                    is_missing: item.isMissing,
                    created_by: user.id, // Track who created this item for alerts
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
                isRequestCanceled: false,
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
        // Get current user ID for tracking who requested
        const { data: { user } } = await supabase.auth.getUser();
        const requestedBy = requested ? (user?.id || null) : null;

        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, isRequestedForNextVisit: requested, requestedBy } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({
                    is_requested_for_next_visit: requested,
                    requested_by: requestedBy,
                    requested_at: requested ? new Date().toISOString() : null,
                })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item request status:", error);
        }
    };

    const updateItemPacked = async (itemId: string, packed: boolean) => {
        // Get current user ID for tracking who packed
        const { data: { user } } = await supabase.auth.getUser();
        const packedBy = packed ? (user?.id || null) : null;

        // Immediately update local state
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, isPacked: packed, packedBy } : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({
                    is_packed: packed,
                    packed_by: packedBy,
                    packed_at: packed ? new Date().toISOString() : null,
                })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to update item packed status:", error);
        }
    };

    // Requester cancels request - if item is packed, set isRequestCanceled flag
    // Packer will see modal to confirm removal
    const cancelItemRequest = async (itemId: string) => {
        const item = items.find((i) => i.id === itemId);
        if (!item) return;

        // If item is packed, set isRequestCanceled - packer must confirm removal
        // If item is not packed, just unrequest normally
        if (item.isPacked) {
            // Optimistic update
            setItems((prev) =>
                prev.map((i) =>
                    i.id === itemId
                        ? { ...i, isRequestedForNextVisit: false, isRequestCanceled: true }
                        : i
                )
            );

            try {
                const { error } = await supabase
                    .from("items")
                    .update({
                        is_requested_for_next_visit: false,
                        is_request_canceled: true,
                    })
                    .eq("id", itemId);

                if (error) throw error;
            } catch (error) {
                console.error("Failed to cancel item request:", error);
            }
        } else {
            // Not packed - just unrequest normally
            setItems((prev) =>
                prev.map((i) =>
                    i.id === itemId
                        ? { ...i, isRequestedForNextVisit: false }
                        : i
                )
            );

            try {
                const { error } = await supabase
                    .from("items")
                    .update({ is_requested_for_next_visit: false })
                    .eq("id", itemId);

                if (error) throw error;
            } catch (error) {
                console.error("Failed to unrequest item:", error);
            }
        }
    };

    // Packer confirms removal from bag after requester canceled
    const confirmRemoveFromBag = async (itemId: string) => {
        // Optimistic update
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId
                    ? { ...item, isPacked: false, isRequestCanceled: false }
                    : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({
                    is_packed: false,
                    is_request_canceled: false,
                })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to remove item from bag:", error);
        }
    };

    // Packer keeps item in bag after requester canceled (clears the canceled flag)
    const keepInBag = async (itemId: string) => {
        // Optimistic update - keep packed, clear canceled flag
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId
                    ? { ...item, isRequestCanceled: false }
                    : item
            )
        );

        try {
            const { error } = await supabase
                .from("items")
                .update({ is_request_canceled: false })
                .eq("id", itemId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to keep item in bag:", error);
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
            // 1. Delete associated missing messages first (cleanup) - silently ignore if table doesn't exist
            try {
                await supabase
                    .from("missing_messages")
                    .delete()
                    .eq("item_id", itemId);
            } catch (e) {
                // Table may not exist - that's OK
            }

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
                cancelItemRequest,
                confirmRemoveFromBag,
                keepInBag,
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
