"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import { useAppState } from "./AppStateContext";

// Alert data structure
export interface ItemsAddedAlert {
    id: string;
    homeId: string;
    homeName: string;
    addedByUserId: string;
    addedByDisplayName: string;
    count: number;
    itemIds: string[];
    isOwnItems: boolean; // True if current user added these items
    timestamp: number;
}

interface ItemsAddedAlertContextType {
    alerts: ItemsAddedAlert[];
    dismissAlert: (id: string) => void;
    markHomeItemsAsSeen: (homeId: string) => Promise<void>;
}

const ItemsAddedAlertContext = createContext<ItemsAddedAlertContextType | undefined>(undefined);

// Auto-dismiss timeout (5 seconds, matching existing toast behavior)
const AUTO_DISMISS_MS = 5000;
// Aggregation window - alerts from same user within this time get merged
const AGGREGATION_WINDOW_MS = 10000;

export function ItemsAddedAlertProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { homes, activeHomes, caregivers, isLoaded: appStateLoaded } = useAppState();

    const [alerts, setAlerts] = useState<ItemsAddedAlert[]>([]);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const dismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Get caregiver display name by user ID
    const getCaregiverName = useCallback((userId: string): string => {
        const caregiver = caregivers.find(c => c.id === userId);
        if (caregiver) {
            return caregiver.label || caregiver.name || "Someone";
        }
        return "Someone";
    }, [caregivers]);

    // Get home name by ID
    const getHomeName = useCallback((homeId: string): string => {
        const home = homes.find(h => h.id === homeId);
        return home?.name || "a home";
    }, [homes]);

    // Check if current user has access to a home (for alerts, we show if home is in user's family)
    const hasAccessToHome = useCallback((homeId: string): boolean => {
        if (!user) return false;

        // For alerts: show if the home belongs to any home in the user's family
        // This means if the home exists in our homes array, the user can see alerts for it
        const home = homes.find(h => h.id === homeId);
        return !!home; // If we can see the home in our family's homes list, we have access for alerts
    }, [homes, user]);

    // Get homes user has access to (for realtime subscription filter)
    const getAccessibleHomeIds = useCallback((): string[] => {
        if (!user) return [];
        return homes
            .filter(h => {
                const accessibleIds = h.accessibleCaregiverIds || [];
                return accessibleIds.includes(user.id) || h.ownerCaregiverId === user.id;
            })
            .map(h => h.id);
    }, [homes, user]);

    // Dismiss an alert
    const dismissAlert = useCallback((id: string) => {
        // Clear any existing timer
        const existingTimer = dismissTimers.current.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
            dismissTimers.current.delete(id);
        }

        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    // Schedule auto-dismiss for an alert
    const scheduleAutoDismiss = useCallback((id: string) => {
        // Clear any existing timer
        const existingTimer = dismissTimers.current.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
            dismissAlert(id);
        }, AUTO_DISMISS_MS);

        dismissTimers.current.set(id, timer);
    }, [dismissAlert]);

    // Add or update an alert (handles aggregation)
    const addOrUpdateAlert = useCallback((
        homeId: string,
        addedByUserId: string,
        itemId: string,
        isOwnItems: boolean
    ) => {
        const now = Date.now();

        setAlerts(prev => {
            // Look for existing alert from same user for same home within aggregation window
            const existingIndex = prev.findIndex(a =>
                a.homeId === homeId &&
                a.addedByUserId === addedByUserId &&
                (now - a.timestamp) < AGGREGATION_WINDOW_MS
            );

            if (existingIndex >= 0) {
                // Update existing alert
                const updated = [...prev];
                const existing = updated[existingIndex];

                // Only add item if not already counted
                if (!existing.itemIds.includes(itemId)) {
                    updated[existingIndex] = {
                        ...existing,
                        count: existing.count + 1,
                        itemIds: [...existing.itemIds, itemId],
                        timestamp: now, // Reset timestamp to extend aggregation window
                    };

                    // Reset auto-dismiss timer
                    scheduleAutoDismiss(existing.id);
                }

                return updated;
            } else {
                // Create new alert
                const newAlert: ItemsAddedAlert = {
                    id: `alert-${now}-${Math.random().toString(36).substring(7)}`,
                    homeId,
                    homeName: getHomeName(homeId),
                    addedByUserId,
                    addedByDisplayName: isOwnItems ? "You" : getCaregiverName(addedByUserId),
                    count: 1,
                    itemIds: [itemId],
                    isOwnItems,
                    timestamp: now,
                };

                // Schedule auto-dismiss
                scheduleAutoDismiss(newAlert.id);

                return [...prev, newAlert];
            }
        });
    }, [getHomeName, getCaregiverName, scheduleAutoDismiss]);

    // Mark items as seen for a home (updates last_seen_at)
    const markHomeItemsAsSeen = useCallback(async (homeId: string) => {
        if (!user) return;

        try {
            await supabase
                .from("user_home_item_views")
                .upsert({
                    user_id: user.id,
                    home_id: homeId,
                    last_seen_at: new Date().toISOString(),
                }, {
                    onConflict: "user_id,home_id",
                });

            // Also dismiss any alerts for this home
            setAlerts(prev => prev.filter(a => a.homeId !== homeId));
        } catch (err) {
            console.error("Error marking items as seen:", err);
        }
    }, [user]);

    // Fetch family ID
    useEffect(() => {
        const fetchFamilyId = async () => {
            if (!user) {
                setFamilyId(null);
                return;
            }

            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .limit(1);

            if (familyMember && familyMember.length > 0) {
                setFamilyId(familyMember[0].family_id);
            }
        };

        fetchFamilyId();
    }, [user]);

    // Check for unseen items on load (offline aggregation)
    useEffect(() => {
        const checkUnseenItems = async () => {
            if (!user || !familyId || !appStateLoaded || homes.length === 0) return;

            try {
                const accessibleHomeIds = getAccessibleHomeIds();
                if (accessibleHomeIds.length === 0) return;

                // Get last seen timestamps for user's homes
                const { data: viewData } = await supabase
                    .from("user_home_item_views")
                    .select("home_id, last_seen_at")
                    .eq("user_id", user.id)
                    .in("home_id", accessibleHomeIds);

                const lastSeenMap = new Map<string, Date>();
                if (viewData) {
                    viewData.forEach(v => {
                        lastSeenMap.set(v.home_id, new Date(v.last_seen_at));
                    });
                }

                // For each accessible home, check for items added since last seen
                for (const homeId of accessibleHomeIds) {
                    const lastSeen = lastSeenMap.get(homeId);

                    // Build query for items in this home, created by others, after last seen
                    let query = supabase
                        .from("items")
                        .select("id, created_by, created_at")
                        .eq("location_home_id", homeId)
                        .neq("created_by", user.id)
                        .not("created_by", "is", null);

                    if (lastSeen) {
                        query = query.gt("created_at", lastSeen.toISOString());
                    }

                    const { data: unseenItems } = await query;

                    if (unseenItems && unseenItems.length > 0) {
                        // Group by creator
                        const byCreator = new Map<string, string[]>();
                        unseenItems.forEach(item => {
                            const creatorId = item.created_by;
                            if (!byCreator.has(creatorId)) {
                                byCreator.set(creatorId, []);
                            }
                            byCreator.get(creatorId)!.push(item.id);
                        });

                        // Create alert(s)
                        if (byCreator.size === 1) {
                            // All from one person
                            const entries = Array.from(byCreator.entries());
                            const [creatorId, itemIds] = entries[0];
                            const newAlert: ItemsAddedAlert = {
                                id: `offline-${homeId}-${Date.now()}`,
                                homeId,
                                homeName: getHomeName(homeId),
                                addedByUserId: creatorId,
                                addedByDisplayName: getCaregiverName(creatorId),
                                count: itemIds.length,
                                itemIds,
                                isOwnItems: false,
                                timestamp: Date.now(),
                            };
                            setAlerts(prev => [...prev, newAlert]);
                            scheduleAutoDismiss(newAlert.id);
                        } else {
                            // Multiple people - use generic message
                            const allItemIds = unseenItems.map(i => i.id);
                            const newAlert: ItemsAddedAlert = {
                                id: `offline-${homeId}-${Date.now()}`,
                                homeId,
                                homeName: getHomeName(homeId),
                                addedByUserId: "multiple",
                                addedByDisplayName: "Caregivers",
                                count: allItemIds.length,
                                itemIds: allItemIds,
                                isOwnItems: false,
                                timestamp: Date.now(),
                            };
                            setAlerts(prev => [...prev, newAlert]);
                            scheduleAutoDismiss(newAlert.id);
                        }
                    }
                }
            } catch (err) {
                console.error("Error checking unseen items:", err);
            }
        };

        // Small delay to ensure app state is fully loaded
        const timer = setTimeout(checkUnseenItems, 1000);
        return () => clearTimeout(timer);
    }, [user, familyId, appStateLoaded, homes, getAccessibleHomeIds, getHomeName, getCaregiverName, scheduleAutoDismiss]);

    // Set up realtime subscription for INSERT events on items table
    useEffect(() => {
        if (!familyId || !user) return;

        console.log("Setting up items alert subscription for family:", familyId);

        const channelName = `items-alerts-${familyId}-${Date.now()}`;

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "items",
                    filter: `family_id=eq.${familyId}`,
                },
                (payload) => {
                    console.log("Items alert: New item inserted:", payload);

                    const newItem = payload.new as any;
                    const homeId = newItem.location_home_id;
                    const createdBy = newItem.created_by;

                    console.log("Items alert: homeId=", homeId, "createdBy=", createdBy, "user.id=", user.id);

                    // Skip if no home ID or no creator
                    if (!homeId || !createdBy) {
                        console.log("Items alert: Skipping - no homeId or createdBy");
                        return;
                    }

                    // Check if user has access to this home
                    const hasAccess = hasAccessToHome(homeId);
                    console.log("Items alert: hasAccessToHome=", hasAccess, "homes=", homes.map(h => ({ id: h.id, name: h.name, accessibleCaregiverIds: h.accessibleCaregiverIds, ownerCaregiverId: h.ownerCaregiverId })));

                    if (!hasAccess) {
                        console.log("Items alert: Skipping - user has no access to home");
                        return;
                    }

                    // Determine if this is the current user's own item
                    const isOwnItem = createdBy === user.id;
                    console.log("Items alert: isOwnItem=", isOwnItem, "showing alert!");

                    // Add alert
                    addOrUpdateAlert(homeId, createdBy, newItem.id, isOwnItem);
                }
            )
            .subscribe((status) => {
                console.log("Items alert subscription status:", status);
            });

        return () => {
            console.log("Removing items alert channel:", channelName);
            supabase.removeChannel(channel);
        };
    }, [familyId, user, hasAccessToHome, addOrUpdateAlert]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            dismissTimers.current.forEach(timer => clearTimeout(timer));
            dismissTimers.current.clear();
        };
    }, []);

    return (
        <ItemsAddedAlertContext.Provider
            value={{
                alerts,
                dismissAlert,
                markHomeItemsAsSeen,
            }}
        >
            {children}
        </ItemsAddedAlertContext.Provider>
    );
}

export function useItemsAddedAlert() {
    const context = useContext(ItemsAddedAlertContext);
    if (context === undefined) {
        throw new Error("useItemsAddedAlert must be used within an ItemsAddedAlertProvider");
    }
    return context;
}
