"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

// Alert data structure for document added
export interface DocumentAddedAlert {
    id: string;
    documentName: string;
    documentCategory: string;
    addedByName: string;
    timestamp: number;
    isOwnAction: boolean;
}

interface DocumentAddedAlertContextType {
    alerts: DocumentAddedAlert[];
    dismissAlert: (id: string) => void;
    showLocalAlert: (alert: Omit<DocumentAddedAlert, "id" | "timestamp" | "isOwnAction">) => void;
}

const DocumentAddedAlertContext = createContext<DocumentAddedAlertContextType | undefined>(undefined);

// Auto-dismiss timeout (5 seconds)
const AUTO_DISMISS_MS = 5000;

export function DocumentAddedAlertProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    const [alerts, setAlerts] = useState<DocumentAddedAlert[]>([]);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const dismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Track documents we just added ourselves (to avoid duplicate alerts)
    const recentlyAddedDocIds = useRef<Set<string>>(new Set());

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

    // Show a local alert (called by the user who added the document)
    const showLocalAlert = useCallback((alertData: Omit<DocumentAddedAlert, "id" | "timestamp" | "isOwnAction">) => {
        const newAlert: DocumentAddedAlert = {
            ...alertData,
            id: `doc-added-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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

    // Set up realtime subscription for documents table
    useEffect(() => {
        if (!familyId || !user) return;

        console.log("Setting up document added alert subscription for family:", familyId);

        const channelName = `doc-added-${familyId}-${Date.now()}`;

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "documents",
                    filter: `family_id=eq.${familyId}`,
                },
                async (payload) => {
                    console.log("Document added alert: New document inserted:", payload);

                    const newData = payload.new as any;
                    const documentId = newData?.id;
                    const documentName = newData?.name || "Document";
                    const documentCategory = newData?.category || "other";
                    const createdBy = newData?.created_by;

                    // Skip if we just added this document ourselves
                    if (recentlyAddedDocIds.current.has(documentId)) {
                        console.log("Document added alert: Skipping - added by current user");
                        recentlyAddedDocIds.current.delete(documentId);
                        return;
                    }

                    // Skip if the document was created by current user
                    if (createdBy === user.id) {
                        console.log("Document added alert: Skipping - created_by matches current user");
                        return;
                    }

                    // Get the name of the user who added the document
                    let addedByName = "Someone";
                    if (createdBy) {
                        const { data: profile } = await supabase
                            .from("profiles")
                            .select("name, label")
                            .eq("id", createdBy)
                            .single();

                        if (profile) {
                            addedByName = profile.label || profile.name || "Someone";
                        }
                    }

                    const newAlert: DocumentAddedAlert = {
                        id: `doc-added-remote-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        documentName,
                        documentCategory,
                        addedByName,
                        timestamp: Date.now(),
                        isOwnAction: false,
                    };

                    console.log("Document added alert: Showing remote alert", newAlert);
                    setAlerts(prev => [...prev, newAlert]);
                    scheduleAutoDismiss(newAlert.id);
                }
            )
            .subscribe((status) => {
                console.log("Document added alert subscription status:", status);
            });

        return () => {
            console.log("Removing document added alert channel:", channelName);
            supabase.removeChannel(channel);
        };
    }, [familyId, user, scheduleAutoDismiss]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            dismissTimers.current.forEach(timer => clearTimeout(timer));
            dismissTimers.current.clear();
        };
    }, []);

    return (
        <DocumentAddedAlertContext.Provider
            value={{
                alerts,
                dismissAlert,
                showLocalAlert,
            }}
        >
            {children}
        </DocumentAddedAlertContext.Provider>
    );
}

export function useDocumentAddedAlert() {
    const context = useContext(DocumentAddedAlertContext);
    if (context === undefined) {
        throw new Error("useDocumentAddedAlert must be used within a DocumentAddedAlertProvider");
    }
    return context;
}
