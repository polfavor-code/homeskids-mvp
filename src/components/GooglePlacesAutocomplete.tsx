"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

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

interface Prediction {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
}

interface GooglePlacesAutocompleteProps {
    onAddressSelect: (address: AddressComponents) => void;
    initialAddress?: Partial<AddressComponents>;
    placeholder?: string;
}

declare global {
    interface Window {
        google: any;
    }
}

export default function GooglePlacesAutocomplete({
    onAddressSelect,
    initialAddress,
    placeholder = "Search address...",
}: GooglePlacesAutocompleteProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchValue, setSearchValue] = useState(initialAddress?.formattedAddress || "");
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
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

    const autocompleteServiceRef = useRef<any>(null);
    const placesServiceRef = useRef<any>(null);
    const sessionTokenRef = useRef<any>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const onAddressSelectRef = useRef(onAddressSelect);
    onAddressSelectRef.current = onAddressSelect;

    // Load Google Maps script
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn("Google Maps API key not found");
            return;
        }

        const initServices = () => {
            if (window.google?.maps?.places) {
                autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
                // Create a dummy div for PlacesService (it needs a map or element)
                const dummyDiv = document.createElement("div");
                placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
                sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
                setIsLoaded(true);
            }
        };

        if (window.google?.maps?.places) {
            initServices();
            return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            const checkLoaded = setInterval(() => {
                if (window.google?.maps?.places) {
                    clearInterval(checkLoaded);
                    initServices();
                }
            }, 100);
            return () => clearInterval(checkLoaded);
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setTimeout(initServices, 100);
        script.onerror = () => console.error("Failed to load Google Maps");
        document.head.appendChild(script);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    // Search for predictions
    const searchPlaces = useCallback((input: string) => {
        if (!isLoaded || !autocompleteServiceRef.current || input.length < 3) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);

        autocompleteServiceRef.current.getPlacePredictions(
            {
                input,
                types: ["address"],
                sessionToken: sessionTokenRef.current,
            },
            (results: Prediction[] | null, status: string) => {
                setIsSearching(false);
                if (status === "OK" && results) {
                    setPredictions(results);
                    setShowDropdown(true);
                } else {
                    setPredictions([]);
                    setShowDropdown(false);
                }
            }
        );
    }, [isLoaded]);

    // Handle input change with debounce
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            searchPlaces(value);
        }, 300);
    };

    // Geocode an address string directly
    const geocodeAddress = useCallback((address: string) => {
        if (!isLoaded || !window.google?.maps) return;

        const geocoder = new window.google.maps.Geocoder();
        setIsSearching(true);

        geocoder.geocode({ address }, (results: any[], status: string) => {
            setIsSearching(false);

            if (status === "OK" && results && results.length > 0) {
                const place = results[0];
                const addressComponents = parseAddressComponents(place);
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const formattedAddress = place.formatted_address || address;

                setSearchValue(formattedAddress);
                setAddressFields({
                    street: addressComponents.street,
                    city: addressComponents.city,
                    state: addressComponents.state,
                    zip: addressComponents.zip,
                    country: addressComponents.country,
                });
                setMapCenter({ lat, lng });
                setShowDropdown(false);

                onAddressSelectRef.current({
                    ...addressComponents,
                    lat,
                    lng,
                    formattedAddress,
                });
            } else {
                console.log("Geocode failed:", status);
            }
        });
    }, [isLoaded]);

    // Handle Enter key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            setShowDropdown(false);

            // If there are predictions, select the first one
            if (predictions.length > 0) {
                handleSelectPrediction(predictions[0]);
            } else if (searchValue.length >= 3) {
                // Otherwise, try to geocode the typed address
                geocodeAddress(searchValue);
            }
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
    };

    // Handle prediction selection
    const handleSelectPrediction = (prediction: Prediction) => {
        if (!placesServiceRef.current) return;

        setShowDropdown(false);
        setSearchValue(prediction.description);

        placesServiceRef.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ["address_components", "geometry", "formatted_address"],
                sessionToken: sessionTokenRef.current,
            },
            (place: any, status: string) => {
                // Create new session token for next search
                sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

                if (status === "OK" && place) {
                    const addressComponents = parseAddressComponents(place);
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    const formattedAddress = place.formatted_address || prediction.description;

                    setSearchValue(formattedAddress);
                    setAddressFields({
                        street: addressComponents.street,
                        city: addressComponents.city,
                        state: addressComponents.state,
                        zip: addressComponents.zip,
                        country: addressComponents.country,
                    });
                    setMapCenter({ lat, lng });

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

    return (
        <div className="space-y-0" ref={containerRef}>
            <div className="border border-border rounded-xl overflow-hidden">
                {/* Search Input */}
                <div className="relative">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-white">
                        <input
                            type="text"
                            value={searchValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                                if (predictions.length > 0) setShowDropdown(true);
                            }}
                            placeholder={placeholder}
                            className="flex-1 text-base outline-none bg-transparent text-forest"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            enterKeyHint="search"
                        />
                        {isSearching ? (
                            <div className="w-5 h-5 border-2 border-forest/30 border-t-forest rounded-full animate-spin flex-shrink-0" />
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (predictions.length > 0) {
                                        handleSelectPrediction(predictions[0]);
                                    } else if (searchValue.length >= 3) {
                                        geocodeAddress(searchValue);
                                    }
                                }}
                                className="p-2 -mr-2 text-forest hover:bg-cream rounded-lg transition-colors flex-shrink-0"
                                aria-label="Search address"
                            >
                                <svg
                                    width="20"
                                    height="20"
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

                    {/* Custom Dropdown */}
                    {showDropdown && predictions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full bg-white border border-border border-t-0 rounded-b-xl shadow-lg z-50 max-h-[300px] overflow-y-auto">
                            {predictions.map((prediction) => (
                                <button
                                    key={prediction.place_id}
                                    type="button"
                                    onClick={() => handleSelectPrediction(prediction)}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        handleSelectPrediction(prediction);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-softGreen/50 active:bg-softGreen transition-colors border-b border-border/50 last:border-b-0"
                                >
                                    <div className="text-sm font-medium text-forest">
                                        {prediction.structured_formatting.main_text}
                                    </div>
                                    <div className="text-xs text-textSub">
                                        {prediction.structured_formatting.secondary_text}
                                    </div>
                                </button>
                            ))}
                            <div className="px-4 py-2 text-xs text-textSub/60 flex items-center justify-end gap-1 bg-cream/30">
                                <span>Powered by</span>
                                <svg height="12" viewBox="0 0 24 24" className="opacity-60">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Map Preview */}
                {mapCenter && mapCenter.lat && mapCenter.lng ? (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${mapCenter.lat},${mapCenter.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                    >
                        <img
                            src={`https://maps.googleapis.com/maps/api/staticmap?center=${mapCenter.lat},${mapCenter.lng}&zoom=15&size=600x200&scale=2&markers=color:red%7C${mapCenter.lat},${mapCenter.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                            alt="Map preview"
                            className="w-full h-36 object-cover"
                        />
                    </a>
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
            </div>
        </div>
    );
}
