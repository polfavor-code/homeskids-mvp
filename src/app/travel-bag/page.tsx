"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useItems } from "@/lib/ItemsContextV2";
import { useAppState } from "@/lib/AppStateContextV2";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

export default function TravelBagPage() {
    useEnsureOnboarding();

    const { items } = useItems();
    const { child, caregivers, currentJuneCaregiverId } = useAppState();

    // Get current caregiver from global state
    const currentCaregiver = caregivers.find(
        (c) => c.id === currentJuneCaregiverId
    )!;

    // Local state for checkbox toggles
    const [packedIds, setPackedIds] = useState<Set<string>>(new Set());

    // Filter items for the unified checklist
    const requestedItems = items.filter(
        (item) =>
            item.isRequestedForNextVisit &&
            !item.isMissing &&
            item.locationCaregiverId === currentJuneCaregiverId
    );

    const missingItems = items.filter((item) => item.isMissing);

    // Sort into groups based on packed state
    const toPackItems = requestedItems.filter((item) => !packedIds.has(item.id));
    const packedItems = requestedItems.filter((item) => packedIds.has(item.id));

    const handleTogglePacked = (itemId: string) => {
        setPackedIds((prev) => {
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
                    {child?.name || "Child"}'s travel bag
                </h1>
                <p className="text-sm text-gray-500">
                    Check off items as you pack them.
                </p>
            </div>

            <div className="space-y-4">
                {/* Unified Checklist Card */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                    {/* To Pack Section */}
                    {toPackItems.length > 0 && (
                        <div className="mb-6">
                            <h2 className="font-bold text-gray-900 mb-3">To pack</h2>
                            <div className="space-y-2">
                                {toPackItems.map((item) => (
                                    <label
                                        key={item.id}
                                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={false}
                                            onChange={() => handleTogglePacked(item.id)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />

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
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Packed Section */}
                    {packedItems.length > 0 && (
                        <div className="mb-6">
                            <h2 className="font-bold text-gray-900 mb-3">Packed</h2>
                            <div className="space-y-2">
                                {packedItems.map((item) => (
                                    <label
                                        key={item.id}
                                        className="flex items-center gap-3 p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                                    >
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            onChange={() => handleTogglePacked(item.id)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />

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
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Missing Items Section */}
                    {missingItems.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <h2 className="font-bold text-gray-900">Missing</h2>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {missingItems.length}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {missingItems.map((item) => (
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

                    {/* Empty state */}
                    {toPackItems.length === 0 && packedItems.length === 0 && missingItems.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <p className="mb-2">Nothing to pack right now.</p>
                            <p className="text-xs">Items will appear here when they're requested.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
