"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

function ItemsPageContent() {
    useEnsureOnboarding();

    const { items } = useItems();
    const { child, caregivers, homes, activeHomes } = useAppState();
    const searchParams = useSearchParams();
    const [filter, setFilter] = useState<string>("All");

    // Handle URL query parameter for filter
    useEffect(() => {
        const filterParam = searchParams.get("filter");
        if (filterParam) {
            setFilter(filterParam);
        }
    }, [searchParams]);

    // Helper to get location label - prefers home, falls back to caregiver
    const getLocationLabel = (item: { locationHomeId: string | null; locationCaregiverId: string | null; isMissing: boolean }) => {
        if (item.isMissing) return "To be found";
        // Prefer home-based location
        if (item.locationHomeId) {
            const home = homes.find((h) => h.id === item.locationHomeId);
            if (home) return home.name;
        }
        // Fallback to caregiver
        const caregiver = caregivers.find((c) => c.id === item.locationCaregiverId);
        return caregiver ? `${caregiver.label}'s Home` : "Unknown Location";
    };

    // Filter items - now supports filtering by home ID
    const filteredItems = items.filter((item) => {
        if (filter === "All") return true;
        if (filter === "To be found") return item.isMissing;
        // Filter by home ID (or fallback to caregiver match via home's owner)
        if (item.locationHomeId === filter) return !item.isMissing;
        // Also check if item's caregiver matches the home's owner (for legacy items)
        const filterHome = homes.find((h) => h.id === filter);
        if (filterHome?.ownerCaregiverId && item.locationCaregiverId === filterHome.ownerCaregiverId) {
            return !item.isMissing;
        }
        return false;
    });

    // Calculate counts for each filter
    const getHomeItemCount = (homeId: string) => {
        return items.filter((item) => {
            if (item.isMissing) return false;
            if (item.locationHomeId === homeId) return true;
            const home = homes.find((h) => h.id === homeId);
            if (home?.ownerCaregiverId && item.locationCaregiverId === home.ownerCaregiverId) {
                return true;
            }
            return false;
        }).length;
    };
    const missingCount = items.filter((item) => item.isMissing).length;

    // Determine which homes to show in filter pills:
    // - Active homes always show
    // - Hidden homes only show if they have items
    const homesToShowInFilter = homes.filter((home) => {
        // Active homes always show
        if (home.status === "active") return true;
        // Hidden homes only show if they have items
        return getHomeItemCount(home.id) > 0;
    });

    return (
        <AppShell>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{child?.name || "Child"}&apos;s Things</h1>
                    <p className="text-sm text-gray-500">All items across every home.</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Showing {filteredItems.length} items
                    </p>
                </div>
                <Link
                    href="/items/new"
                    className="bg-forest text-white px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap hover:bg-forest/90 transition-colors"
                >
                    + New item
                </Link>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide mb-2">
                <button
                    onClick={() => setFilter("All")}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "All"
                        ? "bg-primary text-white"
                        : "bg-white border border-gray-200 text-gray-600"
                        }`}
                >
                    All ({items.length})
                </button>
                {homesToShowInFilter.map((home) => (
                    <button
                        key={home.id}
                        onClick={() => setFilter(home.id)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === home.id
                            ? "bg-primary text-white"
                            : "bg-white border border-gray-200 text-gray-600"
                            }`}
                    >
                        {home.name} ({getHomeItemCount(home.id)})
                    </button>
                ))}
                <button
                    onClick={() => setFilter("To be found")}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "To be found"
                        ? "bg-primary text-white"
                        : "bg-white border border-gray-200 text-gray-600"
                        }`}
                >
                    To be found ({missingCount})
                </button>
            </div>

            {/* Item List */}
            <div className="space-y-2">
                {filteredItems.map((item) => {
                    const locationLabel = getLocationLabel(item);

                    return (
                        <Link
                            key={item.id}
                            href={`/items/${item.id}`}
                            className="block bg-white rounded-xl p-3 shadow-sm border border-gray-50 active:scale-[0.99] transition-transform"
                        >
                            <div className="flex items-center justify-between gap-3">
                                {/* Left: Thumbnail - Use ItemPhoto for real images */}
                                <ItemPhoto
                                    photoPath={item.photoUrl}
                                    itemName={item.name}
                                    className="w-12 h-12 flex-shrink-0"
                                />

                                {/* Middle: Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 truncate">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate">
                                        {item.category}
                                        {/* Show location label conditionally based on filter */}
                                        {filter === "All" && ` · ${locationLabel}`}
                                    </p>
                                </div>

                                {/* Right: Status Badges */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {/* Show yellow pill only if filter is "All" */}
                                    {item.isMissing && filter === "All" ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            To be found
                                        </span>
                                    ) : item.isRequestedForNextVisit ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Requested
                                        </span>
                                    ) : item.isPacked ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Packed
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </Link>
                    );
                })}
                {filteredItems.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-50">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            📦
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">No items yet</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            Add clothes, toys, school stuff and more so you can keep track of them.
                        </p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

export default function ItemsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ItemsPageContent />
        </Suspense>
    );
}
