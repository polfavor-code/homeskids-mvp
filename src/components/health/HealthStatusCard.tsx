"use client";

import React from "react";
import { HealthStatusValue } from "@/lib/HealthContextV2";

export type HealthCategory = "allergies" | "medication" | "dietary";

interface HealthStatusCardProps {
    category: HealthCategory;
    childName: string;
    selectedStatus: HealthStatusValue | null;
    details: string;
    onStatusChange: (status: HealthStatusValue) => void;
    onDetailsChange: (details: string) => void;
    error?: string;
}

// Configuration for each category
const categoryConfig: Record<HealthCategory, {
    title: string;
    skipLabel: string;
    noneLabel: string;
    yesLabel: (childName: string) => string;
    placeholder: string;
    icon: React.ReactNode;
    iconBgColor: string;
    iconTextColor: string;
}> = {
    allergies: {
        title: "Allergies",
        skipLabel: "Skip for now",
        noneLabel: "No allergies",
        yesLabel: (name) => `Yes - ${name} has allergies`,
        placeholder: "e.g. Peanuts, pollen, penicillin",
        iconBgColor: "bg-red-100",
        iconTextColor: "text-red-600",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
    },
    medication: {
        title: "Medication",
        skipLabel: "Skip for now",
        noneLabel: "No regular medication",
        yesLabel: (name) => `Yes - ${name} takes medication`,
        placeholder: "e.g. Asthma inhaler, EpiPen, daily medication",
        iconBgColor: "bg-blue-100",
        iconTextColor: "text-blue-600",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19.5 12.572l-7.5 7.428m0 0l-7.5-7.428m7.5 7.428V4" />
                <rect x="6" y="4" width="12" height="6" rx="1" />
            </svg>
        ),
    },
    dietary: {
        title: "Dietary needs",
        skipLabel: "Skip for now",
        noneLabel: "No dietary restrictions",
        yesLabel: (name) => `Yes - ${name} has dietary needs`,
        placeholder: "e.g. Vegetarian, lactose free, no nuts",
        iconBgColor: "bg-green-100",
        iconTextColor: "text-green-600",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
        ),
    },
};

export default function HealthStatusCard({
    category,
    childName,
    selectedStatus,
    details,
    onStatusChange,
    onDetailsChange,
    error,
}: HealthStatusCardProps) {
    const config = categoryConfig[category];

    return (
        <div className="bg-white border border-border rounded-xl p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full ${config.iconBgColor} flex items-center justify-center ${config.iconTextColor}`}>
                    {config.icon}
                </div>
                <h3 className="font-bold text-forest text-lg">{config.title}</h3>
            </div>

            {/* Radio options */}
            <div className="space-y-3">
                {/* Skip for now */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-cream/50 cursor-pointer transition-colors">
                    <input
                        type="radio"
                        name={`health-${category}`}
                        checked={selectedStatus === "skipped"}
                        onChange={() => onStatusChange("skipped")}
                        className="mt-0.5 w-4 h-4 text-forest focus:ring-forest/30"
                    />
                    <div>
                        <span className="text-sm font-medium text-forest">{config.skipLabel}</span>
                    </div>
                </label>

                {/* No [category] */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-cream/50 cursor-pointer transition-colors">
                    <input
                        type="radio"
                        name={`health-${category}`}
                        checked={selectedStatus === "none"}
                        onChange={() => onStatusChange("none")}
                        className="mt-0.5 w-4 h-4 text-forest focus:ring-forest/30"
                    />
                    <div>
                        <span className="text-sm font-medium text-forest">{config.noneLabel}</span>
                    </div>
                </label>

                {/* Yes - has [category] */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-cream/50 cursor-pointer transition-colors">
                    <input
                        type="radio"
                        name={`health-${category}`}
                        checked={selectedStatus === "has"}
                        onChange={() => onStatusChange("has")}
                        className="mt-0.5 w-4 h-4 text-forest focus:ring-forest/30"
                    />
                    <div className="flex-1">
                        <span className="text-sm font-medium text-forest">{config.yesLabel(childName)}</span>

                        {/* Details textarea - shown only when "has" is selected */}
                        {selectedStatus === "has" && (
                            <textarea
                                value={details}
                                onChange={(e) => onDetailsChange(e.target.value)}
                                placeholder={config.placeholder}
                                rows={2}
                                className="mt-3 w-full px-3 py-2 bg-cream border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all resize-none"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                    </div>
                </label>
            </div>

            {/* Error message */}
            {error && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                </p>
            )}
        </div>
    );
}

// Summary text helpers for displaying status
export function getStatusSummaryText(
    category: HealthCategory,
    status: HealthStatusValue,
    details: string | null
): string {
    if (status === "skipped") {
        return "No information provided yet";
    }

    if (status === "none") {
        switch (category) {
            case "allergies":
                return "Marked as no known allergies";
            case "medication":
                return "Marked as no regular medication";
            case "dietary":
                return "Marked as no dietary restrictions";
        }
    }

    // status === "has"
    if (details && details.trim()) {
        // Truncate if too long
        const maxLen = 50;
        const trimmed = details.trim();
        if (trimmed.length > maxLen) {
            return `Marked as: ${trimmed.substring(0, maxLen)}...`;
        }
        return `Marked as: ${trimmed}`;
    }

    return "Health details added";
}
