"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import InviteCaregiverPanel from "@/components/InviteCaregiverPanel";
import CaregiverStatusPill from "@/components/caregivers/CaregiverStatusPill";
import CaregiverConfirmDialog, { CaregiverAction } from "@/components/caregivers/CaregiverConfirmDialog";
import HomeSelectionDialog from "@/components/caregivers/HomeSelectionDialog";
import { useAuth } from "@/lib/AuthContext";
import { useAppState, CaregiverProfile, HomeProfile } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { getAccessLevelMessage } from "@/lib/caregiverPermissions";

// Canonical role options - consistent across the app
const ROLE_OPTIONS = [
    { value: "parent", label: "Parent" },
    { value: "step_parent", label: "Step-parent" },
    { value: "family_member", label: "Family member" },
    { value: "nanny", label: "Nanny" },
    { value: "babysitter", label: "Babysitter" },
    { value: "family_friend", label: "Family friend" },
    { value: "other", label: "Other" },
];

export default function CaregiversPage() {
    useEnsureOnboarding();

    const { user, loading: authLoading } = useAuth();
    const { child, caregivers, homes, refreshData, isLoaded } = useAppState();

    const [expandedCaregiverId, setExpandedCaregiverId] = useState<string | null>(null);
    const [editingCaregiverId, setEditingCaregiverId] = useState<string | null>(null);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        caregiver: CaregiverProfile | null;
        intendedAction: CaregiverAction | null;
    }>({ isOpen: false, caregiver: null, intendedAction: null });

    // Home selection dialog state (for enabling inactive caregivers)
    const [homeSelectionDialog, setHomeSelectionDialog] = useState<{
        isOpen: boolean;
        caregiver: CaregiverProfile | null;
    }>({ isOpen: false, caregiver: null });

    // Pending invite state
    const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);
    const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
    const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

    // Form state for editing
    const [formData, setFormData] = useState({
        label: "",
        relationship: "",
        phone: "",
    });

    // Filter caregivers by status (derived from home connections)
    // Active = connected to >= 1 home
    // Inactive = connected to 0 homes
    // Pending = invite not yet accepted
    const activeCaregivers = caregivers.filter(c => c.status === "active");
    const inactiveCaregivers = caregivers.filter(c => c.status === "inactive");
    const pendingCaregivers = caregivers.filter(c => c.status === "pending");

    const resetForm = () => {
        setFormData({ label: "", relationship: "", phone: "" });
        setEditingCaregiverId(null);
    };

    const showToast = (message: string, isError = false) => {
        if (isError) {
            setError(message);
            setTimeout(() => setError(""), 5000);
        } else {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(""), 3000);
        }
    };

    const handleEditCaregiver = (caregiver: CaregiverProfile) => {
        if (caregiver.status === "pending") {
            showToast("Cannot edit pending caregivers. Wait for them to accept the invite.", true);
            return;
        }
        setEditingCaregiverId(caregiver.id);
        setExpandedCaregiverId(caregiver.id);
        setFormData({
            label: caregiver.label || "",
            relationship: caregiver.relationship || "",
            phone: caregiver.phone || "",
        });
        setError("");
    };

    const handleSaveCaregiver = async () => {
        if (!formData.label.trim()) {
            showToast("Display name is required", true);
            return;
        }

        try {
            setSaving(true);
            setError("");

            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    label: formData.label.trim(),
                    relationship: formData.relationship || null,
                    phone: formData.phone.trim() || null,
                })
                .eq("id", editingCaregiverId);

            if (updateError) throw updateError;

            await refreshData();
            resetForm();
            showToast("Caregiver updated!");
        } catch (err: any) {
            console.error("Error updating caregiver:", err);
            showToast(err.message || "Failed to update caregiver", true);
        } finally {
            setSaving(false);
        }
    };

    // Open confirmation dialog for caregiver actions
    const openConfirmDialog = (caregiver: CaregiverProfile, action: CaregiverAction) => {
        setConfirmDialog({ isOpen: true, caregiver, intendedAction: action });
    };

    const closeConfirmDialog = () => {
        setConfirmDialog({ isOpen: false, caregiver: null, intendedAction: null });
    };

    // Handle confirmation dialog actions
    const handleConfirmAction = async (action: CaregiverAction) => {
        const caregiver = confirmDialog.caregiver;
        if (!caregiver) return;

        try {
            setSaving(true);

            if (action === "remove") {
                await removeCaregiver(caregiver);
                showToast("Caregiver removed from family.");
            } else if (action === "disable") {
                await disableCaregiverAccess(caregiver.id);
                showToast(`${caregiver.label}'s access has been disabled.`);
            } else if (action === "enable") {
                // For enable, we need to show the home selection dialog
                closeConfirmDialog();
                setHomeSelectionDialog({ isOpen: true, caregiver });
                return;
            }

            closeConfirmDialog();
        } catch (err: any) {
            console.error("Error performing action:", err);
            showToast("Something went wrong. Please try again.", true);
        } finally {
            setSaving(false);
        }
    };

    // Disable caregiver access - remove all home_access entries
    const disableCaregiverAccess = async (caregiverId: string) => {
        // Get family ID
        const { data: familyMember } = await supabase
            .from("family_members")
            .select("family_id")
            .eq("user_id", user?.id)
            .single();

        if (!familyMember) throw new Error("Family not found");

        console.log("🔧 Disabling caregiver:", caregiverId);

        // Fetch fresh home data directly from database (don't rely on React state)
        const { data: freshHomes, error: homesError } = await supabase
            .from("homes")
            .select("id, name, accessible_caregiver_ids")
            .eq("family_id", familyMember.family_id);

        if (homesError) {
            console.error("🔧 Error fetching homes:", homesError);
            throw homesError;
        }

        const familyHomeIds = (freshHomes || []).map(h => h.id);
        console.log("🔧 Family home IDs:", familyHomeIds);

        // Try to delete from home_access table (may not exist yet)
        try {
            const { error: deleteError } = await supabase
                .from("home_access")
                .delete()
                .eq("caregiver_id", caregiverId)
                .in("home_id", familyHomeIds);

            if (deleteError) {
                console.log("🔧 home_access delete error (may not exist):", deleteError);
            } else {
                console.log("🔧 Deleted from home_access table");
            }
        } catch (e) {
            console.log("🔧 home_access table may not exist:", e);
        }

        // Update the legacy accessible_caregiver_ids array on homes table
        // This is the PRIMARY source of truth until home_access is fully deployed
        for (const home of (freshHomes || [])) {
            const currentIds = home.accessible_caregiver_ids || [];
            console.log(`🔧 Checking home ${home.name}: caregiverIds =`, currentIds);
            if (currentIds.includes(caregiverId)) {
                const newIds = currentIds.filter((id: string) => id !== caregiverId);
                console.log(`🔧 Updating home ${home.name}: removing ${caregiverId}, new ids:`, newIds);
                const { error: updateError } = await supabase
                    .from("homes")
                    .update({ accessible_caregiver_ids: newIds })
                    .eq("id", home.id);

                if (updateError) {
                    console.error(`🔧 Error updating home ${home.name}:`, updateError);
                    throw updateError;
                } else {
                    console.log(`🔧 Successfully updated home ${home.name}`);
                }
            }
        }

        console.log("🔧 Refreshing data...");
        await refreshData();
    };

    // Enable caregiver access - add home_access entries for selected homes
    const handleEnableAccess = async (selectedHomeIds: string[]) => {
        const caregiver = homeSelectionDialog.caregiver;
        if (!caregiver || selectedHomeIds.length === 0) return;

        try {
            setSaving(true);

            // Insert home_access entries for each selected home
            const insertPromises = selectedHomeIds.map(homeId =>
                supabase
                    .from("home_access")
                    .insert({ home_id: homeId, caregiver_id: caregiver.id })
                    .single()
            );

            await Promise.all(insertPromises);

            // Also update the legacy accessible_caregiver_ids array on homes table
            for (const homeId of selectedHomeIds) {
                const home = homes.find(h => h.id === homeId);
                if (home) {
                    const currentIds = home.accessibleCaregiverIds || [];
                    if (!currentIds.includes(caregiver.id)) {
                        await supabase
                            .from("homes")
                            .update({ accessible_caregiver_ids: [...currentIds, caregiver.id] })
                            .eq("id", homeId);
                    }
                }
            }

            await refreshData();
            setHomeSelectionDialog({ isOpen: false, caregiver: null });
            showToast(`${caregiver.label}'s access has been restored.`);
        } catch (err: any) {
            console.error("Error enabling access:", err);
            showToast("Failed to enable access. Please try again.", true);
        } finally {
            setSaving(false);
        }
    };

    // Remove caregiver from family entirely
    const removeCaregiver = async (caregiver: CaregiverProfile) => {
        const { data: familyMember } = await supabase
            .from("family_members")
            .select("family_id")
            .eq("user_id", user?.id)
            .single();

        if (!familyMember) throw new Error("Family not found");

        // 1. Delete all home_access entries
        const familyHomeIds = homes.map(h => h.id);
        await supabase
            .from("home_access")
            .delete()
            .eq("caregiver_id", caregiver.id)
            .in("home_id", familyHomeIds);

        // 2. Remove from family_members
        await supabase
            .from("family_members")
            .delete()
            .eq("user_id", caregiver.id)
            .eq("family_id", familyMember.family_id);

        // 3. Update legacy accessible_caregiver_ids on homes
        for (const home of homes) {
            if (home.accessibleCaregiverIds?.includes(caregiver.id)) {
                const newIds = home.accessibleCaregiverIds.filter(id => id !== caregiver.id);
                await supabase
                    .from("homes")
                    .update({ accessible_caregiver_ids: newIds })
                    .eq("id", home.id);
            }
        }

        await refreshData();
    };

    // Get homes that a caregiver has access to
    const getCaregiverHomes = (caregiverId: string): HomeProfile[] => {
        const caregiver = caregivers.find(c => c.id === caregiverId);
        if (!caregiver?.accessibleHomeIds) return [];
        return homes.filter(home => caregiver.accessibleHomeIds.includes(home.id));
    };

    // Get homes that a caregiver doesn't have access to
    const getAvailableHomes = (caregiverId: string): HomeProfile[] => {
        const caregiver = caregivers.find(c => c.id === caregiverId);
        if (!caregiver?.accessibleHomeIds) return homes;
        return homes.filter(home => !caregiver.accessibleHomeIds.includes(home.id));
    };

    // Add caregiver to a home
    const handleAddToHome = async (caregiverId: string, homeId: string) => {
        try {
            // Insert into home_access
            await supabase
                .from("home_access")
                .insert({ home_id: homeId, caregiver_id: caregiverId });

            // Update legacy accessible_caregiver_ids
            const home = homes.find(h => h.id === homeId);
            if (home) {
                const currentIds = home.accessibleCaregiverIds || [];
                if (!currentIds.includes(caregiverId)) {
                    await supabase
                        .from("homes")
                        .update({ accessible_caregiver_ids: [...currentIds, caregiverId] })
                        .eq("id", homeId);
                }
            }

            await refreshData();
        } catch (err: any) {
            console.error("Error adding caregiver to home:", err);
            showToast(err.message || "Failed to add to home", true);
        }
    };

    // Remove caregiver from a home
    const handleRemoveFromHome = async (caregiverId: string, homeId: string) => {
        try {
            // Delete from home_access
            await supabase
                .from("home_access")
                .delete()
                .eq("home_id", homeId)
                .eq("caregiver_id", caregiverId);

            // Update legacy accessible_caregiver_ids
            const home = homes.find(h => h.id === homeId);
            if (home) {
                const newIds = (home.accessibleCaregiverIds || []).filter(id => id !== caregiverId);
                await supabase
                    .from("homes")
                    .update({ accessible_caregiver_ids: newIds })
                    .eq("id", homeId);
            }

            await refreshData();
        } catch (err: any) {
            console.error("Error removing caregiver from home:", err);
            showToast(err.message || "Failed to remove from home", true);
        }
    };

    const getRoleLabel = (value?: string) => {
        if (!value) return null;
        // First check the canonical roles
        const option = ROLE_OPTIONS.find(o => o.value === value);
        if (option) return option.label;
        // Map legacy roles to new labels
        const legacyMap: Record<string, string> = {
            'co_parent': 'Parent',
            'grandparent': 'Family member',
            'aunt_uncle': 'Family member',
            'sibling': 'Family member',
            'cousin': 'Family member',
        };
        return legacyMap[value] || value;
    };

    // Copy invite link to clipboard
    const handleCopyInviteLink = (token: string, caregiverId: string) => {
        const inviteLink = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(inviteLink);
        setCopiedInviteId(caregiverId);
        setTimeout(() => setCopiedInviteId(null), 2000);
    };

    // Get invite link URL
    const getInviteLink = (token: string) => {
        return typeof window !== 'undefined' ? `${window.location.origin}/invite/${token}` : `/invite/${token}`;
    };

    // Revoke a pending invite
    const handleRevokeInvite = async (caregiverId: string) => {
        const inviteId = caregiverId.replace("pending-", "");

        try {
            setSaving(true);

            const { error: deleteError } = await supabase
                .from("invites")
                .delete()
                .eq("id", inviteId);

            if (deleteError) throw deleteError;

            await refreshData();
            setRevokeConfirmId(null);
            setExpandedPendingId(null);
            showToast("Invite revoked. The link will no longer work.");
        } catch (err: any) {
            console.error("Error revoking invite:", err);
            showToast("Something went wrong. Please try again.", true);
        } finally {
            setSaving(false);
        }
    };

    // Render a caregiver card
    const renderCaregiverCard = (caregiver: CaregiverProfile) => {
        const isExpanded = expandedCaregiverId === caregiver.id;
        const isEditing = editingCaregiverId === caregiver.id;
        const caregiverHomes = getCaregiverHomes(caregiver.id);
        const availableHomes = getAvailableHomes(caregiver.id);

        return (
            <div
                key={caregiver.id}
                className={`card-organic overflow-hidden transition-opacity ${
                    caregiver.status === "inactive" ? "opacity-70" : ""
                }`}
            >
                {/* Caregiver Header */}
                <div
                    className="p-4 cursor-pointer hover:bg-cream/30 transition-colors"
                    onClick={() => setExpandedCaregiverId(isExpanded ? null : caregiver.id)}
                >
                    <div className="flex items-center gap-4">
                        <Avatar
                            src={caregiver.avatarUrl}
                            initial={caregiver.avatarInitials}
                            size={48}
                            bgColor={caregiver.avatarColor.startsWith("bg-") ? "#6B7280" : caregiver.avatarColor}
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-forest text-base">{caregiver.label}</h3>
                                {caregiver.isCurrentUser && (
                                    <span className="text-xs bg-softGreen text-forest px-2 py-0.5 rounded-full font-medium">
                                        You
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-textSub">{caregiver.name}</p>
                            {caregiver.relationship && (
                                <p className="text-xs text-textSub mt-0.5">
                                    {getRoleLabel(caregiver.relationship)}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <CaregiverStatusPill status={caregiver.status} className="hidden sm:inline-flex" />
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`text-textSub transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="border-t border-border/30">
                        {isEditing ? (
                            // Edit Form
                            <div className="p-4 space-y-4">
                                <h3 className="font-semibold text-forest">Edit Caregiver</h3>

                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1.5">
                                        Display Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.label}
                                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        placeholder="e.g., Daddy, Mommy, Grandma"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1.5">Role</label>
                                    <select
                                        value={formData.relationship}
                                        onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    >
                                        <option value="">Select role...</option>
                                        {ROLE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1.5">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={resetForm} className="btn-secondary flex-1">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCaregiver}
                                        disabled={saving}
                                        className="btn-primary flex-1 disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Details
                            <div className="p-4 space-y-4">
                                {/* Mobile Status Pill */}
                                <div className="sm:hidden">
                                    <CaregiverStatusPill status={caregiver.status} />
                                </div>

                                {/* Contact Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">Contact Info</h4>
                                    <div className="space-y-1">
                                        <p className="text-sm text-textSub">
                                            <span className="text-forest/70">Name:</span> {caregiver.name}
                                        </p>
                                        {caregiver.phone && (
                                            <p className="text-sm text-textSub">
                                                <span className="text-forest/70">Phone:</span> {caregiver.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Connected Homes */}
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">Connected with</h4>
                                    <div className="space-y-2">
                                        {caregiverHomes.length > 0 ? (
                                            caregiverHomes.map((home) => (
                                                <div
                                                    key={home.id}
                                                    className="flex items-center gap-2 p-2 rounded-lg bg-cream/50"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest flex-shrink-0">
                                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                        <polyline points="9 22 9 12 15 12 15 22" />
                                                    </svg>
                                                    <span className="text-sm text-forest flex-1">{home.name}</span>
                                                    {!caregiver.isCurrentUser && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveFromHome(caregiver.id, home.id);
                                                            }}
                                                            className="p-1 text-textSub hover:text-red-500 transition-colors"
                                                            title="Remove from this home"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-textSub/60 italic">Not connected to any homes</p>
                                        )}

                                        {/* Add to Home Dropdown */}
                                        {availableHomes.length > 0 && !caregiver.isCurrentUser && (
                                            <div className="pt-1">
                                                <select
                                                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleAddToHome(caregiver.id, e.target.value);
                                                        }
                                                    }}
                                                >
                                                    <option value="">+ Connect to a home</option>
                                                    {availableHomes.map((home) => (
                                                        <option key={home.id} value={home.id}>
                                                            {home.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Access Status */}
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">Access</h4>
                                    <p className="text-sm text-textSub">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${
                                                caregiver.status === "active" ? "bg-green-500" : "bg-gray-400"
                                            }`}></span>
                                            {getAccessLevelMessage(caregiver.status)}
                                        </span>
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/30">
                                    <button
                                        onClick={() => handleEditCaregiver(caregiver)}
                                        className="btn-secondary text-sm px-4 py-2"
                                    >
                                        Edit
                                    </button>
                                    {!caregiver.isCurrentUser && (
                                        <>
                                            {caregiver.status === "active" ? (
                                                <button
                                                    onClick={() => openConfirmDialog(caregiver, "disable")}
                                                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                >
                                                    Disable access
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setHomeSelectionDialog({ isOpen: true, caregiver })}
                                                    className="btn-primary text-sm px-4 py-2"
                                                >
                                                    Enable access
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openConfirmDialog(caregiver, "remove")}
                                                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
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

    if (!user) return null;

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Caregivers</h1>
                    <p className="text-sm text-textSub">
                        Manage who has access to {child?.name || "your child"}'s information.
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

                {/* Intro Card */}
                <div className="card-organic p-5">
                    <p className="text-sm text-textSub mb-4">
                        Add parents, babysitters, and helpers so they can see the information they need for {child?.name || "your child"}.
                    </p>
                    {!showInviteForm && (
                        <button
                            onClick={() => setShowInviteForm(true)}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            Invite caregiver
                        </button>
                    )}
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                    <InviteCaregiverPanel
                        onClose={() => setShowInviteForm(false)}
                        onSuccess={() => showToast("Invite created!")}
                    />
                )}

                {/* Active Caregivers List */}
                {activeCaregivers.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-forest">
                            Active caregivers ({activeCaregivers.length})
                        </h2>
                        {activeCaregivers.map(renderCaregiverCard)}
                    </div>
                )}

                {/* Inactive Caregivers List */}
                {inactiveCaregivers.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-forest">
                            Inactive caregivers ({inactiveCaregivers.length})
                        </h2>
                        <p className="text-xs text-textSub -mt-1 mb-2">
                            These caregivers have no home access and cannot see family information.
                        </p>
                        {inactiveCaregivers.map(renderCaregiverCard)}
                    </div>
                )}

                {/* Pending Invites */}
                {pendingCaregivers.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-forest">
                            Pending invites ({pendingCaregivers.length})
                        </h2>
                        {pendingCaregivers.map((caregiver) => (
                            <div key={caregiver.id} className="card-organic overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                <div
                                    className="p-4 cursor-pointer hover:bg-cream/30 transition-colors"
                                    onClick={() => setExpandedPendingId(expandedPendingId === caregiver.id ? null : caregiver.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar initial={caregiver.avatarInitials} size={48} bgColor="#D97706" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-forest text-base">{caregiver.label}</h3>
                                                <CaregiverStatusPill status="pending" />
                                            </div>
                                            <p className="text-sm text-textSub">{caregiver.name}</p>
                                            {caregiver.pendingHomeIds && caregiver.pendingHomeIds.length > 0 && (
                                                <p className="text-xs text-textSub mt-0.5">
                                                    Will have access to: {caregiver.pendingHomeIds.map(id => homes.find(h => h.id === id)?.name).filter(Boolean).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-textSub hidden sm:block">Waiting to accept</span>
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className={`text-textSub transition-transform ${expandedPendingId === caregiver.id ? 'rotate-180' : ''}`}
                                            >
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedPendingId === caregiver.id && caregiver.inviteToken && (
                                    <div className="border-t border-border/30 p-4 space-y-4">
                                        <div className="flex justify-center">
                                            <div className="bg-white p-3 rounded-xl border border-border">
                                                <QRCodeSVG
                                                    value={getInviteLink(caregiver.inviteToken)}
                                                    size={120}
                                                    level="M"
                                                    includeMargin={false}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-forest">Invite Link</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={getInviteLink(caregiver.inviteToken)}
                                                    className="flex-1 px-3 py-2 bg-cream border border-border rounded-lg text-xs font-mono text-forest truncate"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyInviteLink(caregiver.inviteToken!, caregiver.id);
                                                    }}
                                                    className="btn-secondary text-sm px-3 py-2 whitespace-nowrap"
                                                >
                                                    {copiedInviteId === caregiver.id ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-textSub text-center">
                                            Share this link with {caregiver.name} to invite them to join.
                                        </p>

                                        <div className="pt-3 border-t border-border/30">
                                            {revokeConfirmId === caregiver.id ? (
                                                <div className="space-y-3">
                                                    <p className="text-sm text-textSub text-center">
                                                        Are you sure? The invite link will stop working.
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setRevokeConfirmId(null)}
                                                            className="btn-secondary flex-1 text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleRevokeInvite(caregiver.id)}
                                                            disabled={saving}
                                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {saving ? "Revoking..." : "Yes, Revoke"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setRevokeConfirmId(caregiver.id)}
                                                    className="w-full text-sm text-red-500 hover:text-red-600 py-2 transition-colors"
                                                >
                                                    Revoke invite
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {caregivers.length === 0 && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No caregivers yet</h3>
                        <p className="text-sm text-textSub mb-4">
                            Invite parents and helpers to share access to {child?.name || "your child"}'s information.
                        </p>
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
                            <p className="text-sm text-forest font-medium mb-1">About Caregivers</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Caregivers are people who help take care of {child?.name || "your child"}.
                                Connect them to specific homes so they can access relevant information.
                                Removing a caregiver will revoke their access to all family information.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {confirmDialog.caregiver && confirmDialog.intendedAction && (
                <CaregiverConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    caregiverName={confirmDialog.caregiver.label}
                    intendedAction={confirmDialog.intendedAction}
                    currentStatus={confirmDialog.caregiver.status === "active" ? "active" : "inactive"}
                    onCancel={closeConfirmDialog}
                    onConfirm={handleConfirmAction}
                    isLoading={saving}
                />
            )}

            {/* Home Selection Dialog */}
            {homeSelectionDialog.caregiver && (
                <HomeSelectionDialog
                    isOpen={homeSelectionDialog.isOpen}
                    caregiverName={homeSelectionDialog.caregiver.label}
                    homes={homes}
                    onCancel={() => setHomeSelectionDialog({ isOpen: false, caregiver: null })}
                    onConfirm={handleEnableAccess}
                    isLoading={saving}
                />
            )}
        </AppShell>
    );
}
