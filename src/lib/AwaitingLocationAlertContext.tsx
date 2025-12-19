"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import { useAppState } from "./AppStateContext";

// Alert data structure for awaiting location notifications
export interface AwaitingLocationAlert {
    id: string;
    itemId: string;
    itemName: string;
    markedByUserId: string;
    markedByFirstName: string;
    childId: string;
    timestamp: number;
}

interface AwaitingLocationAlertContextType {
    alerts: AwaitingLocationAlert[];
    dismissAlert: (id: string) => void;
}

const AwaitingLocationAlertContext = createContext<AwaitingLocationAlertContextType | undefined>(undefined);

// Auto-dismiss timeout (5 seconds)
const AUTO_DISMISS_MS = 5000;

export function AwaitingLocationAlertProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { currentChildId, caregivers, isLoaded: appStateLoaded } = useAppState();

    const [alerts, setAlerts] = useState<AwaitingLocationAlert[]>([]);
    const dismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
    // Track which items we've already shown alerts for (to avoid duplicates)
    const alertedItemsRef = useRef<Set<string>>(new Set());

    // Get caregiver first name by user ID
    const getCaregiverFirstName = useCallback((userId: string): string => {
        const caregiver = caregivers.find(c => c.id === userId);
        if (caregiver) {
            // Get first name from label or name
            const displayName = caregiver.label || caregiver.name || "Someone";
            return displayName.split(" ")[0]; // Get first name only
        }
        return "Someone";
    }, [caregivers]);

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

    // Add an alert
    const addAlert = useCallback((
        itemId: string,
        itemName: string,
        markedByUserId: string,
        childId: string
    ) => {
        // Don't alert for own actions
        if (markedByUserId === user?.id) return;

        // Don't alert if we've already alerted for this item recently
        const alertKey = `${itemId}-${Date.now()}`;
        if (alertedItemsRef.current.has(itemId)) {
            return;
        }

        // Mark as alerted (will be cleared after 30 seconds to allow re-alerts if item changes again)
        alertedItemsRef.current.add(itemId);
        setTimeout(() => {
            alertedItemsRef.current.delete(itemId);
        }, 30000);

        const now = Date.now();
        const newAlert: AwaitingLocationAlert = {
            id: `awaiting-${alertKey}`,
            itemId,
            itemName,
            markedByUserId,
            markedByFirstName: getCaregiverFirstName(markedByUserId),
            childId,
            timestamp: now,
        };

        setAlerts(prev => [...prev, newAlert]);
        scheduleAutoDismiss(newAlert.id);
    }, [user?.id, getCaregiverFirstName, scheduleAutoDismiss]);

    // Listen for broadcast events for awaiting location
    useEffect(() => {
        if (!currentChildId || !user) return;

        const broadcastChannelName = `awaiting-location-${currentChildId}`;
        console.log("[AwaitingLocation] Setting up broadcast channel:", broadcastChannelName);

        const broadcastChannel = supabase
            .channel(broadcastChannelName)
            .on("broadcast", { event: "item-awaiting-location" }, (payload) => {
                console.log("[AwaitingLocation] Received broadcast:", payload);
                const { itemId, itemName, markedByUserId, childId } = payload.payload;
                
                if (childId === currentChildId) {
                    addAlert(itemId, itemName, markedByUserId, childId);
                }
            })
            .subscribe((status) => {
                console.log("[AwaitingLocation] Broadcast channel status:", status);
            });

        return () => {
            supabase.removeChannel(broadcastChannel);
        };
    }, [currentChildId, user, addAlert]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            dismissTimers.current.forEach(timer => clearTimeout(timer));
            dismissTimers.current.clear();
        };
    }, []);

    return (
        <AwaitingLocationAlertContext.Provider
            value={{
                alerts,
                dismissAlert,
            }}
        >
            {children}
        </AwaitingLocationAlertContext.Provider>
    );
}

export function useAwaitingLocationAlert() {
    const context = useContext(AwaitingLocationAlertContext);
    if (context === undefined) {
        throw new Error("useAwaitingLocationAlert must be used within an AwaitingLocationAlertProvider");
    }
    return context;
}
