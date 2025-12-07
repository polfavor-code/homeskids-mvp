"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useItems } from "@/lib/ItemsContext";
import { useContacts } from "@/lib/ContactsContext";
import { useDocuments } from "@/lib/DocumentsContext";
import { useAppState } from "@/lib/AppStateContext";

// Onboarding step definition
interface OnboardingStep {
    id: string;
    label: string;
    description: string;
    ctaLabel: string;
    targetRoute: string;
}

// Define the ordered list of onboarding steps
const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: "add-item",
        label: "Add your first item",
        description: "Create an item so you can track where it is.",
        ctaLabel: "New item",
        targetRoute: "/items/new",
    },
    {
        id: "add-contacts",
        label: "Add important contacts",
        description: "Save school, doctor and emergency contacts.",
        ctaLabel: "Add contacts",
        targetRoute: "/contacts/new",
    },
    {
        id: "upload-document",
        label: "Upload a key document",
        description: "Store passport, medical or school papers.",
        ctaLabel: "Upload document",
        targetRoute: "/documents/ids",
    },
    {
        id: "invite-caregiver",
        label: "Invite a caregiver",
        description: "Share access with the other parent or family.",
        ctaLabel: "Invite caregiver",
        targetRoute: "/settings/caregivers",
    },
];

const DISMISSED_KEY = "homeskids_onboarding_dismissed";
const CURRENT_INDEX_KEY = "homeskids_onboarding_index";

interface SidebarOnboardingCardProps {
    isCollapsed?: boolean;
}

export default function SidebarOnboardingCard({ isCollapsed = false }: SidebarOnboardingCardProps) {
    const { items, isLoaded: itemsLoaded } = useItems();
    const { contacts, isLoaded: contactsLoaded } = useContacts();
    const { documents, isLoaded: documentsLoaded } = useDocuments();
    const { caregivers, isLoaded: appStateLoaded } = useAppState();

    // Track if entire onboarding is dismissed
    const [isDismissed, setIsDismissed] = useState(false);
    // Track current step index (user can navigate freely)
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        try {
            const dismissed = localStorage.getItem(DISMISSED_KEY);
            if (dismissed === "true") {
                setIsDismissed(true);
            }
            const savedIndex = localStorage.getItem(CURRENT_INDEX_KEY);
            if (savedIndex) {
                const idx = parseInt(savedIndex, 10);
                if (!isNaN(idx) && idx >= 0 && idx < ONBOARDING_STEPS.length) {
                    setCurrentIndex(idx);
                }
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        setIsHydrated(true);
    }, []);

    // Save current index to localStorage
    const saveCurrentIndex = (index: number) => {
        try {
            localStorage.setItem(CURRENT_INDEX_KEY, index.toString());
        } catch (e) {
            // Ignore
        }
    };

    // Dismiss entire onboarding
    const dismissOnboarding = () => {
        setIsDismissed(true);
        try {
            localStorage.setItem(DISMISSED_KEY, "true");
        } catch (e) {
            // Ignore
        }
    };

    // Compute completion status for each step
    const stepCompletion = useMemo(() => {
        const otherCaregivers = caregivers.filter(c => !c.isCurrentUser && c.status !== "pending");

        return {
            "add-item": items.length > 0,
            "add-contacts": contacts.length > 0,
            "upload-document": documents.length > 0,
            "invite-caregiver": otherCaregivers.length > 0,
        };
    }, [items, contacts, documents, caregivers]);

    // Count completed and incomplete steps
    const completedCount = Object.values(stepCompletion).filter(Boolean).length;
    const totalSteps = ONBOARDING_STEPS.length;

    // Get incomplete step indices
    const incompleteIndices = useMemo(() => {
        return ONBOARDING_STEPS
            .map((step, idx) => ({ step, idx }))
            .filter(({ step }) => !stepCompletion[step.id as keyof typeof stepCompletion])
            .map(({ idx }) => idx);
    }, [stepCompletion]);

    // Auto-advance to first incomplete step when completion changes
    useEffect(() => {
        if (isHydrated && incompleteIndices.length > 0) {
            // If current step is completed, move to first incomplete
            const currentStep = ONBOARDING_STEPS[currentIndex];
            if (currentStep && stepCompletion[currentStep.id as keyof typeof stepCompletion]) {
                const firstIncomplete = incompleteIndices[0];
                setCurrentIndex(firstIncomplete);
                saveCurrentIndex(firstIncomplete);
            }
        }
    }, [stepCompletion, isHydrated, incompleteIndices, currentIndex]);

    // Navigation handlers
    const goToPrev = () => {
        const newIndex = currentIndex > 0 ? currentIndex - 1 : totalSteps - 1;
        setCurrentIndex(newIndex);
        saveCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const newIndex = currentIndex < totalSteps - 1 ? currentIndex + 1 : 0;
        setCurrentIndex(newIndex);
        saveCurrentIndex(newIndex);
    };

    // Current step
    const currentStep = ONBOARDING_STEPS[currentIndex];
    const isCurrentStepCompleted = currentStep
        ? stepCompletion[currentStep.id as keyof typeof stepCompletion]
        : false;

    // Don't render if:
    // - Not yet hydrated
    // - Data not loaded
    // - All steps completed
    // - User dismissed onboarding
    // - Sidebar is collapsed
    if (!isHydrated) return null;
    if (!itemsLoaded || !contactsLoaded || !documentsLoaded || !appStateLoaded) return null;
    if (completedCount >= totalSteps) return null;
    if (isDismissed) return null;
    if (isCollapsed) return null;

    return (
        <div className={`mt-auto pt-4 pb-2 px-1 ${isCollapsed ? 'hidden' : 'block'}`}>
            {/* Step Count & Progress */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold text-textSub tracking-wider uppercase">
                    Step {currentIndex + 1} of {totalSteps}
                </span>
                <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                    <div
                        className="h-full bg-forest transition-all duration-300 ease-out"
                        style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            {/* Title */}
            <h3 className="font-dmSerif text-[17px] text-forest leading-tight mb-1">
                {currentStep.label}
            </h3>

            {/* Description */}
            <p className="text-[12px] text-textSub leading-relaxed mb-3 line-clamp-2">
                {currentStep.description}
            </p>

            {/* Actions Row */}
            <div className="flex items-center justify-between">
                {!isCurrentStepCompleted ? (
                    <Link
                        href={currentStep.targetRoute}
                        className="text-[12px] font-bold text-forest hover:text-forest/80 transition-colors flex items-center gap-1 underline underline-offset-4"
                    >
                        {currentStep.ctaLabel} <span className="text-[10px]">→</span>
                    </Link>
                ) : (
                    <div className="flex items-center gap-1 text-[12px] font-bold text-forest">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.78 5.28a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L4.22 8.34a.75.75 0 1 1 1.06-1.06l1.72 1.72 3.72-3.72a.75.75 0 0 1 1.06 0z" />
                        </svg>
                        Done
                    </div>
                )}

                <button
                    onClick={goToNext}
                    className="text-[11px] text-textSub hover:text-forest transition-colors"
                >
                    Skip
                </button>
            </div>
        </div>
    );
}
