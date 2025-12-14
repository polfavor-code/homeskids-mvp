"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChildProfile, CaregiverProfile } from "@/lib/AppStateContext";
import { Item } from "@/lib/mockData";
import { ToastData } from "@/components/Toast";
import { HealthStatus } from "@/lib/HealthContext";

interface Step {
    id: string;
    title: string;
    description: string;
    primaryAction: {
        label: string;
        href: string;
    };
    secondaryAction?: {
        label: string;
        onClick: () => Promise<void>;
    };
    // For health step, we may show it as "seen but skipped" vs "done"
    isMuted?: boolean;
}

interface SetupStepsProps {
    child: ChildProfile | null;
    items: Item[];
    caregivers: CaregiverProfile[];
    // New 3-state health model
    healthStatus: HealthStatus;
    isHealthReviewed: boolean;
    isAllSkipped: boolean;
    healthLoaded: boolean;
    skipAllHealthForNow: (overrideChildId?: string, overrideFamilyId?: string) => Promise<{ success: boolean; error?: string }>;
    addToast: (toast: Omit<ToastData, "id">) => void;
}

export default function SetupSteps({
    child,
    items,
    caregivers,
    healthStatus,
    isHealthReviewed,
    isAllSkipped,
    healthLoaded,
    skipAllHealthForNow,
    addToast,
}: SetupStepsProps) {
    const [skippingHealth, setSkippingHealth] = useState(false);

    // Calculate which steps are incomplete
    const steps = useMemo(() => {
        const incompleteSteps: Step[] = [];

        // Step 1: Add items (complete if has at least 1 item)
        if (items.length === 0) {
            incompleteSteps.push({
                id: "items",
                title: "Add your first item",
                description: "Track belongings like clothes, toys, or school supplies.",
                primaryAction: {
                    label: "Add item",
                    href: "/items/new",
                },
            });
        }

        // Step 2: Health information
        // Show as incomplete if health has not been reviewed at all
        // Show as "muted complete" if everything was skipped
        // Show as "done" if any category is 'none' or 'has'
        if (!isHealthReviewed && healthLoaded) {
            incompleteSteps.push({
                id: "health",
                title: "Review health details",
                description: "Add allergies, dietary needs and medication, or confirm none for now.",
                primaryAction: {
                    label: "Review health details",
                    href: "/health",
                },
                secondaryAction: {
                    label: "Skip for now",
                    onClick: async () => {
                        if (!child?.id || !child?.familyId) {
                            addToast({
                                title: "Error",
                                type: "error",
                                message: "No child found. Please refresh the page.",
                            });
                            return;
                        }
                        setSkippingHealth(true);
                        try {
                            const result = await skipAllHealthForNow(child.id, child.familyId);
                            if (!result.success) {
                                addToast({
                                    title: "Error",
                                    type: "error",
                                    message: result.error || "Failed to save. Please try again.",
                                });
                            }
                        } catch (err) {
                            console.error("Error skipping health:", err);
                            addToast({
                                title: "Error",
                                type: "error",
                                message: "Something went wrong. Please try again.",
                            });
                        }
                        setSkippingHealth(false);
                    },
                },
            });
        } else if (isAllSkipped && healthLoaded) {
            // Health was reviewed but all skipped - show as muted/incomplete
            incompleteSteps.push({
                id: "health",
                title: "Review health details",
                description: "You skipped health info. Add details when ready.",
                primaryAction: {
                    label: "Review health details",
                    href: "/health",
                },
                isMuted: true,
            });
        }

        // Step 3: Invite caregivers (complete if has more than 1 caregiver)
        const activeCaregivers = caregivers.filter(c => c.status === "active" || c.status === "pending");
        if (activeCaregivers.length <= 1) {
            incompleteSteps.push({
                id: "caregivers",
                title: "Invite a caregiver",
                description: "Add another parent, grandparent, or babysitter to share access.",
                primaryAction: {
                    label: "Invite caregiver",
                    href: "/settings/caregivers",
                },
            });
        }

        return incompleteSteps;
    }, [items.length, isHealthReviewed, isAllSkipped, healthLoaded, caregivers, child, skipAllHealthForNow, addToast]);

    // Calculate progress
    // Total steps: items, health, caregivers = 3
    // But health "skipped" counts as partial/seen
    const totalSteps = 3;

    // Calculate completed steps (excluding muted ones)
    const completedSteps = totalSteps - steps.filter(s => !s.isMuted).length;

    // If all skipped health, show partial progress (count as seen but not done)
    const progressPercent = isAllSkipped
        ? ((completedSteps + 0.5) / totalSteps) * 100 // Partial credit for skipped health
        : (completedSteps / totalSteps) * 100;

    // Don't show if all steps complete (including no muted steps)
    if (steps.length === 0) {
        return null;
    }

    // Show the first incomplete step (prioritize non-muted steps)
    const nonMutedSteps = steps.filter(s => !s.isMuted);
    const currentStep = nonMutedSteps.length > 0 ? nonMutedSteps[0] : steps[0];
    const stepNumber = completedSteps + 1;

    return (
        <div className="mt-auto pt-5 border-t border-[#EBE6DC]">
            {/* Progress indicator */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] text-textSub font-bold tracking-[0.1em] uppercase whitespace-nowrap">
                    STEP {stepNumber} OF {totalSteps}
                </span>
                <div className="flex-1 h-1 bg-[#EBE6DC] rounded-full">
                    <div
                        className="h-full bg-forest rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Content - mobile stacked, desktop side-by-side */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                {/* Text */}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-dmSerif text-lg sm:text-[22px] m-0 leading-tight ${currentStep.isMuted ? 'text-textSub' : 'text-forest'}`}>
                        {currentStep.title}
                    </h3>
                    <p className="text-sm text-textSub m-0 mt-0.5">
                        {currentStep.description}
                    </p>
                </div>

                {/* Actions - inline on mobile */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <Link
                        href={currentStep.primaryAction.href}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                            currentStep.isMuted
                                ? 'bg-cream border border-border text-forest hover:bg-white'
                                : 'bg-forest text-white hover:bg-forest/90'
                        }`}
                    >
                        {currentStep.primaryAction.label}
                    </Link>
                    {currentStep.secondaryAction && (
                        <button
                            type="button"
                            onClick={currentStep.secondaryAction.onClick}
                            disabled={skippingHealth}
                            className="text-textSub text-sm cursor-pointer hover:text-forest disabled:opacity-50 whitespace-nowrap underline underline-offset-2"
                        >
                            {currentStep.id === "health" && skippingHealth
                                ? "Saving..."
                                : currentStep.secondaryAction.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
