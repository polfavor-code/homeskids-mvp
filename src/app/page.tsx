"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import JuneLocationToggle from "@/components/home/JuneLocationToggle";
import HomeCard from "@/components/home/HomeCard";
import TravelBagPreview from "@/components/home/TravelBagPreview";
import ToBeFoundPreview from "@/components/home/ToBeFoundPreview";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

export default function Home() {
    useEnsureOnboarding();

    const { items } = useItems();
    const { child, caregivers, currentJuneCaregiverId, setCurrentJuneCaregiverId } = useAppState();

    const currentCaregiver = caregivers.find(
        (c) => c.id === currentJuneCaregiverId
    )!;

    // Filter missing items
    const missingItems = items.filter((item) => item.isMissing);

    // Global empty state
    if (items.length === 0) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-6">
                        🧸
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Add your first item
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-xs mx-auto">
                        Start by adding one of {child.name}’s things so we can track where it is.
                    </p>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                        <p>Use the <strong>+</strong> button below to add an item.</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            {/* 1. June Location Toggle */}
            <JuneLocationToggle
                child={child}
                caregivers={caregivers}
                selectedCaregiverId={currentJuneCaregiverId}
                onToggle={setCurrentJuneCaregiverId}
            />

            {/* 2. Caregiver Home Boxes */}
            <div className="space-y-4">
                {caregivers.map((caregiver) => {
                    const itemsAtHome = items.filter(
                        (item) =>
                            item.locationCaregiverId === caregiver.id && !item.isMissing
                    );
                    const isChildHere = currentJuneCaregiverId === caregiver.id;

                    return (
                        <HomeCard
                            key={caregiver.id}
                            caregiver={caregiver}
                            child={child}
                            items={itemsAtHome}
                            isChildHere={isChildHere}
                        />
                    );
                })}
            </div>

            {/* 3. Travel Bag Preview */}
            <TravelBagPreview
                items={items}
                child={child}
                currentCaregiver={currentCaregiver}
            />

            {/* 4. To Be Found Preview */}
            <ToBeFoundPreview missingItems={missingItems} />
        </AppShell>
    );
}
