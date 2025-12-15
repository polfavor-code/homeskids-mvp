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

// CSS for marker drop animation
const markerStyles = `
@keyframes marker-drop {
    0% { transform: translateY(-100px); opacity: 0; }
    60% { transform: translateY(10px); opacity: 1; }
    80% { transform: translateY(-5px); }
    100% { transform: translateY(0); }
}
.marker-drop-animation {
    animation: marker-drop 0.5s ease-out forwards;
}
`;

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

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const autocompleteServiceRef = useRef<any>(null);
    const placesServiceRef = useRef<any>(null);
    const geocoderRef = useRef<any>(null);
    const sessionTokenRef = useRef<any>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Track if we're using the new Places API
    const useNewPlacesAPI = useRef<boolean>(false);

    const onAddressSelectRef = useRef(onAddressSelect);
    onAddressSelectRef.current = onAddressSelect;

    // Inject marker animation styles
    useEffect(() => {
        if (typeof document === "undefined") return;
        const styleId = "marker-animation-styles";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = markerStyles;
            document.head.appendChild(style);
        }
    }, []);

    // Load Google Maps script
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        console.log("GooglePlacesAutocomplete: Checking API key...", { 
            hasKey: !!apiKey, 
            keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined'
        });

        if (!apiKey) {
            console.error("Google Maps API key not found in environment variables");
            console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('GOOGLE')));
            return;
        }

        const initServices = () => {
            if (window.google?.maps?.places && window.google?.maps?.Geocoder) {
                try {
                    geocoderRef.current = new window.google.maps.Geocoder();
                    
                    // Check if new Places API is available
                    const hasNewAPI = !!window.google.maps.places.Place && 
                                      !!window.google.maps.places.AutocompleteSuggestion;
                    useNewPlacesAPI.current = hasNewAPI;
                    
                    // Initialize legacy services as fallback
                    if (!hasNewAPI) {
                        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
                        const dummyDiv = document.createElement("div");
                        placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
                        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
                    }
                    
                    setIsLoaded(true);
                    console.log("Google Maps services initialized successfully", { 
                        newAPI: useNewPlacesAPI.current 
                    });
                } catch (err) {
                    console.error("Error initializing Google Maps services:", err);
                }
            }
        };

        // Check if already loaded
        if (window.google?.maps?.places && window.google?.maps?.Geocoder) {
            initServices();
            return;
        }

        // Check for existing script to avoid duplicates
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
        if (existingScript) {
            console.log("Google Maps script already exists, waiting for load...");
            const checkLoaded = setInterval(() => {
                if (window.google?.maps?.places && window.google?.maps?.Geocoder) {
                    clearInterval(checkLoaded);
                    initServices();
                }
            }, 100);
            // Timeout after 10 seconds
            setTimeout(() => clearInterval(checkLoaded), 10000);
            return () => clearInterval(checkLoaded);
        }

        // Load the script only if it doesn't exist
        console.log("Loading Google Maps script...");
        const script = document.createElement("script");
        // Include geocoding library explicitly for mobile compatibility
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker,geocoding&loading=async`;
        script.async = true;
        script.defer = true;
        script.id = "google-maps-script"; // Add ID to track it
        script.onload = () => {
            console.log("Google Maps script loaded successfully");
            setTimeout(initServices, 200); // Increased timeout for mobile
        };
        script.onerror = (error) => {
            console.error("Failed to load Google Maps script:", error);
        };
        document.head.appendChild(script);

        return () => {
            // Don't remove script on cleanup - let it persist for other components
            // Cleanup script if component unmounts during loading
            // if (!window.google?.maps?.places) {
            //     script.remove();
            // }
        };
    }, []);

    // Initialize map when loaded
    useEffect(() => {
        if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

        const defaultCenter = mapCenter || { lat: 52.3676, lng: 4.9041 }; // Amsterdam default

        try {
            mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
                center: defaultCenter,
                zoom: mapCenter ? 16 : 4,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false, // Disabled for better mobile UX
                zoomControl: true,
                gestureHandling: "greedy", // Better for mobile - allows single-finger pan
                mapId: "address-picker-map", // Required for AdvancedMarkerElement
                // Mobile-friendly options
                clickableIcons: false,
                disableDoubleClickZoom: false,
                draggable: true,
            });

            console.log("Map initialized successfully");

            // Add marker if we have initial coordinates
            if (mapCenter) {
                // Delay marker creation slightly to ensure map is fully ready
                setTimeout(() => {
                    createMarker(mapCenter.lat, mapCenter.lng, false);
                }, 100);
            }

            // Allow clicking on map to set location - capture listener for cleanup
            const clickListener = mapRef.current.addListener("click", (e: any) => {
                if (e.latLng) {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    updateMarkerPosition(lat, lng);
                    reverseGeocode(lat, lng);
                }
            });

            // Cleanup function to remove listeners and prevent memory leaks
            return () => {
                // Remove the click listener
                if (clickListener) {
                    try {
                        clickListener.remove();
                    } catch (err) {
                        console.warn("Error removing click listener:", err);
                    }
                }

                // Clear all instance listeners on the map
                if (mapRef.current && window.google?.maps?.event?.clearInstanceListeners) {
                    try {
                        window.google.maps.event.clearInstanceListeners(mapRef.current);
                    } catch (err) {
                        console.warn("Error clearing map listeners:", err);
                    }
                }

                // Clean up marker
                if (markerRef.current) {
                    try {
                        markerRef.current.map = null;
                        markerRef.current = null;
                    } catch (err) {
                        console.warn("Error cleaning up marker:", err);
                    }
                }

                // Clean up map reference
                mapRef.current = null;
            };
        } catch (err) {
            console.error("Error initializing map:", err);
        }
    }, [isLoaded, mapCenter]);

    // Create marker element for AdvancedMarkerElement
    const createMarkerElement = (animate: boolean = true) => {
        const markerEl = document.createElement("div");
        markerEl.innerHTML = `
            <div style="
                width: 36px;
                height: 36px;
                background: #EA4335;
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    width: 10px;
                    height: 10px;
                    background: white;
                    border-radius: 50%;
                    transform: rotate(45deg);
                "></div>
            </div>
        `;
        if (animate) {
            markerEl.classList.add("marker-drop-animation");
        }
        return markerEl;
    };

    // Create or update marker using AdvancedMarkerElement (new API)
    const createMarker = (lat: number, lng: number, animate: boolean = true) => {
        // Check if we have the required API available
        if (!mapRef.current) {
            console.warn("Map not ready yet");
            return;
        }

        // Fallback to standard marker if AdvancedMarkerElement is not available (mobile browsers may not support it yet)
        const hasAdvancedMarker = window.google?.maps?.marker?.AdvancedMarkerElement;

        // Remove existing marker from map
        if (markerRef.current) {
            try {
                if (hasAdvancedMarker) {
                    markerRef.current.map = null;
                } else {
                    markerRef.current.setMap(null);
                }
                markerRef.current = null;
            } catch (err) {
                console.warn("Error removing old marker:", err);
            }
        }

        try {
            if (hasAdvancedMarker) {
                // Use AdvancedMarkerElement (modern browsers)
                const markerContent = createMarkerElement(animate);

                markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
                    position: { lat, lng },
                    map: mapRef.current,
                    content: markerContent,
                    gmpDraggable: true,
                });

                // Attach dragend listener
                markerRef.current.addListener("dragend", () => {
                    const pos = markerRef.current.position;
                    if (pos) {
                        const newLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
                        const newLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
                        reverseGeocode(newLat, newLng);
                        setMapCenter({ lat: newLat, lng: newLng });
                    }
                });

                if (animate) {
                    setTimeout(() => {
                        markerContent.classList.remove("marker-drop-animation");
                    }, 500);
                }
            } else {
                // Fallback to standard Marker for mobile browsers
                console.log("Using standard Marker for compatibility");
                markerRef.current = new window.google.maps.Marker({
                    position: { lat, lng },
                    map: mapRef.current,
                    draggable: true,
                    animation: animate ? window.google.maps.Animation.DROP : null,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#EA4335",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 3,
                    },
                });

                // Attach dragend listener for standard marker
                markerRef.current.addListener("dragend", (e: any) => {
                    if (e.latLng) {
                        const newLat = e.latLng.lat();
                        const newLng = e.latLng.lng();
                        reverseGeocode(newLat, newLng);
                        setMapCenter({ lat: newLat, lng: newLng });
                    }
                });
            }
            console.log("Marker created successfully");
        } catch (err) {
            console.error("Error creating marker:", err);
        }
    };

    // Update marker position
    const updateMarkerPosition = (lat: number, lng: number) => {
        if (!mapRef.current) return;

        createMarker(lat, lng, true);
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(16);
        setMapCenter({ lat, lng });
    };

    // Reverse geocode coordinates to address
    const reverseGeocode = useCallback((lat: number, lng: number) => {
        if (!geocoderRef.current) {
            console.warn("Geocoder not ready");
            return;
        }

        geocoderRef.current.geocode(
            { location: { lat, lng } },
            (results: any[], status: string) => {
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
                } else {
                    console.warn("Reverse geocoding failed:", status);
                }
            }
        );
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

    // Search for predictions - uses new API if available, falls back to legacy
    const searchPlaces = useCallback(async (input: string) => {
        if (!isLoaded || input.length < 3) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);

        // Try new API first if available
        if (useNewPlacesAPI.current) {
            try {
                const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input,
                    includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
                });

                if (suggestions && suggestions.length > 0) {
                    const mappedPredictions: Prediction[] = suggestions.map((suggestion: any) => ({
                        place_id: suggestion.placePrediction.placeId,
                        description: suggestion.placePrediction.text.text,
                        structured_formatting: {
                            main_text: suggestion.placePrediction.mainText?.text || suggestion.placePrediction.text.text.split(",")[0],
                            secondary_text: suggestion.placePrediction.secondaryText?.text || suggestion.placePrediction.text.text.split(",").slice(1).join(",").trim(),
                        },
                    }));
                    setPredictions(mappedPredictions);
                    setShowDropdown(true);
                } else {
                    setPredictions([]);
                    setShowDropdown(false);
                }
                setIsSearching(false);
                return;
            } catch (err) {
                console.warn("New Places API failed, trying legacy:", err);
            }
        }

        // Fallback to legacy API
        if (autocompleteServiceRef.current) {
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
        } else {
            setIsSearching(false);
            setPredictions([]);
            setShowDropdown(false);
        }
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
        if (!isLoaded || !geocoderRef.current) {
            console.warn("Geocoder not ready");
            return;
        }

        setIsSearching(true);

        geocoderRef.current.geocode({ address }, (results: any[], status: string) => {
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
                setShowDropdown(false);

                updateMarkerPosition(lat, lng);

                onAddressSelectRef.current({
                    ...addressComponents,
                    lat,
                    lng,
                    formattedAddress,
                });
            } else {
                console.warn("Geocode failed:", status);
                // Still close dropdown even if geocoding failed
                setShowDropdown(false);
            }
        });
    }, [isLoaded]);

    // Handle Enter key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            setShowDropdown(false);

            if (predictions.length > 0) {
                handleSelectPrediction(predictions[0]);
            } else if (searchValue.length >= 3) {
                geocodeAddress(searchValue);
            }
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
    };

    // Handle prediction selection - uses new API if available, falls back to legacy
    const handleSelectPrediction = async (prediction: Prediction) => {
        setShowDropdown(false);
        setSearchValue(prediction.description);
        setIsSearching(true);

        // Try new API first if available
        if (useNewPlacesAPI.current) {
            try {
                const place = new window.google.maps.places.Place({
                    id: prediction.place_id,
                });

                await place.fetchFields({
                    fields: ["addressComponents", "location", "formattedAddress"],
                });

                const addressComponents = parseAddressComponentsNew(place.addressComponents || []);
                const lat = place.location?.lat() || 0;
                const lng = place.location?.lng() || 0;
                const formattedAddress = place.formattedAddress || prediction.description;

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
                setIsSearching(false);
                return;
            } catch (err) {
                console.warn("New Place API failed, trying legacy:", err);
            }
        }

        // Fallback to legacy API
        if (placesServiceRef.current) {
            placesServiceRef.current.getDetails(
                {
                    placeId: prediction.place_id,
                    fields: ["address_components", "geometry", "formatted_address"],
                    sessionToken: sessionTokenRef.current,
                },
                (place: any, status: string) => {
                    setIsSearching(false);
                    
                    // Create new session token
                    if (window.google?.maps?.places?.AutocompleteSessionToken) {
                        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
                    }

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

                        updateMarkerPosition(lat, lng);

                        onAddressSelectRef.current({
                            ...addressComponents,
                            lat,
                            lng,
                            formattedAddress,
                        });
                    } else {
                        console.warn("Place details failed:", status);
                        geocodeAddress(prediction.description);
                    }
                }
            );
        } else {
            setIsSearching(false);
            geocodeAddress(prediction.description);
        }
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

    // Parse address components from new Places API format
    const parseAddressComponentsNew = (components: any[]): Omit<AddressComponents, "lat" | "lng" | "formattedAddress"> => {
        let streetNumber = "";
        let route = "";
        let city = "";
        let state = "";
        let zip = "";
        let country = "";

        for (const component of components) {
            const types = component.types || [];
            if (types.includes("street_number")) {
                streetNumber = component.longText || component.shortText || "";
            } else if (types.includes("route")) {
                route = component.longText || component.shortText || "";
            } else if (types.includes("locality") || types.includes("postal_town")) {
                city = component.longText || component.shortText || "";
            } else if (types.includes("administrative_area_level_1")) {
                state = component.shortText || component.longText || "";
            } else if (types.includes("postal_code")) {
                zip = component.longText || component.shortText || "";
            } else if (types.includes("country")) {
                country = component.longText || component.shortText || "";
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
                            inputMode="search"
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
                                    onTouchStart={(e) => {
                                        // Prevent iOS Safari from firing click event
                                        e.currentTarget.style.backgroundColor = "rgba(20, 184, 166, 0.1)";
                                    }}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.currentTarget.style.backgroundColor = "";
                                        handleSelectPrediction(prediction);
                                    }}
                                    onTouchCancel={(e) => {
                                        e.currentTarget.style.backgroundColor = "";
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-softGreen/50 active:bg-softGreen transition-colors border-b border-border/50 last:border-b-0 touch-manipulation"
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

                {/* Interactive Map */}
                <div className="relative">
                    <div
                        ref={mapContainerRef}
                        className="h-48 w-full bg-gray-100 touch-none"
                        style={{ WebkitUserSelect: "none", userSelect: "none" }}
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
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white/90 px-4 py-2 rounded-lg text-sm text-forest shadow">
                                Search or tap map to set location
                            </div>
                        </div>
                    )}
                    {/* Error overlay for API issues */}
                    {!isLoaded && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                            <div className="flex flex-col items-center gap-2 text-red-600 text-center p-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span className="text-xs font-medium">Maps API key not configured</span>
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
                    <span>Tap map to drop pin, drag marker to adjust</span>
                </div>
            </div>
        </div>
    );
}
