"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ==============================================
// V2 ITEMS CONTEXT - Items per ChildSpace
// ==============================================

export type Item = {
    id: string;
    childSpaceId: string;
    name: string;
    category: string;  // Required for V1 compatibility
    status: "at_home" | "in_bag" | "moved" | "lost";
    photoUrl?: string;
    notes?: string;
    createdBy?: string;
    createdAt?: string;
    // Packing state (for travel)
    isRequestedForNextVisit: boolean;  // Required for V1 compatibility
    isPacked: boolean;  // Required for V1 compatibility
    isRequestCanceled: boolean;  // Required for V1 compatibility
    requestedBy?: string | null;
    packedBy?: string | null;
    requestedAt?: string;
    // Item origin - who originally brought this item (NOT about ownership, just logistics)
    // Items always belong to the child
    originUserId?: string | null;
    originHomeId?: string | null;
    // Child ownership - which children this item belongs to
    childIds: string[];
    // V1 compatibility
    locationCaregiverId: string | null;
    locationHomeId: string | null;
    isMissing: boolean;  // Required for V1 compatibility
};

// Transfer request - request to move an item to a different home
export type TransferRequestStatus = "pending" | "accepted" | "completed" | "declined" | "canceled";

export type ItemTransferRequest = {
    id: string;
    itemId: string;
    itemName?: string; // Derived from item
    requestedBy: string;
    requestedByName?: string; // Derived from profile
    targetHomeId: string | null; // null = "bring to next handover"
    targetHomeName?: string; // Derived from home
    status: TransferRequestStatus;
    message?: string;
    requestedForDate?: string;
    createdAt: string;
    respondedAt?: string;
    respondedBy?: string;
    completedAt?: string;
};

// V1 compatible Item type for addItem
type AddItemInput = {
    // V2 format (preferred)
    childSpaceId?: string;
    name: string;
    category?: string;
    photoUrl?: string;
    notes?: string;
    // Child ownership - which children this item belongs to
    childIds?: string[];
    // Origin home - where the item originates from
    originHomeId?: string | null;
    // V1 compatibility
    id?: string;
    locationCaregiverId?: string;
    locationHomeId?: string | null;
    isRequestedForNextVisit?: boolean;
    isPacked?: boolean;
    isMissing?: boolean;
    isRequestCanceled?: boolean;
};

interface ItemsContextType {
    items: Item[];
    isLoaded: boolean;

    // Refresh items (call after onboarding or when data access changes)
    refetchItems: () => Promise<void>;

    // CRUD operations - accepts both V1 and V2 formats
    addItem: (item: AddItemInput) => Promise<{ success: boolean; error?: string; item?: Item }>;

    updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
    deleteItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;

    // Location/status updates
    updateItemStatus: (itemId: string, status: Item["status"]) => Promise<void>;
    moveItemToChildSpace: (itemId: string, newChildSpaceId: string) => Promise<void>;

    // Packing operations
    requestItem: (itemId: string, requested: boolean) => Promise<void>;
    packItem: (itemId: string, packed: boolean) => Promise<void>;
    cancelItemRequest: (itemId: string) => Promise<void>;
    confirmRemoveFromBag: (itemId: string) => Promise<void>;
    keepInBag: (itemId: string) => Promise<void>;

    // Filter items
    getItemsByChildSpace: (childSpaceId: string) => Item[];
    getItemsByStatus: (status: Item["status"]) => Item[];
    getItemsOriginatedByUser: (userId: string) => Item[];

    // Transfer requests
    transferRequests: ItemTransferRequest[];
    createTransferRequest: (itemId: string, options: { targetHomeId?: string | null; message?: string; requestedForDate?: string }) => Promise<{ success: boolean; error?: string }>;
    respondToTransferRequest: (requestId: string, accept: boolean) => Promise<{ success: boolean; error?: string }>;
    completeTransferRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
    cancelTransferRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
    getTransferRequestsForItem: (itemId: string) => ItemTransferRequest[];
    getPendingTransferRequests: () => ItemTransferRequest[];

    // V1 compatibility methods
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
    markItemFound: (itemId: string) => void;
    missingMessages: any[];
    addMissingMessage: (message: { itemId: string; authorCaregiverId: string; text: string }) => void;
    getMissingMessagesForItem: (itemId: string) => any[];
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Item[]>([]);
    const [transferRequests, setTransferRequests] = useState<ItemTransferRequest[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentChildId, setCurrentChildId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const hasCompletedFetchRef = useRef(false);

    // Fetch items for the user's accessible child_spaces
    const fetchItems = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                setItems([]);
                setCurrentUserId(null);
                if (hasCompletedFetchRef.current) {
                    setIsLoaded(true);
                }
                return;
            }

            setCurrentUserId(user.id);

            // 1. Get children this user has access to
            const { data: childAccess } = await supabase
                .from("child_access")
                .select("child_id")
                .eq("user_id", user.id);

            if (!childAccess || childAccess.length === 0) {
                setItems([]);
                hasCompletedFetchRef.current = true;
                setIsLoaded(true);
                return;
            }

            const childIds = childAccess.map(ca => ca.child_id);
            setCurrentChildId(childIds[0]); // Use first child for now

            // 2. Get child_spaces for these children
            const { data: childSpaces } = await supabase
                .from("child_spaces")
                .select("id")
                .in("child_id", childIds);

            if (!childSpaces || childSpaces.length === 0) {
                setItems([]);
                hasCompletedFetchRef.current = true;
                setIsLoaded(true);
                return;
            }

            const childSpaceIds = childSpaces.map(cs => cs.id);

            // 3. Fetch items for these child_spaces
            const { data: itemsData } = await supabase
                .from("items")
                .select("*")
                .in("child_space_id", childSpaceIds);

            if (itemsData) {
                // Get child_spaces to map child_space_id -> home_id
                const childSpaceToHomeMap = new Map<string, string>();
                for (const csId of childSpaceIds) {
                    const cs = await supabase
                        .from("child_spaces")
                        .select("id, home_id")
                        .eq("id", csId)
                        .single();
                    if (cs.data) {
                        childSpaceToHomeMap.set(cs.data.id, cs.data.home_id);
                    }
                }

                const mappedItems: Item[] = itemsData.map((item: any) => ({
                    id: item.id,
                    childSpaceId: item.child_space_id,
                    name: item.name,
                    category: item.category || "Other",  // V1 compatibility: default category
                    status: item.status || "at_home",
                    photoUrl: item.photo_url,
                    notes: item.notes,
                    createdBy: item.created_by,
                    createdAt: item.created_at,
                    isRequestedForNextVisit: item.is_requested_for_next_visit || false,
                    isPacked: item.is_packed || false,
                    isRequestCanceled: item.is_request_canceled || false,
                    requestedBy: item.requested_by || null,
                    packedBy: item.packed_by || null,
                    originUserId: item.origin_user_id || null,
                    originHomeId: item.origin_home_id || null,
                    // Child ownership
                    childIds: item.child_ids || [],
                    // V1 compatibility: derive locationHomeId from child_space
                    locationHomeId: childSpaceToHomeMap.get(item.child_space_id) || null,
                    locationCaregiverId: null,  // V2 doesn't use caregiver-based location
                    isMissing: item.status === "lost",
                }));
                setItems(mappedItems);

                // Also fetch transfer requests for these items
                const itemIds = mappedItems.map(i => i.id);
                if (itemIds.length > 0) {
                    const { data: requestsData } = await supabase
                        .from("item_transfer_requests")
                        .select("*")
                        .in("item_id", itemIds);

                    if (requestsData) {
                        const mappedRequests: ItemTransferRequest[] = requestsData.map((req: any) => ({
                            id: req.id,
                            itemId: req.item_id,
                            requestedBy: req.requested_by,
                            targetHomeId: req.target_home_id,
                            status: req.status,
                            message: req.message,
                            requestedForDate: req.requested_for_date,
                            createdAt: req.created_at,
                            respondedAt: req.responded_at,
                            respondedBy: req.responded_by,
                            completedAt: req.completed_at,
                        }));
                        setTransferRequests(mappedRequests);
                    }
                }

                hasCompletedFetchRef.current = true;
            }
        } catch (error) {
            console.error("Failed to load items:", error);
            hasCompletedFetchRef.current = true;
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Auth state listener
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "INITIAL_SESSION") {
                if (!session) {
                    setItems([]);
                    setIsLoaded(true);
                } else {
                    fetchItems();
                }
            } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                setIsLoaded(false);
                fetchItems();
            } else if (event === "SIGNED_OUT") {
                setItems([]);
                hasCompletedFetchRef.current = false;
                setIsLoaded(true);
            }
        });

        const fallbackTimeout = setTimeout(() => {
            if (!hasCompletedFetchRef.current) {
                fetchItems();
            }
        }, 3000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(fallbackTimeout);
        };
    }, [fetchItems]);

    // Realtime subscription for items
    useEffect(() => {
        if (!currentChildId) return;

        const channel = supabase
            .channel(`items-v2-${currentChildId}-${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "items",
                },
                () => {
                    fetchItems();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentChildId, fetchItems]);

    // Add item - supports both V1 and V2 formats
    const addItem = async (item: AddItemInput): Promise<{ success: boolean; error?: string; item?: Item }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: "Not authenticated" };
            }

            // Determine child_space_id - use V2 format if provided, otherwise derive from locationHomeId
            let childSpaceId = item.childSpaceId;

            if (!childSpaceId && item.locationHomeId) {
                // V1 compatibility: look up child_space by home_id
                // We need to find a child_space for this home
                const { data: childSpaceData } = await supabase
                    .from("child_spaces")
                    .select("id")
                    .eq("home_id", item.locationHomeId)
                    .limit(1)
                    .single();

                if (childSpaceData) {
                    childSpaceId = childSpaceData.id;
                }
            }

            if (!childSpaceId && currentChildId) {
                // Fallback: use the first child_space for the current child
                const { data: childSpaceData } = await supabase
                    .from("child_spaces")
                    .select("id")
                    .eq("child_id", currentChildId)
                    .limit(1)
                    .single();

                if (childSpaceData) {
                    childSpaceId = childSpaceData.id;
                }
            }

            if (!childSpaceId) {
                return { success: false, error: "No child space found. Please complete onboarding." };
            }

            const status = item.isMissing ? "lost" : "at_home";

            // Get the home_id for this child_space to set origin_home_id (if not provided)
            const { data: childSpaceData } = await supabase
                .from("child_spaces")
                .select("home_id, child_id")
                .eq("id", childSpaceId)
                .single();

            // Determine origin_home_id: use provided value, or default to current home
            const originHomeId = item.originHomeId !== undefined 
                ? item.originHomeId 
                : (childSpaceData?.home_id || null);

            // Determine child_ids: use provided value, or default to child from child_space
            const childIds = item.childIds && item.childIds.length > 0
                ? item.childIds
                : (childSpaceData?.child_id ? [childSpaceData.child_id] : []);

            // Try insert with child_ids first, fall back without if column doesn't exist yet
            let data: any;
            let error: any;

            const baseInsert = {
                child_space_id: childSpaceId,
                name: item.name,
                category: item.category,
                photo_url: item.photoUrl,
                notes: item.notes,
                status,
                created_by: user.id,
                origin_user_id: user.id,
                origin_home_id: originHomeId,
                is_requested_for_next_visit: item.isRequestedForNextVisit || false,
                is_packed: item.isPacked || false,
                is_request_canceled: item.isRequestCanceled || false,
            };

            // First try with child_ids
            const result1 = await supabase
                .from("items")
                .insert({ ...baseInsert, child_ids: childIds })
                .select()
                .single();

            if (result1.error?.message?.includes("child_ids")) {
                // Column doesn't exist yet, retry without it
                console.warn("[Items] child_ids column not found, inserting without it");
                const result2 = await supabase
                    .from("items")
                    .insert(baseInsert)
                    .select()
                    .single();
                data = result2.data;
                error = result2.error;
            } else {
                data = result1.data;
                error = result1.error;
            }

            if (error) {
                return { success: false, error: error.message };
            }

            const newItem: Item = {
                id: data.id,
                childSpaceId: data.child_space_id,
                name: data.name,
                category: data.category || "Other",
                status: data.status,
                photoUrl: data.photo_url,
                notes: data.notes,
                createdBy: data.created_by,
                createdAt: data.created_at,
                isRequestedForNextVisit: data.is_requested_for_next_visit || false,
                isPacked: data.is_packed || false,
                isRequestCanceled: data.is_request_canceled || false,
                requestedBy: null,
                packedBy: null,
                originUserId: data.origin_user_id || null,
                originHomeId: data.origin_home_id || null,
                childIds: data.child_ids || [],
                // V1 compatibility
                locationHomeId: item.locationHomeId || null,
                locationCaregiverId: item.locationCaregiverId || null,
                isMissing: item.isMissing || false,
            };

            setItems(prev => [...prev, newItem]);
            return { success: true, item: newItem };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    };

    // Update item
    const updateItem = async (itemId: string, updates: Partial<Item>) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        ));

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.originUserId !== undefined) dbUpdates.origin_user_id = updates.originUserId;
        if (updates.originHomeId !== undefined) dbUpdates.origin_home_id = updates.originHomeId;
        
        // Handle child_ids separately in case column doesn't exist yet
        const hasChildIdsUpdate = updates.childIds !== undefined;
        if (hasChildIdsUpdate) dbUpdates.child_ids = updates.childIds;

        if (Object.keys(dbUpdates).length > 0) {
            const result = await supabase
                .from("items")
                .update(dbUpdates)
                .eq("id", itemId);

            // If child_ids column doesn't exist, retry without it
            if (result.error?.message?.includes("child_ids") && hasChildIdsUpdate) {
                console.warn("[Items] child_ids column not found, updating without it");
                delete dbUpdates.child_ids;
                if (Object.keys(dbUpdates).length > 0) {
                    await supabase
                        .from("items")
                        .update(dbUpdates)
                        .eq("id", itemId);
                }
            }
        }
    };

    // Delete item
    const deleteItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
        const previousItems = items;
        setItems(prev => prev.filter(item => item.id !== itemId));

        try {
            const { error } = await supabase
                .from("items")
                .delete()
                .eq("id", itemId);

            if (error) {
                setItems(previousItems);
                return { success: false, error: error.message };
            }
            return { success: true };
        } catch (error) {
            setItems(previousItems);
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    };

    // Update status
    const updateItemStatus = async (itemId: string, status: Item["status"]) => {
        await updateItem(itemId, { status });
    };

    // Move to different child_space
    const moveItemToChildSpace = async (itemId: string, newChildSpaceId: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, childSpaceId: newChildSpaceId } : item
        ));

        await supabase
            .from("items")
            .update({ child_space_id: newChildSpaceId })
            .eq("id", itemId);
    };

    // Request item for next visit
    const requestItem = async (itemId: string, requested: boolean) => {
        const { data: { user } } = await supabase.auth.getUser();

        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, isRequestedForNextVisit: requested, requestedBy: requested ? user?.id : undefined }
                : item
        ));

        await supabase
            .from("items")
            .update({
                is_requested_for_next_visit: requested,
                requested_by: requested ? user?.id : null,
                requested_at: requested ? new Date().toISOString() : null,
            })
            .eq("id", itemId);
    };

    // Pack item
    const packItem = async (itemId: string, packed: boolean) => {
        const { data: { user } } = await supabase.auth.getUser();

        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, isPacked: packed, packedBy: packed ? user?.id : undefined }
                : item
        ));

        await supabase
            .from("items")
            .update({
                is_packed: packed,
                packed_by: packed ? user?.id : null,
                packed_at: packed ? new Date().toISOString() : null,
            })
            .eq("id", itemId);
    };

    // Cancel request
    const cancelItemRequest = async (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        if (item.isPacked) {
            setItems(prev => prev.map(i =>
                i.id === itemId
                    ? { ...i, isRequestedForNextVisit: false, isRequestCanceled: true }
                    : i
            ));

            await supabase
                .from("items")
                .update({
                    is_requested_for_next_visit: false,
                    is_request_canceled: true,
                })
                .eq("id", itemId);
        } else {
            setItems(prev => prev.map(i =>
                i.id === itemId ? { ...i, isRequestedForNextVisit: false } : i
            ));

            await supabase
                .from("items")
                .update({ is_requested_for_next_visit: false })
                .eq("id", itemId);
        }
    };

    // Confirm remove from bag
    const confirmRemoveFromBag = async (itemId: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, isPacked: false, isRequestCanceled: false }
                : item
        ));

        await supabase
            .from("items")
            .update({
                is_packed: false,
                is_request_canceled: false,
            })
            .eq("id", itemId);
    };

    // Keep in bag
    const keepInBag = async (itemId: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, isRequestCanceled: false } : item
        ));

        await supabase
            .from("items")
            .update({ is_request_canceled: false })
            .eq("id", itemId);
    };

    // Filter helpers
    const getItemsByChildSpace = (childSpaceId: string) =>
        items.filter(item => item.childSpaceId === childSpaceId);

    const getItemsByStatus = (status: Item["status"]) =>
        items.filter(item => item.status === status);

    // Get items originated by a specific user (can see these even if at another home)
    const getItemsOriginatedByUser = (userId: string) =>
        items.filter(item => item.originUserId === userId);

    // ===== Transfer Request Methods =====

    const createTransferRequest = async (
        itemId: string,
        options: { targetHomeId?: string | null; message?: string; requestedForDate?: string }
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: "Not authenticated" };

            const { data, error } = await supabase
                .from("item_transfer_requests")
                .insert({
                    item_id: itemId,
                    requested_by: user.id,
                    target_home_id: options.targetHomeId || null,
                    message: options.message || null,
                    requested_for_date: options.requestedForDate || null,
                    status: "pending",
                })
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            const newRequest: ItemTransferRequest = {
                id: data.id,
                itemId: data.item_id,
                requestedBy: data.requested_by,
                targetHomeId: data.target_home_id,
                status: data.status,
                message: data.message,
                requestedForDate: data.requested_for_date,
                createdAt: data.created_at,
            };

            setTransferRequests(prev => [...prev, newRequest]);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    };

    const respondToTransferRequest = async (requestId: string, accept: boolean): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: "Not authenticated" };

            const newStatus = accept ? "accepted" : "declined";

            const { error } = await supabase
                .from("item_transfer_requests")
                .update({
                    status: newStatus,
                    responded_at: new Date().toISOString(),
                    responded_by: user.id,
                })
                .eq("id", requestId);

            if (error) {
                return { success: false, error: error.message };
            }

            setTransferRequests(prev =>
                prev.map(req => req.id === requestId
                    ? { ...req, status: newStatus as TransferRequestStatus, respondedAt: new Date().toISOString(), respondedBy: user.id }
                    : req
                )
            );

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    };

    const completeTransferRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase
                .from("item_transfer_requests")
                .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                })
                .eq("id", requestId);

            if (error) {
                return { success: false, error: error.message };
            }

            setTransferRequests(prev =>
                prev.map(req => req.id === requestId
                    ? { ...req, status: "completed" as TransferRequestStatus, completedAt: new Date().toISOString() }
                    : req
                )
            );

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    };

    const cancelTransferRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase
                .from("item_transfer_requests")
                .update({ status: "canceled" })
                .eq("id", requestId);

            if (error) {
                return { success: false, error: error.message };
            }

            setTransferRequests(prev =>
                prev.map(req => req.id === requestId
                    ? { ...req, status: "canceled" as TransferRequestStatus }
                    : req
                )
            );

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    };

    const getTransferRequestsForItem = (itemId: string) =>
        transferRequests.filter(req => req.itemId === itemId);

    const getPendingTransferRequests = () =>
        transferRequests.filter(req => req.status === "pending");

    // ===== V1 Compatibility Methods =====

    // V1: updateItemLocation - maps to child_space in V2
    const updateItemLocation = async (
        itemId: string,
        newLocation: { caregiverId?: string; homeId?: string; toBeFound?: boolean }
    ) => {
        console.log("🏠 updateItemLocation called:", { itemId, newLocation });
        
        // Handle "Missing" status
        if (newLocation.toBeFound !== undefined) {
            const isMissing = newLocation.toBeFound;
            const status = isMissing ? "lost" as const : "at_home" as const;
            setItems(prev => prev.map(item =>
                item.id === itemId
                    ? { ...item, isMissing, status }
                    : item
            ));

            await supabase
                .from("items")
                .update({ status: newLocation.toBeFound ? "lost" : "at_home" })
                .eq("id", itemId);
            return;
        }
        
        // Handle home change - need to find the child_space for the new home
        if (newLocation.homeId) {
            const item = items.find(i => i.id === itemId);
            if (!item) {
                console.error("❌ Item not found:", itemId);
                return;
            }
            
            console.log("🏠 Item current childSpaceId:", item.childSpaceId);
            
            // Get the current child_space to find which child this is for
            const { data: currentChildSpace } = await supabase
                .from("child_spaces")
                .select("child_id")
                .eq("id", item.childSpaceId)
                .single();
            
            if (!currentChildSpace) {
                console.error("❌ Could not find current child_space");
                return;
            }
            
            console.log("🏠 Item is for child_id:", currentChildSpace.child_id);
            
            // Find the child_space for this child at the new home
            const { data: newChildSpace, error: csError } = await supabase
                .from("child_spaces")
                .select("id")
                .eq("home_id", newLocation.homeId)
                .eq("child_id", currentChildSpace.child_id)
                .single();
            
            console.log("🏠 New child_space lookup:", { newChildSpace, csError });
            
            if (!newChildSpace) {
                console.error("❌ Could not find child_space for new home");
                return;
            }
            
            console.log("🏠 Moving item to child_space:", newChildSpace.id);
            
            // Update the item's child_space_id
            const { error: updateError } = await supabase
                .from("items")
                .update({ child_space_id: newChildSpace.id })
                .eq("id", itemId);
            
            if (updateError) {
                console.error("❌ Error updating item location:", updateError);
                return;
            }
            
            console.log("✅ Item location updated successfully");
            
            // Update local state
            setItems(prev => prev.map(i =>
                i.id === itemId
                    ? {
                        ...i,
                        childSpaceId: newChildSpace.id,
                        locationHomeId: newLocation.homeId || null,
                        isMissing: false,
                        status: "at_home" as const
                    }
                    : i
            ));
        }
    };

    // V1: updateItemRequested - maps to requestItem in V2
    const updateItemRequested = (itemId: string, requested: boolean) => {
        requestItem(itemId, requested);
    };

    // V1: updateItemPacked - maps to packItem in V2
    const updateItemPacked = (itemId: string, packed: boolean) => {
        packItem(itemId, packed);
    };

    // V1: updateItemName
    const updateItemName = async (itemId: string, newName: string) => {
        await updateItem(itemId, { name: newName });
    };

    // V1: updateItemNotes
    const updateItemNotes = async (itemId: string, notes: string) => {
        await updateItem(itemId, { notes });
    };

    // V1: updateItemCategory
    const updateItemCategory = async (itemId: string, category: string) => {
        await updateItem(itemId, { category });
    };

    // V1: updateItemPhoto
    const updateItemPhoto = async (itemId: string, photoUrl: string | null) => {
        await updateItem(itemId, { photoUrl: photoUrl || undefined });
    };

    // V1: markItemFound
    const markItemFound = (itemId: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, isMissing: false, status: "at_home" as const }
                : item
        ));

        supabase
            .from("items")
            .update({ status: "at_home" })
            .eq("id", itemId);
    };

    // V1: missing messages (not used in V2, but needed for compatibility)
    const missingMessages: any[] = [];
    const addMissingMessage = (_message: { itemId: string; authorCaregiverId: string; text: string }) => {
        // No-op in V2
    };
    const getMissingMessagesForItem = (_itemId: string) => [];

    return (
        <ItemsContext.Provider
            value={{
                items,
                isLoaded,
                refetchItems: fetchItems,
                addItem,
                updateItem,
                deleteItem,
                updateItemStatus,
                moveItemToChildSpace,
                requestItem,
                packItem,
                cancelItemRequest,
                confirmRemoveFromBag,
                keepInBag,
                getItemsByChildSpace,
                getItemsByStatus,
                getItemsOriginatedByUser,
                // Transfer requests
                transferRequests,
                createTransferRequest,
                respondToTransferRequest,
                completeTransferRequest,
                cancelTransferRequest,
                getTransferRequestsForItem,
                getPendingTransferRequests,
                // V1 compatibility
                updateItemLocation,
                updateItemRequested,
                updateItemPacked,
                updateItemName,
                updateItemNotes,
                updateItemCategory,
                updateItemPhoto,
                markItemFound,
                missingMessages,
                addMissingMessage,
                getMissingMessagesForItem,
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
