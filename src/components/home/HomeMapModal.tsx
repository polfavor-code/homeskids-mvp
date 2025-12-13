"use client";

import React, { useEffect, useRef } from "react";
import { HomeProfile } from "@/lib/AppStateContext";

interface HomeMapModalProps {
    isOpen: boolean;
    home: HomeProfile | null;
    onClose: () => void;
}

/**
 * HomeMapModal - Shows home address with map links
 * Desktop: Centered modal
 * Mobile: Bottom sheet
 */
export default function HomeMapModal({ isOpen, home, onClose }: HomeMapModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Get destination string for Google Maps URLs
    const getDestination = () => {
        if (!home) return "";

        // Prefer lat/lng if available
        if (home.addressLat && home.addressLng) {
            return `${home.addressLat},${home.addressLng}`;
        }

        // Fallback to address string
        const addressParts = [
            home.addressStreet,
            home.addressCity,
            home.addressState,
            home.addressZip,
            home.addressCountry,
        ].filter(Boolean);

        if (addressParts.length > 0) {
            return encodeURIComponent(addressParts.join(", "));
        }

        // Final fallback to address field
        if (home.address) {
            return encodeURIComponent(home.address);
        }

        return "";
    };

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

    const destination = getDestination();
    const displayAddress = getDisplayAddress();
    const hasAddress = destination.length > 0;

    const directionsUrl = hasAddress
        ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        : null;
    const mapsUrl = hasAddress
        ? `https://www.google.com/maps/search/?api=1&query=${destination}`
        : null;

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

    return (
        <div
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-modal-title"
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Icon */}
                    <div className="w-12 h-12 rounded-full bg-softGreen flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h2 id="map-modal-title" className="text-xl font-dmSerif text-forest text-center mb-2">
                        {home.name}
                    </h2>

                    {/* Address */}
                    <div className="text-center mb-6">
                        {displayAddress ? (
                            <div className="text-sm text-textSub space-y-0.5">
                                {displayAddress.map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-textSub/60 italic">No address added yet</p>
                        )}
                    </div>

                    {/* Buttons */}
                    {hasAddress ? (
                        <div className="flex gap-3">
                            <a
                                href={directionsUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 btn-primary text-center"
                            >
                                Directions
                            </a>
                            <a
                                href={mapsUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 btn-secondary text-center"
                            >
                                Open in Maps
                            </a>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full btn-secondary"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Bottom Sheet */}
            <div
                className="sm:hidden absolute left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-dmSerif text-forest">{home.name}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 text-textSub"
                        aria-label="Close"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    {/* Address */}
                    <div className="mb-5">
                        {displayAddress ? (
                            <div className="text-sm text-textSub space-y-0.5">
                                {displayAddress.map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-textSub/60 italic">No address added yet</p>
                        )}
                    </div>

                    {/* Buttons */}
                    {hasAddress ? (
                        <div className="flex gap-3">
                            <a
                                href={directionsUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 btn-primary text-center"
                            >
                                Directions
                            </a>
                            <a
                                href={mapsUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 btn-secondary text-center"
                            >
                                Open in Maps
                            </a>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full btn-secondary"
                        >
                            Close
                        </button>
                    )}
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
