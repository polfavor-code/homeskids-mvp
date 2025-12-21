"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ItemPhoto from "@/components/ItemPhoto";
import LocationMap from "@/components/LocationMap";
import { useAppState, CaregiverProfile, HomeProfile } from "@/lib/AppStateContext";
import { useItems } from "@/lib/ItemsContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

export default function HomeDetailPage() {
    useEnsureOnboarding();
    const params = useParams();
    const homeId = params.homeId as string;

    const { homes, caregivers, child, currentHomeId } = useAppState();
    const { items } = useItems();

    // Find the home
    const home = homes.find((h) => h.id === homeId);

    // Get caregivers connected to this home
    // Uses home.accessibleCaregiverIds (from home_memberships) as the source of truth
    const getHomeCaregivers = (): CaregiverProfile[] => {
        if (!home) return [];

        return caregivers.filter((caregiver) => {
            // Primary check: caregiver is in home's accessibleCaregiverIds (from home_memberships)
            if (home.accessibleCaregiverIds?.includes(caregiver.id)) return true;
            // Legacy fallback: owner of the home
            if (home.ownerCaregiverId === caregiver.id) return true;
            return false;
        });
    };

    // Get items at this home
    const getHomeItems = () => {
        if (!home) return [];
        return items.filter((item) => {
            if (item.isMissing) return false; // Exclude items awaiting location
            if (item.locationHomeId === homeId) return true;
            if (home.ownerCaregiverId && item.locationCaregiverId === home.ownerCaregiverId) return true;
            return false;
        });
    };

    const homeCaregivers = getHomeCaregivers();
    const homeItems = getHomeItems();
    const previewItems = homeItems.slice(0, 5);
    const isChildHere = currentHomeId === homeId;

    // Format address for display
    const getDisplayAddress = () => {
        if (!home) return null;

        const parts = [];
        if (home.addressStreet) parts.push(home.addressStreet);
        if (home.addressCity || home.addressState || home.addressZip) {
            const cityStateParts = [home.addressCity, home.addressState].filter(Boolean).join(", ");
            const cityStateZip = [cityStateParts, home.addressZip].filter(Boolean).join(" ");
            parts.push(cityStateZip);
        }
        if (home.addressCountry) parts.push(home.addressCountry);

        if (parts.length > 0) return parts;
        if (home.address) return [home.address];
        return null;
    };

    // Get directions URL
    const getDirectionsUrl = () => {
        if (!home) return null;

        let destination = "";
        if (home.addressLat && home.addressLng) {
            destination = `${home.addressLat},${home.addressLng}`;
        } else {
            const addressParts = [
                home.addressStreet,
                home.addressCity,
                home.addressState,
                home.addressZip,
                home.addressCountry,
            ].filter(Boolean);

            if (addressParts.length > 0) {
                destination = encodeURIComponent(addressParts.join(", "));
            } else if (home.address) {
                destination = encodeURIComponent(home.address);
            }
        }

        return destination ? `https://www.google.com/maps/dir/?api=1&destination=${destination}` : null;
    };

    // Get address query for geocoding
    const getAddressQuery = () => {
        if (!home) return null;

        const addressParts = [
            home.addressStreet,
            home.addressCity,
            home.addressState,
            home.addressZip,
            home.addressCountry,
        ].filter(Boolean);

        if (addressParts.length > 0) {
            return addressParts.join(", ");
        } else if (home.address) {
            return home.address;
        }

        return null;
    };

    const addressQuery = getAddressQuery();
    const hasCoordinates = home?.addressLat && home?.addressLng;

    // Get relationship label
    const getRelationshipLabel = (relationship?: string): string | null => {
        if (!relationship) return null;
        const labels: Record<string, string> = {
            parent: "Parent",
            step_parent: "Step-parent",
            family_member: "Family member",
            nanny: "Nanny",
            babysitter: "Babysitter",
            family_friend: "Family friend",
            other: "Caregiver",
        };
        return labels[relationship] || null;
    };

    // Convert Tailwind bg class to actual CSS color
    const getAvatarBgColor = (avatarColor?: string): string => {
        if (!avatarColor) return "#2C3E2D";
        // If it's already a hex/rgb color, use it directly
        if (avatarColor.startsWith("#") || avatarColor.startsWith("rgb")) return avatarColor;
        // Map common Tailwind bg classes to colors
        const colorMap: Record<string, string> = {
            "bg-gray-500": "#6B7280",
            "bg-gray-400": "#9CA3AF",
            "bg-gray-600": "#4B5563",
            "bg-red-500": "#EF4444",
            "bg-blue-500": "#3B82F6",
            "bg-green-500": "#22C55E",
            "bg-yellow-500": "#EAB308",
            "bg-purple-500": "#A855F7",
            "bg-pink-500": "#EC4899",
            "bg-indigo-500": "#6366F1",
            "bg-teal-500": "#14B8A6",
            "bg-orange-500": "#F97316",
        };
        return colorMap[avatarColor] || "#2C3E2D";
    };

    const displayAddress = getDisplayAddress();
    const directionsUrl = getDirectionsUrl();

    if (!home) {
        return (
            <AppShell>
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🏠</span>
                    </div>
                    <h2 className="font-dmSerif text-xl text-forest mb-2">Home not found</h2>
                    <p className="text-textSub text-sm mb-6">This home may have been removed.</p>
                    <Link href="/" className="btn-primary">
                        Back to dashboard
                    </Link>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            {/* Back link */}
            <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-textSub hover:text-forest transition-colors mb-4"
            >
                ← Dashboard
            </Link>

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="font-dmSerif text-2xl text-forest">{home.name}</h1>
                    {isChildHere && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-softGreen text-forest text-xs font-medium rounded-full">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {child?.name || "Child"} is here
                        </span>
                    )}
                </div>
            </div>

            {/* Address Section */}
            <div className="bg-white rounded-2xl p-5 border border-border mb-4">
                <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-3">
                    Address
                </h3>
                {displayAddress ? (
                    <div className="mb-4">
                        {displayAddress.map((line, i) => (
                            <p key={i} className="text-sm text-forest">
                                {line}
                            </p>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-textSub/60 italic mb-4">No address added yet</p>
                )}

                {/* Interactive Map */}
                {addressQuery && (
                    <div className="mb-4">
                        <LocationMap
                            address={addressQuery}
                            lat={home.addressLat}
                            lng={home.addressLng}
                            height="180px"
                            className="w-full"
                        />
                    </div>
                )}

                {directionsUrl && (
                    <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        Get directions
                    </a>
                )}
            </div>

            {/* People Section */}
            <div className="bg-white rounded-2xl p-5 border border-border mb-4">
                <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-3">
                    People at this home ({homeCaregivers.length})
                </h3>
                {homeCaregivers.length > 0 ? (
                    <div className="space-y-3">
                        {homeCaregivers.map((caregiver) => (
                            <div
                                key={caregiver.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-cream/50"
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden relative"
                                    style={{ backgroundColor: getAvatarBgColor(caregiver.avatarColor) }}
                                >
                                    {/* Always show initials as base layer */}
                                    <span className="z-0">{caregiver.avatarInitials || caregiver.name.charAt(0).toUpperCase()}</span>
                                    {/* Overlay image if available */}
                                    {caregiver.avatarUrl && caregiver.avatarUrl.trim() !== "" && (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={caregiver.avatarUrl}
                                            alt={caregiver.name}
                                            className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-forest truncate">
                                        {caregiver.label || caregiver.name}
                                        {caregiver.isCurrentUser && (
                                            <span className="text-textSub text-xs ml-1">(you)</span>
                                        )}
                                    </p>
                                    {getRelationshipLabel(caregiver.relationship) && (
                                        <p className="text-xs text-textSub truncate">
                                            {getRelationshipLabel(caregiver.relationship)}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        caregiver.status === "active"
                                            ? "bg-softGreen text-forest"
                                            : caregiver.status === "pending"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-gray-100 text-gray-600"
                                    }`}
                                >
                                    {caregiver.status === "active"
                                        ? "Active"
                                        : caregiver.status === "pending"
                                        ? "Pending"
                                        : "Inactive"}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-textSub/60 italic">No caregivers at this home</p>
                )}
            </div>

            {/* Items Section */}
            <div className="bg-white rounded-2xl p-5 border border-border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider">
                        Items at this home ({homeItems.length})
                    </h3>
                    {homeItems.length > 0 && (
                        <Link
                            href={`/items?filter=${homeId}`}
                            className="text-xs font-medium text-forest hover:text-teal transition-colors"
                        >
                            View all →
                        </Link>
                    )}
                </div>
                {previewItems.length > 0 ? (
                    <div className="space-y-2">
                        {previewItems.map((item) => (
                            <Link
                                key={item.id}
                                href={`/items/${item.id}`}
                                className="flex items-center gap-3 p-3 rounded-xl bg-cream/50 hover:bg-cream transition-colors"
                            >
                                <ItemPhoto
                                    photoPath={item.photoUrl}
                                    itemName={item.name}
                                    className="w-10 h-10 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-forest truncate text-sm">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-textSub truncate">
                                        {item.category}
                                    </p>
                                </div>
                            </Link>
                        ))}
                        {homeItems.length > 5 && (
                            <Link
                                href={`/items?filter=${homeId}`}
                                className="block text-center py-3 text-sm font-medium text-forest hover:text-teal transition-colors"
                            >
                                View all {homeItems.length} items →
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 bg-cream rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">📦</span>
                        </div>
                        <p className="text-sm text-textSub mb-3">No items at this home yet</p>
                        <Link href="/items/new" className="btn-secondary text-sm">
                            Add an item
                        </Link>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
