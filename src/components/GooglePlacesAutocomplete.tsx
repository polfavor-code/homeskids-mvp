"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

// Global styles for pac-container (Google's autocomplete dropdown)
const injectPacContainerStyles = () => {
    const styleId = "google-pac-container-styles";
    if (typeof document === "undefined" || document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        .pac-container {
            z-index: 99999 !important;
            border-radius: 12px !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
            margin-top: 4px !important;
            font-family: inherit !important;
            background: white !important;
            /* Ensure pointer events work on mobile */
            pointer-events: auto !important;
            -webkit-overflow-scrolling: touch !important;
        }
        .pac-item {
            padding: 14px 16px !important;
            font-size: 15px !important;
            cursor: pointer !important;
            border-top: 1px solid #f3f4f6 !important;
            /* Ensure tappable on mobile */
            -webkit-tap-highlight-color: rgba(0,0,0,0.1) !important;
            touch-action: manipulation !important;
        }
        .pac-item:first-child {
            border-top: none !important;
        }
        .pac-item:hover, .pac-item-selected, .pac-item:active {
            background-color: #f0fdf4 !important;
        }
        .pac-item-query {
            font-size: 15px !important;
            color: #243425 !important;
        }
        .pac-matched {
            font-weight: 600 !important;
        }
        .pac-icon {
            margin-right: 12px !important;
        }
        /* Mobile specific - ensure dropdown is visible above keyboard */
        @media (max-width: 640px) {
            .pac-container {
                position: fixed !important;
                left: 8px !important;
                right: 8px !important;
                width: auto !important;
                max-height: 50vh !important;
                overflow-y: auto !important;
                top: auto !important;
                bottom: 50% !important;
                transform: translateY(50%) !important;
            }
            .pac-item {
                padding: 16px !important;
                min-height: 48px !important;
            }
        }
    `;
    document.head.appendChild(style);
};

// Interactive Map Preview component
function MapPreview({ lat, lng, isLoaded }: { lat: number; lng: number; isLoaded: boolean }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
        if (!isLoaded || !mapRef.current || !window.google?.maps) return;

        // Create map instance
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                center: { lat, lng },
                zoom: 15,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
                gestureHandling: "cooperative",
            });

            // Add marker
            markerRef.current = new window.google.maps.Marker({
                position: { lat, lng },
                map: mapInstanceRef.current,
            });
        } else {
            // Update existing map
            const newCenter = { lat, lng };
            mapInstanceRef.current.setCenter(newCenter);
            markerRef.current.setPosition(newCenter);
        }
    }, [lat, lng, isLoaded]);

    return <div ref={mapRef} className="h-36 w-full" />;
}

export interface AddressComponents {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    lat: number;
    lng: number;
    formattedAddress: string;
}

interface GooglePlacesAutocompleteProps {
    onAddressSelect: (address: AddressComponents) => void;
    initialAddress?: Partial<AddressComponents>;
    placeholder?: string;
}

// Declare google types
declare global {
    interface Window {
        google: any;
        initGooglePlaces: () => void;
    }
}

export default function GooglePlacesAutocomplete({
    onAddressSelect,
    initialAddress,
    placeholder = "Search address...",
}: GooglePlacesAutocompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchValue, setSearchValue] = useState(initialAddress?.formattedAddress || "");
    const [addressFields, setAddressFields] = useState<Partial<AddressComponents>>({
        street: initialAddress?.street || "",
        city: initialAddress?.city || "",
        state: initialAddress?.state || "",
        zip: initialAddress?.zip || "",
        country: initialAddress?.country || "",
    });
    const [showMap, setShowMap] = useState(!!initialAddress?.lat);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
        initialAddress?.lat && initialAddress?.lng
            ? { lat: initialAddress.lat, lng: initialAddress.lng }
            : null
    );

    // Load Google Maps script
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn("Google Maps API key not found");
            return;
        }

        // Check if already loaded
        if (window.google?.maps?.places) {
            setIsLoaded(true);
            return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            existingScript.addEventListener("load", () => setIsLoaded(true));
            return;
        }

        // Load the script
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => console.error("Failed to load Google Maps");
        document.head.appendChild(script);

        return () => {
            // Don't remove script on unmount as other components might use it
        };
    }, []);

    // Store callback in ref to avoid re-initialization
    const onAddressSelectRef = useRef(onAddressSelect);
    onAddressSelectRef.current = onAddressSelect;

    // Initialize autocomplete when script is loaded
    useEffect(() => {
        if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

        // Inject styles for the dropdown
        injectPacContainerStyles();

        let observer: MutationObserver | null = null;

        try {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ["address"],
                fields: ["address_components", "geometry", "formatted_address"],
            });

            autocompleteRef.current.addListener("place_changed", () => {
                const place = autocompleteRef.current.getPlace();

                if (!place.geometry) {
                    return;
                }

                const addressComponents = parseAddressComponents(place);
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                setSearchValue(place.formatted_address || "");
                setAddressFields({
                    street: addressComponents.street,
                    city: addressComponents.city,
                    state: addressComponents.state,
                    zip: addressComponents.zip,
                    country: addressComponents.country,
                });
                setMapCenter({ lat, lng });
                setShowMap(true);

                // Blur input to dismiss keyboard on mobile
                inputRef.current?.blur();

                onAddressSelectRef.current({
                    ...addressComponents,
                    lat,
                    lng,
                    formattedAddress: place.formatted_address || "",
                });
            });

            // Fix for mobile: ensure pac-container touch events work
            // Google's autocomplete can have issues with touch on mobile/iOS
            const fixMobileTouchEvents = () => {
                const pacContainers = document.querySelectorAll('.pac-container');
                pacContainers.forEach(container => {
                    const el = container as HTMLElement;
                    // Ensure touch events work
                    el.style.pointerEvents = 'auto';

                    // Add touch event handlers for iOS
                    el.addEventListener('touchstart', () => {}, { passive: true });
                    el.addEventListener('touchend', (e) => {
                        // Find the pac-item that was tapped
                        const target = e.target as HTMLElement;
                        const pacItem = target.closest('.pac-item');
                        if (pacItem) {
                            // Trigger a click on the item
                            (pacItem as HTMLElement).click();
                        }
                    }, { passive: false });
                });
            };

            // Use MutationObserver to catch when pac-container is added to DOM
            observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement && node.classList.contains('pac-container')) {
                            fixMobileTouchEvents();
                        }
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Also run immediately in case container already exists
            setTimeout(fixMobileTouchEvents, 300);

        } catch (error) {
            console.error("Error initializing autocomplete:", error);
        }

        // Cleanup observer on unmount
        return () => {
            if (observer) {
                observer.disconnect();
            }
        };
    }, [isLoaded]);

    // Parse Google address components into our format
    const parseAddressComponents = (place: any): Omit<AddressComponents, "lat" | "lng" | "formattedAddress"> => {
        const components = place.address_components || [];

        let streetNumber = "";
        let route = "";
        let city = "";
        let state = "";
        let zip = "";
        let country = "";

        for (const component of components) {
            const types = component.types;

            if (types.includes("street_number")) {
                streetNumber = component.long_name;
            } else if (types.includes("route")) {
                route = component.long_name;
            } else if (types.includes("locality") || types.includes("postal_town")) {
                city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
                state = component.short_name;
            } else if (types.includes("postal_code")) {
                zip = component.long_name;
            } else if (types.includes("country")) {
                country = component.long_name;
            }
        }

        return {
            street: streetNumber ? `${streetNumber} ${route}` : route,
            city,
            state,
            zip,
            country,
        };
    };

    // Handle manual field changes
    const handleFieldChange = useCallback((field: keyof AddressComponents, value: string) => {
        const newFields = { ...addressFields, [field]: value };
        setAddressFields(newFields);

        // Notify parent of changes
        onAddressSelectRef.current({
            street: newFields.street || "",
            city: newFields.city || "",
            state: newFields.state || "",
            zip: newFields.zip || "",
            country: newFields.country || "",
            lat: mapCenter?.lat || 0,
            lng: mapCenter?.lng || 0,
            formattedAddress: searchValue,
        });
    }, [addressFields, mapCenter, searchValue]);

    return (
        <div className="space-y-0">
            {/* Search Box with Map Preview */}
            <div className="border border-border rounded-xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-textSub flex-shrink-0"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 text-sm outline-none bg-transparent text-forest"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        enterKeyHint="search"
                    />
                    {/* Google Logo */}
                    <svg height="14" viewBox="0 0 24 24" className="opacity-40 flex-shrink-0">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                </div>

                {/* Map Preview */}
                {showMap && mapCenter && mapCenter.lat && mapCenter.lng ? (
                    <MapPreview lat={mapCenter.lat} lng={mapCenter.lng} isLoaded={isLoaded} />
                ) : (
                    <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 text-textSub">
                            <span className="text-2xl">📍</span>
                            <span className="text-xs">Map preview</span>
                        </div>
                    </div>
                )}

                {/* Address Fields */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-cream/50">
                    <input
                        type="text"
                        placeholder="Street"
                        value={addressFields.street || ""}
                        onChange={(e) => handleFieldChange("street", e.target.value)}
                        className="col-span-2 px-3 py-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="City"
                        value={addressFields.city || ""}
                        onChange={(e) => handleFieldChange("city", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="State"
                        value={addressFields.state || ""}
                        onChange={(e) => handleFieldChange("state", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="ZIP"
                        value={addressFields.zip || ""}
                        onChange={(e) => handleFieldChange("zip", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="Country"
                        value={addressFields.country || ""}
                        onChange={(e) => handleFieldChange("country", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                </div>
            </div>
        </div>
    );
}
