"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useHealth, DietType, HealthStatusValue } from "@/lib/HealthContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { HealthIcon, AllergyIcon, MedicationIcon } from "@/components/icons/DuotoneIcons";
import { getStatusSummaryText, HealthCategory } from "@/components/health/HealthStatusCard";

// Emoji map for allergy categories
const allergyEmoji: Record<string, string> = {
    food: "🍽️",
    medication: "💊",
    environmental: "🌿",
    other: "⚠️",
};

// Diet type labels
const dietTypeLabels: Record<DietType, string> = {
    "": "",
    "vegetarian": "Vegetarian",
    "vegan": "Vegan",
    "pescatarian": "Pescatarian",
    "dairy-free": "Dairy-free",
    "gluten-free": "Gluten-free",
    "halal": "Halal",
    "kosher": "Kosher",
    "other": "Special diet",
};

export default function HealthPage() {
    useEnsureOnboarding();
    const { child } = useAppState();
    const {
        healthStatus,
        allergies,
        medications,
        dietaryNeeds,
        isLoaded,
        hasAnyHealthData,
        updateHealthStatus,
    } = useHealth();
    const childName = child?.name || "your child";
    const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);

    // Get severity badge colors
    const getSeverityStyle = (severity: string) => {
        switch (severity) {
            case "severe":
                return "bg-red-200 text-red-800";
            case "moderate":
                return "bg-amber-200 text-amber-800";
            default:
                return "bg-green-200 text-green-800";
        }
    };

    const getSeverityBg = (severity: string) => {
        switch (severity) {
            case "severe":
                return "bg-red-50 border-red-100";
            case "moderate":
                return "bg-amber-50 border-amber-100";
            default:
                return "bg-green-50 border-green-100";
        }
    };

    // Filter active medications
    const activeMedications = medications.filter((m) => m.isActive);
    const regularMedications = activeMedications.filter((m) => !m.isAsNeeded);

    // Check if dietary data exists
    const hasDietaryData = Boolean(dietaryNeeds.dietType || dietaryNeeds.instructions || dietaryNeeds.likes || dietaryNeeds.dislikes);

    // Check for empty state (no data AND all statuses are 'skipped')
    const showEmptyState = !hasAnyHealthData &&
        healthStatus.allergiesStatus === "skipped" &&
        healthStatus.medicationStatus === "skipped" &&
        healthStatus.dietaryStatus === "skipped";

    if (!isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    // Empty State UI - when no health data exists and all skipped
    if (showEmptyState) {
        return (
            <AppShell>
                <div className="space-y-6">
                    {/* Page Header */}
                    <div>
                        <h1 className="text-2xl font-dmSerif text-forest">Health information</h1>
                        <p className="text-sm text-textSub mt-1">
                            No information provided yet for {childName}.
                        </p>
                    </div>

                    {/* Intro text */}
                    <div className="card-organic p-5 bg-softGreen/30">
                        <p className="text-sm text-forest leading-relaxed">
                            If {childName} has allergies, dietary needs, or takes medication, you can add them here so every caregiver stays informed.
                        </p>
                    </div>

                    {/* Allergies Row */}
                    <div className="card-organic p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                                <AllergyIcon size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-forest">Allergies</h3>
                                <p className="text-sm text-textSub mt-0.5">
                                    Add known allergies or confirm there are none.
                                </p>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <Link
                                        href="/health/allergies"
                                        className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest/90 transition-colors"
                                    >
                                        Add allergy
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            setUpdatingCategory('allergies');
                                            await updateHealthStatus('allergies', 'none');
                                            setUpdatingCategory(null);
                                        }}
                                        disabled={updatingCategory === 'allergies'}
                                        className="px-4 py-2 text-forest text-sm font-medium hover:text-teal transition-colors disabled:opacity-50"
                                    >
                                        {updatingCategory === 'allergies' ? 'Saving...' : 'No allergies'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Diet Row */}
                    <div className="card-organic p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                                    <line x1="6" y1="1" x2="6" y2="4" />
                                    <line x1="10" y1="1" x2="10" y2="4" />
                                    <line x1="14" y1="1" x2="14" y2="4" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-forest">Diet & food notes</h3>
                                <p className="text-sm text-textSub mt-0.5">
                                    Note dietary needs, preferences, or restrictions.
                                </p>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <Link
                                        href="/health/diet"
                                        className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest/90 transition-colors"
                                    >
                                        Add diet note
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            setUpdatingCategory('dietary');
                                            await updateHealthStatus('dietary', 'none');
                                            setUpdatingCategory(null);
                                        }}
                                        disabled={updatingCategory === 'dietary'}
                                        className="px-4 py-2 text-forest text-sm font-medium hover:text-teal transition-colors disabled:opacity-50"
                                    >
                                        {updatingCategory === 'dietary' ? 'Saving...' : 'No dietary restrictions'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Medication Row */}
                    <div className="card-organic p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                <MedicationIcon size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-forest">Medication</h3>
                                <p className="text-sm text-textSub mt-0.5">
                                    Add regular medication or confirm none is needed.
                                </p>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <Link
                                        href="/health/medication"
                                        className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest/90 transition-colors"
                                    >
                                        Add medication
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            setUpdatingCategory('medication');
                                            await updateHealthStatus('medication', 'none');
                                            setUpdatingCategory(null);
                                        }}
                                        disabled={updatingCategory === 'medication'}
                                        className="px-4 py-2 text-forest text-sm font-medium hover:text-teal transition-colors disabled:opacity-50"
                                    >
                                        {updatingCategory === 'medication' ? 'Saving...' : 'No regular medication'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AppShell>
        );
    }

    // Helper to render status row
    const renderStatusRow = (
        category: HealthCategory,
        status: HealthStatusValue,
        details: string | null,
        href: string
    ) => {
        const summaryText = getStatusSummaryText(category, status, details);
        const isSkipped = status === "skipped";

        return (
            <div className={`flex items-center gap-3 py-4 px-3 rounded-xl ${isSkipped ? 'bg-amber-50/50' : 'bg-softGreen/50'}`}>
                <div className={`w-6 h-6 rounded-full ${isSkipped ? 'bg-amber-400' : 'bg-green-500'} flex items-center justify-center text-white flex-shrink-0`}>
                    {isSkipped ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M12 9v2m0 4h.01" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </div>
                <div className="flex-1">
                    <p className={`text-sm ${isSkipped ? 'text-amber-700' : 'text-forest'} font-medium`}>
                        {summaryText}
                    </p>
                </div>
                <Link
                    href={href}
                    className="text-xs text-textSub hover:text-forest underline underline-offset-2"
                >
                    Change
                </Link>
            </div>
        );
    };

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Health Overview</h1>
                    <p className="text-sm text-textSub mt-1">
                        Quickly see allergies, medication, and key health notes for {childName}.
                    </p>
                </div>

                {/* Allergies Snapshot Card */}
                <div className="card-organic p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <AllergyIcon size={20} />
                            </div>
                            <h2 className="font-bold text-forest text-lg">Allergies</h2>
                        </div>
                        {allergies.length > 0 && (
                            <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full">
                                {allergies.length} active
                            </span>
                        )}
                    </div>

                    {allergies.length > 0 ? (
                        <div className="space-y-3">
                            {allergies.slice(0, 3).map((allergy) => (
                                <div
                                    key={allergy.id}
                                    className={`p-3 rounded-xl border ${getSeverityBg(allergy.severity)}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${allergy.severity === "severe" ? "bg-red-100" : allergy.severity === "moderate" ? "bg-amber-100" : "bg-green-100"}`}>
                                            {allergyEmoji[allergy.category] || "⚠️"}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-forest text-sm">{allergy.name}</h3>
                                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${getSeverityStyle(allergy.severity)}`}>
                                                    {allergy.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            {allergy.action && (
                                                <p className="text-xs text-textSub mt-1">
                                                    {allergy.action}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Link
                                href="/health/allergies"
                                className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-forest hover:text-teal transition-colors"
                            >
                                View full allergy details
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </Link>
                        </div>
                    ) : (
                        renderStatusRow(
                            "allergies",
                            healthStatus.allergiesStatus,
                            healthStatus.allergiesDetails,
                            "/health/allergies"
                        )
                    )}
                </div>

                {/* Medication Snapshot Card */}
                <div className="card-organic p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <MedicationIcon size={20} />
                            </div>
                            <h2 className="font-bold text-forest text-lg">Medication</h2>
                        </div>
                        {activeMedications.length > 0 && (
                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                                {activeMedications.length} current
                            </span>
                        )}
                    </div>

                    {activeMedications.length > 0 ? (
                        <div className="space-y-3">
                            {regularMedications.slice(0, 3).map((med) => (
                                <div key={med.id} className="flex items-center gap-3 p-3 rounded-xl bg-cream/50 border border-border/30">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M8 12h8" />
                                            <path d="M12 8v8" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-forest text-sm">{med.name}</h3>
                                        <p className="text-xs text-textSub">
                                            {[med.schedule, med.notes].filter(Boolean).join(" • ") || med.dose}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <Link
                                href="/health/medication"
                                className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-forest hover:text-teal transition-colors"
                            >
                                View full medication list
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </Link>
                        </div>
                    ) : (
                        renderStatusRow(
                            "medication",
                            healthStatus.medicationStatus,
                            healthStatus.medicationDetails,
                            "/health/medication"
                        )
                    )}
                </div>

                {/* Dietary Needs Snapshot Card */}
                <div className="card-organic p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                                    <line x1="6" y1="1" x2="6" y2="4" />
                                    <line x1="10" y1="1" x2="10" y2="4" />
                                    <line x1="14" y1="1" x2="14" y2="4" />
                                </svg>
                            </div>
                            <h2 className="font-bold text-forest text-lg">Dietary needs</h2>
                        </div>
                    </div>

                    {hasDietaryData ? (
                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-green-50/50 border border-green-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">🥗</span>
                                    <h3 className="font-semibold text-forest text-sm">
                                        {dietaryNeeds.dietType === "other" && dietaryNeeds.customDescription
                                            ? dietaryNeeds.customDescription
                                            : dietTypeLabels[dietaryNeeds.dietType] || "Custom dietary notes"}
                                    </h3>
                                </div>
                                {dietaryNeeds.instructions && (
                                    <p className="text-xs text-textSub mt-1 line-clamp-2">
                                        {dietaryNeeds.instructions}
                                    </p>
                                )}
                            </div>
                            <Link
                                href="/health/diet"
                                className="flex items-center justify-center gap-2 text-sm font-semibold text-forest hover:text-teal transition-colors"
                            >
                                View full dietary details
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </Link>
                        </div>
                    ) : (
                        renderStatusRow(
                            "dietary",
                            healthStatus.dietaryStatus,
                            healthStatus.dietaryDetails,
                            "/health/diet"
                        )
                    )}
                </div>

                {/* Emergency Plan Card */}
                <div className="card-organic p-5 bg-softGreen/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                        </div>
                        <h2 className="font-bold text-forest text-lg">Emergency Plan</h2>
                    </div>

                    <p className="text-sm text-textSub leading-relaxed mb-4">
                        In a future update, this section will show what to do in emergencies —
                        who to call first, where to go, and critical steps for each scenario.
                    </p>

                    <button
                        disabled
                        className="w-full py-2.5 rounded-xl border border-border bg-white text-textSub/50 text-sm font-medium cursor-not-allowed"
                    >
                        Add emergency plan (coming soon)
                    </button>
                </div>

                {/* Quick Links */}
                <div className="card-organic p-5">
                    <h2 className="font-bold text-forest text-lg mb-4">Health Sections</h2>

                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/health/allergies"
                            className="p-4 rounded-xl bg-red-50/50 border border-red-100 hover:border-red-200 transition-colors text-center group"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-2 group-hover:scale-105 transition-transform">
                                <AllergyIcon size={20} />
                            </div>
                            <h3 className="font-semibold text-forest text-sm">Allergies</h3>
                        </Link>

                        <Link
                            href="/health/medication"
                            className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors text-center group"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-2 group-hover:scale-105 transition-transform">
                                <MedicationIcon size={20} />
                            </div>
                            <h3 className="font-semibold text-forest text-sm">Medication</h3>
                        </Link>

                        <Link
                            href="/health/diet"
                            className="p-4 rounded-xl bg-green-50/50 border border-green-100 hover:border-green-200 transition-colors text-center group col-span-2"
                        >
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-2 group-hover:scale-105 transition-transform">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                                    <line x1="6" y1="1" x2="6" y2="4" />
                                    <line x1="10" y1="1" x2="10" y2="4" />
                                    <line x1="14" y1="1" x2="14" y2="4" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-forest text-sm">Dietary Needs</h3>
                        </Link>
                    </div>
                </div>

                {/* Future Features Note */}
                <div className="text-center py-4">
                    <p className="text-xs text-textSub">
                        Soon you'll be able to add vaccination records, doctor visits, and growth tracking.
                    </p>
                </div>
            </div>
        </AppShell>
    );
}
