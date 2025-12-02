"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MOCK_CAREGIVERS, MOCK_CHILD } from "@/lib/mockData";

export type ChildProfile = {
    id: string;
    name: string;
    avatarInitials: string;
};

export type CaregiverProfile = {
    id: string;
    name: string;
    label: string;
    avatarInitials: string;
    avatarColor: string;
};

interface AppStateContextType {
    child: ChildProfile;
    caregivers: CaregiverProfile[];
    currentJuneCaregiverId: string;
    onboardingCompleted: boolean;
    setChild: (child: ChildProfile) => void;
    setCaregivers: (caregivers: CaregiverProfile[]) => void;
    setCurrentJuneCaregiverId: (id: string) => void;
    setOnboardingCompleted: (completed: boolean) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
    // Initialize with mock data
    const [child, setChild] = useState<ChildProfile>(MOCK_CHILD);
    const [caregivers, setCaregivers] = useState<CaregiverProfile[]>(MOCK_CAREGIVERS);
    const [currentJuneCaregiverId, setCurrentJuneCaregiverId] = useState<string>(
        MOCK_CAREGIVERS[0].id
    );
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem("homeskids_app_state_v1");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.child) setChild(parsed.child);
                if (parsed.caregivers) setCaregivers(parsed.caregivers);
                if (parsed.currentJuneCaregiverId) setCurrentJuneCaregiverId(parsed.currentJuneCaregiverId);
                if (parsed.onboardingCompleted !== undefined) setOnboardingCompleted(parsed.onboardingCompleted);
            }
        } catch (error) {
            console.error("Failed to load app state:", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (!isLoaded) return;
        try {
            const stateToSave = {
                child,
                caregivers,
                currentJuneCaregiverId,
                onboardingCompleted,
            };
            localStorage.setItem("homeskids_app_state_v1", JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save app state:", error);
        }
    }, [child, caregivers, currentJuneCaregiverId, onboardingCompleted, isLoaded]);

    return (
        <AppStateContext.Provider
            value={{
                child,
                caregivers,
                currentJuneCaregiverId,
                onboardingCompleted,
                setChild,
                setCaregivers,
                setCurrentJuneCaregiverId,
                setOnboardingCompleted,
            }}
        >
            {children}
        </AppStateContext.Provider>
    );
}

export function useAppState() {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error("useAppState must be used within an AppStateProvider");
    }
    return context;
}
