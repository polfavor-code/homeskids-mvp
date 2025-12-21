"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { ItemsIcon, TravelBagIcon, SearchIcon } from "@/components/icons/DuotoneIcons";

export default function AwaitingLocationItemsPage() {
    useEnsureOnboarding();

    const { items } = useItems();
    const { child, caregivers, homes, accessibleHomes, childSpaces, currentChildId } = useAppState();

    // Get child_space IDs for current child (same logic as main items page)
    const currentChildSpaceIds = childSpaces
        .filter(cs => cs.childId === currentChildId)
        .map(cs => cs.id);

    // Check if user has any home access
    const hasHomeAccess = accessibleHomes.length > 0;

    // Filter items to only show those for the current child AND in accessible homes (same as main page)
    const accessibleItems = hasHomeAccess
        ? items.filter(item => {
            // First, filter by current child's child_spaces
            if (currentChildSpaceIds.length > 0 && !currentChildSpaceIds.includes(item.childSpaceId)) {
                return false;
            }
            // Show unassigned items
            if (!item.locationHomeId) return true;
            // Show items in accessible homes
            return accessibleHomes.some(h => h.id === item.locationHomeId);
          })
        : items;

    // Filter to only items awaiting location (from accessible items)
    const awaitingLocationItems = accessibleItems.filter((item) => item.isMissing);

    // Calculate counts (from accessible items for consistency)
    const awaitingLocationCount = awaitingLocationItems.length;
    const totalCount = accessibleItems.length;

    // Helper to get last known location (if any)
    const getLastKnownLocation = (item: { locationHomeId?: string | null; locationCaregiverId?: string | null }) => {
        if (item.locationHomeId) {
            const home = homes.find((h) => h.id === item.locationHomeId);
            if (home) return home.name;
        }
        const caregiver = caregivers.find((c) => c.id === item.locationCaregiverId);
        return caregiver ? `${caregiver.label}'s Home` : null;
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
                    <p className="text-sm text-textSub mt-1">Items waiting for location confirmation.</p>
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
                    href="/items/awaiting-location"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-forest text-white border border-forest"
                >
                    <SearchIcon size={16} />
                    Awaiting location ({awaitingLocationCount})
                </Link>
            </div>

            {/* Explanation text */}
            <div className="bg-cream/50 border border-border rounded-xl p-4 mb-4">
                <p className="text-sm text-forest">
                    These items exist but their current location hasn&apos;t been confirmed yet. 
                    This can happen when an item is at another caregiver&apos;s home that hasn&apos;t joined, 
                    or when you&apos;re not sure where it currently is.
                </p>
            </div>

            {/* Item count */}
            <p className="text-xs text-gray-400 mb-2">
                Showing {awaitingLocationItems.length} items awaiting location
            </p>

            {/* Item List */}
            <div className="space-y-2">
                {awaitingLocationItems.map((item) => {
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
                                        {item.category}{lastLocation ? ` · Last seen: ${lastLocation}` : ""}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                        Awaiting location
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                {awaitingLocationItems.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-50">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            ✓
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">All items have confirmed locations</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            Every item has a home assigned. Great job keeping track of everything!
                        </p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
