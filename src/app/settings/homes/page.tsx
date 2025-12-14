"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import MobileSelect from "@/components/MobileSelect";
import MobileMultiSelect from "@/components/MobileMultiSelect";
import GooglePlacesAutocomplete, { AddressComponents } from "@/components/GooglePlacesAutocomplete";
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
    { value: "America/New_York", label: "America/New York (EST)" },
    { value: "America/Los_Angeles", label: "America/Los Angeles (PST)" },
    { value: "America/Chicago", label: "America/Chicago (CST)" },
    { value: "UTC", label: "UTC" },
];

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
    homePhone: string;
    wifiName: string;
    wifiPassword: string;
    notes: string;
    isPrimary: boolean;
    accessibleCaregiverIds: string[];
}

const defaultFormData: HomeFormData = {
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
    homePhone: "",
    wifiName: "",
    wifiPassword: "",
    notes: "",
    isPrimary: false,
    accessibleCaregiverIds: [],
};

export default function HomeSetupPage() {
    useEnsureOnboarding();

    const { user, loading: authLoading } = useAuth();
    const { child, homes, activeHomes, hiddenHomes, caregivers, currentHomeId, refreshData, isLoaded } = useAppState();
    const { items } = useItems();

    // Count items located at each home
    const getItemCountForHome = (homeId: string): number => {
        return items.filter(item => item.locationHomeId === homeId).length;
    };

    const [expandedHomeId, setExpandedHomeId] = useState<string | null>(null);
    const [editingHomeId, setEditingHomeId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [formData, setFormData] = useState<HomeFormData>(defaultFormData);
    const [showHideWarning, setShowHideWarning] = useState<string | null>(null);

    // Filter out pending caregivers for selection
    const activeCaregivers = caregivers.filter(c => !c.id.startsWith("pending-"));

    const resetForm = () => {
        setFormData(defaultFormData);
        setShowAddForm(false);
        setEditingHomeId(null);
    };

    const handleEditHome = (home: HomeProfile) => {
        setEditingHomeId(home.id);
        setExpandedHomeId(home.id);
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
            homePhone: home.homePhone || "",
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
                home_phone: formData.homePhone.trim() || null,
                wifi_name: formData.wifiName.trim() || null,
                wifi_password: formData.wifiPassword.trim() || null,
                notes: formData.notes.trim() || null,
                is_primary: formData.isPrimary,
                accessible_caregiver_ids: formData.accessibleCaregiverIds,
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

                if (newHome && formData.accessibleCaregiverIds.length > 0) {
                    const accessEntries = formData.accessibleCaregiverIds.map(caregiverId => ({
                        home_id: newHome.id,
                        caregiver_id: caregiverId,
                    }));
                    await supabase.from("home_access").insert(accessEntries);
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
                                <h4 className="text-sm font-semibold text-forest mb-2">Time Zone</h4>
                                <p className="text-sm text-textSub">
                                    {TIME_ZONE_OPTIONS.find(tz => tz.value === home.timeZone)?.label || "Auto-detect"}
                                </p>
                            </div>

                            {/* Contact Info */}
                            {home.homePhone && (
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">Contact Info</h4>
                                    <p className="text-sm text-textSub">
                                        <span className="text-forest/70">Phone:</span> {home.homePhone}
                                    </p>
                                </div>
                            )}

                            {/* WiFi */}
                            {(home.wifiName || home.wifiPassword) && (
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">WiFi</h4>
                                    <div className="space-y-1">
                                        {home.wifiName && (
                                            <p className="text-sm text-textSub">
                                                <span className="text-forest/70">Network:</span> {home.wifiName}
                                            </p>
                                        )}
                                        {home.wifiPassword && (
                                            <p className="text-sm text-textSub">
                                                <span className="text-forest/70">Password:</span> {home.wifiPassword}
                                            </p>
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
                        Add another home
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
                        <div className="text-forest mt-0.5">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
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
                        onAddressSelect={(address: AddressComponents) => {
                            setFormData({
                                ...formData,
                                address: address.formattedAddress,
                                addressStreet: address.street,
                                addressCity: address.city,
                                addressState: address.state,
                                addressZip: address.zip,
                                addressCountry: address.country,
                                addressLat: address.lat,
                                addressLng: address.lng,
                            });
                        }}
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
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">Time Zone</h3>
                <div>
                    <MobileSelect
                        value={formData.timeZone}
                        onChange={(value) => setFormData({ ...formData, timeZone: value })}
                        options={TIME_ZONE_OPTIONS}
                        title="Select time zone"
                    />
                    <p className="text-xs text-textSub mt-1">
                        This defines the local time shown for this home.
                    </p>
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-forest border-b border-border/30 pb-2">Contact Info</h3>
                <div>
                    <label className="block text-sm font-medium text-forest mb-1.5">
                        Home Phone
                    </label>
                    <input
                        type="tel"
                        value={formData.homePhone}
                        onChange={(e) => setFormData({ ...formData, homePhone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                        placeholder="+1 555 123 4567"
                    />
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
                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            WiFi Password
                        </label>
                        <input
                            type="text"
                            value={formData.wifiPassword}
                            onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                            placeholder="Password"
                        />
                    </div>
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
