"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

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

// Track if options have been set
let optionsSet = false;
let loadPromise: Promise<void> | null = null;

const loadGoogleMaps = async (): Promise<void> => {
    if (loadPromise) return loadPromise;

    // Check if already loaded
    if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
        return Promise.resolve();
    }

    // Set options only once
    if (!optionsSet) {
        setOptions({
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
            v: "weekly",
        });
        optionsSet = true;
    }

    // Import required libraries
    loadPromise = Promise.all([
        importLibrary("maps"),
        importLibrary("places"),
        importLibrary("geocoding"),
        importLibrary("marker"),
    ]).then(() => {});

    return loadPromise;
};

export default function GooglePlacesAutocomplete({
    onAddressSelect,
    initialAddress,
    placeholder = "Search address...",
}: GooglePlacesAutocompleteProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchValue, setSearchValue] = useState(initialAddress?.formattedAddress || "");
    const [error, setError] = useState<string | null>(null);
    const [addressFields, setAddressFields] = useState<Partial<AddressComponents>>({
        street: initialAddress?.street || "",
        city: initialAddress?.city || "",
        state: initialAddress?.state || "",
        zip: initialAddress?.zip || "",
        country: initialAddress?.country || "",
    });
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
        initialAddress?.lat && initialAddress?.lng
            ? { lat: initialAddress.lat, lng: initialAddress.lng }
            : null
    );

    const onAddressSelectRef = useRef(onAddressSelect);
    onAddressSelectRef.current = onAddressSelect;

    // Load Google Maps
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setError("Google Maps API key not configured");
            return;
        }

        loadGoogleMaps()
            .then(() => {
                setIsLoaded(true);
                geocoderRef.current = new google.maps.Geocoder();
            })
            .catch((err) => {
                console.error("Failed to load Google Maps:", err);
                setError("Failed to load Google Maps");
            });
    }, []);

    // Initialize map when loaded and container is ready
    useEffect(() => {
        if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

        const defaultCenter = mapCenter || { lat: 52.3676, lng: 4.9041 }; // Amsterdam as default

        mapRef.current = new google.maps.Map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: mapCenter ? 16 : 4,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: "greedy", // Allow single finger pan on mobile
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }],
                },
            ],
        });

        // Add marker if we have initial coordinates
        if (mapCenter) {
            markerRef.current = new google.maps.Marker({
                position: mapCenter,
                map: mapRef.current,
                draggable: true,
                animation: google.maps.Animation.DROP,
            });

            // Allow dragging marker to update address
            markerRef.current.addListener("dragend", () => {
                const pos = markerRef.current?.getPosition();
                if (pos) {
                    reverseGeocode(pos.lat(), pos.lng());
                }
            });
        }

        // Allow clicking on map to set location
        mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                updateMarkerPosition(lat, lng);
                reverseGeocode(lat, lng);
            }
        });
    }, [isLoaded, mapCenter]);

    // Update marker position
    const updateMarkerPosition = (lat: number, lng: number) => {
        if (!mapRef.current) return;

        if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng });
        } else {
            markerRef.current = new google.maps.Marker({
                position: { lat, lng },
                map: mapRef.current,
                draggable: true,
                animation: google.maps.Animation.DROP,
            });

            markerRef.current.addListener("dragend", () => {
                const pos = markerRef.current?.getPosition();
                if (pos) {
                    reverseGeocode(pos.lat(), pos.lng());
                }
            });
        }

        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(16);
        setMapCenter({ lat, lng });
    };

    // Reverse geocode coordinates to address
    const reverseGeocode = (lat: number, lng: number) => {
        if (!geocoderRef.current) return;

        geocoderRef.current.geocode(
            { location: { lat, lng } },
            (results, status) => {
                if (status === "OK" && results && results[0]) {
                    const place = results[0];
                    const addressComponents = parseAddressComponents(place);
                    const formattedAddress = place.formatted_address || "";

                    setSearchValue(formattedAddress);
                    setAddressFields({
                        street: addressComponents.street,
                        city: addressComponents.city,
                        state: addressComponents.state,
                        zip: addressComponents.zip,
                        country: addressComponents.country,
                    });

                    onAddressSelectRef.current({
                        ...addressComponents,
                        lat,
                        lng,
                        formattedAddress,
                    });
                }
            }
        );
    };

    // Search for an address
    const searchAddress = useCallback(() => {
        if (!geocoderRef.current || !searchValue.trim()) return;

        setIsSearching(true);
        setError(null);

        geocoderRef.current.geocode(
            { address: searchValue },
            (results, status) => {
                setIsSearching(false);

                if (status === "OK" && results && results[0]) {
                    const place = results[0];
                    const location = place.geometry?.location;

                    if (location) {
                        const lat = location.lat();
                        const lng = location.lng();
                        const addressComponents = parseAddressComponents(place);
                        const formattedAddress = place.formatted_address || searchValue;

                        setSearchValue(formattedAddress);
                        setAddressFields({
                            street: addressComponents.street,
                            city: addressComponents.city,
                            state: addressComponents.state,
                            zip: addressComponents.zip,
                            country: addressComponents.country,
                        });

                        updateMarkerPosition(lat, lng);

                        onAddressSelectRef.current({
                            ...addressComponents,
                            lat,
                            lng,
                            formattedAddress,
                        });
                    }
                } else {
                    setError("Address not found. Try a different search.");
                }
            }
        );
    }, [searchValue]);

    // Parse Google address components
    const parseAddressComponents = (place: google.maps.GeocoderResult): Omit<AddressComponents, "lat" | "lng" | "formattedAddress"> => {
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

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchAddress();
        }
    };

    return (
        <div className="space-y-0">
            <div className="border border-border rounded-xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-white">
                    <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 text-base outline-none bg-transparent text-forest"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        enterKeyHint="search"
                    />
                    {isSearching ? (
                        <div className="w-6 h-6 border-2 border-forest/30 border-t-forest rounded-full animate-spin flex-shrink-0" />
                    ) : (
                        <button
                            type="button"
                            onClick={searchAddress}
                            disabled={!isLoaded || !searchValue.trim()}
                            className="p-2 -mr-2 text-forest hover:bg-cream active:bg-softGreen rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
                            aria-label="Search address"
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Error message */}
                {error && (
                    <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Interactive Map */}
                <div className="relative">
                    <div
                        ref={mapContainerRef}
                        className="h-48 w-full bg-gray-100"
                    />
                    {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <div className="flex flex-col items-center gap-2 text-textSub">
                                <div className="w-6 h-6 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
                                <span className="text-xs">Loading map...</span>
                            </div>
                        </div>
                    )}
                    {isLoaded && !mapCenter && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                            <div className="bg-white/90 px-4 py-2 rounded-lg text-sm text-forest shadow">
                                Search or tap the map to set location
                            </div>
                        </div>
                    )}
                </div>

                {/* Address Fields */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-cream/50">
                    <input
                        type="text"
                        placeholder="Street"
                        value={addressFields.street || ""}
                        onChange={(e) => handleFieldChange("street", e.target.value)}
                        className="col-span-2 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="City"
                        value={addressFields.city || ""}
                        onChange={(e) => handleFieldChange("city", e.target.value)}
                        className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="State"
                        value={addressFields.state || ""}
                        onChange={(e) => handleFieldChange("state", e.target.value)}
                        className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="ZIP"
                        value={addressFields.zip || ""}
                        onChange={(e) => handleFieldChange("zip", e.target.value)}
                        className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <input
                        type="text"
                        placeholder="Country"
                        value={addressFields.country || ""}
                        onChange={(e) => handleFieldChange("country", e.target.value)}
                        className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                </div>

                {/* Helper text */}
                <div className="px-3 py-2 text-xs text-textSub bg-cream/30 flex items-center gap-2">
                    <svg height="12" viewBox="0 0 24 24" className="opacity-60 flex-shrink-0">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Tap map to drop pin, or drag marker to adjust</span>
                </div>
            </div>
        </div>
    );
}
