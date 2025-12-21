"use client";

import { useEffect, useState, useRef } from "react";

interface LocationMapProps {
    address: string;
    lat?: number;
    lng?: number;
    height?: string;
    className?: string;
}

// Google Maps API Key - set this in your environment variables
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Load Google Maps script
function loadGoogleMapsScript(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.google && window.google.maps) {
            resolve();
            return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            existingScript.addEventListener("load", () => resolve());
            return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(script);
    });
}

export default function LocationMap({ address, lat, lng, height = "180px", className = "" }: LocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // Check for API key
        if (!GOOGLE_MAPS_API_KEY) {
            setError("Google Maps API key not configured");
            setLoading(false);
            return;
        }

        const initMap = async () => {
            try {
                await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
                
                let position: google.maps.LatLngLiteral;

                // Use provided coordinates or geocode the address
                if (lat && lng) {
                    position = { lat, lng };
                } else {
                    // Geocode the address
                    const geocoder = new google.maps.Geocoder();
                    const result = await geocoder.geocode({ address });
                    
                    if (result.results && result.results.length > 0) {
                        const location = result.results[0].geometry.location;
                        position = { lat: location.lat(), lng: location.lng() };
                    } else {
                        setError("Location not found");
                        setLoading(false);
                        return;
                    }
                }

                // Create map
                const map = new google.maps.Map(mapRef.current!, {
                    center: position,
                    zoom: 15,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    gestureHandling: "greedy", // Allows easy scroll/pinch zoom
                    styles: [
                        // Subtle styling - hide POI labels for cleaner look
                        {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }],
                        },
                    ],
                });

                // Add marker
                new google.maps.Marker({
                    position,
                    map,
                    title: address,
                });

                mapInstanceRef.current = map;
                setLoading(false);
            } catch (err) {
                console.error("Google Maps error:", err);
                setError("Failed to load map");
                setLoading(false);
            }
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current = null;
            }
        };
    }, [address, lat, lng]);

    if (error) {
        return (
            <div
                className={`bg-cream/50 rounded-xl flex items-center justify-center ${className}`}
                style={{ height }}
            >
                <div className="text-textSub text-sm">{error}</div>
            </div>
        );
    }

    // Build Google Maps URL for "View full map"
    const getGoogleMapsUrl = () => {
        if (lat && lng) {
            return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    };

    return (
        <div className={`relative rounded-xl overflow-hidden border border-border/50 ${className}`} style={{ height }}>
            {loading && (
                <div className="absolute inset-0 bg-cream/50 flex items-center justify-center z-10">
                    <div className="text-textSub text-sm">Loading map...</div>
                </div>
            )}
            <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
            
            {/* View full map button */}
            <a
                href={getGoogleMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 left-2 z-20 bg-white px-2.5 py-1.5 rounded-lg shadow-md text-xs font-medium text-forest hover:bg-gray-50 transition-colors flex items-center gap-1.5 border border-border/50"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View full map
            </a>
        </div>
    );
}
