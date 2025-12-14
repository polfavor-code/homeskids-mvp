"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import { useAppState } from "./AppStateContextV2";

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
    const [familyId, setFamilyId] = useState<string | null>(null);
    const dismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Track the last known home to detect changes from realtime
    const lastKnownHomeId = useRef<string | null>(null);
    // Track if we just triggered a switch ourselves (to avoid duplicate alerts)
    const justSwitchedLocally = useRef<boolean>(false);

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
    }, [scheduleAutoDismiss]);

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

    // Initialize lastKnownHomeId when app state loads
    useEffect(() => {
        if (appStateLoaded && currentHomeId && lastKnownHomeId.current === null) {
            lastKnownHomeId.current = currentHomeId;
        }
    }, [appStateLoaded, currentHomeId]);

    // Set up realtime subscription for children table (to detect home switches)
    useEffect(() => {
        if (!familyId || !user || !child?.id) return;

        console.log("Setting up home switch alert subscription for child:", child.id);

        const channelName = `home-switch-${child.id}-${Date.now()}`;

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
                    console.log("Home switch alert: Child updated:", payload);

                    const newData = payload.new as any;
                    const oldData = payload.old as any;
                    const newHomeId = newData?.current_home_id;
                    const oldHomeId = oldData?.current_home_id;

                    // Only trigger if current_home_id actually changed
                    // Check both that newHomeId exists AND that it's different from oldHomeId
                    // Also use lastKnownHomeId as fallback if oldHomeId is undefined
                    const previousHomeId = oldHomeId || lastKnownHomeId.current;

                    if (!newHomeId || newHomeId === previousHomeId) {
                        console.log("Home switch alert: No home change detected, skipping", { newHomeId, previousHomeId, oldHomeId });
                        return;
                    }

                    // Skip if we just triggered this switch ourselves
                    if (justSwitchedLocally.current) {
                        console.log("Home switch alert: Skipping - triggered locally");
                        // Still update lastKnownHomeId
                        lastKnownHomeId.current = newHomeId;
                        return;
                    }

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

                    console.log("Home switch alert: Showing remote alert", newAlert);
                    setAlerts(prev => [...prev, newAlert]);
                    scheduleAutoDismiss(newAlert.id);

                    // Update lastKnownHomeId
                    lastKnownHomeId.current = newHomeId;
                }
            )
            .subscribe((status) => {
                console.log("Home switch alert subscription status:", status);
            });

        return () => {
            console.log("Removing home switch alert channel:", channelName);
            supabase.removeChannel(channel);
        };
    }, [familyId, user, child?.id, child?.name, getHomeName, scheduleAutoDismiss]);

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
