"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { ChevronDownIcon, ItemsIcon, TravelBagIcon, SearchIcon } from "@/components/icons/DuotoneIcons";

function ItemsPageContent() {
    useEnsureOnboarding();
    const router = useRouter();
    const searchParams = useSearchParams();

    const { items } = useItems();
    const { child, caregivers, homes } = useAppState();

    // Home filter state from URL
    const filterParam = searchParams.get("filter");
    const [homeFilter, setHomeFilter] = useState<string>(filterParam || "all");

    // Dropdown open state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Update URL when filter changes
    const handleFilterChange = (filter: string) => {
        setHomeFilter(filter);
        setIsDropdownOpen(false);
        if (filter !== "all") {
            router.push(`/items?filter=${filter}`);
        } else {
            router.push("/items");
        }
    };

    // Helper to get location label - prefers home, falls back to caregiver
    const getLocationLabel = (item: { locationHomeId: string | null; locationCaregiverId: string | null; isMissing: boolean }) => {
        if (item.isMissing) return "Missing";
        if (item.locationHomeId) {
            const home = homes.find((h) => h.id === item.locationHomeId);
            if (home) return home.name;
        }
        const caregiver = caregivers.find((c) => c.id === item.locationCaregiverId);
        return caregiver ? `${caregiver.label}'s Home` : "Unknown Location";
    };

    // Filter items by home
    const getFilteredItems = () => {
        let filtered = items;

        if (homeFilter !== "all") {
            filtered = filtered.filter((item) => {
                if (item.isMissing) return false;
                if (item.locationHomeId) {
                    return item.locationHomeId === homeFilter;
                }
                const filterHome = homes.find((h) => h.id === homeFilter);
                if (filterHome?.ownerCaregiverId && item.locationCaregiverId === filterHome.ownerCaregiverId) {
                    return true;
                }
                return false;
            });
        }

        return filtered;
    };

    const filteredItems = getFilteredItems();

    // Calculate counts
    const missingCount = items.filter((item) => item.isMissing).length;
    const totalCount = items.length;

    // Get home item count
    const getHomeItemCount = (homeId: string) => {
        return items.filter((item) => {
            if (item.isMissing) return false;
            if (item.locationHomeId) {
                return item.locationHomeId === homeId;
            }
            const home = homes.find((h) => h.id === homeId);
            if (home?.ownerCaregiverId && item.locationCaregiverId === home.ownerCaregiverId) {
                return true;
            }
            return false;
        }).length;
    };

    // Determine which homes to show in filter
    const homesToShowInFilter = homes.filter((home) => {
        if (home.status === "active") return true;
        return getHomeItemCount(home.id) > 0;
    });

    // Get current filter label
    const getCurrentFilterLabel = () => {
        if (homeFilter === "all") return "All homes";
        const home = homes.find((h) => h.id === homeFilter);
        return home?.name || "All homes";
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".home-filter-dropdown")) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener("click", handleClickOutside);
        }
        return () => document.removeEventListener("click", handleClickOutside);
    }, [isDropdownOpen]);

    // Get current user caregiver and their home
    const currentUserCaregiver = caregivers.find(c => c.isCurrentUser);
    const currentUserHome = homes.find(h => h.ownerCaregiverId === currentUserCaregiver?.id);

    // Helper to get status label for requested items
    // - If YOU marked it and item is at YOUR home → "To pack" (you're preparing to pack it)
    // - If SOMEONE ELSE requested it → "Requested by [Name]" (they asked you to pack it)
    const getRequestedLabel = (item: { requestedBy?: string | null; locationHomeId: string | null }) => {
        const requestedById = item.requestedBy;
        if (!requestedById) return "To pack";

        // Check if the current user requested it AND the item is at the current user's home
        const isAtMyHome = currentUserHome && item.locationHomeId === currentUserHome.id;

        if (currentUserCaregiver && requestedById === currentUserCaregiver.id) {
            // I marked this item - just show "To pack"
            return "To pack";
        }

        // Someone else requested it - show who
        const requester = caregivers.find(c => c.id === requestedById);
        if (requester) {
            const firstName = requester.name.split(" ")[0];
            return `Requested by ${firstName}`;
        }
        return "To pack";
    };

    // Helper to get role-aware "Packed by" label
    const getPackedLabel = (packedById: string | null | undefined) => {
        if (!packedById) return "Packed";
        if (currentUserCaregiver && packedById === currentUserCaregiver.id) {
            return "Packed by you";
        }
        const packer = caregivers.find(c => c.id === packedById);
        if (packer) {
            // Use first name only
            const firstName = packer.name.split(" ")[0];
            return `Packed by ${firstName}`;
        }
        return "Packed";
    };

    return (
        <AppShell>
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
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-forest text-white border border-forest"
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
                {missingCount > 0 && (
                    <Link
                        href="/items/missing"
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-transparent border border-forest text-forest hover:bg-forest hover:text-white"
                    >
                        <SearchIcon size={16} />
                        Missing ({missingCount})
                    </Link>
                )}
            </div>

            {/* Home Filter Dropdown - Chip Style */}
            <div className="mb-4 home-filter-dropdown relative">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="inline-flex items-center gap-2 pl-4 pr-3 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-forest hover:border-forest transition-colors"
                >
                    <span>{getCurrentFilterLabel()}</span>
                    <span className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-softGreen text-forest text-xs font-bold rounded-full">
                        {homeFilter === "all" ? totalCount : getHomeItemCount(homeFilter)}
                    </span>
                    <ChevronDownIcon size={14} className={`text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Desktop Dropdown */}
                {isDropdownOpen && (
                    <div className="hidden sm:block absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                        <button
                            onClick={() => handleFilterChange("all")}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                homeFilter === "all" ? "text-forest font-semibold bg-softGreen/30" : "text-gray-700"
                            }`}
                        >
                            All homes ({totalCount})
                        </button>
                        {homesToShowInFilter.map((home) => (
                            <button
                                key={home.id}
                                onClick={() => handleFilterChange(home.id)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                    homeFilter === home.id ? "text-forest font-semibold bg-softGreen/30" : "text-gray-700"
                                }`}
                            >
                                {home.name} ({getHomeItemCount(home.id)})
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Mobile Bottom Sheet */}
            {isDropdownOpen && (
                <div className="sm:hidden fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30"
                        onClick={() => setIsDropdownOpen(false)}
                    />

                    {/* Sheet - positioned above mobile nav */}
                    <div className="absolute bottom-[90px] left-0 right-0 bg-white rounded-3xl shadow-2xl animate-slide-up max-h-[50vh] overflow-y-auto mx-3">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-lg font-dmSerif text-forest">Filter by home</h2>
                            <button
                                onClick={() => setIsDropdownOpen(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 text-forest"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Options */}
                        <div className="px-4 py-4 space-y-2">
                            <button
                                onClick={() => handleFilterChange("all")}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                                    homeFilter === "all"
                                        ? "bg-softGreen text-forest font-semibold"
                                        : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <span>All homes</span>
                                <span className="text-sm text-gray-500">{totalCount} items</span>
                            </button>
                            {homesToShowInFilter.map((home) => (
                                <button
                                    key={home.id}
                                    onClick={() => handleFilterChange(home.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                                        homeFilter === home.id
                                            ? "bg-softGreen text-forest font-semibold"
                                            : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <span>{home.name}</span>
                                    <span className="text-sm text-gray-500">{getHomeItemCount(home.id)} items</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Item count */}
            <p className="text-xs text-gray-400 mb-2">
                Showing {filteredItems.length} items
            </p>

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
                                        {item.category}
                                        {homeFilter === "all" && ` · ${locationLabel}`}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {item.isMissing ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            Missing
                                        </span>
                                    ) : item.isPacked ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-softGreen text-forest">
                                            {getPackedLabel(item.packedBy)}
                                        </span>
                                    ) : item.isRequestedForNextVisit ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {getRequestedLabel(item)}
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

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </AppShell>
    );
}

export default function ItemsPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <ItemsPageContent />
        </React.Suspense>
    );
}
