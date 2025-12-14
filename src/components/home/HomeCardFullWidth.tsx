"use client";

import React from "react";
import Link from "next/link";
import { CaregiverProfile, ChildProfile, HomeProfile } from "@/lib/AppStateContextV2";
import { Item } from "@/lib/mockData";

interface HomeCardFullWidthProps {
    home: HomeProfile;
    ownerCaregiver?: CaregiverProfile; // The primary caregiver for this home
    child: ChildProfile | null;
    items: Item[];
    isActive: boolean;
    onSwitch?: () => void;
    caregiverCount?: number; // Optional override for valid caregiver count
    isSwitching?: boolean; // Loading state for switch button
}

export default function HomeCardFullWidth({
    home,
    ownerCaregiver,
    child,
    items,
    isActive,
    onSwitch,
    caregiverCount,
    isSwitching = false,
}: HomeCardFullWidthProps) {
    // Get current local time (use home's timezone if available)
    const currentTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: home.timeZone && home.timeZone !== 'auto' ? home.timeZone : undefined,
    });

    // Home display name - use name directly since it's already like "Daddy's Home"
    const displayName = home.name;

    // Get avatar info - prefer owner caregiver's avatar if available
    const avatarInitials = ownerCaregiver?.avatarInitials || home.name.charAt(0);
    const avatarUrl = ownerCaregiver?.avatarUrl;
    const avatarLabel = ownerCaregiver?.label || home.name.replace("'s Home", "").replace(" Home", "");

    return (
        <Link
            href={`/items?filter=${home.id}`}
            className={`
                block relative bg-white rounded-[24px] p-6 mb-0
                transition-all duration-200
                ${isActive
                    ? "shadow-[0_8px_24px_rgba(36,52,37,0.08)]"
                    : "shadow-[0_8px_24px_rgba(36,52,37,0.08)] hover:shadow-[0_12px_32px_rgba(36,52,37,0.12)] hover:-translate-y-1"
                }
            `}
            style={{
                zIndex: 10,
            }}
        >
            {/* Card Header: Name + Status */}
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-dmSerif text-2xl text-forest m-0">
                    {displayName}
                </h3>
                {isActive && (
                    <div className="bg-forest text-white px-5 py-2 rounded-full text-sm font-bold shadow-sm">
                        Here
                    </div>
                )}
            </div>

            {/* Local Time */}
            <div className="text-[13px] text-[#5C705D] mb-4">
                Local time {currentTime}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-3 bg-[#F8F8F8] p-4 rounded-2xl">
                <div className="text-center">
                    <span className="block font-bold text-[15px] text-forest mb-0.5">Map</span>
                    <span className="text-[11px] text-[#5C705D] uppercase font-semibold">View</span>
                </div>
                <div className="text-center">
                    <span className="block font-bold text-[15px] text-forest mb-0.5">
                        {caregiverCount ?? (home.accessibleCaregiverIds?.length || 0)}
                    </span>
                    <span className="text-[11px] text-[#5C705D] uppercase font-semibold">
                        {(caregiverCount ?? (home.accessibleCaregiverIds?.length || 0)) === 1 ? 'Person' : 'People'}
                    </span>
                </div>
                <div className="text-center">
                    <span className="block font-bold text-[15px] text-forest mb-0.5">
                        {items.length}
                    </span>
                    <span className="text-[11px] text-[#5C705D] uppercase font-semibold">Items</span>
                </div>
            </div>

            {/* Switch Button (only for non-active) */}
            {!isActive && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isSwitching) {
                            onSwitch?.();
                        }
                    }}
                    disabled={isSwitching}
                    className={`w-full bg-white border-2 border-[#F0F0F0] text-forest py-3.5 rounded-2xl font-semibold mt-5 transition-colors cursor-pointer ${
                        isSwitching
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:border-forest"
                    }`}
                >
                    {isSwitching ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Moving...
                        </span>
                    ) : (
                        `Move ${child?.name || "Child"} here`
                    )}
                </button>
            )}
        </Link>
    );
}
