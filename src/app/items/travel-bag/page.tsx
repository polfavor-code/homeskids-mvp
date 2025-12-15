"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import Avatar from "@/components/Avatar";
import TravelBagTabs, { TravelBagTab } from "@/components/travel-bag/TravelBagTabs";
import BagEssentialsSection from "@/components/travel-bag/BagEssentialsSection";
import PreviousTripTab from "@/components/travel-bag/PreviousTripTab";
import BagHistoryTab from "@/components/travel-bag/BagHistoryTab";
import TransferDetailModal from "@/components/travel-bag/TransferDetailModal";
import { useItems, Item } from "@/lib/ItemsContext";
import { useAppState, ChildProfile } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { useBagTransfers, BagTransfer } from "@/lib/useBagTransfers";
import { ItemsIcon, TravelBagIcon, SearchIcon } from "@/components/icons/DuotoneIcons";

// Shared tab type for the items section
type ItemsTab = "all" | "travel-bag" | "missing";

function TravelBagCheckPageContent() {
    useEnsureOnboarding();
    const searchParams = useSearchParams();

    const { items, updateItemRequested, updateItemPacked, cancelItemRequest, confirmRemoveFromBag, keepInBag } = useItems();
    const { child, caregivers, activeHomes, currentJuneCaregiverId, currentHomeId } = useAppState();

    // Get current home (where child is now = origin/packer)
    // and destination home (where child is going = requester)
    // Only use ACTIVE homes for travel bag
    const originHome = activeHomes.find((h) => h.id === currentHomeId) || activeHomes[0];
    const destinationHome = activeHomes.find((h) => h.id !== currentHomeId);

    // Legacy: Get caregivers for fallback display
    const originCaregiver = caregivers.find((c) => c.id === originHome?.ownerCaregiverId) ||
        caregivers.find((c) => c.id === currentJuneCaregiverId);
    const destinationCaregiver = caregivers.find((c) => c.id === destinationHome?.ownerCaregiverId) ||
        caregivers.find((c) => c.id !== currentJuneCaregiverId);

    // Determine if current user is the packer (child is at their home) or requester
    // The packer is at the home where the child currently is (originHome)
    // The requester is at the other home (destinationHome)
    const currentUserCaregiver = caregivers.find(c => c.isCurrentUser);

    // Check if current user's home is where the child is (origin)
    // User is a packer if they have access to the origin home (where child currently is)
    const userIsAtOrigin = currentUserCaregiver?.accessibleHomeIds?.includes(originHome?.id || "") ||
                           originHome?.ownerCaregiverId === currentUserCaregiver?.id;

    // Auto-determine view mode based on user's home relationship
    const [viewMode, setViewMode] = useState<"packer" | "requester">(userIsAtOrigin ? "packer" : "requester");

    // Update view mode when user/home data changes
    useEffect(() => {
        if (currentUserCaregiver && originHome) {
            const isAtOrigin = currentUserCaregiver.accessibleHomeIds?.includes(originHome.id) ||
                              originHome.ownerCaregiverId === currentUserCaregiver.id;
            setViewMode(isAtOrigin ? "packer" : "requester");
        }
    }, [currentUserCaregiver, originHome]);

    // Tab state - check URL param for initial tab
    const initialTab = searchParams.get("tab") as TravelBagTab || "current";
    const [activeTab, setActiveTab] = useState<TravelBagTab>(initialTab);

    // Bag transfers for history/previous trip tabs
    const { transfers, isLoading: transfersLoading, lastTransfer, hasHistory } = useBagTransfers();

    // Transfer detail modal state
    const [selectedTransfer, setSelectedTransfer] = useState<BagTransfer | null>(null);

    // Local state for dismissed missing items (session only)
    const [dismissedMissingIds, setDismissedMissingIds] = useState<Set<string>>(new Set());

    // State for canceled item confirmation modal
    const [canceledItemModal, setCanceledItemModal] = useState<Item | null>(null);

    const handleDismissMissing = (itemId: string) => {
        setDismissedMissingIds((prev) => new Set(Array.from(prev).concat(itemId)));
    };

    // Handlers for canceled item modal
    const handleKeepInBag = async () => {
        if (canceledItemModal) {
            await keepInBag(canceledItemModal.id);
            setCanceledItemModal(null);
        }
    };

    const handleRemoveFromBag = async () => {
        if (canceledItemModal) {
            await confirmRemoveFromBag(canceledItemModal.id);
            setCanceledItemModal(null);
        }
    };

    // Helper to check if item is at origin (current home where child is)
    const isAtOrigin = (item: Item) => {
        if (!originHome) return false;

        // If item has a locationHomeId set, use that exclusively
        if (item.locationHomeId) {
            return item.locationHomeId === originHome.id;
        }

        // Fallback for legacy items without locationHomeId:
        // Check if item's caregiver is the origin home's owner
        if (originHome.ownerCaregiverId && item.locationCaregiverId === originHome.ownerCaregiverId) return true;

        // Fallback: check if item's caregiver has access to origin home
        if (item.locationCaregiverId && originHome.accessibleCaregiverIds?.includes(item.locationCaregiverId)) return true;

        return false;
    };

    // Items requested for next visit that are at origin (packer's home)
    const itemsToPack = items.filter(
        (item) =>
            item.isRequestedForNextVisit &&
            isAtOrigin(item) &&
            !item.isMissing
    );

    // Items at origin that are NOT requested (available for requester to request)
    const availableAtOrigin = items.filter(
        (item) =>
            isAtOrigin(item) &&
            !item.isRequestedForNextVisit &&
            !item.isMissing
    );

    // ALL items at origin (for showing complete list with in-bag indicators)
    const allItemsAtOrigin = items.filter(
        (item) =>
            isAtOrigin(item) &&
            !item.isMissing
    );

    const awaitingLocationItems = items.filter((item) => item.isMissing && !dismissedMissingIds.has(item.id));

    // Items where requester canceled but still packed - packer needs to confirm removal
    const canceledButPackedItems = items.filter(
        (item) =>
            item.isRequestCanceled &&
            item.isPacked &&
            isAtOrigin(item) &&
            !item.isMissing
    );

    // Split items to pack into packed and unpacked
    const toPackUnpacked = itemsToPack.filter((item) => !item.isPacked);
    const toPackPacked = itemsToPack.filter((item) => item.isPacked);

    const handleTogglePacked = async (itemId: string) => {
        const item = items.find((i) => i.id === itemId);
        if (item) {
            await updateItemPacked(itemId, !item.isPacked);
        }
    };

    const handleRequestItem = async (item: Item) => {
        await updateItemRequested(item.id, true);
    };

    const handleUnrequestItem = async (item: Item) => {
        // Use cancelItemRequest - if packed, it sets isRequestCanceled flag
        // so packer can confirm removal
        await cancelItemRequest(item.id);
    };

    // Check if we have valid home setup
    const hasValidSetup = originCaregiver && destinationCaregiver;

    // Total item count
    const totalItems = items.filter((i) => !i.isMissing).length;

    // Progress calculation
    const packedCount = toPackPacked.length;
    const totalToPack = itemsToPack.length;
    const progressPercent = totalToPack > 0 ? (packedCount / totalToPack) * 100 : 0;

    const isPacker = viewMode === "packer";

    // Count items awaiting location for badge
    const awaitingLocationCount = items.filter((item) => item.isMissing).length;

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/items"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← All items
            </Link>

            {/* Header - Same as Items page */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">{child?.name || "Child"}&apos;s Things</h1>
                    <p className="text-sm text-textSub mt-1">All items across every home.</p>
                </div>
                <Link
                    href="/items/new"
                    className="bg-forest text-white px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest/90 transition-colors border border-forest flex-shrink-0"
                >
                    + New item
                </Link>
            </div>

            {/* Items Section Tabs (shared across Items pages) - Matching Dashboard Button Style */}
            <div className="flex flex-wrap gap-2 mb-4">
                <Link
                    href="/items"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-transparent border border-forest text-forest hover:bg-forest hover:text-white"
                >
                    <ItemsIcon size={16} />
                    All items ({items.length})
                </Link>
                <Link
                    href="/items/travel-bag"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors bg-forest text-white border border-forest"
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

            {/* Travel Bag Internal Tabs - no card wrapper */}
            <div className="mb-4">
                <TravelBagTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Tab Content */}
            {activeTab === "current" ? (
                /* CURRENT PACKLIST TAB */
                <div>
                    {totalItems === 0 && awaitingLocationItems.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-border text-center">
                            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                📦
                            </div>
                            <h3 className="font-bold text-forest mb-2">No items found for {child?.name || "your child"}</h3>
                            <p className="text-sm text-textSub mb-4 max-w-xs mx-auto">
                                Add items to start tracking what moves between homes.
                            </p>
                            <Link
                                href="/items/new"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl font-medium hover:bg-teal transition-colors"
                            >
                                + New item
                            </Link>
                        </div>
                    ) : isPacker ? (
                        /* PACKER VIEW */
                        <PackerView
                            child={child}
                            originHome={originHome}
                            destinationHome={destinationHome}
                            itemsToPack={itemsToPack}
                            toPackUnpacked={toPackUnpacked}
                            toPackPacked={toPackPacked}
                            awaitingLocationItems={awaitingLocationItems}
                            canceledButPackedItems={canceledButPackedItems}
                            allItemsAtOrigin={allItemsAtOrigin}
                            totalToPack={totalToPack}
                            packedCount={packedCount}
                            progressPercent={progressPercent}
                            onTogglePacked={handleTogglePacked}
                            onDismissMissing={handleDismissMissing}
                            onShowCanceledModal={setCanceledItemModal}
                            onRequestItem={handleRequestItem}
                            onUnrequestItem={handleUnrequestItem}
                            childId={child?.id}
                            caregivers={caregivers}
                            currentUserCaregiver={currentUserCaregiver}
                        />
                    ) : (
                        /* REQUESTER VIEW */
                        <RequesterView
                            child={child}
                            originHome={originHome}
                            destinationHome={destinationHome}
                            itemsToPack={itemsToPack}
                            toPackUnpacked={toPackUnpacked}
                            toPackPacked={toPackPacked}
                            allItemsAtOrigin={allItemsAtOrigin}
                            totalToPack={totalToPack}
                            packedCount={packedCount}
                            progressPercent={progressPercent}
                            onRequestItem={handleRequestItem}
                            onUnrequestItem={handleUnrequestItem}
                            childId={child?.id}
                            caregivers={caregivers}
                            currentUserCaregiver={currentUserCaregiver}
                        />
                    )}
                </div>
            ) : activeTab === "previous" ? (
                /* PREVIOUS TRIP TAB */
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/30">
                    <PreviousTripTab
                        lastTransfer={lastTransfer}
                        isLoading={transfersLoading}
                        onViewItems={setSelectedTransfer}
                    />
                </div>
            ) : (
                /* BAG HISTORY TAB */
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/30">
                    <BagHistoryTab
                        transfers={transfers}
                        isLoading={transfersLoading}
                        onSelectTransfer={setSelectedTransfer}
                    />
                </div>
            )}

            {/* Dev: View Mode Toggle (super tiny at bottom) */}
            <div className="flex justify-center mt-12 opacity-20 hover:opacity-60 transition-opacity">
                <div className="inline-flex gap-1">
                    <button
                        onClick={() => setViewMode("packer")}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors ${isPacker
                            ? "bg-border/50 text-textSub"
                            : "text-textSub/50 hover:text-textSub"
                            }`}
                    >
                        {originHome?.name || "Origin"}
                    </button>
                    <button
                        onClick={() => setViewMode("requester")}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors ${!isPacker
                            ? "bg-border/50 text-textSub"
                            : "text-textSub/50 hover:text-textSub"
                            }`}
                    >
                        {destinationHome?.name || "Dest"}
                    </button>
                </div>
            </div>

            {/* Transfer Detail Modal */}
            <TransferDetailModal
                transfer={selectedTransfer}
                childName={child?.name || "Child"}
                onClose={() => setSelectedTransfer(null)}
            />

            {/* Canceled Request Confirmation Modal */}
            {canceledItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="font-dmSerif text-xl text-forest mb-2">
                            Request canceled — remove from bag?
                        </h3>
                        <p className="text-sm text-textSub mb-6">
                            {destinationHome?.name || "The other home"} no longer needs <strong>{canceledItemModal.name}</strong> packed. Would you like to remove it from {child?.name || "your child"}'s bag?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRemoveFromBag}
                                className="flex-1 py-2.5 px-4 bg-cream border border-border text-forest rounded-xl font-medium hover:bg-border/30 transition-colors"
                            >
                                Remove from bag
                            </button>
                            <button
                                onClick={handleKeepInBag}
                                className="flex-1 py-2.5 px-4 bg-forest text-white rounded-xl font-medium hover:bg-teal transition-colors"
                            >
                                Keep packed
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

// ============================================
// PACKER VIEW - Can check off items as packed
// ============================================
function PackerView({
    child,
    originHome,
    destinationHome,
    itemsToPack,
    toPackUnpacked,
    toPackPacked,
    awaitingLocationItems,
    canceledButPackedItems,
    allItemsAtOrigin,
    totalToPack,
    packedCount,
    progressPercent,
    onTogglePacked,
    onDismissMissing,
    onShowCanceledModal,
    onRequestItem,
    onUnrequestItem,
    childId,
    caregivers,
    currentUserCaregiver,
}: {
    child: ChildProfile | null;
    originHome: { name: string } | undefined;
    destinationHome: { name: string } | undefined;
    itemsToPack: Item[];
    toPackUnpacked: Item[];
    toPackPacked: Item[];
    awaitingLocationItems: Item[];
    canceledButPackedItems: Item[];
    allItemsAtOrigin: Item[];
    totalToPack: number;
    packedCount: number;
    progressPercent: number;
    onTogglePacked: (id: string) => void;
    onDismissMissing: (id: string) => void;
    onShowCanceledModal: (item: Item) => void;
    onRequestItem: (item: Item) => void;
    onUnrequestItem: (item: Item) => void;
    childId: string | undefined;
    caregivers: { id: string; name: string; isCurrentUser?: boolean }[];
    currentUserCaregiver: { id: string; name: string } | undefined;
}) {
    // State for showing/hiding missing items
    const [showMissingItems, setShowMissingItems] = React.useState(false);

    // Helper to get role-aware "Requested by" label
    const getRequestedLabel = (requestedById: string | null | undefined) => {
        if (!requestedById) return undefined;
        if (currentUserCaregiver && requestedById === currentUserCaregiver.id) {
            return "Requested by you";
        }
        const requester = caregivers.find(c => c.id === requestedById);
        if (requester) {
            const firstName = requester.name.split(" ")[0];
            return `Requested by ${firstName}`;
        }
        return undefined;
    };

    // Helper to get role-aware "Packed by" label
    const getPackedLabel = (packedById: string | null | undefined) => {
        if (!packedById) return undefined;
        if (currentUserCaregiver && packedById === currentUserCaregiver.id) {
            return "Packed by you";
        }
        const packer = caregivers.find(c => c.id === packedById);
        if (packer) {
            const firstName = packer.name.split(" ")[0];
            return `Packed by ${firstName}`;
        }
        return undefined;
    };

    return (
        <div className="space-y-4">
            {/* Section Title with flow info */}
            <h2 className="text-lg font-bold text-forest pl-2">
                {originHome?.name || "This home"} → {destinationHome?.name || "Other home"}
            </h2>

            {/* Suitcase Card - directly after header */}
            <div className="relative pt-6">
                {/* Suitcase Handle (Behind Card) */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-0">
                    <BagHandle name={child?.name} gender={child?.gender} part="handle" />
                </div>
                {/* Label (In Front of Card) */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <BagHandle name={child?.name} gender={child?.gender} part="label" />
                </div>

                {/* Main Bag Card */}
                <div className="relative z-10 bg-white rounded-3xl p-6 shadow-lg border border-border/30">
                    {/* Bag Header */}
                    <div className="flex justify-between items-start mb-6 pb-5 border-b border-dashed border-border">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <Avatar
                                src={child?.avatarUrl}
                                initial={child?.avatarInitials || child?.name?.charAt(0)}
                                size={48}
                                bgColor="#E07B39"
                            />
                            <div>
                                <h3 className="font-dmSerif text-lg text-forest">
                                    {child?.name || "Child"}'s bag
                                </h3>
                                <p className="text-sm text-textSub">
                                    {totalToPack > 0
                                        ? `Pack ${totalToPack} item${totalToPack !== 1 ? "s" : ""} at ${originHome?.name || "home"}`
                                        : "No items requested"}
                                </p>
                            </div>
                        </div>

                        {/* Progress Ring */}
                        {totalToPack > 0 && (
                            <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15"
                                        fill="none"
                                        stroke="#E5E7EB"
                                        strokeWidth="3"
                                    />
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15"
                                        fill="none"
                                        stroke="#4CA1AF"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${progressPercent * 0.94} 100`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-teal">
                                    {packedCount}/{totalToPack}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Item List */}
                    {itemsToPack.length === 0 ? (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 bg-softGreen rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                                ✓
                            </div>
                            <p className="text-sm text-textSub">No items requested yet</p>
                            <p className="text-xs text-textSub/70 mt-1">
                                The other caregiver can request items to pack
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Unpacked items first */}
                            {toPackUnpacked.map((item) => (
                                <PackerItemRow
                                    key={item.id}
                                    item={item}
                                    isPacked={false}
                                    onTogglePacked={() => onTogglePacked(item.id)}
                                    onRemove={() => onUnrequestItem(item)}
                                    requestedLabel={getRequestedLabel(item.requestedBy)}
                                    packedLabel={getPackedLabel(item.packedBy)}
                                />
                            ))}
                            {/* Packed items */}
                            {toPackPacked.map((item) => (
                                <PackerItemRow
                                    key={item.id}
                                    item={item}
                                    isPacked={true}
                                    onTogglePacked={() => onTogglePacked(item.id)}
                                    onRemove={() => onUnrequestItem(item)}
                                    requestedLabel={getRequestedLabel(item.requestedBy)}
                                    packedLabel={getPackedLabel(item.packedBy)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Bag Essentials - Inline in bag card */}
                    <div className="mt-4 pt-4 border-t border-dashed border-border">
                        <BagEssentialsSection childId={childId} />
                    </div>
                </div>
            </div>

            {/* Awaiting Location Items - Info Card (neutral style) */}
            {awaitingLocationItems.length > 0 && (
                <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg flex-shrink-0">📍</span>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-forest">
                                    {awaitingLocationItems.length} item{awaitingLocationItems.length !== 1 ? "s" : ""} awaiting location
                                </p>
                                <p className="text-xs text-textSub">
                                    Location not yet confirmed.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowMissingItems(!showMissingItems)}
                            className="flex-shrink-0 px-3 py-1.5 bg-white/60 hover:bg-white text-forest text-xs font-semibold rounded-lg transition-colors border border-border/50"
                        >
                            {showMissingItems ? "Hide" : "View items"}
                        </button>
                    </div>

                    {/* Expandable awaiting location items list */}
                    {showMissingItems && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                            {awaitingLocationItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 bg-white/60 rounded-xl"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                                        {item.photoUrl ? (
                                            <ItemPhoto
                                                photoPath={item.photoUrl}
                                                itemName={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            getItemEmoji(item.category || "Other")
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-forest truncate">{item.name}</p>
                                        <p className="text-xs text-textSub">{item.category || "Other"}</p>
                                    </div>
                                    <Link
                                        href={`/items/${item.id}`}
                                        className="text-xs text-forest hover:text-teal font-medium"
                                    >
                                        View
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All Items at Origin (with in-bag indicators) - simplified */}
            {allItemsAtOrigin.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs text-textSub mb-2 px-1">
                        Items at {originHome?.name || "this home"}
                    </p>
                    <div className="space-y-2">
                        {allItemsAtOrigin.map((item) => {
                            const isInBag = item.isRequestedForNextVisit || false;
                            const isPacked = item.isPacked || false;
                            return (
                                <AllItemsRow
                                    key={item.id}
                                    item={item}
                                    isInBag={isInBag}
                                    isPacked={isPacked}
                                    onAdd={() => onRequestItem(item)}
                                    requestedLabel={getRequestedLabel(item.requestedBy)}
                                    packedLabel={getPackedLabel(item.packedBy)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// REQUESTER VIEW - Read-only status, can request items
// ============================================
function RequesterView({
    child,
    originHome,
    destinationHome,
    itemsToPack,
    toPackUnpacked,
    toPackPacked,
    allItemsAtOrigin,
    totalToPack,
    packedCount,
    progressPercent,
    onRequestItem,
    onUnrequestItem,
    childId,
    caregivers,
    currentUserCaregiver,
}: {
    child: ChildProfile | null;
    originHome: { name: string } | undefined;
    destinationHome: { name: string } | undefined;
    itemsToPack: Item[];
    toPackUnpacked: Item[];
    toPackPacked: Item[];
    allItemsAtOrigin: Item[];
    totalToPack: number;
    packedCount: number;
    progressPercent: number;
    onRequestItem: (item: Item) => void;
    onUnrequestItem: (item: Item) => void;
    childId: string | undefined;
    caregivers: { id: string; name: string; isCurrentUser?: boolean }[];
    currentUserCaregiver: { id: string; name: string } | undefined;
}) {
    // Helper to get role-aware "Requested by" label
    const getRequestedLabel = (requestedById: string | null | undefined) => {
        if (!requestedById) return undefined;
        if (currentUserCaregiver && requestedById === currentUserCaregiver.id) {
            return "Requested by you";
        }
        const requester = caregivers.find(c => c.id === requestedById);
        if (requester) {
            const firstName = requester.name.split(" ")[0];
            return `Requested by ${firstName}`;
        }
        return undefined;
    };

    // Helper to get role-aware "Packed by" label
    const getPackedLabel = (packedById: string | null | undefined) => {
        if (!packedById) return undefined;
        if (currentUserCaregiver && packedById === currentUserCaregiver.id) {
            return "Packed by you";
        }
        const packer = caregivers.find(c => c.id === packedById);
        if (packer) {
            const firstName = packer.name.split(" ")[0];
            return `Packed by ${firstName}`;
        }
        return undefined;
    };

    return (
        <div className="space-y-6">
            {/* Section Title with flow info */}
            <h2 className="text-lg font-bold text-forest pl-2">
                {originHome?.name || "Other home"} → {destinationHome?.name || "Your home"}
            </h2>

            {/* Suitcase Card - Read Only View */}
            <div className="relative pt-6">
                {/* Suitcase Handle */}
                {/* Suitcase Handle (Behind Card) */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-0">
                    <BagHandle name={child?.name} gender={child?.gender} part="handle" />
                </div>
                {/* Label (In Front of Card) */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <BagHandle name={child?.name} gender={child?.gender} part="label" />
                </div>

                {/* Main Bag Card */}
                <div className="relative z-10 bg-white rounded-3xl p-6 shadow-lg border border-border/30">
                    {/* Bag Header */}
                    <div className="flex justify-between items-start mb-6 pb-5 border-b border-dashed border-border">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <Avatar
                                src={child?.avatarUrl}
                                initial={child?.avatarInitials || child?.name?.charAt(0)}
                                size={48}
                                bgColor="#E07B39"
                            />
                            <div>
                                <h3 className="font-dmSerif text-lg text-forest">
                                    {child?.name || "Child"}'s bag
                                </h3>
                                <p className="text-sm text-textSub">
                                    {totalToPack > 0
                                        ? `${packedCount} of ${totalToPack} packed at ${originHome?.name || "origin"}`
                                        : "No items requested yet"}
                                </p>
                            </div>
                        </div>

                        {/* Progress Ring */}
                        {totalToPack > 0 && (
                            <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15"
                                        fill="none"
                                        stroke="#E5E7EB"
                                        strokeWidth="3"
                                    />
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15"
                                        fill="none"
                                        stroke="#4CA1AF"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${progressPercent * 0.94} 100`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-teal">
                                    {packedCount}/{totalToPack}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Item List - Read Only */}
                    {itemsToPack.length === 0 ? (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 bg-cream rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                                📦
                            </div>
                            <p className="text-sm text-textSub">No items requested</p>
                            <p className="text-xs text-textSub/70 mt-1">
                                Request items from the list below
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Show all requested items with their pack status */}
                            {toPackUnpacked.map((item) => (
                                <RequesterItemRow
                                    key={item.id}
                                    item={item}
                                    isPacked={false}
                                    onUnrequest={() => onUnrequestItem(item)}
                                    requestedLabel={getRequestedLabel(item.requestedBy)}
                                    packedLabel={getPackedLabel(item.packedBy)}
                                />
                            ))}
                            {toPackPacked.map((item) => (
                                <RequesterItemRow
                                    key={item.id}
                                    item={item}
                                    isPacked={true}
                                    onUnrequest={() => onUnrequestItem(item)}
                                    requestedLabel={getRequestedLabel(item.requestedBy)}
                                    packedLabel={getPackedLabel(item.packedBy)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Bag Essentials - Inline in bag card */}
                    <div className="mt-4 pt-4 border-t border-dashed border-border">
                        <BagEssentialsSection childId={childId} />
                    </div>
                </div>
            </div>

            {/* All Items at Origin (with request status) - simplified */}
            {allItemsAtOrigin.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs text-textSub mb-2 px-1">
                        Items at {originHome?.name || "other home"}
                    </p>
                    <div className="space-y-2">
                        {allItemsAtOrigin.map((item) => {
                            const isInBag = item.isRequestedForNextVisit || false;
                            const isPacked = item.isPacked || false;
                            return (
                                <AllItemsRow
                                    key={item.id}
                                    item={item}
                                    isInBag={isInBag}
                                    isPacked={isPacked}
                                    onAdd={() => onRequestItem(item)}
                                    requestedLabel={getRequestedLabel(item.requestedBy)}
                                    packedLabel={getPackedLabel(item.packedBy)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// ITEM ROW COMPONENTS
// ============================================

// View icon component
function ViewIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

// Packer can toggle packed status and remove from bag
function PackerItemRow({
    item,
    isPacked,
    onTogglePacked,
    onRemove,
    packedLabel,
    requestedLabel,
}: {
    item: Item;
    isPacked: boolean;
    onTogglePacked: () => void;
    onRemove: () => void;
    packedLabel?: string;
    requestedLabel?: string;
}) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isPacked ? "bg-softGreen/30" : "bg-cream"
                }`}
        >
            {/* Thumbnail - clickable to view item */}
            <Link
                href={`/items/${item.id}`}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-white border border-border flex-shrink-0 flex items-center justify-center text-xl hover:ring-2 hover:ring-teal/50 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {item.photoUrl ? (
                    <ItemPhoto
                        photoPath={item.photoUrl}
                        itemName={item.name}
                        className="w-10 h-10 rounded-lg object-cover"
                    />
                ) : (
                    getItemEmoji(item.category || "Other")
                )}
            </Link>

            {/* Info - clickable to toggle */}
            <button
                onClick={onTogglePacked}
                className="flex-1 min-w-0 text-left"
            >
                <h3 className={`font-semibold text-sm ${isPacked ? "text-forest/60" : "text-forest"}`}>
                    {item.name}
                </h3>
                <p className="text-xs text-textSub">
                    {isPacked ? (packedLabel || "Packed") + " ✓" : requestedLabel ? `${requestedLabel} · To pack` : "To pack"}
                </p>
            </button>

            {/* View button */}
            <Link
                href={`/items/${item.id}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-textSub/50 hover:text-teal hover:bg-teal/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="View item"
            >
                <ViewIcon size={16} />
            </Link>

            {/* Checkbox */}
            <button
                onClick={onTogglePacked}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isPacked
                    ? "bg-teal border-teal text-white"
                    : "border-border bg-white hover:border-teal/50"
                    }`}
            >
                {isPacked && <span className="text-sm">✓</span>}
            </button>

            {/* Remove button */}
            <button
                onClick={onRemove}
                className="text-xs text-textSub hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                title="Remove from bag"
            >
                ✕
            </button>
        </div>
    );
}

// Requester sees read-only status with option to unrequest
function RequesterItemRow({
    item,
    isPacked,
    onUnrequest,
    packedLabel,
    requestedLabel,
}: {
    item: Item;
    isPacked: boolean;
    onUnrequest: () => void;
    packedLabel?: string;
    requestedLabel?: string;
}) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isPacked ? "bg-softGreen/30" : "bg-cream"
                }`}
        >
            {/* Thumbnail - clickable to view item */}
            <Link
                href={`/items/${item.id}`}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-white border border-border flex-shrink-0 flex items-center justify-center text-xl hover:ring-2 hover:ring-teal/50 transition-all"
            >
                {item.photoUrl ? (
                    <ItemPhoto
                        photoPath={item.photoUrl}
                        itemName={item.name}
                        className="w-10 h-10 rounded-lg object-cover"
                    />
                ) : (
                    getItemEmoji(item.category || "Other")
                )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm ${isPacked ? "text-forest/60" : "text-forest"}`}>
                    {item.name}
                </h3>
                <p className={`text-xs ${isPacked ? "text-teal font-medium" : "text-textSub"}`}>
                    {isPacked ? (packedLabel || "Packed") + " ✓" : requestedLabel ? `${requestedLabel} · Waiting to be packed` : "Waiting to be packed"}
                </p>
            </div>

            {/* View button */}
            <Link
                href={`/items/${item.id}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-textSub/50 hover:text-teal hover:bg-teal/10 transition-colors"
                title="View item"
            >
                <ViewIcon size={16} />
            </Link>

            {/* Status indicator (read-only) */}
            <div
                className={`w-6 h-6 rounded-md flex items-center justify-center ${isPacked
                    ? "bg-teal text-white"
                    : "bg-yellow-100 text-yellow-600"
                    }`}
            >
                {isPacked ? <span className="text-sm">✓</span> : <span className="text-xs">⏳</span>}
            </div>

            {/* Remove button */}
            <button
                onClick={onUnrequest}
                className="text-xs text-textSub hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                title="Remove from bag"
            >
                ✕
            </button>
        </div>
    );
}

// Available items that can be requested
function AvailableItemRow({
    item,
    onRequest,
}: {
    item: Item;
    onRequest: () => void;
}) {
    return (
        <button
            onClick={onRequest}
            className="w-full flex items-center gap-3 p-3 bg-cream/50 rounded-xl hover:bg-teal/10 hover:border-teal/30 border border-transparent transition-all text-left group"
        >
            {/* Thumbnail */}
            <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-white border border-border flex-shrink-0 flex items-center justify-center text-xl">
                {item.photoUrl ? (
                    <ItemPhoto
                        photoPath={item.photoUrl}
                        itemName={item.name}
                        className="w-10 h-10 rounded-lg object-cover"
                    />
                ) : (
                    getItemEmoji(item.category || "Other")
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-forest group-hover:text-teal transition-colors">
                    {item.name}
                </h3>
                <p className="text-xs text-textSub">{item.category}</p>
            </div>

            {/* Add indicator */}
            <div className="w-6 h-6 rounded-full bg-forest/10 text-forest flex items-center justify-center text-sm group-hover:bg-teal group-hover:text-white transition-colors">
                +
            </div>
        </button>
    );
}

// All items row - shows items with in-bag/not-in-bag state
function AllItemsRow({
    item,
    isInBag,
    isPacked,
    onAdd,
    packedLabel,
    requestedLabel,
}: {
    item: Item;
    isInBag: boolean;
    isPacked: boolean;
    onAdd: () => void;
    packedLabel?: string;
    requestedLabel?: string;
}) {
    // If in bag, show greyed out / disabled state with appropriate status
    if (isInBag) {
        const statusText = isPacked ? (packedLabel || "Packed") + " ✓" : requestedLabel ? `${requestedLabel} · Waiting` : "Waiting to be packed";
        return (
            <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                {/* Thumbnail */}
                <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center text-xl grayscale opacity-50">
                    {item.photoUrl ? (
                        <ItemPhoto
                            photoPath={item.photoUrl}
                            itemName={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                        />
                    ) : (
                        getItemEmoji(item.category || "Other")
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 opacity-50">
                    <h3 className="font-medium text-sm text-gray-400">
                        {item.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                        {statusText}
                    </p>
                </div>

                {/* View button - stays clickable */}
                <Link
                    href={`/items/${item.id}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-textSub/50 hover:text-teal hover:bg-teal/10 transition-colors"
                    title="View item"
                >
                    <ViewIcon size={16} />
                </Link>

                {/* Status indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm opacity-50 ${
                    isPacked ? "bg-gray-300 text-gray-500" : "bg-gray-200 text-gray-400"
                }`}>
                    {isPacked ? "✓" : "⏳"}
                </div>
            </div>
        );
    }

    // Not in bag - can be added
    return (
        <div className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent bg-cream/50 hover:bg-teal/10 hover:border-teal/30 transition-all text-left group">
            {/* Thumbnail */}
            <Link
                href={`/items/${item.id}`}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-white border border-border flex-shrink-0 flex items-center justify-center text-xl hover:ring-2 hover:ring-teal/50 transition-all"
            >
                {item.photoUrl ? (
                    <ItemPhoto
                        photoPath={item.photoUrl}
                        itemName={item.name}
                        className="w-10 h-10 rounded-lg object-cover"
                    />
                ) : (
                    getItemEmoji(item.category || "Other")
                )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-forest group-hover:text-teal transition-colors">
                    {item.name}
                </h3>
                <p className="text-xs text-textSub">{item.category}</p>
            </div>

            {/* View button */}
            <Link
                href={`/items/${item.id}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-textSub/50 hover:text-teal hover:bg-teal/10 transition-colors"
                title="View item"
            >
                <ViewIcon size={16} />
            </Link>

            {/* Add button */}
            <button
                onClick={onAdd}
                className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center text-sm hover:bg-forest transition-colors"
                title="Add to bag"
            >
                +
            </button>
        </div>
    );
}

// Awaiting location item box - neutral dashed border style
function AwaitingLocationItemBox({
    item,
    onDismiss
}: {
    item: Item;
    onDismiss: () => void;
}) {
    return (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Link
                href={`/items/${item.id}`}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
                <div className="text-xl flex-shrink-0">
                    {item.photoUrl ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden">
                            <ItemPhoto
                                photoPath={item.photoUrl}
                                itemName={item.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        getItemEmoji(item.category || "Other")
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <strong className="block text-gray-700 text-sm font-medium">
                        {item.name}
                    </strong>
                    <span className="text-xs text-gray-500">
                        Location not confirmed
                    </span>
                </div>
            </Link>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
                className="flex-shrink-0 text-gray-300 hover:text-gray-500 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                title="Dismiss for this session"
            >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
    );
}

// Canceled item box - yellow/warning style, triggers modal for packer
function CanceledItemBox({
    item,
    destinationLabel,
    onReview
}: {
    item: Item;
    destinationLabel: string;
    onReview: () => void;
}) {
    return (
        <button
            onClick={onReview}
            className="w-full flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-300 hover:bg-yellow-100 transition-colors text-left"
        >
            <div className="text-xl flex-shrink-0">
                {item.photoUrl ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                        <ItemPhoto
                            photoPath={item.photoUrl}
                            itemName={item.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                        {getItemEmoji(item.category || "Other")}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <strong className="block text-yellow-800 text-sm font-bold">
                    {item.name}
                </strong>
                <span className="text-xs text-yellow-700">
                    {destinationLabel} canceled this request
                </span>
            </div>
            <div className="flex-shrink-0 bg-yellow-200 text-yellow-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
                Review
            </div>
        </button>
    );
}

// Helper function to get emoji based on category
function getItemEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
        clothing: "👕",
        toys: "🧸",
        electronics: "📱",
        books: "📚",
        school: "🎒",
        sports: "⚽",
        hygiene: "🧴",
        medicine: "💊",
        documents: "📂",
        other: "📦",
    };
    return emojiMap[category?.toLowerCase()] || "📦";
}

// ============================================
// NEW BAG HANDLE COMPONENT
// ============================================
function BagHandle({ name, gender, part = "all" }: { name: string | undefined; gender?: "boy" | "girl" | null; part?: "all" | "handle" | "label" }) {
    const childName = name || "Child";
    // Use gender prop for theming - pink for girl, blue for boy (default to pink if no gender set)
    const isGirl = gender !== "boy";
    const themeClass = isGirl ? "pink-theme" : "blue-theme";

    return (
        <div className={`bag-handle-container ${themeClass}`}>
            {/* Font import */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');
                
                .bag-handle-container {
                    position: relative;
                    width: 140px;
                    height: 40px;
                }

                .bh-handle {
                    width: 100%;
                    height: 100%;
                    border-radius: 20px 20px 0 0;
                    border: 10px solid;
                    border-bottom: none;
                    position: absolute;
                    bottom: -10px;
                    left: 0;
                    z-index: 0;
                }

                .bh-rope-knot {
                    position: absolute;
                    top: 4px; /* Lowered further */
                    left: 82%;
                    z-index: 10;
                    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
                    transform-origin: top center;
                    animation: bh-swing 4s ease-in-out infinite alternate;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 0;
                }

                @keyframes bh-swing {
                    from { transform: rotate(6deg); }
                    to { transform: rotate(-6deg); }
                }

                .bh-knot-loop {
                    width: 20px;
                    height: 20px;
                    border: 3px solid #D7CCC8;
                    border-radius: 50%;
                    background: #EFEBE9;
                    flex-shrink: 0;
                    position: relative;
                    z-index: 2;
                }

                .bh-string {
                    width: 2px;
                    height: 24px;
                    background: #D7CCC8;
                    margin-top: -3px; /* Tighter connection */
                    flex-shrink: 0;
                }

                .bh-tag {
                    background: white;
                    padding: 6px 16px 8px;
                    border-radius: 4px;
                    transform: rotate(-15deg);
                    transform-origin: 50% -5px;
                    border: 2px solid;
                    position: relative;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    min-width: 40px;
                    max-width: 200px;
                    white-space: nowrap;
                    text-align: center;
                    margin-top: -2px;
                }

                .bh-tag::before {
                    content: '';
                    position: absolute;
                    top: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 4px;
                    background: #FFF;
                    border: 2px solid #D7CCC8;
                    border-radius: 50%;
                }

                .bh-child-name {
                    font-family: 'Caveat', cursive;
                    font-size: 24px;
                    line-height: 1;
                    color: #2C3E2D;
                }

                /* Pink Theme */
                .pink-theme .bh-handle { border-color: #F8BBD0; background: transparent; }
                .pink-theme .bh-tag { background: #FFF0F5; border-color: #F06292; }

                /* Blue Theme */
                .blue-theme .bh-handle { border-color: #BBDEFB; background: transparent; }
                .blue-theme .bh-tag { background: #E3F2FD; border-color: #64B5F6; }
            `}</style>

            {(part === "all" || part === "handle") && <div className="bh-handle"></div>}

            {(part === "all" || part === "label") && (
                <div className="bh-rope-knot">
                    <div className="bh-knot-loop"></div>
                    <div className="bh-string"></div>
                    <div className="bh-tag">
                        <div className="bh-child-name">{childName}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TravelBagCheckPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TravelBagCheckPageContent />
        </Suspense>
    );
}
