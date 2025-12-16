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
import ChildScopeSelector, { formatSuccessMessage, ChildOption } from "@/components/ChildScopeSelector";

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
    selectedChildIds: string[]; // Which children this home belongs to
    inviteLater: boolean; // If true, create home with 0 caregivers (user will invite later)
}

// Function to get default form data with browser-detected country code
// Note: selectedChildIds is set separately based on currentChildId context
const getDefaultFormData = (currentChildId?: string): HomeFormData => ({
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
    selectedChildIds: currentChildId ? [currentChildId] : [], // Default to current child
    inviteLater: false, // Default: user should select caregivers
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
    const { 
        child, 
        children, 
        homes, 
        activeHomes, 
        pendingHomes, 
        caregivers, 
        currentHomeId, 
        currentChildId, 
        setCurrentChildId, 
        refreshData, 
        isLoaded,
        getHomeChildrenWithStatus,
        linkChildToHome,
        toggleChildHomeStatus,
        currentUserPermissions,
        accessibleHomes
    } = useAppState();
    
    // Check if user has home access
    const hasHomeAccess = accessibleHomes.length > 0;
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
    const [formData, setFormData] = useState<HomeFormData>(() => getDefaultFormData(currentChildId));
    const [childScopeError, setChildScopeError] = useState("");
    const [showHideWarning, setShowHideWarning] = useState<string | null>(null);
    
    // Connected Children state
    const [connectedChildrenByHome, setConnectedChildrenByHome] = useState<Record<string, { childId: string; childName: string; childAvatarUrl?: string; status: 'active' | 'inactive' }[]>>({});
    const [loadingChildrenForHome, setLoadingChildrenForHome] = useState<string | null>(null);
    const [showLinkChildModal, setShowLinkChildModal] = useState<string | null>(null); // homeId or null
    
    // Other homes state (homes user has access to but not linked to current child)
    type ConnectedCaregiverInfo = {
        id: string;
        displayName: string;
        fullName: string;
    };
    type OtherHomeInfo = {
        id: string;
        name: string;
        address?: string;
        photoUrl?: string;
        linkedToChildren: string[]; // names of children this home is linked to
        connectedCaregivers: ConnectedCaregiverInfo[]; // caregivers connected to this home
    };
    const [otherAvailableHomes, setOtherAvailableHomes] = useState<OtherHomeInfo[]>([]);
    const [inactiveHomesForChild, setInactiveHomesForChild] = useState<OtherHomeInfo[]>([]);
    const [loadingOtherHomes, setLoadingOtherHomes] = useState(false);
    const [showInactiveHomes, setShowInactiveHomes] = useState(false);
    const [addingHomeId, setAddingHomeId] = useState<string | null>(null);
    
    // Toast state for home added notification with manage link
    type HomeAddedToast = {
        show: boolean;
        homeName: string;
        homeId: string;
        caregiverCount: number;
    };
    const [homeAddedToast, setHomeAddedToast] = useState<HomeAddedToast>({ show: false, homeName: "", homeId: "", caregiverCount: 0 });

    // Auto-show add form if ?add=true is in URL
    useEffect(() => {
        if (searchParams.get("add") === "true") {
            setShowAddForm(true);
            // Also ensure current child is preselected
            if (currentChildId && formData.selectedChildIds.length === 0) {
                setFormData(prev => ({ ...prev, selectedChildIds: [currentChildId] }));
            }
        }
    }, [searchParams, currentChildId]);
    
    // Sync selectedChildIds when currentChildId changes and form is reset
    useEffect(() => {
        if (currentChildId && showAddForm && formData.selectedChildIds.length === 0) {
            setFormData(prev => ({ ...prev, selectedChildIds: [currentChildId] }));
        }
    }, [currentChildId, showAddForm]);
    
    // Load connected children when a home is expanded
    useEffect(() => {
        const loadConnectedChildren = async () => {
            if (!expandedHomeId || connectedChildrenByHome[expandedHomeId]) return;
            
            setLoadingChildrenForHome(expandedHomeId);
            try {
                const childrenData = await getHomeChildrenWithStatus(expandedHomeId);
                setConnectedChildrenByHome(prev => ({
                    ...prev,
                    [expandedHomeId]: childrenData
                }));
            } catch (err) {
                console.error("Error loading connected children:", err);
            } finally {
                setLoadingChildrenForHome(null);
            }
        };
        loadConnectedChildren();
    }, [expandedHomeId, getHomeChildrenWithStatus]);
    
    // Load other available homes (homes user has access to but not linked to current child)
    useEffect(() => {
        const loadOtherHomes = async () => {
            if (!currentChildId || !user) return;
            
            setLoadingOtherHomes(true);
            try {
                // 1. Get all homes the current user has access to via home_memberships
                const { data: userMemberships, error: membershipError } = await supabase
                    .from("home_memberships")
                    .select("home_id")
                    .eq("user_id", user.id);
                
                if (membershipError) {
                    console.error("Error fetching user home memberships:", membershipError);
                    return;
                }
                
                if (!userMemberships || userMemberships.length === 0) {
                    setOtherAvailableHomes([]);
                    setInactiveHomesForChild([]);
                    return;
                }
                
                const userHomeIds = userMemberships.map(m => m.home_id);
                
                // 2. Get child_spaces for current child to see which homes are already linked
                const { data: childSpacesData, error: spacesError } = await supabase
                    .from("child_spaces")
                    .select("home_id, status")
                    .eq("child_id", currentChildId);
                
                if (spacesError) {
                    console.error("Error fetching child spaces:", spacesError);
                    return;
                }
                
                // Map of home_id -> status for current child
                const currentChildHomeStatus = new Map<string, string>();
                for (const cs of (childSpacesData || [])) {
                    currentChildHomeStatus.set(cs.home_id, cs.status);
                }
                
                // Get home IDs that are active for current child (already shown in activeHomes)
                const activeHomeIdsForChild = Array.from(currentChildHomeStatus.entries())
                    .filter(([_, status]) => status === 'active')
                    .map(([homeId, _]) => homeId);
                
                // Get home IDs that are inactive for current child
                const inactiveHomeIdsForChild = Array.from(currentChildHomeStatus.entries())
                    .filter(([_, status]) => status === 'inactive')
                    .map(([homeId, _]) => homeId);
                
                // Get home IDs the user has access to but not linked to this child at all
                const notLinkedHomeIds = userHomeIds.filter(hid => !currentChildHomeStatus.has(hid));
                
                // 3. Fetch home details for inactive and not-linked homes
                const homesToFetch = [...inactiveHomeIdsForChild, ...notLinkedHomeIds];
                if (homesToFetch.length === 0) {
                    setOtherAvailableHomes([]);
                    setInactiveHomesForChild([]);
                    return;
                }
                
                const { data: homesData, error: homesError } = await supabase
                    .from("homes")
                    .select("id, name, address, photo_url")
                    .in("id", homesToFetch);
                
                if (homesError) {
                    console.error("Error fetching homes:", homesError);
                    return;
                }
                
                // 4. Get all child_spaces to know which children each home is linked to
                const { data: allChildSpaces, error: allSpacesError } = await supabase
                    .from("child_spaces")
                    .select("home_id, child_id, status")
                    .in("home_id", homesToFetch)
                    .eq("status", "active");
                
                // Build map of home_id -> child_ids (active only)
                const homeChildMap = new Map<string, string[]>();
                for (const cs of (allChildSpaces || [])) {
                    if (!homeChildMap.has(cs.home_id)) {
                        homeChildMap.set(cs.home_id, []);
                    }
                    homeChildMap.get(cs.home_id)!.push(cs.child_id);
                }
                
                // 5. Get all caregivers connected to these homes via home_memberships
                const { data: homeMemberships, error: membershipsError } = await supabase
                    .from("home_memberships")
                    .select(`
                        home_id,
                        user_id,
                        profiles (
                            id,
                            name,
                            label
                        )
                    `)
                    .in("home_id", homesToFetch);
                
                // Build map of home_id -> caregiver info
                const homeCaregiverMap = new Map<string, ConnectedCaregiverInfo[]>();
                for (const membership of (homeMemberships || []) as any[]) {
                    if (!membership.profiles) continue;
                    const profile = membership.profiles;
                    
                    if (!homeCaregiverMap.has(membership.home_id)) {
                        homeCaregiverMap.set(membership.home_id, []);
                    }
                    
                    // Avoid duplicates
                    const existing = homeCaregiverMap.get(membership.home_id)!;
                    if (!existing.some(c => c.id === membership.user_id)) {
                        existing.push({
                            id: membership.user_id,
                            displayName: profile.label || profile.name || "Unknown",
                            fullName: profile.name || "Unknown"
                        });
                    }
                }
                
                // Build the home info lists
                const inactiveHomes: OtherHomeInfo[] = [];
                const otherHomes: OtherHomeInfo[] = [];
                
                for (const home of (homesData || [])) {
                    const linkedChildIds = homeChildMap.get(home.id) || [];
                    const linkedChildNames = linkedChildIds
                        .map(cid => children.find(c => c.id === cid)?.name)
                        .filter(Boolean) as string[];
                    
                    const homeInfo: OtherHomeInfo = {
                        id: home.id,
                        name: home.name,
                        address: home.address,
                        photoUrl: home.photo_url,
                        linkedToChildren: linkedChildNames,
                        connectedCaregivers: homeCaregiverMap.get(home.id) || []
                    };
                    
                    if (inactiveHomeIdsForChild.includes(home.id)) {
                        inactiveHomes.push(homeInfo);
                    } else {
                        otherHomes.push(homeInfo);
                    }
                }
                
                setInactiveHomesForChild(inactiveHomes);
                setOtherAvailableHomes(otherHomes);
            } catch (err) {
                console.error("Error loading other homes:", err);
            } finally {
                setLoadingOtherHomes(false);
            }
        };
        
        loadOtherHomes();
    }, [currentChildId, user, children, homes]); // Re-run when homes changes (after add/remove)
    
    // Handle adding a home to current child (reactivate or create new link)
    const handleAddHomeToChild = async (homeId: string) => {
        if (!currentChildId) return;
        
        setAddingHomeId(homeId);
        setError("");
        
        // Find the home info to get caregiver count
        const homeInfo = [...otherAvailableHomes, ...inactiveHomesForChild].find(h => h.id === homeId);
        const caregiverCount = homeInfo?.connectedCaregivers.length || 0;
        const homeName = homeInfo?.name || "Home";
        
        try {
            const result = await linkChildToHome(currentChildId, homeId);
            if (result.success) {
                // Show toast with caregiver info and manage link
                setHomeAddedToast({
                    show: true,
                    homeName,
                    homeId,
                    caregiverCount
                });
                // Auto-hide after 8 seconds (longer to allow reading and clicking manage)
                setTimeout(() => setHomeAddedToast(prev => ({ ...prev, show: false })), 8000);
                // The homes list will be refreshed by linkChildToHome -> refreshData
            } else {
                setError(result.error || "Failed to add home");
            }
        } catch (err) {
            console.error("Error adding home to child:", err);
            setError("Failed to add home");
        } finally {
            setAddingHomeId(null);
        }
    };
    
    // Handle disconnecting a home from current child (set status to inactive)
    const handleDisconnectHomeFromChild = async (homeId: string) => {
        if (!currentChildId) return;
        
        setAddingHomeId(homeId);
        setError("");
        
        try {
            const result = await toggleChildHomeStatus(currentChildId, homeId, 'inactive');
            if (result.success) {
                setSuccessMessage("Home disconnected from child");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setError(result.error || "Failed to disconnect home");
            }
        } catch (err) {
            console.error("Error disconnecting home:", err);
            setError("Failed to disconnect home");
        } finally {
            setAddingHomeId(null);
        }
    };
    
    // Handle linking a child to a home
    const handleLinkChildToHome = async (homeId: string, childId: string) => {
        setShowLinkChildModal(null);
        setSaving(true);
        setError("");
        
        try {
            const result = await linkChildToHome(childId, homeId);
            if (result.success) {
                // Refresh the connected children for this home
                const childrenData = await getHomeChildrenWithStatus(homeId);
                setConnectedChildrenByHome(prev => ({
                    ...prev,
                    [homeId]: childrenData
                }));
                setSuccessMessage("Child linked to home!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setError(result.error || "Failed to link child");
            }
        } catch (err) {
            console.error("Error linking child to home:", err);
            setError("Failed to link child");
        } finally {
            setSaving(false);
        }
    };
    
    // Get children that can be linked to a specific home (not already connected)
    const getAvailableChildrenForHome = (homeId: string) => {
        const connectedChildren = connectedChildrenByHome[homeId] || [];
        return children.filter(
            child => !connectedChildren.some(cc => cc.childId === child.id)
        );
    };

    // Filter out pending caregivers for selection
    const activeCaregivers = caregivers.filter(c => !c.id.startsWith("pending-"));

    const resetForm = () => {
        setFormData(getDefaultFormData(currentChildId));
        setChildScopeError("");
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
            // For edits, child scope is not changed (managed via child_spaces table)
            selectedChildIds: currentChildId ? [currentChildId] : [],
            inviteLater: false, // For edits, inviteLater is not applicable
        });
        setError("");
        setChildScopeError("");
    };

    const handleSaveHome = async (homeId?: string) => {
        // Validate required fields
        if (!formData.name.trim()) {
            setError("Home name is required");
            return;
        }

        // Validate child selection for new homes
        if (!homeId && formData.selectedChildIds.length === 0) {
            setChildScopeError("Select at least 1 child to continue.");
            return;
        }

        // Validate caregiver selection for new homes
        // User must either select at least one caregiver OR explicitly choose "Invite later"
        if (!homeId && !formData.inviteLater && formData.accessibleCaregiverIds.length === 0) {
            setError("Select at least one caregiver, or choose \"Invite someone later\"");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setChildScopeError("");

            // Try to get family ID (V1) - optional, may not exist for V2 users
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user?.id)
                .single();

            // If setting as primary, unset other homes first
            // Scope by user's accessible homes via home_memberships (works for both V1 and V2)
            if (formData.isPrimary && user?.id) {
                // Get all home IDs the user has access to
                const { data: userHomes } = await supabase
                    .from("home_memberships")
                    .select("home_id")
                    .eq("user_id", user.id);
                
                if (userHomes && userHomes.length > 0) {
                    const userHomeIds = userHomes.map(h => h.home_id);
                    await supabase
                        .from("homes")
                        .update({ is_primary: false })
                        .in("id", userHomeIds);
                }
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
                // V2 approach: use created_by instead of family_id
                // Include family_id if available for backwards compatibility
                const insertData: any = {
                    created_by: user?.id,
                    status: "active",
                    ...homeData,
                };
                
                // Add family_id if available (V1 backwards compatibility)
                if (familyMember?.family_id) {
                    insertData.family_id = familyMember.family_id;
                }
                
                const { data: newHome, error: insertError } = await supabase
                    .from("homes")
                    .insert(insertData)
                    .select()
                    .single();

                if (insertError) throw insertError;

                if (newHome) {
                    /**
                     * APPROACH: Create one Home, then link to multiple children via child_spaces
                     * This is the preferred approach - Home is a shared entity, child_spaces is the join table.
                     * Each selected child gets their own child_spaces entry pointing to the same home.
                     */
                    
                    // Create child_spaces entries for ALL selected children
                    const childSpaceEntries = formData.selectedChildIds.map(childId => ({
                        child_id: childId,
                        home_id: newHome.id,
                        status: "active", // Explicitly set active status
                    }));

                    if (childSpaceEntries.length > 0) {
                        const { error: childSpaceError } = await supabase
                            .from("child_spaces")
                            .insert(childSpaceEntries);

                        if (childSpaceError) {
                            console.error("Error creating child_spaces:", childSpaceError);
                            // Don't throw - home was created, we can fix links later
                        }
                    }

                    // Add current user to home_memberships as home admin (they created it)
                    const { error: membershipError } = await supabase
                        .from("home_memberships")
                        .insert({
                            home_id: newHome.id,
                            user_id: user?.id,
                            is_home_admin: true, // Creator is admin
                        });

                    if (membershipError) {
                        console.error("Error creating home_membership:", membershipError);
                    }

                    // Add selected caregivers to home_memberships (only if not inviteLater)
                    // These are explicitly selected caregivers, not auto-added
                    if (!formData.inviteLater && formData.accessibleCaregiverIds.length > 0) {
                        // Filter out current user if they were selected (they're already added as admin)
                        const otherCaregiverIds = formData.accessibleCaregiverIds.filter(id => id !== user?.id);
                        
                        if (otherCaregiverIds.length > 0) {
                            const membershipEntries = otherCaregiverIds.map(caregiverId => ({
                                home_id: newHome.id,
                                user_id: caregiverId,
                                is_home_admin: false,
                            }));
                            
                            const { error: caregiverMembershipError } = await supabase
                                .from("home_memberships")
                                .insert(membershipEntries);
                            
                            if (caregiverMembershipError) {
                                console.error("Error creating caregiver memberships:", caregiverMembershipError);
                            }
                        }
                    }
                }

                // Show success message with child count
                const successMsg = formatSuccessMessage(formData.selectedChildIds, children as ChildOption[]);
                setSuccessMessage(successMsg);
                
                // Switch to the first selected child so user sees the new home
                const firstSelectedChildId = formData.selectedChildIds[0];
                if (firstSelectedChildId && firstSelectedChildId !== currentChildId) {
                    setCurrentChildId(firstSelectedChildId);
                }
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
            setSuccessMessage(`"${home.name}" is now pending`);
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
            // V2 approach: Add caregiver to home_memberships table
            const { error: membershipError } = await supabase
                .from("home_memberships")
                .upsert(
                    { home_id: homeId, user_id: caregiverId, is_home_admin: false },
                    { onConflict: "home_id,user_id" }
                );

            if (membershipError) throw membershipError;

            await refreshData();
            setSuccessMessage("Caregiver added to home");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error adding caregiver to home:", err);
            setError(err.message || "Failed to add caregiver");
        }
    };

    const handleRemoveCaregiver = async (homeId: string, caregiverId: string) => {
        const home = homes.find(h => h.id === homeId);
        if (!home) return;

        try {
            // V2 approach: Remove caregiver from home_memberships table
            const { error: membershipError } = await supabase
                .from("home_memberships")
                .delete()
                .eq("home_id", homeId)
                .eq("user_id", caregiverId);

            if (membershipError) throw membershipError;

            await refreshData();
            setSuccessMessage("Caregiver removed from home");
            setTimeout(() => setSuccessMessage(""), 3000);
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

    // Check if home has no caregivers connected (needs caregivers to be invited)
    const isHomeNeedingCaregivers = (home: HomeProfile): boolean => {
        const caregiverIds = home.accessibleCaregiverIds || [];
        // Home needs caregivers if: it has 0 caregivers connected
        return caregiverIds.length === 0;
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
                                    Pending
                                </span>
                            )}
                            {!isHidden && isHomeNeedingCaregivers(home) && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                    Not shared yet
                                </span>
                            )}
                        </div>
                        {home.address && (
                            <p className="text-sm text-textSub truncate">{home.address}</p>
                        )}
                        <p className="text-xs text-textSub mt-0.5">
                            {isHomeNeedingCaregivers(home) ? (
                                <span className="text-orange-600">Invite caregivers to share this home</span>
                            ) : (
                                <>
                                    {getValidCaregiverCount(home)} caregiver(s) connected
                                    {getItemCountForHome(home.id) > 0 && (
                                        <span className="text-textSub/60"> · {getItemCountForHome(home.id)} item{getItemCountForHome(home.id) !== 1 ? 's' : ''}</span>
                                    )}
                                </>
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
                                childrenList={children as ChildOption[]}
                                childScopeError={childScopeError}
                            />
                        </div>
                    ) : (
                        <div className="p-4 space-y-5">
                            {/* Invite Prompt for homes needing caregivers */}
                            {isHomeNeedingCaregivers(home) && currentUserPermissions.isGuardian && (
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-600">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="8.5" cy="7" r="4" />
                                                <line x1="20" y1="8" x2="20" y2="14" />
                                                <line x1="23" y1="11" x2="17" y2="11" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-orange-800 text-sm">No caregivers connected yet</p>
                                            <p className="text-xs text-orange-600 mt-0.5">Invite someone to this home so they can see {child?.name || "your child"}'s information here.</p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <Link
                                                    href="/settings/caregivers?invite=true"
                                                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors"
                                                >
                                                    Invite caregiver
                                                </Link>
                                                <button
                                                    onClick={() => setExpandedHomeId(null)}
                                                    className="px-3 py-1.5 text-orange-600 text-xs font-medium hover:text-orange-800 transition-colors"
                                                >
                                                    Do it later
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
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
                                                options={getAvailableCaregivers(home).map((c) => {
                                                    // Format role label for this caregiver
                                                    let roleLabel = '';
                                                    if (c.roleType === 'guardian') {
                                                        roleLabel = c.guardianRole === 'step_parent' ? 'Step-parent' : 'Parent';
                                                    } else {
                                                        // Helper types
                                                        const helperLabels: Record<string, string> = {
                                                            'family_member': 'Family member',
                                                            'friend': 'Family friend',
                                                            'nanny': 'Nanny',
                                                            'babysitter': 'Babysitter',
                                                        };
                                                        roleLabel = helperLabels[c.helperType || ''] || 'Helper';
                                                    }
                                                    // Add child name context if available
                                                    const roleWithContext = child ? `${roleLabel} of ${child.name}` : roleLabel;
                                                    
                                                    return {
                                                        value: c.id,
                                                        label: c.label || c.name,
                                                        description: roleWithContext,
                                                        avatarUrl: c.avatarUrl,
                                                        avatarInitials: c.avatarInitials,
                                                        avatarColor: c.avatarColor,
                                                    };
                                                })}
                                                placeholder="+ Add caregiver to this home"
                                                title="Add caregiver"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Connected Children */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-forest">Children at this home</h4>
                                    {currentUserPermissions.isGuardian && getAvailableChildrenForHome(home.id).length > 0 && (
                                        <button
                                            onClick={() => setShowLinkChildModal(home.id)}
                                            className="text-xs text-teal hover:text-forest font-medium flex items-center gap-1"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="12" y1="5" x2="12" y2="19" />
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                            Link child
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {loadingChildrenForHome === home.id ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-forest"></div>
                                        </div>
                                    ) : (connectedChildrenByHome[home.id] || []).filter(c => c.status === 'active').length === 0 ? (
                                        <p className="text-sm text-textSub/60 italic">No children linked to this home</p>
                                    ) : (
                                        (connectedChildrenByHome[home.id] || [])
                                            .filter(c => c.status === 'active')
                                            .map((childInfo) => (
                                                <Link
                                                    key={childInfo.childId}
                                                    href={`/settings/child/${childInfo.childId}`}
                                                    className="flex items-center gap-3 p-2 rounded-lg bg-orange-50/50 hover:bg-orange-100/50 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                        {childInfo.childAvatarUrl ? (
                                                            <img 
                                                                src={childInfo.childAvatarUrl} 
                                                                alt={childInfo.childName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-orange-600 font-bold text-sm">
                                                                {childInfo.childName?.charAt(0) || "?"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-forest truncate">{childInfo.childName}</p>
                                                    </div>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSub/50 flex-shrink-0">
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                </Link>
                                            ))
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-border/30 gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => handleEditHome(home)}
                                        className="btn-secondary text-sm px-4 py-2"
                                    >
                                        Edit
                                    </button>
                                    {currentUserPermissions.isGuardian && !isHidden && (
                                        <button
                                            onClick={() => handleDisconnectHomeFromChild(home.id)}
                                            disabled={addingHomeId === home.id}
                                            className="text-sm px-4 py-2 bg-orange-50 text-orange-700 rounded-xl font-medium hover:bg-orange-100 transition-colors disabled:opacity-50"
                                        >
                                            {addingHomeId === home.id ? "..." : `Disconnect from ${child?.name || "child"}`}
                                        </button>
                                    )}
                                    {isHidden ? (
                                        <button
                                            onClick={() => handleShowHome(home.id)}
                                            disabled={saving}
                                            className="text-sm px-4 py-2 bg-softGreen text-forest rounded-xl font-medium hover:bg-softGreen/80 transition-colors disabled:opacity-50"
                                        >
                                            Activate home
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleHideHome(home.id)}
                                            disabled={saving}
                                            className="text-sm px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                                        >
                                            Move to pending
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
                    <h1 className="text-2xl font-dmSerif text-forest">{child?.name || "Your child"}'s home setup</h1>
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

                {/* Home Added Toast with Caregiver Info */}
                {homeAddedToast.show && (
                    <div className="bg-softGreen border border-forest/20 rounded-xl px-4 py-3 text-sm text-forest">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <p className="font-medium">
                                    Home added to {child?.name || "child"}.{" "}
                                    {homeAddedToast.caregiverCount === 0 
                                        ? "No caregivers in this home yet."
                                        : homeAddedToast.caregiverCount === 1
                                            ? "1 caregiver added."
                                            : `${homeAddedToast.caregiverCount} caregivers added.`
                                    }
                                </p>
                                <p className="text-xs text-forest/70 mt-1">
                                    You can manage caregivers in the home's settings.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => {
                                        setExpandedHomeId(homeAddedToast.homeId);
                                        setHomeAddedToast(prev => ({ ...prev, show: false }));
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium bg-forest text-white rounded-lg hover:bg-forest/90 transition-colors"
                                >
                                    Manage
                                </button>
                                <button
                                    onClick={() => setHomeAddedToast(prev => ({ ...prev, show: false }))}
                                    className="p-1 text-forest/50 hover:text-forest transition-colors"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>
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
                
                {/* Link Child Modal */}
                {showLinkChildModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLinkChildModal(null)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full">
                            <div className="p-4 border-b border-border/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-forest text-lg">Link Child to Home</h3>
                                    <button
                                        onClick={() => setShowLinkChildModal(null)}
                                        className="p-2 text-textSub hover:text-forest rounded-lg"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm text-textSub mt-1">
                                    Select a child to add to this home
                                </p>
                            </div>
                            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                                {getAvailableChildrenForHome(showLinkChildModal).map((childItem) => (
                                    <button
                                        key={childItem.id}
                                        onClick={() => handleLinkChildToHome(showLinkChildModal, childItem.id)}
                                        disabled={saving}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-forest/30 hover:bg-orange-50/30 transition-colors disabled:opacity-50"
                                    >
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center flex-shrink-0">
                                            {childItem.avatarUrl ? (
                                                <img 
                                                    src={childItem.avatarUrl} 
                                                    alt={childItem.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-orange-600 font-bold">
                                                    {childItem.name?.charAt(0) || "?"}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-medium text-forest text-left flex-1 truncate">
                                            {childItem.name}
                                        </span>
                                    </button>
                                ))}
                                {getAvailableChildrenForHome(showLinkChildModal).length === 0 && (
                                    <p className="text-sm text-textSub text-center py-4">
                                        All children are already linked to this home
                                    </p>
                                )}
                            </div>
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
                        childrenList={children as ChildOption[]}
                        childScopeError={childScopeError}
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
                            <h3 className="font-bold text-forest text-lg mb-2">No homes yet</h3>
                            <p className="text-sm text-textSub mb-4">
                                {!hasHomeAccess 
                                    ? "Once you're added to a home, it will appear here automatically."
                                    : pendingHomes.length > 0
                                        ? "All your homes are pending setup. Add caregivers to activate them."
                                        : `Add the physical locations where ${child?.name || "your child"} stays.`
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Add Home Button - only show if user has home access (or is guardian) */}
                {!showAddForm && !editingHomeId && hasHomeAccess && (
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

                {/* OTHER HOMES SECTION - Homes user has access to but not linked to this child */}
                {(otherAvailableHomes.length > 0 || loadingOtherHomes) && (
                    <div className="space-y-4 pt-2">
                        <div>
                            <h2 className="text-lg font-semibold text-forest flex items-center gap-2">
                                Other homes
                                {!loadingOtherHomes && (
                                    <span className="text-sm font-normal text-textSub">({otherAvailableHomes.length})</span>
                                )}
                            </h2>
                            <p className="text-xs text-textSub mt-1">
                                Homes in your account that aren't linked to {child?.name || "this child"} yet.
                            </p>
                        </div>

                        {loadingOtherHomes ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {otherAvailableHomes.map((home) => {
                                    // Format caregivers display
                                    const caregivers = home.connectedCaregivers;
                                    let caregiversDisplay = "none yet";
                                    if (caregivers.length === 1) {
                                        caregiversDisplay = `${caregivers[0].displayName} (${caregivers[0].fullName})`;
                                    } else if (caregivers.length === 2) {
                                        caregiversDisplay = `${caregivers[0].displayName} (${caregivers[0].fullName}), ${caregivers[1].displayName} (${caregivers[1].fullName})`;
                                    } else if (caregivers.length > 2) {
                                        caregiversDisplay = `${caregivers[0].displayName} (${caregivers[0].fullName}), ${caregivers[1].displayName} (${caregivers[1].fullName}) +${caregivers.length - 2}`;
                                    }
                                    
                                    return (
                                    <div
                                        key={home.id}
                                        className="card-organic p-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Home Icon */}
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                    <polyline points="9 22 9 12 15 12 15 22" />
                                                </svg>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-forest text-base truncate">{home.name}</h3>
                                                {home.address && (
                                                    <p className="text-sm text-textSub truncate">{home.address}</p>
                                                )}
                                            {home.linkedToChildren.length > 0 && (
                                                <p className="text-xs text-blue-600 mt-0.5">
                                                    Used for: {home.linkedToChildren.join(", ")}
                                                </p>
                                            )}
                                                {/* Caregivers in this home */}
                                                <p className="text-xs text-forest/70 mt-1">
                                                    <span className="font-medium">Caregivers in this home:</span>{" "}
                                                    {caregiversDisplay}
                                                </p>
                                            </div>

                                            {/* Add Button - Guardians only */}
                                            {currentUserPermissions.isGuardian && (
                                                <button
                                                    onClick={() => handleAddHomeToChild(home.id)}
                                                    disabled={addingHomeId === home.id}
                                                    className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium hover:bg-forest/90 transition-colors disabled:opacity-50 flex-shrink-0"
                                                >
                                                    {addingHomeId === home.id ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        `Add to ${child?.name || "child"}'s homes`
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Helper text about caregivers being added */}
                                        {caregivers.length > 0 && currentUserPermissions.isGuardian && (
                                            <div className="mt-3 ml-16">
                                                <p className="text-xs text-textSub">
                                                    When you add this home, these caregivers will be added to {child?.name || "this child"}'s caregivers list.
                                                </p>
                                                <p className="text-xs text-textSub/70 mt-0.5">
                                                    You can remove a caregiver at any time.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* INACTIVE HOMES FOR THIS CHILD - Collapsible */}
                {inactiveHomesForChild.length > 0 && (
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowInactiveHomes(!showInactiveHomes)}
                            className="flex items-center gap-2 text-sm text-textSub hover:text-forest transition-colors"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`transition-transform ${showInactiveHomes ? 'rotate-90' : ''}`}
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                            Inactive homes for {child?.name || "this child"}
                            <span className="text-xs text-textSub/70">({inactiveHomesForChild.length})</span>
                        </button>

                        {showInactiveHomes && (
                            <div className="space-y-3 pl-2">
                                <p className="text-xs text-textSub">
                                    These homes were previously connected to {child?.name || "this child"} but are currently inactive.
                                </p>
                                {inactiveHomesForChild.map((home) => {
                                    // Format caregivers display
                                    const caregivers = home.connectedCaregivers;
                                    let caregiversDisplay = "none yet";
                                    if (caregivers.length === 1) {
                                        caregiversDisplay = `${caregivers[0].displayName} (${caregivers[0].fullName})`;
                                    } else if (caregivers.length === 2) {
                                        caregiversDisplay = `${caregivers[0].displayName} (${caregivers[0].fullName}), ${caregivers[1].displayName} (${caregivers[1].fullName})`;
                                    } else if (caregivers.length > 2) {
                                        caregiversDisplay = `${caregivers[0].displayName} (${caregivers[0].fullName}), ${caregivers[1].displayName} (${caregivers[1].fullName}) +${caregivers.length - 2}`;
                                    }
                                    
                                    return (
                                    <div
                                        key={home.id}
                                        className="card-organic p-4 opacity-70"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Home Icon */}
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                    <polyline points="9 22 9 12 15 12 15 22" />
                                                </svg>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-forest text-base truncate">{home.name}</h3>
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                                        Inactive
                                                    </span>
                                                </div>
                                                {home.address && (
                                                    <p className="text-sm text-textSub truncate">{home.address}</p>
                                                )}
                                                {/* Caregivers in this home */}
                                                <p className="text-xs text-forest/70 mt-1">
                                                    <span className="font-medium">Caregivers in this home:</span>{" "}
                                                    {caregiversDisplay}
                                                </p>
                                            </div>

                                            {/* Add Back Button - Guardians only */}
                                            {currentUserPermissions.isGuardian && (
                                                <button
                                                    onClick={() => handleAddHomeToChild(home.id)}
                                                    disabled={addingHomeId === home.id}
                                                    className="px-4 py-2 bg-softGreen text-forest rounded-xl text-sm font-medium hover:bg-softGreen/80 transition-colors disabled:opacity-50 flex-shrink-0"
                                                >
                                                    {addingHomeId === home.id ? (
                                                        <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        "Add back"
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Helper text about caregivers being added */}
                                        {caregivers.length > 0 && currentUserPermissions.isGuardian && (
                                            <div className="mt-3 ml-16">
                                                <p className="text-xs text-textSub">
                                                    When you add this home back, these caregivers will be added to {child?.name || "this child"}'s caregivers list.
                                                </p>
                                                <p className="text-xs text-textSub/70 mt-0.5">
                                                    You can remove a caregiver at any time.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* PENDING HOMES SECTION */}
                {pendingHomes.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <h2 className="text-lg font-semibold text-gray-500 flex items-center gap-2">
                            Pending homes
                            <span className="text-sm font-normal">({pendingHomes.length})</span>
                        </h2>
                        <p className="text-xs text-textSub -mt-2">
                            Homes with no caregivers connected are pending setup. Add caregivers to activate them.
                        </p>

                        {pendingHomes.map((home) => renderHomeCard(home, true))}
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
                                Homes are places where a child stays. A home can be used for multiple children.
                                Connect a home here to show it in {child?.name || "this child"}'s space.
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
    childrenList,
    childScopeError,
}: {
    formData: HomeFormData;
    setFormData: (data: HomeFormData) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
    isNew: boolean;
    caregivers: CaregiverProfile[];
    childrenList: ChildOption[];
    childScopeError?: string;
}) {
    const [fetchingTimeZone, setFetchingTimeZone] = useState(false);
    const [showTimeZoneOverride, setShowTimeZoneOverride] = useState(false);

    const hasLocation = !!(formData.addressLat && formData.addressLng);
    
    // Check if save should be disabled (no children selected for new homes)
    const isSaveDisabled = isNew && formData.selectedChildIds.length === 0;

    // Format the Add Home button text based on selected children
    const getAddButtonText = (): string => {
        if (!isNew) return "Save Changes";
        
        const selectedCount = formData.selectedChildIds.length;
        const totalChildren = childrenList.length;
        
        if (selectedCount === 0) return "Add Home";
        
        // If all children are selected (and more than 1 child exists)
        if (selectedCount === totalChildren && totalChildren > 1) {
            return "Add home for all children";
        }
        
        // Get names of selected children
        const selectedChildren = childrenList.filter(c => formData.selectedChildIds.includes(c.id));
        
        if (selectedCount === 1) {
            return `Add home for ${selectedChildren[0]?.name || "child"}`;
        }
        
        if (selectedCount === 2) {
            return `Add home for ${selectedChildren[0]?.name}, ${selectedChildren[1]?.name}`;
        }
        
        // 3+ children: show first 2 names + count
        const remainingCount = selectedCount - 2;
        return `Add home for ${selectedChildren[0]?.name}, ${selectedChildren[1]?.name} +${remainingCount} more`;
    };

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
            {/* Header */}
            <h2 className="font-bold text-forest text-lg">
                {isNew ? "Add Home" : "Edit Home"}
            </h2>

            {/* Child Scope Selector - Only show for new homes */}
            {isNew && (
                <ChildScopeSelector
                    childrenList={childrenList}
                    selectedChildIds={formData.selectedChildIds}
                    onChange={(selectedIds) => setFormData({ ...formData, selectedChildIds: selectedIds })}
                    error={childScopeError}
                    disabled={saving}
                />
            )}

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
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">
                    Connected with <span className="text-red-500">*</span>
                </h3>
                
                {/* Invite Later Option */}
                <div 
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        formData.inviteLater 
                            ? 'border-forest bg-softGreen/30' 
                            : 'border-border hover:border-forest/30'
                    }`}
                    onClick={() => {
                        if (!formData.inviteLater) {
                            // Selecting invite later - clear caregiver selections
                            setFormData({ ...formData, inviteLater: true, accessibleCaregiverIds: [] });
                        } else {
                            // Deselecting invite later
                            setFormData({ ...formData, inviteLater: false });
                        }
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            formData.inviteLater ? 'border-forest bg-forest' : 'border-gray-300'
                        }`}>
                            {formData.inviteLater && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-forest text-sm">Invite someone later</p>
                            <p className="text-xs text-textSub">This home will be created without any connected caregivers.</p>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-border/50"></div>
                    <span className="text-xs text-textSub">or select caregivers</span>
                    <div className="flex-1 border-t border-border/50"></div>
                </div>

                {/* Caregiver Selection */}
                <div className={formData.inviteLater ? 'opacity-50 pointer-events-none' : ''}>
                    {caregivers.length > 0 ? (
                        <div className="space-y-2">
                            {caregivers.map((caregiver) => {
                                const isSelected = formData.accessibleCaregiverIds.includes(caregiver.id);
                                // Format label as "DisplayName (Full Name)" or just display name if same
                                const displayLabel = caregiver.label && caregiver.name && caregiver.label !== caregiver.name
                                    ? `${caregiver.label} (${caregiver.name})`
                                    : caregiver.label || caregiver.name;
                                
                                return (
                                    <div
                                        key={caregiver.id}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-colors flex items-center gap-3 ${
                                            isSelected 
                                                ? 'border-forest bg-softGreen/20' 
                                                : 'border-border hover:border-forest/30'
                                        }`}
                                        onClick={() => {
                                            if (formData.inviteLater) return; // Blocked when invite later is selected
                                            
                                            const newIds = isSelected
                                                ? formData.accessibleCaregiverIds.filter(id => id !== caregiver.id)
                                                : [...formData.accessibleCaregiverIds, caregiver.id];
                                            setFormData({ ...formData, accessibleCaregiverIds: newIds });
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                            isSelected ? 'border-forest bg-forest' : 'border-gray-300'
                                        }`}>
                                            {isSelected && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        
                                        {/* Avatar */}
                                        <div 
                                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                                            style={{ backgroundColor: caregiver.avatarUrl ? 'transparent' : (caregiver.avatarColor?.startsWith('bg-') ? '#6B7280' : caregiver.avatarColor || '#6B7280') }}
                                        >
                                            {caregiver.avatarUrl ? (
                                                <img 
                                                    src={caregiver.avatarUrl} 
                                                    alt={caregiver.label}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-white font-bold text-xs">
                                                    {caregiver.avatarInitials || caregiver.name?.[0] || '?'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-forest text-sm truncate">{displayLabel}</p>
                                            {caregiver.relationship && (
                                                <p className="text-xs text-textSub capitalize">{caregiver.relationship.replace('_', ' ')}</p>
                                            )}
                                        </div>
                                        
                                        {/* Current user badge */}
                                        {caregiver.isCurrentUser && (
                                            <span className="text-xs bg-softGreen text-forest px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                                You
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-textSub italic text-center py-4">
                            No caregivers available. Use "Invite someone later" to create this home.
                        </p>
                    )}
                </div>

                <p className="text-xs text-textSub">
                    {formData.inviteLater 
                        ? "You can invite caregivers to this home after creating it."
                        : "Select the caregivers who will have access to this home."
                    }
                </p>
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
                    disabled={saving || isSaveDisabled}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isSaveDisabled ? "Select a child to enable Save" : undefined}
                >
                    {saving ? "Saving..." : getAddButtonText()}
                </button>
            </div>
        </div>
    );
}
