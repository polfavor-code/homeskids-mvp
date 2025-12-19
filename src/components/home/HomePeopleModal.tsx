"use client";

import React, { useEffect, useRef } from "react";
import { HomeProfile, CaregiverProfile } from "@/lib/AppStateContext";

interface HomePeopleModalProps {
    isOpen: boolean;
    home: HomeProfile | null;
    caregivers: CaregiverProfile[];
    onClose: () => void;
}

/**
 * HomePeopleModal - Shows people/caregivers associated with a home
 * Desktop: Centered modal
 * Mobile: Bottom sheet
 */
export default function HomePeopleModal({
    isOpen,
    home,
    caregivers,
    onClose,
}: HomePeopleModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Get caregivers connected to this home
    // Uses home.accessibleCaregiverIds (from home_memberships) as the source of truth
    const getHomeCaregivers = (): CaregiverProfile[] => {
        if (!home) return [];

        return caregivers.filter((caregiver) => {
            // Primary check: caregiver is in home's accessibleCaregiverIds (from home_memberships)
            if (home.accessibleCaregiverIds?.includes(caregiver.id)) {
                return true;
            }
            // Legacy fallback: owner of the home
            if (home.ownerCaregiverId === caregiver.id) {
                return true;
            }
            return false;
        });
    };

    const homeCaregivers = getHomeCaregivers();

    // Get avatar initials
    const getInitials = (name: string): string => {
        return name.charAt(0).toUpperCase();
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

    // ESC key and body scroll handling
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !home) return null;

    const PeopleList = () => (
        <div className="space-y-3">
            {homeCaregivers.length > 0 ? (
                homeCaregivers.map((caregiver) => (
                    <div
                        key={caregiver.id}
                        className="p-3 rounded-xl bg-cream/50"
                    >
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden relative"
                                style={{ backgroundColor: getAvatarBgColor(caregiver.avatarColor) }}
                            >
                                {/* Always show initials as base layer */}
                                <span className="z-0">{getInitials(caregiver.name)}</span>
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

                            {/* Info */}
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

                            {/* Status indicator */}
                            <div className="flex-shrink-0">
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
                        </div>

                        {/* Contact details - only show if available */}
                        {(caregiver.phone) && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                                {caregiver.phone && (
                                    <a
                                        href={`tel:${caregiver.phone}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-forest hover:bg-forest hover:text-white transition-colors border border-border"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                        </svg>
                                        {caregiver.phone}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center mx-auto mb-3">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-textSub"
                        >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <p className="text-sm text-textSub">No one marked here right now.</p>
                </div>
            )}
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="people-modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Desktop Modal */}
            <div className="hidden sm:flex items-center justify-center h-full p-4">
                <div
                    ref={modalRef}
                    className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    style={{ boxShadow: "0 20px 50px rgba(44, 62, 45, 0.15)" }}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-textSub hover:text-forest transition-colors"
                        aria-label="Close"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Icon */}
                    <div className="w-12 h-12 rounded-full bg-softGreen flex items-center justify-center mx-auto mb-4">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-forest"
                        >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h2
                        id="people-modal-title"
                        className="text-xl font-dmSerif text-forest text-center mb-1"
                    >
                        People at {home.name}
                    </h2>
                    <p className="text-sm text-textSub text-center mb-5">
                        {homeCaregivers.length}{" "}
                        {homeCaregivers.length === 1 ? "caregiver" : "caregivers"}
                    </p>

                    {/* People list */}
                    <div className="max-h-[300px] overflow-y-auto">
                        <PeopleList />
                    </div>

                    {/* Close button */}
                    <button onClick={onClose} className="w-full btn-secondary mt-5">
                        Close
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Sheet */}
            <div
                className="sm:hidden absolute left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[65vh] flex flex-col"
                style={{
                    bottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)",
                    paddingBottom: "16px"
                }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-softGreen flex items-center justify-center">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-forest"
                            >
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-dmSerif text-forest">
                                People at {home.name}
                            </h2>
                            <p className="text-xs text-textSub">
                                {homeCaregivers.length}{" "}
                                {homeCaregivers.length === 1 ? "caregiver" : "caregivers"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 text-textSub"
                        aria-label="Close"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <PeopleList />
                </div>
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
        </div>
    );
}
