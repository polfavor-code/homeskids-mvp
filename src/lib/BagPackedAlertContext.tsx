"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import { useAppState } from "./AppStateContext";

// Alert data structure for bag packed
export interface BagPackedAlert {
    id: string;
    bagId: string;
    fromHomeName: string;
    toHomeName: string;
    packedByName: string;
    timestamp: number;
    isOwnAction: boolean; // True if current user packed the bag
}

interface BagPackedAlertContextType {
    alerts: BagPackedAlert[];
    dismissAlert: (id: string) => void;
    // Called by the user who packs the bag to show their own alert and broadcast
    showLocalAlert: (alert: Omit<BagPackedAlert, "id" | "timestamp" | "isOwnAction">) => void;
}

const BagPackedAlertContext = createContext<BagPackedAlertContextType | undefined>(undefined);

// Auto-dismiss timeout (5 seconds)
const AUTO_DISMISS_MS = 5000;

export function BagPackedAlertProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { homes, currentChildId } = useAppState();

    const [alerts, setAlerts] = useState<BagPackedAlert[]>([]);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const dismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Track if we just triggered a pack ourselves (to avoid duplicate alerts)
    const justPackedLocally = useRef<boolean>(false);
    // Track if we just received a broadcast alert (to avoid duplicate from DB subscription)
    const justReceivedBroadcast = useRef<boolean>(false);

    // Broadcast channel ref
    const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Get family ID on mount
    useEffect(() => {
        async function loadFamilyId() {
            if (!user) {
                setFamilyId(null);
                return;
            }

            try {
                const { data: memberData } = await supabase
                    .from("family_members")
                    .select("family_id")
                    .eq("user_id", user.id)
                    .single();

                if (memberData) {
                    setFamilyId(memberData.family_id);
                }
            } catch (error) {
                console.error("[BagPackedAlert] Error loading family ID:", error);
            }
        }

        loadFamilyId();
    }, [user]);

    // Get home name by ID
    const getHomeName = useCallback((homeId: string | null): string => {
        if (!homeId) return "a home";
        const home = homes.find(h => h.id === homeId);
        return home?.name || "a home";
    }, [homes]);

    // Dismiss an alert
    const dismissAlert = useCallback((id: string) => {
        const existingTimer = dismissTimers.current.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
            dismissTimers.current.delete(id);
        }
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    // Schedule auto-dismiss for an alert
    const scheduleAutoDismiss = useCallback((id: string) => {
        const existingTimer = dismissTimers.current.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
            dismissAlert(id);
        }, AUTO_DISMISS_MS);

        dismissTimers.current.set(id, timer);
    }, [dismissAlert]);

    // Show a local alert (called by the user who packed the bag)
    const showLocalAlert = useCallback((alertData: Omit<BagPackedAlert, "id" | "timestamp" | "isOwnAction">) => {
        // Mark that we just packed locally to avoid duplicate from realtime
        justPackedLocally.current = true;
        setTimeout(() => {
            justPackedLocally.current = false;
        }, 2000); // Reset after 2 seconds

        const newAlert: BagPackedAlert = {
            ...alertData,
            id: `bag-packed-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestamp: Date.now(),
            isOwnAction: true,
        };

        setAlerts(prev => [...prev, newAlert]);
        scheduleAutoDismiss(newAlert.id);

        // Broadcast the alert to other caregivers
        if (broadcastChannelRef.current) {
            broadcastChannelRef.current.send({
                type: "broadcast",
                event: "bag-packed-alert",
                payload: {
                    bagId: alertData.bagId,
                    fromHomeName: alertData.fromHomeName,
                    toHomeName: alertData.toHomeName,
                    packedByName: alertData.packedByName,
                },
            });
        }
    }, [scheduleAutoDismiss]);

    // Set up broadcast channel for sharing alerts between caregivers
    useEffect(() => {
        if (!familyId) return;

        const broadcastChannelName = `bag-packed-broadcast-${familyId}`;
        console.log("[BagPackedAlert] Setting up broadcast channel:", broadcastChannelName);

        const broadcastChannel = supabase
            .channel(broadcastChannelName)
            .on("broadcast", { event: "bag-packed-alert" }, (payload) => {
                console.log("[BagPackedAlert] Received broadcast alert:", payload);

                // Skip if we just packed this bag ourselves
                if (justPackedLocally.current) {
                    console.log("[BagPackedAlert] Skipping broadcast - packed locally");
                    return;
                }

                const data = payload.payload as any;
                const newAlert: BagPackedAlert = {
                    id: `bag-packed-broadcast-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    bagId: data.bagId,
                    fromHomeName: data.fromHomeName,
                    toHomeName: data.toHomeName,
                    packedByName: data.packedByName,
                    timestamp: Date.now(),
                    isOwnAction: false,
                };

                // Mark that we received a broadcast to skip duplicate from DB subscription
                justReceivedBroadcast.current = true;
                setTimeout(() => {
                    justReceivedBroadcast.current = false;
                }, 2000);

                setAlerts(prev => [...prev, newAlert]);
                scheduleAutoDismiss(newAlert.id);
            })
            .subscribe((status) => {
                console.log("[BagPackedAlert] Broadcast channel status:", status);
            });

        broadcastChannelRef.current = broadcastChannel;

        return () => {
            supabase.removeChannel(broadcastChannel);
            broadcastChannelRef.current = null;
        };
    }, [familyId, scheduleAutoDismiss]);

    // Set up realtime subscription for travel_bags table (fallback)
    useEffect(() => {
        if (!user || !familyId) return;

        const channelName = `bag-packed-db-${familyId}-${Date.now()}`;

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "travel_bags",
                },
                async (payload) => {
                    const newData = payload.new as any;
                    const oldData = payload.old as any;

                    // Only trigger if status changed to "completed"
                    if (newData?.status !== "completed" || oldData?.status === "completed") {
                        return;
                    }

                    // Skip if we just packed this ourselves
                    if (justPackedLocally.current) {
                        console.log("[BagPackedAlert] Skipping DB alert - packed locally");
                        return;
                    }

                    // Skip if we already received a broadcast
                    if (justReceivedBroadcast.current) {
                        console.log("[BagPackedAlert] Skipping DB alert - already received broadcast");
                        return;
                    }

                    console.log("[BagPackedAlert] Showing fallback alert from DB");

                    const fromHomeName = getHomeName(newData.from_home_id);
                    const toHomeName = getHomeName(newData.to_home_id);

                    const newAlert: BagPackedAlert = {
                        id: `bag-packed-remote-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        bagId: newData.id,
                        fromHomeName,
                        toHomeName,
                        packedByName: "Another caregiver", // We don't know who from DB alone
                        timestamp: Date.now(),
                        isOwnAction: false,
                    };

                    setAlerts(prev => [...prev, newAlert]);
                    scheduleAutoDismiss(newAlert.id);
                }
            )
            .subscribe((status) => {
                console.log("[BagPackedAlert] DB subscription status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, familyId, getHomeName, scheduleAutoDismiss]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            dismissTimers.current.forEach(timer => clearTimeout(timer));
            dismissTimers.current.clear();
        };
    }, []);

    return (
        <BagPackedAlertContext.Provider
            value={{
                alerts,
                dismissAlert,
                showLocalAlert,
            }}
        >
            {children}
        </BagPackedAlertContext.Provider>
    );
}

export function useBagPackedAlert() {
    const context = useContext(BagPackedAlertContext);
    if (context === undefined) {
        throw new Error("useBagPackedAlert must be used within a BagPackedAlertProvider");
    }
    return context;
}
