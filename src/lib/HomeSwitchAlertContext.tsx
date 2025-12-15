"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import { useAppState } from "./AppStateContext";

// Alert data structure for home switch
export interface HomeSwitchAlert {
    id: string;
    childName: string;
    fromHomeName: string;
    toHomeName: string;
    toHomeId: string;
    movedCount: number;
    timestamp: number;
    isOwnAction: boolean; // True if current user triggered the switch
}

interface HomeSwitchAlertContextType {
    alerts: HomeSwitchAlert[];
    dismissAlert: (id: string) => void;
    // Called by the user who initiates the switch to show their own alert
    showLocalAlert: (alert: Omit<HomeSwitchAlert, "id" | "timestamp" | "isOwnAction">) => void;
}

const HomeSwitchAlertContext = createContext<HomeSwitchAlertContextType | undefined>(undefined);

// Auto-dismiss timeout (5 seconds)
const AUTO_DISMISS_MS = 5000;

export function HomeSwitchAlertProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { child, homes, currentHomeId, isLoaded: appStateLoaded } = useAppState();

    const [alerts, setAlerts] = useState<HomeSwitchAlert[]>([]);
    const dismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Track the last known home to detect changes from realtime
    const lastKnownHomeId = useRef<string | null>(null);
    // Track if we just triggered a switch ourselves (to avoid duplicate alerts)
    const justSwitchedLocally = useRef<boolean>(false);
    // Track if we just received a broadcast alert (to avoid duplicate from DB subscription)
    const justReceivedBroadcast = useRef<boolean>(false);

    // Get home name by ID
    const getHomeName = useCallback((homeId: string): string => {
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

    // Broadcast channel for sharing alert data with other caregivers
    const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Show a local alert (called by the user who triggered the switch)
    const showLocalAlert = useCallback((alertData: Omit<HomeSwitchAlert, "id" | "timestamp" | "isOwnAction">) => {
        // Mark that we just switched locally to avoid duplicate from realtime
        justSwitchedLocally.current = true;
        setTimeout(() => {
            justSwitchedLocally.current = false;
        }, 2000); // Reset after 2 seconds

        const newAlert: HomeSwitchAlert = {
            ...alertData,
            id: `home-switch-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestamp: Date.now(),
            isOwnAction: true,
        };

        setAlerts(prev => [...prev, newAlert]);
        scheduleAutoDismiss(newAlert.id);

        // Broadcast the alert to other caregivers so they see the moved items count
        if (broadcastChannelRef.current) {
            broadcastChannelRef.current.send({
                type: "broadcast",
                event: "home-switch-alert",
                payload: {
                    childName: alertData.childName,
                    fromHomeName: alertData.fromHomeName,
                    toHomeName: alertData.toHomeName,
                    toHomeId: alertData.toHomeId,
                    movedCount: alertData.movedCount,
                },
            });
        }
    }, [scheduleAutoDismiss]);

    // Initialize lastKnownHomeId when app state loads
    useEffect(() => {
        if (appStateLoaded && currentHomeId && lastKnownHomeId.current === null) {
            lastKnownHomeId.current = currentHomeId;
        }
    }, [appStateLoaded, currentHomeId]);

    // Set up broadcast channel for sharing alerts between caregivers
    useEffect(() => {
        if (!child?.id) return;

        const broadcastChannelName = `home-switch-broadcast-${child.id}`;
        console.log("[HomeSwitchAlert] Setting up broadcast channel:", broadcastChannelName);

        const broadcastChannel = supabase
            .channel(broadcastChannelName)
            .on("broadcast", { event: "home-switch-alert" }, (payload) => {
                console.log("[HomeSwitchAlert] Received broadcast alert:", payload);
                
                // Skip if we just triggered this switch ourselves
                if (justSwitchedLocally.current) {
                    console.log("[HomeSwitchAlert] Skipping broadcast - triggered locally");
                    return;
                }

                const data = payload.payload as any;
                const newAlert: HomeSwitchAlert = {
                    id: `home-switch-broadcast-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    childName: data.childName,
                    fromHomeName: data.fromHomeName,
                    toHomeName: data.toHomeName,
                    toHomeId: data.toHomeId,
                    movedCount: data.movedCount || 0,
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
                console.log("[HomeSwitchAlert] Broadcast channel status:", status);
            });

        broadcastChannelRef.current = broadcastChannel;

        return () => {
            supabase.removeChannel(broadcastChannel);
            broadcastChannelRef.current = null;
        };
    }, [child?.id, scheduleAutoDismiss]);

    // Set up realtime subscription for children table (to detect home switches)
    // This is a fallback in case the broadcast doesn't arrive
    useEffect(() => {
        if (!user || !child?.id) return;

        console.log("[HomeSwitchAlert] Setting up DB subscription for:", {
            userId: user.id,
            childId: child.id,
            childName: child.name
        });

        const channelName = `home-switch-db-${child.id}-${Date.now()}`;

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "children",
                    filter: `id=eq.${child.id}`,
                },
                (payload) => {
                    console.log("[HomeSwitchAlert] Received realtime update:", payload);

                    const newData = payload.new as any;
                    const oldData = payload.old as any;
                    const newHomeId = newData?.current_home_id;
                    const oldHomeId = oldData?.current_home_id;
                    
                    console.log("[HomeSwitchAlert] Home change:", { oldHomeId, newHomeId, lastKnown: lastKnownHomeId.current });

                    // Only trigger if current_home_id actually changed
                    // Check both that newHomeId exists AND that it's different from oldHomeId
                    // Also use lastKnownHomeId as fallback if oldHomeId is undefined
                    const previousHomeId = oldHomeId || lastKnownHomeId.current;

                    if (!newHomeId || newHomeId === previousHomeId) {
                        console.log("[HomeSwitchAlert] No home change detected, skipping:", { newHomeId, previousHomeId });
                        return;
                    }

                    // Skip if we just triggered this switch ourselves
                    if (justSwitchedLocally.current) {
                        console.log("[HomeSwitchAlert] Skipping DB alert - triggered locally");
                        // Still update lastKnownHomeId
                        lastKnownHomeId.current = newHomeId;
                        return;
                    }

                    // Skip if we already received a broadcast with the full alert data
                    if (justReceivedBroadcast.current) {
                        console.log("[HomeSwitchAlert] Skipping DB alert - already received broadcast");
                        lastKnownHomeId.current = newHomeId;
                        return;
                    }
                    
                    console.log("[HomeSwitchAlert] Showing fallback alert from DB (broadcast may have failed)");

                    // This is a switch from another user - show alert
                    const fromHomeName = getHomeName(oldHomeId);
                    const toHomeName = getHomeName(newHomeId);
                    const childName = child?.name || "Child";

                    const newAlert: HomeSwitchAlert = {
                        id: `home-switch-remote-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        childName,
                        fromHomeName,
                        toHomeName,
                        toHomeId: newHomeId,
                        movedCount: 0, // We don't know how many items were moved from realtime
                        timestamp: Date.now(),
                        isOwnAction: false,
                    };

                    // Home switch alert: Showing remote alert
                    setAlerts(prev => [...prev, newAlert]);
                    scheduleAutoDismiss(newAlert.id);

                    // Update lastKnownHomeId
                    lastKnownHomeId.current = newHomeId;
                }
            )
            .subscribe((status) => {
                console.log("[HomeSwitchAlert] Subscription status:", status, "for child:", child.id);
            });

        return () => {
            // Removing home switch alert channel
            supabase.removeChannel(channel);
        };
    }, [user, child?.id, child?.name, getHomeName, scheduleAutoDismiss]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            dismissTimers.current.forEach(timer => clearTimeout(timer));
            dismissTimers.current.clear();
        };
    }, []);

    return (
        <HomeSwitchAlertContext.Provider
            value={{
                alerts,
                dismissAlert,
                showLocalAlert,
            }}
        >
            {children}
        </HomeSwitchAlertContext.Provider>
    );
}

export function useHomeSwitchAlert() {
    const context = useContext(HomeSwitchAlertContext);
    if (context === undefined) {
        throw new Error("useHomeSwitchAlert must be used within a HomeSwitchAlertProvider");
    }
    return context;
}
