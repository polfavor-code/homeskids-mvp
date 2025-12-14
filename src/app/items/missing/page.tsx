"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import { useItems } from "@/lib/ItemsContextV2";
import { useAppState } from "@/lib/AppStateContextV2";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { ItemsIcon, TravelBagIcon, SearchIcon } from "@/components/icons/DuotoneIcons";

export default function MissingItemsPage() {
    useEnsureOnboarding();

    const { items } = useItems();
    const { child, caregivers, homes } = useAppState();

    // Filter to only missing items
    const missingItems = items.filter((item) => item.isMissing);

    // Calculate counts
    const missingCount = missingItems.length;
    const totalCount = items.length;

    // Helper to get last known location
    const getLastKnownLocation = (item: { locationHomeId?: string | null; locationCaregiverId?: string | null }) => {
        if (item.locationHomeId) {
            const home = homes.find((h) => h.id === item.locationHomeId);
            if (home) return home.name;
        }
        const caregiver = caregivers.find((c) => c.id === item.locationCaregiverId);
        return caregiver ? `${caregiver.label}'s Home` : "Unknown";
    };

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/items"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← All items
            </Link>

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">{child?.name || "Child"}&apos;s Things</h1>
                    <p className="text-sm text-textSub mt-1">All items across every home.</p>
                </div>
                <Link
                    href="/items/new"
                    className="bg-forest text-white px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest/90 transition-colors border border-forest"
                >
                    + New item
                </Link>
            </div>

            {/* Top Tabs - Matching Dashboard Button Style */}
            <div className="flex flex-wrap gap-2 mb-4">
                <Link
                    href="/items"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-transparent border border-forest text-forest hover:bg-forest hover:text-white"
                >
                    <ItemsIcon size={16} />
                    All items ({totalCount})
                </Link>
                <Link
                    href="/items/travel-bag"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-transparent border border-forest text-forest hover:bg-forest hover:text-white"
                >
                    <TravelBagIcon size={16} />
                    Travel bag
                </Link>
                <Link
                    href="/items/missing"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-forest text-white border border-forest"
                >
                    <SearchIcon size={16} />
                    Missing ({missingCount})
                </Link>
            </div>

            {/* Item count */}
            <p className="text-xs text-gray-400 mb-2">
                Showing {missingItems.length} missing items
            </p>

            {/* Item List */}
            <div className="space-y-2">
                {missingItems.map((item) => {
                    const lastLocation = getLastKnownLocation(item);

                    return (
                        <Link
                            key={item.id}
                            href={`/items/${item.id}`}
                            className="block bg-white rounded-xl p-3 shadow-sm border border-gray-50 active:scale-[0.99] transition-transform"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <ItemPhoto
                                    photoPath={item.photoUrl}
                                    itemName={item.name}
                                    className="w-12 h-12 flex-shrink-0"
                                />

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 truncate">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate">
                                        {item.category} · Last seen at {lastLocation}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Missing
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                {missingItems.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-50">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            🎉
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">No missing items</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            All items are accounted for. Great job keeping track of everything!
                        </p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
