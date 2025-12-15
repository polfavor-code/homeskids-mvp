"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import MobileSelect from "@/components/MobileSelect";
import MobileMultiSelect from "@/components/MobileMultiSelect";
import PhoneInput from "@/components/PhoneInput";
import GooglePlacesAutocomplete, { AddressComponents } from "@/components/GooglePlacesAutocomplete";

// Type for phone entries
interface PhoneEntry {
    countryCode: string;
    number: string;
}
import { useAuth } from "@/lib/AuthContext";
import { useAppState, HomeProfile, CaregiverProfile, HomeStatus } from "@/lib/AppStateContext";
import { useItems } from "@/lib/ItemsContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";

const TIME_ZONE_OPTIONS = [
    { value: "auto", label: "Detect automatically (browser default)" },
    { value: "Europe/Madrid", label: "Europe/Madrid (CET)" },
    { value: "Europe/Amsterdam", label: "Europe/Amsterdam (CET)" },
    { value: "Europe/London", label: "Europe/London (GMT)" },
    { value: "Europe/Paris", label: "Europe/Paris (CET)" },
    { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
    { value: "Europe/Rome", label: "Europe/Rome (CET)" },
    { value: "America/New_York", label: "America/New York (EST)" },
    { value: "America/Los_Angeles", label: "America/Los Angeles (PST)" },
    { value: "America/Chicago", label: "America/Chicago (CST)" },
    { value: "America/Denver", label: "America/Denver (MST)" },
    { value: "America/Phoenix", label: "America/Phoenix (MST)" },
    { value: "America/Toronto", label: "America/Toronto (EST)" },
    { value: "America/Vancouver", label: "America/Vancouver (PST)" },
    { value: "America/Mexico_City", label: "America/Mexico City (CST)" },
    { value: "America/Sao_Paulo", label: "America/São Paulo (BRT)" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
    { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
    { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
    { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
    { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST)" },
    { value: "UTC", label: "UTC" },
];

// Helper to get timezone from coordinates using Google Time Zone API
async function getTimeZoneFromCoordinates(lat: number, lng: number): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.status === "OK" && data.timeZoneId) {
            return data.timeZoneId;
        }
        return null;
    } catch (error) {
        console.error("Error fetching timezone:", error);
        return null;
    }
}

// Helper to format timezone for display with local time
function formatTimeZone(timeZoneId: string): string {
    try {
        const now = new Date();
        
        // For auto, use browser's timezone
        const effectiveTimeZone = timeZoneId === "auto" 
            ? Intl.DateTimeFormat().resolvedOptions().timeZone 
            : timeZoneId;
        
        // Get time in that timezone
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: effectiveTimeZone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const localTime = timeFormatter.format(now);
        
        // Get timezone abbreviation
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: effectiveTimeZone,
            timeZoneName: 'short'
        });
        const parts = tzFormatter.formatToParts(now);
        const tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || '';
        
        if (timeZoneId === "auto") {
            return `Browser default — ${localTime} (${tzAbbr})`;
        }
        
        return `${timeZoneId.replace(/_/g, ' ')} — ${localTime} (${tzAbbr})`;
    } catch {
        return timeZoneId === "auto" ? "Detected automatically (browser default)" : timeZoneId;
    }
}

// Country to phone code mapping
const COUNTRY_TO_PHONE_CODE: Record<string, string> = {
    // Europe
    "Spain": "+34",
    "ES": "+34",
    "Netherlands": "+31",
    "NL": "+31",
    "Germany": "+49",
    "DE": "+49",
    "France": "+33",
    "FR": "+33",
    "Italy": "+39",
    "IT": "+39",
    "United Kingdom": "+44",
    "UK": "+44",
    "GB": "+44",
    "Portugal": "+351",
    "PT": "+351",
    "Belgium": "+32",
    "BE": "+32",
    "Austria": "+43",
    "AT": "+43",
    "Switzerland": "+41",
    "CH": "+41",
    "Ireland": "+353",
    "IE": "+353",
    "Poland": "+48",
    "PL": "+48",
    "Sweden": "+46",
    "SE": "+46",
    "Norway": "+47",
    "NO": "+47",
    "Denmark": "+45",
    "DK": "+45",
    "Finland": "+358",
    "FI": "+358",
    "Greece": "+30",
    "GR": "+30",
    // Americas
    "United States": "+1",
    "USA": "+1",
    "US": "+1",
    "Canada": "+1",
    "CA": "+1",
    "Mexico": "+52",
    "MX": "+52",
    "Brazil": "+55",
    "BR": "+55",
    "Argentina": "+54",
    "AR": "+54",
    "Colombia": "+57",
    "CO": "+57",
    "Chile": "+56",
    "CL": "+56",
    // Asia Pacific
    "Australia": "+61",
    "AU": "+61",
    "New Zealand": "+64",
    "NZ": "+64",
    "Japan": "+81",
    "JP": "+81",
    "China": "+86",
    "CN": "+86",
    "South Korea": "+82",
    "KR": "+82",
    "India": "+91",
    "IN": "+91",
    "Singapore": "+65",
    "SG": "+65",
    "Hong Kong": "+852",
    "HK": "+852",
    "Thailand": "+66",
    "TH": "+66",
    "Indonesia": "+62",
    "ID": "+62",
    "Philippines": "+63",
    "PH": "+63",
    "Malaysia": "+60",
    "MY": "+60",
    "Vietnam": "+84",
    "VN": "+84",
    // Middle East
    "United Arab Emirates": "+971",
    "UAE": "+971",
    "AE": "+971",
    "Saudi Arabia": "+966",
    "SA": "+966",
    "Israel": "+972",
    "IL": "+972",
    "Turkey": "+90",
    "TR": "+90",
    // Africa
    "South Africa": "+27",
    "ZA": "+27",
    "Egypt": "+20",
    "EG": "+20",
    "Morocco": "+212",
    "MA": "+212",
    "Nigeria": "+234",
    "NG": "+234",
};

// Get phone code from country name or code
function getPhoneCodeFromCountry(country: string): string {
    if (!country) return "+1";
    
    // Try direct match
    const directMatch = COUNTRY_TO_PHONE_CODE[country];
    if (directMatch) return directMatch;
    
    // Try uppercase match
    const upperMatch = COUNTRY_TO_PHONE_CODE[country.toUpperCase()];
    if (upperMatch) return upperMatch;
    
    // Try partial match (e.g., "Spain, Europe" -> "Spain")
    const firstPart = country.split(',')[0].trim();
    const partialMatch = COUNTRY_TO_PHONE_CODE[firstPart];
    if (partialMatch) return partialMatch;
    
    return "+1"; // Default fallback
}

// Detect country from browser locale/timezone
function detectBrowserCountryCode(): string {
    try {
        // Try to get country from timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Map common timezones to countries
        if (timeZone.startsWith("Europe/Madrid") || timeZone.startsWith("Atlantic/Canary")) return "+34";
        if (timeZone.startsWith("Europe/Amsterdam")) return "+31";
        if (timeZone.startsWith("Europe/Berlin")) return "+49";
        if (timeZone.startsWith("Europe/Paris")) return "+33";
        if (timeZone.startsWith("Europe/Rome")) return "+39";
        if (timeZone.startsWith("Europe/London")) return "+44";
        if (timeZone.startsWith("Europe/Lisbon")) return "+351";
        if (timeZone.startsWith("Europe/Brussels")) return "+32";
        if (timeZone.startsWith("Europe/Vienna")) return "+43";
        if (timeZone.startsWith("Europe/Zurich")) return "+41";
        if (timeZone.startsWith("Europe/Dublin")) return "+353";
        if (timeZone.startsWith("Europe/Warsaw")) return "+48";
        if (timeZone.startsWith("Europe/Stockholm")) return "+46";
        if (timeZone.startsWith("Europe/Oslo")) return "+47";
        if (timeZone.startsWith("Europe/Copenhagen")) return "+45";
        if (timeZone.startsWith("Europe/Helsinki")) return "+358";
        if (timeZone.startsWith("Europe/Athens")) return "+30";
        if (timeZone.startsWith("America/New_York") || 
            timeZone.startsWith("America/Chicago") || 
            timeZone.startsWith("America/Denver") || 
            timeZone.startsWith("America/Los_Angeles") ||
            timeZone.startsWith("America/Phoenix")) return "+1";
        if (timeZone.startsWith("America/Toronto") || timeZone.startsWith("America/Vancouver")) return "+1";
        if (timeZone.startsWith("America/Mexico_City")) return "+52";
        if (timeZone.startsWith("America/Sao_Paulo")) return "+55";
        if (timeZone.startsWith("Australia/")) return "+61";
        if (timeZone.startsWith("Pacific/Auckland")) return "+64";
        if (timeZone.startsWith("Asia/Tokyo")) return "+81";
        if (timeZone.startsWith("Asia/Shanghai") || timeZone.startsWith("Asia/Hong_Kong")) return "+86";
        if (timeZone.startsWith("Asia/Seoul")) return "+82";
        if (timeZone.startsWith("Asia/Kolkata")) return "+91";
        if (timeZone.startsWith("Asia/Singapore")) return "+65";
        if (timeZone.startsWith("Asia/Dubai")) return "+971";
        
        // Try navigator language as fallback
        const lang = navigator.language || "";
        const region = lang.split('-')[1]?.toUpperCase();
        if (region && COUNTRY_TO_PHONE_CODE[region]) {
            return COUNTRY_TO_PHONE_CODE[region];
        }
        
        return "+1"; // Default
    } catch {
        return "+1";
    }
}

interface HomeFormData {
    name: string;
    address: string;
    addressStreet: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
    addressCountry: string;
    addressLat: number | null;
    addressLng: number | null;
    timeZone: string;
    timeZoneManuallySet: boolean; // Track if user manually overrode the timezone
    homePhones: PhoneEntry[];
    wifiName: string;
    wifiPassword: string;
    notes: string;
    isPrimary: boolean;
    accessibleCaregiverIds: string[];
}

// Function to get default form data with browser-detected country code
const getDefaultFormData = (): HomeFormData => ({
    name: "",
    address: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    addressCountry: "",
    addressLat: null,
    addressLng: null,
    timeZone: "auto",
    timeZoneManuallySet: false,
    homePhones: [{ countryCode: detectBrowserCountryCode(), number: "" }],
    wifiName: "",
    wifiPassword: "",
    notes: "",
    isPrimary: false,
    accessibleCaregiverIds: [],
});

// Helper to parse stored phone data (backwards compatible)
const parseHomePhones = (homePhone: string | null): PhoneEntry[] => {
    if (!homePhone) return [{ countryCode: "+1", number: "" }];
    try {
        const parsed = JSON.parse(homePhone);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // Legacy format - single phone string
        return [{ countryCode: "+1", number: homePhone }];
    }
    return [{ countryCode: "+1", number: "" }];
};

// Helper to serialize phone data for storage
const serializeHomePhones = (phones: PhoneEntry[]): string | null => {
    const validPhones = phones.filter(p => p.number.trim());
    if (validPhones.length === 0) return null;
    return JSON.stringify(validPhones);
};

export default function HomeSetupPage() {
    useEnsureOnboarding();

    const { user, loading: authLoading } = useAuth();
    const { child, homes, activeHomes, hiddenHomes, caregivers, currentHomeId, currentChildId, refreshData, isLoaded } = useAppState();
    const { items } = useItems();

    // Count items located at each home
    const getItemCountForHome = (homeId: string): number => {
        return items.filter(item => item.locationHomeId === homeId).length;
    };

    const searchParams = useSearchParams();
    
    const [expandedHomeId, setExpandedHomeId] = useState<string | null>(null);
    const [editingHomeId, setEditingHomeId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [formData, setFormData] = useState<HomeFormData>(() => getDefaultFormData());
    const [showHideWarning, setShowHideWarning] = useState<string | null>(null);

    // Auto-show add form if ?add=true is in URL
    useEffect(() => {
        if (searchParams.get("add") === "true") {
            setShowAddForm(true);
        }
    }, [searchParams]);

    // Filter out pending caregivers for selection
    const activeCaregivers = caregivers.filter(c => !c.id.startsWith("pending-"));

    const resetForm = () => {
        setFormData(getDefaultFormData());
        setShowAddForm(false);
        setEditingHomeId(null);
    };

    const handleEditHome = (home: HomeProfile) => {
        setEditingHomeId(home.id);
        setExpandedHomeId(home.id);
        // Determine if timezone was manually set (not auto and not matching a location-derived one)
        const hasAddress = !!(home.addressLat && home.addressLng);
        const isManuallySet = home.timeZone && home.timeZone !== "auto" && hasAddress;
        setFormData({
            name: home.name,
            address: home.address || "",
            addressStreet: home.addressStreet || "",
            addressCity: home.addressCity || "",
            addressState: home.addressState || "",
            addressZip: home.addressZip || "",
            addressCountry: home.addressCountry || "",
            addressLat: home.addressLat || null,
            addressLng: home.addressLng || null,
            timeZone: home.timeZone || "auto",
            timeZoneManuallySet: !!isManuallySet,
            homePhones: parseHomePhones(home.homePhone || null),
            wifiName: home.wifiName || "",
            wifiPassword: home.wifiPassword || "",
            notes: home.notes || "",
            isPrimary: home.isPrimary || false,
            accessibleCaregiverIds: home.accessibleCaregiverIds || [],
        });
        setError("");
    };

    const handleSaveHome = async (homeId?: string) => {
        if (!formData.name.trim()) {
            setError("Home name is required");
            return;
        }

        try {
            setSaving(true);
            setError("");

            // Get family ID
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user?.id)
                .single();

            if (!familyMember) {
                throw new Error("Family not found");
            }

            // If setting as primary, unset other homes first
            if (formData.isPrimary) {
                await supabase
                    .from("homes")
                    .update({ is_primary: false })
                    .eq("family_id", familyMember.family_id);
            }

            const homeData = {
                name: formData.name.trim(),
                address: formData.address.trim() || null,
                address_street: formData.addressStreet.trim() || null,
                address_city: formData.addressCity.trim() || null,
                address_state: formData.addressState.trim() || null,
                address_zip: formData.addressZip.trim() || null,
                address_country: formData.addressCountry.trim() || null,
                address_lat: formData.addressLat || null,
                address_lng: formData.addressLng || null,
                time_zone: formData.timeZone || "auto",
                home_phone: serializeHomePhones(formData.homePhones),
                wifi_name: formData.wifiName.trim() || null,
                wifi_password: formData.wifiPassword.trim() || null,
                notes: formData.notes.trim() || null,
                is_primary: formData.isPrimary,
                // Note: accessible_caregiver_ids is managed through child_space_access table
            };

            if (homeId) {
                // Update existing home
                const { error: updateError } = await supabase
                    .from("homes")
                    .update(homeData)
                    .eq("id", homeId);

                if (updateError) throw updateError;

                // Sync home_access table with legacy array
                await supabase
                    .from("home_access")
                    .delete()
                    .eq("home_id", homeId);

                if (formData.accessibleCaregiverIds.length > 0) {
                    const accessEntries = formData.accessibleCaregiverIds.map(caregiverId => ({
                        home_id: homeId,
                        caregiver_id: caregiverId,
                    }));
                    await supabase.from("home_access").insert(accessEntries);
                }

                setSuccessMessage("Home updated!");
            } else {
                // Create new home with status = "active"
                const { data: newHome, error: insertError } = await supabase
                    .from("homes")
                    .insert({
                        family_id: familyMember.family_id,
                        status: "active",
                        ...homeData,
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                if (newHome) {
                    // Create child_spaces entry to link home to current child
                    if (currentChildId) {
                        const { error: childSpaceError } = await supabase
                            .from("child_spaces")
                            .insert({
                                child_id: currentChildId,
                                home_id: newHome.id,
                            });
                        
                        if (childSpaceError) {
                            console.error("Error creating child_space:", childSpaceError);
                        }
                    }

                    // Add current user to home_memberships so they have access
                    const { error: membershipError } = await supabase
                        .from("home_memberships")
                        .insert({
                            home_id: newHome.id,
                            user_id: user?.id,
                        });
                    
                    if (membershipError) {
                        console.error("Error creating home_membership:", membershipError);
                    }

                    // Handle additional caregiver access if specified
                    if (formData.accessibleCaregiverIds.length > 0) {
                        const accessEntries = formData.accessibleCaregiverIds.map(caregiverId => ({
                            home_id: newHome.id,
                            caregiver_id: caregiverId,
                        }));
                        await supabase.from("home_access").insert(accessEntries);
                    }
                }

                setSuccessMessage("Home added!");
            }

            await refreshData();
            resetForm();
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error saving home:", err);
            setError(err.message || "Failed to save home");
        } finally {
            setSaving(false);
        }
    };

    const handleHideHome = async (homeId: string) => {
        const home = homes.find(h => h.id === homeId);
        if (!home) return;

        // Check if this is the current home
        if (homeId === currentHomeId) {
            setShowHideWarning(homeId);
            return;
        }

        // Check if this would leave no active homes
        if (activeHomes.length <= 1) {
            setError("You need at least one active home. Show another home first or add a new one.");
            setTimeout(() => setError(""), 5000);
            return;
        }

        try {
            setSaving(true);
            setError("");

            const { error: updateError } = await supabase
                .from("homes")
                .update({ status: "hidden" })
                .eq("id", homeId);

            if (updateError) throw updateError;

            await refreshData();
            setSuccessMessage(`"${home.name}" is now hidden`);
            setExpandedHomeId(null);
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error hiding home:", err);
            setError(err.message || "Failed to hide home");
        } finally {
            setSaving(false);
        }
    };

    const handleShowHome = async (homeId: string) => {
        const home = homes.find(h => h.id === homeId);
        if (!home) return;

        try {
            setSaving(true);
            setError("");

            const { error: updateError } = await supabase
                .from("homes")
                .update({ status: "active" })
                .eq("id", homeId);

            if (updateError) throw updateError;

            await refreshData();
            setSuccessMessage(`"${home.name}" is now active`);
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error showing home:", err);
            setError(err.message || "Failed to show home");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteHome = async (homeId: string, homeName: string) => {
        if (!confirm(`Permanently remove "${homeName}"? This action cannot be undone. Items in this home will need to be reassigned.`)) return;

        try {
            setSaving(true);

            await supabase
                .from("home_access")
                .delete()
                .eq("home_id", homeId);

            const { error: deleteError } = await supabase
                .from("homes")
                .delete()
                .eq("id", homeId);

            if (deleteError) throw deleteError;

            await refreshData();
            setSuccessMessage("Home removed");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error deleting home:", err);
            setError(err.message || "Failed to remove home");
        } finally {
            setSaving(false);
        }
    };

    const handleAddCaregiver = async (homeId: string, caregiverId: string) => {
        const home = homes.find(h => h.id === homeId);
        if (!home) return;

        const currentIds = home.accessibleCaregiverIds || [];
        if (currentIds.includes(caregiverId)) return;

        try {
            const { error: legacyError } = await supabase
                .from("homes")
                .update({ accessible_caregiver_ids: [...currentIds, caregiverId] })
                .eq("id", homeId);

            if (legacyError) throw legacyError;

            await supabase
                .from("home_access")
                .upsert(
                    { home_id: homeId, caregiver_id: caregiverId },
                    { onConflict: "home_id,caregiver_id" }
                );

            await refreshData();
        } catch (err: any) {
            console.error("Error adding caregiver to home:", err);
            setError(err.message || "Failed to add caregiver");
        }
    };

    const handleRemoveCaregiver = async (homeId: string, caregiverId: string) => {
        const home = homes.find(h => h.id === homeId);
        if (!home) return;

        const currentIds = home.accessibleCaregiverIds || [];
        const newIds = currentIds.filter(id => id !== caregiverId);

        try {
            const { error: legacyError } = await supabase
                .from("homes")
                .update({ accessible_caregiver_ids: newIds })
                .eq("id", homeId);

            if (legacyError) throw legacyError;

            await supabase
                .from("home_access")
                .delete()
                .eq("home_id", homeId)
                .eq("caregiver_id", caregiverId);

            await refreshData();
        } catch (err: any) {
            console.error("Error removing caregiver from home:", err);
            setError(err.message || "Failed to remove caregiver");
        }
    };

    const getCaregiverById = (id: string): CaregiverProfile | undefined => {
        return caregivers.find(c => c.id === id);
    };

    // Get the count of valid caregivers (ones that actually exist)
    const getValidCaregiverCount = (home: HomeProfile): number => {
        return (home.accessibleCaregiverIds || []).filter(id => getCaregiverById(id)).length;
    };

    const getAvailableCaregivers = (home: HomeProfile): CaregiverProfile[] => {
        const assignedIds = home.accessibleCaregiverIds || [];
        return activeCaregivers.filter(c => !assignedIds.includes(c.id));
    };

    // Loading state
    if (authLoading || !isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    if (!user) {
        return null;
    }

    // Render a home card
    const renderHomeCard = (home: HomeProfile, isHidden: boolean = false) => (
        <div key={home.id} className={`card-organic overflow-hidden ${isHidden ? 'opacity-70' : ''}`}>
            {/* Home Header - Always visible */}
            <div
                className="p-4 cursor-pointer hover:bg-cream/30 transition-colors"
                onClick={() => setExpandedHomeId(expandedHomeId === home.id ? null : home.id)}
            >
                <div className="flex items-center gap-4">
                    {/* Home Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isHidden ? 'bg-gray-100 text-gray-400' : 'bg-cream text-forest'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-forest text-base">{home.name}</h3>
                            {home.isPrimary && (
                                <span className="text-xs bg-softGreen text-forest px-2 py-0.5 rounded-full font-medium">
                                    Primary
                                </span>
                            )}
                            {isHidden && (
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                    Hidden
                                </span>
                            )}
                        </div>
                        {home.address && (
                            <p className="text-sm text-textSub truncate">{home.address}</p>
                        )}
                        <p className="text-xs text-textSub mt-0.5">
                            {getValidCaregiverCount(home)} caregiver(s) connected
                            {getItemCountForHome(home.id) > 0 && (
                                <span className="text-textSub/60"> · {getItemCountForHome(home.id)} item{getItemCountForHome(home.id) !== 1 ? 's' : ''}</span>
                            )}
                        </p>
                    </div>

                    {/* Expand Icon */}
                    <div className="text-textSub">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform ${expandedHomeId === home.id ? 'rotate-180' : ''}`}
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {expandedHomeId === home.id && (
                <div className="border-t border-border/30">
                    {editingHomeId === home.id ? (
                        <div className="p-4">
                            <HomeForm
                                formData={formData}
                                setFormData={setFormData}
                                onSave={() => handleSaveHome(home.id)}
                                onCancel={resetForm}
                                saving={saving}
                                isNew={false}
                                caregivers={activeCaregivers}
                            />
                        </div>
                    ) : (
                        <div className="p-4 space-y-5">
                            {/* Location Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-forest mb-2">Location</h4>
                                <div className="space-y-3">
                                    {home.address ? (
                                        <>
                                            {/* Static Map Preview */}
                                            {home.addressLat && home.addressLng && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${home.addressLat},${home.addressLng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block rounded-xl overflow-hidden border border-border"
                                                >
                                                    <img
                                                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${home.addressLat},${home.addressLng}&zoom=15&size=400x150&scale=2&markers=color:red%7C${home.addressLat},${home.addressLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                                                        alt="Map preview"
                                                        className="w-full h-[120px] object-cover"
                                                    />
                                                </a>
                                            )}
                                            <p className="text-sm text-textSub">{home.address}</p>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${home.addressLat && home.addressLng ? `${home.addressLat},${home.addressLng}` : encodeURIComponent(home.address)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-teal hover:underline inline-flex items-center gap-1"
                                            >
                                                View on Google Maps
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                    <polyline points="15 3 21 3 21 9" />
                                                    <line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                            </a>
                                        </>
                                    ) : (
                                        <p className="text-sm text-textSub/60 italic">No address set</p>
                                    )}
                                </div>
                            </div>

                            {/* Time Zone */}
                            <div>
                                <h4 className="text-sm font-semibold text-forest mb-2">
                                    {home.addressLat && home.addressLng ? "Time Zone (based on location)" : "Time Zone"}
                                </h4>
                                <p className="text-sm text-textSub">
                                    {formatTimeZone(home.timeZone || "auto")}
                                </p>
                            </div>

                            {/* Contact Info */}
                            {home.homePhone && (
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">Contact Info</h4>
                                    {parseHomePhones(home.homePhone).filter(p => p.number).map((phone, idx) => (
                                        <p key={idx} className="text-sm text-textSub">
                                            <span className="text-forest/70">Phone:</span>{" "}
                                            <a href={`tel:${phone.countryCode}${phone.number}`} className="hover:text-forest">
                                                {phone.countryCode} {phone.number}
                                            </a>
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* WiFi */}
                            {(home.wifiName || home.wifiPassword) && (
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">WiFi</h4>
                                    <div className="space-y-2">
                                        {home.wifiName && (
                                            <p className="text-sm text-textSub">
                                                <span className="text-forest/70">Network:</span> {home.wifiName}
                                            </p>
                                        )}
                                        {home.wifiPassword && (
                                            <WiFiPasswordDisplay password={home.wifiPassword} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {home.notes && (
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">House Notes</h4>
                                    <p className="text-sm text-textSub whitespace-pre-wrap">{home.notes}</p>
                                </div>
                            )}

                            {/* People in this home */}
                            <div>
                                <h4 className="text-sm font-semibold text-forest mb-3">People in this home</h4>
                                <div className="space-y-2">
                                    {(home.accessibleCaregiverIds || []).map((caregiverId) => {
                                        const caregiver = getCaregiverById(caregiverId);
                                        if (!caregiver) return null;
                                        return (
                                            <div
                                                key={caregiverId}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-cream/50"
                                            >
                                                <Avatar
                                                    src={caregiver.avatarUrl}
                                                    initial={caregiver.avatarInitials}
                                                    size={32}
                                                    bgColor={caregiver.avatarColor.startsWith("bg-") ? "#6B7280" : caregiver.avatarColor}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-forest">{caregiver.label}</p>
                                                    {caregiver.relationship && (
                                                        <p className="text-xs text-textSub capitalize">{caregiver.relationship.replace('_', ' ')}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveCaregiver(home.id, caregiverId);
                                                    }}
                                                    className="p-1 text-textSub hover:text-red-500 transition-colors"
                                                    title="Remove from this home"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {(home.accessibleCaregiverIds?.length || 0) === 0 && (
                                        <p className="text-sm text-textSub/60 italic">No caregivers assigned yet</p>
                                    )}

                                    {/* Add Caregiver Dropdown */}
                                    {getAvailableCaregivers(home).length > 0 && (
                                        <div className="pt-2">
                                            <MobileSelect
                                                value=""
                                                onChange={(value) => {
                                                    if (value) {
                                                        handleAddCaregiver(home.id, value);
                                                    }
                                                }}
                                                options={getAvailableCaregivers(home).map((c) => ({
                                                    value: c.id,
                                                    label: `${c.label} (${c.name})`
                                                }))}
                                                placeholder="+ Add caregiver to this home"
                                                title="Add caregiver"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-border/30 gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditHome(home)}
                                        className="btn-secondary text-sm px-4 py-2"
                                    >
                                        Edit
                                    </button>
                                    {isHidden ? (
                                        <button
                                            onClick={() => handleShowHome(home.id)}
                                            disabled={saving}
                                            className="text-sm px-4 py-2 bg-softGreen text-forest rounded-xl font-medium hover:bg-softGreen/80 transition-colors disabled:opacity-50"
                                        >
                                            Show home
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleHideHome(home.id)}
                                            disabled={saving}
                                            className="text-sm px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                                        >
                                            Hide home
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteHome(home.id, home.name)}
                                    className="text-sm text-textSub hover:text-red-500 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/settings"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Settings
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Home Setup</h1>
                    <p className="text-sm text-textSub">
                        Manage the places where {child?.name || "your child"} lives and stays.
                    </p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-softGreen border border-forest/20 rounded-xl px-4 py-3 text-sm text-forest font-medium">
                        {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Hide Warning Dialog */}
                {showHideWarning && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHideWarning(null)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-dmSerif text-forest">
                                    Can't hide {child?.name || "your child"}'s current home
                                </h2>
                            </div>
                            <p className="text-sm text-textSub text-center">
                                Please set another home as {child?.name || "your child"}'s current home before hiding this one.
                            </p>
                            <button
                                onClick={() => setShowHideWarning(null)}
                                className="w-full btn-primary"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Home Form */}
                {showAddForm && (
                    <HomeForm
                        formData={formData}
                        setFormData={setFormData}
                        onSave={() => handleSaveHome()}
                        onCancel={resetForm}
                        saving={saving}
                        isNew={true}
                        caregivers={activeCaregivers}
                    />
                )}

                {/* ACTIVE HOMES SECTION */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-forest flex items-center gap-2">
                        Active homes
                        <span className="text-sm font-normal text-textSub">({activeHomes.length})</span>
                    </h2>

                    {activeHomes.map((home) => renderHomeCard(home, false))}

                    {activeHomes.length === 0 && !showAddForm && (
                        <div className="card-organic p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-forest text-lg mb-2">No active homes</h3>
                            <p className="text-sm text-textSub mb-4">
                                {hiddenHomes.length > 0
                                    ? "All your homes are hidden. Show a home or add a new one."
                                    : `Add the physical locations where ${child?.name || "your child"} stays.`}
                            </p>
                        </div>
                    )}
                </div>

                {/* Add Home Button */}
                {!showAddForm && !editingHomeId && (
                    <button
                        onClick={() => {
                            setShowAddForm(true);
                            setExpandedHomeId(null);
                        }}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-forest/30 text-forest text-sm font-semibold hover:border-forest hover:bg-softGreen/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {homes.length === 0 ? "Add your first home" : "Add another home"}
                    </button>
                )}

                {/* HIDDEN HOMES SECTION */}
                {hiddenHomes.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <h2 className="text-lg font-semibold text-gray-500 flex items-center gap-2">
                            Hidden homes
                            <span className="text-sm font-normal">({hiddenHomes.length})</span>
                        </h2>
                        <p className="text-xs text-textSub -mt-2">
                            Homes with no caregivers connected are automatically hidden. Add caregivers to show them again.
                        </p>

                        {hiddenHomes.map((home) => renderHomeCard(home, true))}
                    </div>
                )}

                {/* Info Section */}
                <div className="card-organic p-4 bg-softGreen/50">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-forest flex items-center justify-center mt-0.5">
                            <span className="text-forest text-xs font-semibold leading-none">i</span>
                        </div>
                        <div>
                            <p className="text-sm text-forest font-medium mb-1">About Homes</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Homes are physical locations where {child?.name || "your child"} stays.
                                Homes with no caregivers connected are automatically hidden.
                                Add caregivers to a home to make it active again.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

// WiFi Password Display Component with mask/show toggle and copy button
function WiFiPasswordDisplay({ password }: { password: string }) {
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <p className="text-sm text-textSub flex-1">
                <span className="text-forest/70">Password:</span>{" "}
                <span className="font-mono">{isVisible ? password : "••••••••"}</span>
            </p>
            <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="p-1.5 text-textSub hover:text-forest rounded transition-colors"
                title={isVisible ? "Hide password" : "Show password"}
            >
                {isVisible ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                )}
            </button>
            <button
                type="button"
                onClick={handleCopy}
                className={`p-1.5 rounded transition-colors ${copied ? "text-green-600" : "text-textSub hover:text-forest"}`}
                title={copied ? "Copied!" : "Copy password"}
            >
                {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                )}
            </button>
        </div>
    );
}

// WiFi Password Input Component with show/hide toggle and copy button
function WiFiPasswordInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-forest mb-1.5">
                WiFi Password
            </label>
            <div className="relative">
                <input
                    type={isVisible ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 py-3 pr-20 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                    placeholder="Password"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        className="p-1.5 text-textSub hover:text-forest rounded transition-colors"
                        title={isVisible ? "Hide password" : "Show password"}
                    >
                        {isVisible ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={`p-1.5 rounded transition-colors ${copied ? "text-green-600" : "text-textSub hover:text-forest"}`}
                        title={copied ? "Copied!" : "Copy password"}
                        disabled={!value}
                    >
                        {copied ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Home Form Component
function HomeForm({
    formData,
    setFormData,
    onSave,
    onCancel,
    saving,
    isNew,
    caregivers,
}: {
    formData: HomeFormData;
    setFormData: (data: HomeFormData) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
    isNew: boolean;
    caregivers: CaregiverProfile[];
}) {
    const [fetchingTimeZone, setFetchingTimeZone] = useState(false);
    const [showTimeZoneOverride, setShowTimeZoneOverride] = useState(false);

    const hasLocation = !!(formData.addressLat && formData.addressLng);

    // Handle address selection and auto-fetch timezone + update phone country code
    const handleAddressSelect = async (address: AddressComponents) => {
        // Get phone code from address country
        const phoneCodeFromAddress = address.country ? getPhoneCodeFromCountry(address.country) : null;
        
        // Update phone country codes for empty phone entries
        const updatedPhones = formData.homePhones.map(phone => {
            // Only update if phone number is empty (not manually entered)
            if (!phone.number && phoneCodeFromAddress) {
                return { ...phone, countryCode: phoneCodeFromAddress };
            }
            return phone;
        });
        
        // Update address fields
        const newFormData: HomeFormData = {
            ...formData,
            address: address.formattedAddress,
            addressStreet: address.street,
            addressCity: address.city,
            addressState: address.state,
            addressZip: address.zip,
            addressCountry: address.country,
            addressLat: address.lat,
            addressLng: address.lng,
            homePhones: updatedPhones,
        };

        // Auto-fetch timezone if not manually set
        if (!formData.timeZoneManuallySet && address.lat && address.lng) {
            setFetchingTimeZone(true);
            try {
                const timeZoneId = await getTimeZoneFromCoordinates(address.lat, address.lng);
                if (timeZoneId) {
                    newFormData.timeZone = timeZoneId;
                    newFormData.timeZoneManuallySet = false;
                }
            } catch (error) {
                console.error("Failed to fetch timezone:", error);
            } finally {
                setFetchingTimeZone(false);
            }
        }

        setFormData(newFormData);
    };

    // Handle manual timezone change
    const handleTimeZoneChange = (value: string) => {
        setFormData({ 
            ...formData, 
            timeZone: value, 
            timeZoneManuallySet: true 
        });
        setShowTimeZoneOverride(false);
    };

    // Reset to auto-detected timezone
    const handleResetTimeZone = async () => {
        if (formData.addressLat && formData.addressLng) {
            setFetchingTimeZone(true);
            try {
                const timeZoneId = await getTimeZoneFromCoordinates(formData.addressLat, formData.addressLng);
                if (timeZoneId) {
                    setFormData({ 
                        ...formData, 
                        timeZone: timeZoneId, 
                        timeZoneManuallySet: false 
                    });
                }
            } catch (error) {
                console.error("Failed to fetch timezone:", error);
            } finally {
                setFetchingTimeZone(false);
            }
        } else {
            setFormData({ 
                ...formData, 
                timeZone: "auto", 
                timeZoneManuallySet: false 
            });
        }
        setShowTimeZoneOverride(false);
    };

    return (
        <div className="card-organic p-5 space-y-5">
            <h2 className="font-bold text-forest text-lg">
                {isNew ? "Add Home" : "Edit Home"}
            </h2>

            {/* Basic Info */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-forest mb-1.5">
                        Home Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                        placeholder="e.g., Daddy's Home, Mommy's Home"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="isPrimary"
                        checked={formData.isPrimary}
                        onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                        className="w-4 h-4 text-forest border-border rounded focus:ring-forest/20"
                    />
                    <label htmlFor="isPrimary" className="text-sm text-forest">
                        Set as primary home
                    </label>
                </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">Location</h3>
                <div>
                    <label className="block text-sm font-medium text-forest mb-1.5">
                        Address
                    </label>
                    <GooglePlacesAutocomplete
                        onAddressSelect={handleAddressSelect}
                        initialAddress={{
                            formattedAddress: formData.address,
                            street: formData.addressStreet,
                            city: formData.addressCity,
                            state: formData.addressState,
                            zip: formData.addressZip,
                            country: formData.addressCountry,
                            lat: formData.addressLat || 0,
                            lng: formData.addressLng || 0,
                        }}
                        placeholder="Search for address..."
                    />
                    <p className="text-xs text-textSub mt-2">
                        Add a location so parents and helpers know where this home is.
                    </p>
                </div>
            </div>

            {/* Time Zone */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">
                    {hasLocation ? "Time Zone (based on home location)" : "Time Zone"}
                </h3>
                <div>
                    {fetchingTimeZone ? (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-cream/30">
                            <div className="w-4 h-4 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
                            <span className="text-sm text-textSub">Detecting time zone from location...</span>
                        </div>
                    ) : showTimeZoneOverride ? (
                        <div className="space-y-2">
                            <MobileSelect
                                value={formData.timeZone}
                                onChange={handleTimeZoneChange}
                                options={TIME_ZONE_OPTIONS}
                                title="Select time zone"
                            />
                            <button
                                type="button"
                                onClick={() => setShowTimeZoneOverride(false)}
                                className="text-xs text-textSub hover:text-forest"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-cream/30">
                            <div className="flex-1">
                                <p className="text-sm text-forest font-medium">
                                    {formatTimeZone(formData.timeZone)}
                                </p>
                                {formData.timeZoneManuallySet && (
                                    <p className="text-xs text-textSub mt-0.5">Manually set</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {formData.timeZoneManuallySet && hasLocation && (
                                    <button
                                        type="button"
                                        onClick={handleResetTimeZone}
                                        className="text-xs text-teal hover:text-forest font-medium"
                                    >
                                        Reset
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowTimeZoneOverride(true)}
                                    className="text-xs text-teal hover:text-forest font-medium"
                                >
                                    Change
                                </button>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-textSub mt-1.5">
                        {hasLocation 
                            ? "Time zone is automatically detected from the home address."
                            : "Will update automatically once an address is added."
                        }
                    </p>
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">Contact Info</h3>
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-forest">
                        Home Phone(s)
                    </label>
                    {formData.homePhones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="flex-1">
                                <PhoneInput
                                    value={phone.number}
                                    countryCode={phone.countryCode}
                                    onChange={(newNumber, newCountryCode) => {
                                        const newPhones = [...formData.homePhones];
                                        newPhones[index] = { countryCode: newCountryCode, number: newNumber };
                                        setFormData({ ...formData, homePhones: newPhones });
                                    }}
                                    placeholder="Phone number"
                                />
                            </div>
                            {formData.homePhones.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newPhones = formData.homePhones.filter((_, i) => i !== index);
                                        setFormData({ ...formData, homePhones: newPhones });
                                    }}
                                    className="p-2 text-textSub hover:text-red-500 transition-colors"
                                    title="Remove phone"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            // Use address country code, or existing first phone's code, or browser detection
                            const newCountryCode = formData.addressCountry 
                                ? getPhoneCodeFromCountry(formData.addressCountry)
                                : (formData.homePhones[0]?.countryCode || detectBrowserCountryCode());
                            setFormData({
                                ...formData,
                                homePhones: [...formData.homePhones, { countryCode: newCountryCode, number: "" }]
                            });
                        }}
                        className="text-sm text-teal hover:text-forest font-medium flex items-center gap-1 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add another phone
                    </button>
                </div>
            </div>

            {/* WiFi */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">WiFi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            WiFi Name
                        </label>
                        <input
                            type="text"
                            value={formData.wifiName}
                            onChange={(e) => setFormData({ ...formData, wifiName: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                            placeholder="Network name"
                        />
                    </div>
                    <WiFiPasswordInput
                        value={formData.wifiPassword}
                        onChange={(value) => setFormData({ ...formData, wifiPassword: value })}
                    />
                </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">House Notes</h3>
                <div>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                        placeholder="Gate code, parking, pets, special instructions..."
                    />
                </div>
            </div>

            {/* Connected Caregivers */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">Connected with</h3>
                <div>
                    <MobileMultiSelect
                        values={formData.accessibleCaregiverIds}
                        onChange={(values) => setFormData({ ...formData, accessibleCaregiverIds: values })}
                        options={caregivers.map((c) => ({
                            value: c.id,
                            label: c.label || c.name,
                        }))}
                        allOption={{
                            value: "all",
                            label: caregivers.length > 2 ? "All caregivers" : "Both sides",
                        }}
                        placeholder="Select caregivers..."
                        title="Connected with"
                    />
                    <p className="text-xs text-textSub mt-2">
                        Select which caregivers have access to this home.
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onCancel}
                    className="btn-secondary flex-1"
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="btn-primary flex-1 disabled:opacity-50"
                >
                    {saving ? "Saving..." : isNew ? "Add Home" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
