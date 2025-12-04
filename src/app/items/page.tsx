"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

function ItemsPageContent() {
    useEnsureOnboarding();

    const { items } = useItems();
    const { child, caregivers } = useAppState();
    const searchParams = useSearchParams();
    const [filter, setFilter] = useState<string>("All");

    // Handle URL query parameter for filter
    useEffect(() => {
        const filterParam = searchParams.get("filter");
        if (filterParam) {
            setFilter(filterParam);
        }
    }, [searchParams]);

    // Helper to get location label
    const getLocationLabel = (caregiverId: string, isMissing: boolean) => {
        if (isMissing) return "To be found";
        const caregiver = caregivers.find((c) => c.id === caregiverId);
        return caregiver ? `${caregiver.label}'s Home` : "Unknown Location";
    };

    // Filter items
    const filteredItems = items.filter((item) => {
        if (filter === "All") return true;
        if (filter === "To be found") return item.isMissing;
        // Filter by caregiver ID
        return item.locationCaregiverId === filter && !item.isMissing;
    });

    return (
        <AppShell>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">{child?.name || "Child"}&apos;s Things</h1>
                <p className="text-sm text-gray-500">All items across every home.</p>
                <p className="text-xs text-gray-400 mt-1">
                    Showing {filteredItems.length} items
                </p>
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
                    All
                </button>
                {caregivers.map((caregiver) => (
                    <button
                        key={caregiver.id}
                        onClick={() => setFilter(caregiver.id)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === caregiver.id
                            ? "bg-primary text-white"
                            : "bg-white border border-gray-200 text-gray-600"
                            }`}
                    >
                        {caregiver.label}&apos;s Home
                    </button>
                ))}
                <button
                    onClick={() => setFilter("To be found")}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "To be found"
                        ? "bg-primary text-white"
                        : "bg-white border border-gray-200 text-gray-600"
                        }`}
                >
                    To be found
                </button>
            </div>

            {/* Item List */}
            <div className="space-y-2">
                {filteredItems.map((item) => {
                    const locationLabel = getLocationLabel(
                        item.locationCaregiverId,
                        item.isMissing
                    );

                    return (
                        <Link
                            key={item.id}
                            href={`/items/${item.id}`}
                            className="block bg-white rounded-xl p-3 shadow-sm border border-gray-50 active:scale-[0.99] transition-transform"
                        >
                            <div className="flex items-center justify-between gap-3">
                                {/* Left: Thumbnail */}
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-400 flex-shrink-0">
                                    {item.name.charAt(0)}
                                </div>

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
