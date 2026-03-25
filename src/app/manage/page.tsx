"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAppState, Household } from "@/lib/AppStateContext";
import HouseholdCard from "@/components/household/HouseholdCard";

export default function ManagePage() {
    const { households, currentHousehold } = useAppState();

    // Modal state for actions
    const [actionModal, setActionModal] = useState<{
        type: "edit" | "delete" | "leave" | null;
        household: Household | null;
    }>({ type: null, household: null });

    // Handlers for household actions
    const handleEdit = (household: Household) => {
        setActionModal({ type: "edit", household });
    };

    const handleDelete = (household: Household) => {
        setActionModal({ type: "delete", household });
    };

    const handleLeave = (household: Household) => {
        setActionModal({ type: "leave", household });
    };

    const closeModal = () => {
        setActionModal({ type: null, household: null });
    };

    // If no households, show empty state
    if (!households || households.length === 0) {
        return (
            <AppShell>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-dmSerif text-forest">Manage household</h1>
                        <p className="text-sm text-textSub">
                            Organize your homes, family members, and caregivers
                        </p>
                    </div>
                    <div className="card-organic p-8 text-center">
                        <p className="text-textSub">No households found. Create a home to get started.</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Manage household</h1>
                    <p className="text-sm text-textSub">
                        Organize your homes, family members, and caregivers
                    </p>
                </div>

                {/* Household Cards */}
                <div className="space-y-4">
                    {households.map((household) => (
                        <HouseholdCard
                            key={household.id}
                            household={household}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onLeave={handleLeave}
                        />
                    ))}
                </div>
            </div>

            {/* Action Modals */}
            {actionModal.type && actionModal.household && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={closeModal}
                    />

                    {/* Modal content */}
                    <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        {actionModal.type === "edit" && (
                            <>
                                <h3 className="text-lg font-semibold text-forest mb-2">
                                    Edit household
                                </h3>
                                <p className="text-sm text-textSub mb-6">
                                    Edit settings for "{actionModal.household.name}".
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-forest mb-1">
                                            Household name
                                        </label>
                                        <input
                                            type="text"
                                            defaultValue={actionModal.household.name}
                                            className="w-full px-4 py-3 rounded-xl border border-border focus:border-forest focus:ring-1 focus:ring-forest outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 rounded-xl border border-border text-forest font-medium hover:bg-cream transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 rounded-xl bg-forest text-white font-medium hover:bg-forest/90 transition-colors"
                                    >
                                        Save changes
                                    </button>
                                </div>
                            </>
                        )}

                        {actionModal.type === "delete" && (
                            <>
                                <h3 className="text-lg font-semibold text-red-600 mb-2">
                                    Delete household
                                </h3>
                                <p className="text-sm text-textSub mb-6">
                                    Are you sure you want to delete "{actionModal.household.name}"? This action cannot be undone. All homes, children, pets, and caregivers associated with this household will be removed.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 rounded-xl border border-border text-forest font-medium hover:bg-cream transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}

                        {actionModal.type === "leave" && (
                            <>
                                <h3 className="text-lg font-semibold text-red-600 mb-2">
                                    Leave household
                                </h3>
                                <p className="text-sm text-textSub mb-6">
                                    Are you sure you want to leave "{actionModal.household.name}"? You will lose access to all homes, children, and pets in this household. An owner can re-invite you later.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 rounded-xl border border-border text-forest font-medium hover:bg-cream transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                                    >
                                        Leave
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </AppShell>
    );
}
