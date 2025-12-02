"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import {
    getToPackItems,
    getPackedItems,
    getToBeFoundItems,
} from "@/lib/travelBagUtils";

export default function TravelBagPage() {
    useEnsureOnboarding();

    const { items } = useItems();
    const { child, caregivers, currentJuneCaregiverId } = useAppState();

    // Get current caregiver from global state
    const currentCaregiver = caregivers.find(
        (c) => c.id === currentJuneCaregiverId
    )!;

    // Local state for packing toggles
    const [locallyPackedIds, setLocallyPackedIds] = useState<Set<string>>(
        new Set()
    );

    // Compute derived lists based on current caregiver
    const initialToPack = getToPackItems(items, currentJuneCaregiverId);
    const initialPacked = getPackedItems(items);
    const toBeFound = getToBeFoundItems(items);

    // Filter items based on local packing state
    const toPack = initialToPack.filter((item) => !locallyPackedIds.has(item.id));
    const packed = [
        ...initialPacked,
        ...initialToPack.filter((item) => locallyPackedIds.has(item.id)),
    ];

    const handleTogglePacked = (itemId: string) => {
        setLocallyPackedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    return (
        <AppShell>
            <div className="mb-4">
                <Link
                    href="/"
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    ← Back to home
                </Link>
            </div>

            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    {child.name}&apos;s travel bag
                </h1>
                <p className="text-sm text-gray-500">
                    See what needs to be packed and what&apos;s on its way.
                </p>
            </div>

            <div className="space-y-4">
                {/* Section A: To pack at [Caregiver's Home] */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                    <h2 className="font-bold text-gray-900 mb-1">
                        To pack at {currentCaregiver.label}&apos;s Home
                    </h2>
                    <p className="text-xs text-gray-500 mb-3">
                        Pack these items into {child.name}&apos;s bag.
                    </p>

                    {toPack.length > 0 ? (
                        <div className="space-y-2">
                            {toPack.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
                                        {item.name.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 text-sm truncate">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">{item.category}</p>
                                    </div>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleTogglePacked(item.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${locallyPackedIds.has(item.id)
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-200 text-gray-600"
                                            }`}
                                    >
                                        {locallyPackedIds.has(item.id) ? "Packed" : "Pack"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-400 text-sm">
                            <p>Nothing to pack right now.</p>
                            <p className="text-xs mt-1">
                                Items will appear here when they&apos;re requested.
                            </p>
                        </div>
                    )}
                </div>

                {/* Section B: Packed and on the way */}
                {packed.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                        <h2 className="font-bold text-gray-900 mb-1">
                            Packed and on the way
                        </h2>
                        <p className="text-xs text-gray-500 mb-3">
                            These items are packed and will move with {child.name}.
                        </p>

                        <div className="space-y-2">
                            {packed.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 bg-green-50 rounded-lg"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center text-sm font-bold text-green-600 flex-shrink-0">
                                        {item.name.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 text-sm truncate">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">{item.category}</p>
                                    </div>

                                    {/* Label */}
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                                        Packed
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section C: To be checked on arrival */}
                {packed.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                        <h2 className="font-bold text-gray-900 mb-1">
                            To be checked on arrival
                        </h2>
                        <p className="text-xs text-gray-500 mb-3">
                            When {child.name} arrives, check that these items are really in the bag.
                        </p>

                        <div className="space-y-2">
                            {packed.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                                        {item.name.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 text-sm truncate">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">{item.category}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section D: To be found */}
                {toBeFound.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className="font-bold text-gray-900">To be found</h2>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {toBeFound.length}
                            </span>
                        </div>

                        <div className="space-y-2">
                            {toBeFound.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/items/${item.id}`}
                                    className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-10 h-10 rounded-lg bg-yellow-200 flex items-center justify-center text-sm font-bold text-yellow-700 flex-shrink-0">
                                        {item.name.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 text-sm truncate">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-yellow-700">Reported missing</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
