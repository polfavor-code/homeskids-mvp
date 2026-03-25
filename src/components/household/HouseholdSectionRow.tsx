"use client";

import React from "react";
import Link from "next/link";

interface HouseholdSectionRowProps {
    href: string;
    icon: React.ReactNode;
    label: string;
    count?: number;
    iconColor?: string;
}

/**
 * HouseholdSectionRow - A simple row for a section inside a household card
 *
 * Displays: icon | label | count | chevron
 * Clicking navigates to the section page.
 */
export default function HouseholdSectionRow({
    href,
    icon,
    label,
    count,
    iconColor = "text-gray-500",
}: HouseholdSectionRowProps) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 px-4 py-3 hover:bg-cream/50 transition-colors rounded-lg"
        >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg bg-cream/70 flex items-center justify-center ${iconColor}`}>
                {icon}
            </div>

            {/* Label */}
            <span className="flex-1 text-sm font-medium text-forest">
                {label}
            </span>

            {/* Count */}
            {count !== undefined && count > 0 && (
                <span className="text-sm text-textSub font-medium">
                    {count}
                </span>
            )}

            {/* Chevron */}
            <svg
                className="w-4 h-4 text-textSub/40 group-hover:text-forest group-hover:translate-x-0.5 transition-all"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <polyline points="9 18 15 12 9 6" />
            </svg>
        </Link>
    );
}
