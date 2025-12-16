"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import FirstHomeAssignmentPrompt from "@/components/FirstHomeAssignmentPrompt";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { ChevronDownIcon, ItemsIcon, TravelBagIcon, SearchIcon, HomeIcon } from "@/components/icons/DuotoneIcons";

function ItemsPageContent() {
    useEnsureOnboarding();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const { items } = useItems();
    const { child, caregivers, accessibleHomes } = useAppState();
    
    // Use only accessible homes for display
    const homes = accessibleHomes;
    const hasHomeAccess = accessibleHomes.length > 0;
    
    // Filter items to only show those in accessible homes (or unassigned items if user has access)
    const accessibleItems = hasHomeAccess 
        ? items.filter(item => {
            // Show unassigned items
            if (!item.locationHomeId) return true;
            // Show items in accessible homes
            return accessibleHomes.some(h => h.id === item.locationHomeId);
          })
        : []; // No home access = empty list

    // Home filter state from URL
    const filterParam = searchParams.get("filter");
    const [homeFilter, setHomeFilter] = useState<string>(filterParam || "all");

    // Dropdown open state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Soft nudge dismissal state (stored in localStorage)
    const [isNoHomeBannerDismissed, setIsNoHomeBannerDismissed] = useState(false);
    const [showFirstHomePrompt, setShowFirstHomePrompt] = useState(false);
    const [firstHomeInfo, setFirstHomeInfo] = useState<{ id: string; name: string } | null>(null);

    // Check localStorage for banner dismissal and first home prompt on mount
    useEffect(() => {
        const dismissed = localStorage.getItem('noHomeBannerDismissed');
        setIsNoHomeBannerDismissed(dismissed === 'true');

        const firstHomeDone = localStorage.getItem('firstHomeAssignmentDone');
        
        // Show first home prompt if:
        // 1. Not shown before (firstHomeDone is null)
        // 2. We have exactly 1 home (first home just created)
        // 3. We have unassigned items
        if (!firstHomeDone && homes.length === 1) {
            const unassignedItems = items.filter(item => !item.isMissing && !item.locationHomeId);
            if (unassignedItems.length > 0) {
                setFirstHomeInfo({ id: homes[0].id, name: homes[0].name });
                setShowFirstHomePrompt(true);
            }
        }
    }, [homes, items]);

    const handleDismissNoHomeBanner = () => {
        localStorage.setItem('noHomeBannerDismissed', 'true');
        setIsNoHomeBannerDismissed(true);
    };

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

    // Helper to get location label - prefers home, shows "Awaiting location" for unconfirmed items
    const getLocationLabel = (item: { locationHomeId?: string | null; locationCaregiverId?: string | null; isMissing?: boolean; status?: string }) => {
        if (item.isMissing || item.status === "lost") return "Awaiting location";
        if (item.locationHomeId) {
            const home = homes.find((h) => h.id === item.locationHomeId);
            if (home) return home.name;
        }
        // If no homes exist at all, show "No home yet" instead of "Unknown Location"
        if (homes.length === 0) {
            return "No home yet";
        }
        const caregiver = caregivers.find((c) => c.id === item.locationCaregiverId);
        return caregiver ? `${caregiver.label}'s Home` : "No home yet";
    };

    // Filter items by home or status (using accessibleItems as base)
    const getFilteredItems = () => {
        let filtered = accessibleItems;

        if (homeFilter === "awaiting-location") {
            // Filter to show only items awaiting location
            filtered = filtered.filter((item) => item.isMissing);
        } else if (homeFilter !== "all") {
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

    // Calculate counts (based on accessible items)
    const awaitingLocationCount = accessibleItems.filter((item) => item.isMissing).length;
    const totalCount = accessibleItems.length;
    const unassignedCount = accessibleItems.filter((item) => !item.isMissing && !item.locationHomeId).length;
    
    // Determine if we should show the no-home banner
    const hasNoHomes = homes.length === 0;
    const hasUnassignedItems = unassignedCount > 0;
    const shouldShowNoHomeBanner = hasNoHomes && !isNoHomeBannerDismissed;

    // Get home item count (based on accessible items)
    const getHomeItemCount = (homeId: string) => {
        return accessibleItems.filter((item) => {
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
        if (homeFilter === "awaiting-location") return "Awaiting location";
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
    // - If YOU marked it → "To pack" (you're preparing to pack it)
    // - If SOMEONE ELSE requested it → "Requested by [Name]" (they asked you to pack it)
    const getRequestedLabel = (item: { requestedBy?: string | null; locationHomeId?: string | null }) => {
        const requestedById = item.requestedBy;
        if (!requestedById) return "To pack";

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

    // Get unassigned item IDs for first home prompt (from accessible items)
    const unassignedItemIds = accessibleItems
        .filter(item => !item.isMissing && !item.locationHomeId)
        .map(item => item.id);

    return (
        <AppShell>
            {/* First Home Assignment Prompt */}
            {showFirstHomePrompt && firstHomeInfo && unassignedItemIds.length > 0 && (
                <FirstHomeAssignmentPrompt
                    homeId={firstHomeInfo.id}
                    homeName={firstHomeInfo.name}
                    unassignedItemIds={unassignedItemIds}
                    onClose={() => setShowFirstHomePrompt(false)}
                />
            )}
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">
                        {hasHomeAccess ? `${child?.name || "Child"}'s Things` : "Items"}
                    </h1>
                    <p className="text-sm text-textSub mt-1">
                        {hasHomeAccess ? "All items across every home." : "Track items across homes."}
                    </p>
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
                {awaitingLocationCount > 0 && (
                    <Link
                        href="/items/awaiting-location"
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-transparent border border-forest text-forest hover:bg-forest hover:text-white"
                    >
                        <SearchIcon size={16} />
                        Awaiting location ({awaitingLocationCount})
                    </Link>
                )}
            </div>

            {/* Soft Nudge: No Home Banner (Non-blocking) */}
            {shouldShowNoHomeBanner && (
                <div className="bg-[#FDF6F4] border border-[#F0DDD8] rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FAEAE6] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-terracotta">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <p className="flex-1 text-sm text-forest">
                        Items will stay unassigned until you <Link href="/settings/homes" className="font-semibold text-terracotta underline underline-offset-2 hover:text-terracotta/80 transition-colors">add a home</Link>
                    </p>
                    <button
                        onClick={handleDismissNoHomeBanner}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-[#F0DDD8] transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-terracotta/50 hover:text-terracotta">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Home Filter Dropdown - Chip Style (only show if homes exist) */}
            {homes.length > 0 && (
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
                        {awaitingLocationCount > 0 && (
                            <button
                                onClick={() => handleFilterChange("awaiting-location")}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                    homeFilter === "awaiting-location" ? "text-forest font-semibold bg-softGreen/30" : "text-gray-700"
                                }`}
                            >
                                Awaiting location ({awaitingLocationCount})
                            </button>
                        )}
                    </div>
                )}
            </div>
            )}

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
                            {awaitingLocationCount > 0 && (
                                <button
                                    onClick={() => handleFilterChange("awaiting-location")}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                                        homeFilter === "awaiting-location"
                                            ? "bg-softGreen text-forest font-semibold"
                                            : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <span>Awaiting location</span>
                                    <span className="text-sm text-gray-500">{awaitingLocationCount} items</span>
                                </button>
                            )}
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
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                            Awaiting location
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
                            {!hasHomeAccess 
                                ? "Once you're added to a home, items will appear here automatically."
                                : "Add clothes, toys, school stuff and more so you can keep track of them."
                            }
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
