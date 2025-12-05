"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import MissingItemAlert from "@/components/home/MissingItemAlert";
import HomeCardFullWidth from "@/components/home/HomeCardFullWidth";
import TravelBagPreview from "@/components/home/TravelBagPreview";
import ToBeFoundPreview from "@/components/home/ToBeFoundPreview";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

export default function Home() {
    useEnsureOnboarding();

    const { user, loading: authLoading } = useAuth();
    const { items, isLoaded: itemsLoaded } = useItems();
    const {
        child,
        caregivers,
        homes,
        currentHomeId,
        setCurrentHomeId,
        currentJuneCaregiverId, // Legacy fallback
        setCurrentJuneCaregiverId, // Legacy fallback
        isLoaded: appStateLoaded
    } = useAppState();

    // Get current home - prefer new homes model, fallback to legacy caregiver model
    const currentHome = homes.length > 0
        ? (homes.find((h) => h.id === currentHomeId) ?? homes[0])
        : undefined;

    // Legacy fallback for current caregiver (for travel bag, etc.)
    const currentCaregiver = caregivers.length
        ? (caregivers.find((c) => c.id === currentJuneCaregiverId) ?? caregivers[0])
        : undefined;

    // Filter missing items
    const missingItems = items.filter((item) => item.isMissing);

    // Separate active and other homes
    const activeHome = currentHome;
    const otherHomes = homes.filter((h) => h.id !== currentHomeId);

    // Get items for a specific home (NEW: by home_id)
    // Falls back to caregiver-based location for items without home_id
    const getItemsForHome = (homeId: string) => {
        const home = homes.find(h => h.id === homeId);
        return items.filter((item) => {
            if (item.isMissing) return false;
            // Primary: check location_home_id
            if (item.locationHomeId === homeId) return true;
            // Fallback: check if item's caregiver is the home owner
            if (home?.ownerCaregiverId && item.locationCaregiverId === home.ownerCaregiverId) return true;
            // Fallback: check if item's caregiver is in home's accessible caregivers
            if (item.locationCaregiverId && home?.accessibleCaregiverIds?.includes(item.locationCaregiverId)) return true;
            return false;
        });
    };

    // Get owner caregiver for a home
    const getOwnerCaregiver = (home: typeof homes[0]) => {
        return caregivers.find(c => c.id === home.ownerCaregiverId);
    };

    // Show loading state while auth/data is loading to prevent flash of content
    if (authLoading || !appStateLoaded || !itemsLoaded) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    // Only show content if user is authenticated (otherwise will redirect via useEnsureOnboarding)
    if (!user) {
        return null;
    }

    // If no homes configured yet, show a prompt to set up homes
    if (homes.length === 0) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-20 h-20 bg-softGreen rounded-full flex items-center justify-center text-4xl mb-6">
                        🏠
                    </div>
                    <h2 className="text-xl font-dmSerif text-forest mb-2">
                        Set up your homes
                    </h2>
                    <p className="text-textSub mb-8 max-w-xs mx-auto">
                        Add the homes where {child?.name || "your child"} stays to start tracking their things.
                    </p>
                    <Link
                        href="/settings/homes"
                        className="btn-primary"
                    >
                        Add your first home
                    </Link>
                </div>
            </AppShell>
        );
    }

    // Global empty state for items
    if (items.length === 0) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-20 h-20 bg-softGreen rounded-full flex items-center justify-center text-4xl mb-6">
                        🧸
                    </div>
                    <h2 className="text-xl font-dmSerif text-forest mb-2">
                        Add your first item
                    </h2>
                    <p className="text-textSub mb-8 max-w-xs mx-auto">
                        Start by adding one of {child?.name || "your child"}'s things so we can track where it is.
                    </p>
                    <div className="p-4 bg-softGreen rounded-xl border border-border text-sm text-forest">
                        <p>Use the <strong>+</strong> button below to add an item.</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    const userFirstName = user?.user_metadata?.name?.split(' ')[0] || 'there';

    return (
        <AppShell>
            {/* Header Section - V6 Style */}
            <div className="grid grid-cols-[1fr_auto] gap-5 mb-10 items-start">
                <div className="greeting-col">
                    <h1 className="font-dmSerif text-4xl text-forest leading-none mb-2">
                        Hi {userFirstName},
                    </h1>
                    <p className="text-sm text-forest/60 leading-relaxed">
                        Here’s everything organized for {child?.name || "your child"}.
                    </p>
                </div>

                {/* Stats Box */}
                <div className="bg-white p-4 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] text-right min-w-[100px]">
                    <span className="block text-2xl font-bold text-forest leading-none mb-1">
                        {items.length}
                    </span>
                    <span className="text-[11px] text-forest/60 uppercase font-bold tracking-wide">
                        ITEMS TOTAL
                    </span>
                </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex gap-3 mb-10 overflow-x-auto pb-1 scrollbar-hide">
                <Link
                    href="/items/add"
                    className="bg-forest text-white px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest/90 transition-colors border border-forest"
                >
                    + Add item
                </Link>
                <Link
                    href="/items/travel-bag"
                    className="bg-transparent border border-forest text-forest px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest hover:text-white transition-colors"
                >
                    Request packing
                </Link>
                <Link
                    href="/settings/caregivers"
                    className="bg-transparent border border-forest text-forest px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest hover:text-white transition-colors"
                >
                    Invite caregiver
                </Link>
            </div>

            {/* Section Header with Decorative Line */}
            <div className="text-center mb-8 relative">
                {/* Decorative line behind - Darker as requested */}
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/10 -translate-y-1/2 z-0" />
                {/* Title on top of line */}
                <h2 className="font-dmSerif text-xl text-forest bg-cream inline-block px-4 relative z-10">
                    {child?.name || "Child"}'s home right now
                </h2>
            </div>



            {/* Vertical Flow Container */}
            <div className="relative">
                {/* Flow Line - behind everything */}
                <div
                    className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 z-0"
                    style={{ background: "#E0DCD5" }}
                />

                {/* ACTIVE HOME CARD */}
                {activeHome && (
                    <div className="relative z-10 mb-0">
                        <HomeCardFullWidth
                            home={activeHome}
                            ownerCaregiver={getOwnerCaregiver(activeHome)}
                            child={child}
                            items={getItemsForHome(activeHome.id)}
                            isActive={true}
                        />
                    </div>
                )}

                {/* TRAVEL BAG CARD - includes its own line segments */}
                <TravelBagPreview
                    items={items}
                    child={child}
                    currentCaregiver={currentCaregiver}
                    currentHome={activeHome}
                />

                {/* OTHER HOME(S) CARDS */}
                <div className="relative z-10">
                    {otherHomes.map((home, index) => (
                        <div key={home.id}>
                            <HomeCardFullWidth
                                home={home}
                                ownerCaregiver={getOwnerCaregiver(home)}
                                child={child}
                                items={getItemsForHome(home.id)}
                                isActive={false}
                                onSwitch={() => setCurrentHomeId(home.id)}
                            />
                            {/* Spacing between other home cards */}
                            {index < otherHomes.length - 1 && (
                                <div className="h-4" />
                            )}
                        </div>
                    ))}
                </div>
            </div>



            {/* Floating Missing Item Alert at bottom */}
            {missingItems.length > 0 && (
                <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none">
                    <div className="w-full max-w-xl px-4 pointer-events-auto">
                        <MissingItemAlert missingItems={missingItems} />
                    </div>
                </div>
            )}
        </AppShell>
    );
}
