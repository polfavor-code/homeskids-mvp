"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import Avatar from "@/components/Avatar";
import { useItems } from "@/lib/ItemsContext";
import { useAppState, ChildProfile } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { Item } from "@/lib/mockData";

export default function TravelBagCheckPage() {
    useEnsureOnboarding();

    const { items, updateItemRequested, updateItemPacked } = useItems();
    const { child, caregivers, homes, currentJuneCaregiverId, currentHomeId } = useAppState();

    // Get current home (where child is now = origin/packer)
    // and destination home (where child is going = requester)
    const originHome = homes.find((h) => h.id === currentHomeId) || homes[0];
    const destinationHome = homes.find((h) => h.id !== currentHomeId);

    // Legacy: Get caregivers for fallback display
    const originCaregiver = caregivers.find((c) => c.id === originHome?.ownerCaregiverId) ||
        caregivers.find((c) => c.id === currentJuneCaregiverId);
    const destinationCaregiver = caregivers.find((c) => c.id === destinationHome?.ownerCaregiverId) ||
        caregivers.find((c) => c.id !== currentJuneCaregiverId);

    // Determine if current user is the packer (child is at their home) or requester
    // For now, we use currentJuneCaregiverId to determine perspective
    // The packer is the one where the child currently is
    const [viewMode, setViewMode] = useState<"packer" | "requester">("packer");

    // Local state for dismissed missing items (session only)
    const [dismissedMissingIds, setDismissedMissingIds] = useState<Set<string>>(new Set());

    const handleDismissMissing = (itemId: string) => {
        setDismissedMissingIds((prev) => new Set(Array.from(prev).concat(itemId)));
    };

    // Helper to check if item is at origin (current home)
    const isAtOrigin = (item: Item) => {
        // Prefer home-based location
        if (originHome && item.locationHomeId === originHome.id) return true;
        // Fallback: check if item's caregiver matches home's owner
        if (originHome?.ownerCaregiverId && item.locationCaregiverId === originHome.ownerCaregiverId) return true;
        // Fallback: legacy caregiver-based
        if (item.locationCaregiverId === currentJuneCaregiverId) return true;
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

    const missingItems = items.filter((item) => item.isMissing && !dismissedMissingIds.has(item.id));

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
        await updateItemRequested(item.id, false);
        // Also unpack it when unrequesting
        await updateItemPacked(item.id, false);
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

    return (
        <AppShell>
            {/* Header */}
            <div className="text-center mb-6">
                <Link
                    href="/"
                    className="text-sm text-textSub hover:text-forest inline-block mb-4 transition-colors"
                >
                    ← Back to home
                </Link>
                <h1 className="font-dmSerif text-2xl text-forest mb-2">
                    {isPacker ? `Pack ${child?.name || "Child"}'s bag` : `Request items for ${child?.name || "Child"}`}
                </h1>
                <p className="text-sm text-textSub">
                    {isPacker
                        ? `Pack ${child?.name || "your child"}'s things for the next stay at ${destinationCaregiver?.label || "the other home"}'s Home.`
                        : `Request items from ${originCaregiver?.label || "the other home"}'s Home for ${child?.name || "your child"}'s next visit.`}
                </p>

                {/* Route Hint */}
                {hasValidSetup && (
                    <div className="flex items-center justify-center gap-3 mt-5 text-sm font-semibold text-forest/80">
                        <span>{originCaregiver.label}'s</span>
                        <div className="h-px w-8 bg-forest/30" />
                        <div className="w-1.5 h-1.5 bg-forest rounded-full" />
                        <div className="h-px w-8 bg-forest/30" />
                        <span>{destinationCaregiver.label}'s</span>
                    </div>
                )}
            </div>

            {/* No items at all empty state */}
            {totalItems === 0 && missingItems.length === 0 ? (
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
                        + Add an item
                    </Link>
                </div>
            ) : isPacker ? (
                /* PACKER VIEW */
                <PackerView
                    child={child}
                    originCaregiver={originCaregiver}
                    destinationCaregiver={destinationCaregiver}
                    itemsToPack={itemsToPack}
                    toPackUnpacked={toPackUnpacked}
                    toPackPacked={toPackPacked}
                    missingItems={missingItems}
                    totalToPack={totalToPack}
                    packedCount={packedCount}
                    progressPercent={progressPercent}
                    onTogglePacked={handleTogglePacked}
                    onDismissMissing={handleDismissMissing}
                />
            ) : (
                /* REQUESTER VIEW */
                <RequesterView
                    child={child}
                    originCaregiver={originCaregiver}
                    destinationCaregiver={destinationCaregiver}
                    itemsToPack={itemsToPack}
                    toPackUnpacked={toPackUnpacked}
                    toPackPacked={toPackPacked}
                    availableAtOrigin={availableAtOrigin}
                    totalToPack={totalToPack}
                    packedCount={packedCount}
                    progressPercent={progressPercent}
                    onRequestItem={handleRequestItem}
                    onUnrequestItem={handleUnrequestItem}
                />
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
                        {originCaregiver?.label || "P"}
                    </button>
                    <button
                        onClick={() => setViewMode("requester")}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors ${!isPacker
                            ? "bg-border/50 text-textSub"
                            : "text-textSub/50 hover:text-textSub"
                            }`}
                    >
                        {destinationCaregiver?.label || "R"}
                    </button>
                </div>
            </div>
        </AppShell>
    );
}

// ============================================
// PACKER VIEW - Can check off items as packed
// ============================================
function PackerView({
    child,
    originCaregiver,
    itemsToPack,
    toPackUnpacked,
    toPackPacked,
    missingItems,
    totalToPack,
    packedCount,
    progressPercent,
    onTogglePacked,
    onDismissMissing,
}: {
    child: ChildProfile | null;
    originCaregiver: { label: string } | undefined;
    destinationCaregiver: { label: string } | undefined;
    itemsToPack: Item[];
    toPackUnpacked: Item[];
    toPackPacked: Item[];
    missingItems: Item[];
    totalToPack: number;
    packedCount: number;
    progressPercent: number;
    onTogglePacked: (id: string) => void;
    onDismissMissing: (id: string) => void;
}) {
    return (
        <div className="space-y-6">
            {/* Section Title */}
            <h2 className="text-lg font-bold text-forest pl-2">What to pack</h2>

            {/* Suitcase Card */}
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
                                        ? `Pack ${totalToPack} item${totalToPack !== 1 ? "s" : ""} at ${originCaregiver?.label || "home"}'s Home`
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
                        <div className="text-center py-8">
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
                                />
                            ))}
                            {/* Packed items */}
                            {toPackPacked.map((item) => (
                                <PackerItemRow
                                    key={item.id}
                                    item={item}
                                    isPacked={true}
                                    onTogglePacked={() => onTogglePacked(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Missing Items Section */}
            {missingItems.length > 0 && (
                <div className="space-y-3">
                    {missingItems.map((item) => (
                        <MissingItemBox
                            key={item.id}
                            item={item}
                            originLabel={originCaregiver?.label || "home"}
                            onDismiss={() => onDismissMissing(item.id)}
                        />
                    ))}
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
    originCaregiver,
    itemsToPack,
    toPackUnpacked,
    toPackPacked,
    availableAtOrigin,
    totalToPack,
    packedCount,
    progressPercent,
    onRequestItem,
    onUnrequestItem,
}: {
    child: ChildProfile | null;
    originCaregiver: { label: string } | undefined;
    destinationCaregiver: { label: string } | undefined;
    itemsToPack: Item[];
    toPackUnpacked: Item[];
    toPackPacked: Item[];
    availableAtOrigin: Item[];
    totalToPack: number;
    packedCount: number;
    progressPercent: number;
    onRequestItem: (item: Item) => void;
    onUnrequestItem: (item: Item) => void;
}) {
    return (
        <div className="space-y-6">
            {/* Section Title */}
            <h2 className="text-lg font-bold text-forest pl-2">Requested items</h2>

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
                                        ? `${packedCount} of ${totalToPack} packed by ${originCaregiver?.label || "packer"}`
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
                        <div className="text-center py-8">
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
                                />
                            ))}
                            {toPackPacked.map((item) => (
                                <RequesterItemRow
                                    key={item.id}
                                    item={item}
                                    isPacked={true}
                                    onUnrequest={() => onUnrequestItem(item)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Available Items to Request */}
            {availableAtOrigin.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                    <div className="p-4 border-b border-border/30 bg-cream/30">
                        <h2 className="font-bold text-forest">Available at {originCaregiver?.label || "other home"}'s</h2>
                        <p className="text-xs text-textSub mt-0.5">
                            Tap an item to request it for {child?.name || "your child"}'s bag
                        </p>
                    </div>

                    <div className="p-4">
                        <div className="space-y-2">
                            {availableAtOrigin.map((item) => (
                                <AvailableItemRow
                                    key={item.id}
                                    item={item}
                                    onRequest={() => onRequestItem(item)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {availableAtOrigin.length === 0 && itemsToPack.length > 0 && (
                <div className="text-center py-4 text-sm text-textSub">
                    All items at {originCaregiver?.label || "the other home"}'s have been requested
                </div>
            )}
        </div>
    );
}

// ============================================
// ITEM ROW COMPONENTS
// ============================================

// Packer can toggle packed status
function PackerItemRow({
    item,
    isPacked,
    onTogglePacked,
}: {
    item: Item;
    isPacked: boolean;
    onTogglePacked: () => void;
}) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isPacked ? "bg-softGreen/30" : "bg-cream"
                }`}
        >
            {/* Thumbnail - clickable to view item */}
            <Link
                href={`/items/${item.id}`}
                className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-border flex-shrink-0 flex items-center justify-center text-xl hover:ring-2 hover:ring-teal/50 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {item.photoUrl ? (
                    <ItemPhoto
                        photoPath={item.photoUrl}
                        itemName={item.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    getItemEmoji(item.category)
                )}
            </Link>

            {/* Info - clickable to toggle */}
            <button
                onClick={onTogglePacked}
                className="flex-1 min-w-0 text-left"
            >
                <div className="flex items-center gap-4">
                    <h3 className={`font-semibold text-sm ${isPacked ? "text-forest/60" : "text-forest"}`}>
                        {item.name}
                    </h3>
                    {/* View link */}
                    <Link
                        href={`/items/${item.id}`}
                        className="text-textSub/40 hover:text-teal text-xs transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View Item
                    </Link>
                </div>
                <p className="text-xs text-textSub">
                    {isPacked ? "Packed ✓" : "To pack"}
                </p>
            </button>

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
        </div>
    );
}

// Requester sees read-only status with option to unrequest
function RequesterItemRow({
    item,
    isPacked,
    onUnrequest,
}: {
    item: Item;
    isPacked: boolean;
    onUnrequest: () => void;
}) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isPacked ? "bg-softGreen/30" : "bg-cream"
                }`}
        >
            {/* Thumbnail - clickable to view item */}
            <Link
                href={`/items/${item.id}`}
                className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-border flex-shrink-0 flex items-center justify-center text-xl hover:ring-2 hover:ring-teal/50 transition-all"
            >
                {item.photoUrl ? (
                    <ItemPhoto
                        photoPath={item.photoUrl}
                        itemName={item.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    getItemEmoji(item.category)
                )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4">
                    <h3 className={`font-semibold text-sm ${isPacked ? "text-forest/60" : "text-forest"}`}>
                        {item.name}
                    </h3>
                    {/* View link */}
                    <Link
                        href={`/items/${item.id}`}
                        className="text-textSub/40 hover:text-teal text-xs transition-colors"
                    >
                        View Item
                    </Link>
                </div>
                <p className={`text-xs ${isPacked ? "text-teal font-medium" : "text-textSub"}`}>
                    {isPacked ? "Packed ✓" : "Waiting to be packed"}
                </p>
            </div>

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
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-border flex-shrink-0 flex items-center justify-center text-xl">
                {item.photoUrl ? (
                    <ItemPhoto
                        photoPath={item.photoUrl}
                        itemName={item.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    getItemEmoji(item.category)
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

// Missing item box - dashed border style
function MissingItemBox({
    item,
    originLabel,
    onDismiss
}: {
    item: Item;
    originLabel: string;
    onDismiss: () => void;
}) {
    return (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-dashed border-red-400">
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
                        getItemEmoji(item.category)
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <strong className="block text-red-700 text-sm font-bold">
                        Missing: {item.name}
                    </strong>
                    <span className="text-xs text-red-600/80">
                        Not found at {originLabel}'s. Check car?
                    </span>
                </div>
            </Link>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
                className="flex-shrink-0 text-red-300 hover:text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                title="Dismiss for this session"
            >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
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
