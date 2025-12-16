"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { QRCodeSVG } from "qrcode.react";
import MobileSelect from "@/components/MobileSelect";

interface InviteCaregiverPanelProps {
    onClose: () => void;
    onSuccess?: () => void;
}

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

// Track invite link data outside component to survive re-renders
let pendingInviteData: { token: string; name: string; label: string; role: string; homeIds: string[] } | null = null;

export default function InviteCaregiverPanel({ onClose, onSuccess }: InviteCaregiverPanelProps) {
    const { user } = useAuth();
    const { child, homes, refreshData } = useAppState();

    // Initialize from pending data if exists (survives re-renders from context updates)
    const [showInviteLink, setShowInviteLink] = useState(() => pendingInviteData !== null);
    const [inviteName, setInviteName] = useState(() => pendingInviteData?.name || "");
    const [inviteLabel, setInviteLabel] = useState(() => pendingInviteData?.label || "");
    const [inviteRole, setInviteRole] = useState(() => pendingInviteData?.role || "");
    const [inviteToken, setInviteToken] = useState(() => pendingInviteData?.token || "");

    // Home selection state - default to all homes if only one, empty if multiple
    const [selectedHomeIds, setSelectedHomeIds] = useState<string[]>(() => {
        if (pendingInviteData?.homeIds) return pendingInviteData.homeIds;
        // If only one home, auto-select it
        return homes.length === 1 ? [homes[0].id] : [];
    });
    const [skipHomeSelection, setSkipHomeSelection] = useState(false);
    const [askToCreateHome, setAskToCreateHome] = useState(false);

    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleToggleHome = (homeId: string) => {
        setSelectedHomeIds(prev => {
            if (prev.includes(homeId)) {
                return prev.filter(id => id !== homeId);
            } else {
                return [...prev, homeId];
            }
        });
        // Clear skip if selecting homes
        if (!selectedHomeIds.includes(homeId)) {
            setSkipHomeSelection(false);
        }
    };

    const handleSkipHomeSelection = () => {
        setSkipHomeSelection(true);
        setAskToCreateHome(false);
        setSelectedHomeIds([]);
    };

    const handleToggleAskToCreateHome = () => {
        setAskToCreateHome(prev => !prev);
        // Clear skip when toggling this option
        if (!askToCreateHome) {
            setSkipHomeSelection(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!inviteName.trim()) {
            setError("Please enter their full name");
            return;
        }

        if (!inviteLabel.trim()) {
            setError(`Please enter what ${child?.name || "your child"} calls them`);
            return;
        }

        if (!inviteRole) {
            setError("Please select a role");
            return;
        }

        // Validate home selection - need at least one option selected
        const hasHomeSelection = selectedHomeIds.length > 0 || askToCreateHome || skipHomeSelection;
        if (!hasHomeSelection) {
            setError("Please select at least one home or choose an option");
            return;
        }

        if (!child) {
            setError("No child profile found. Please complete setup first.");
            return;
        }

        try {
            setGeneratingInvite(true);
            setError("");

            // Generate new invite token
            const newToken = crypto.randomUUID();

            // Determine final home IDs - can have both selected homes AND ask to create own
            const finalHomeIds = selectedHomeIds.length > 0 ? selectedHomeIds : [];
            const primaryHomeId = finalHomeIds.length > 0 ? finalHomeIds[0] : null;

            // Build invite data - home_ids column may not exist in older databases
            const inviteData: Record<string, any> = {
                child_id: child.id,
                invited_by: user?.id,
                token: newToken,
                status: "pending",
                invitee_name: inviteName.trim(),
                invitee_label: inviteLabel.trim(), // Child-specific display name (e.g., "Daddy", "Grandma")
                invitee_role: inviteRole,
                has_own_home: askToCreateHome, // True if they need to create their own home
                home_id: primaryHomeId,
            };

            // Try to include home_ids if the column exists
            let { error: insertError } = await supabase.from("invites").insert({
                ...inviteData,
                home_ids: finalHomeIds.length > 0 ? finalHomeIds : null,
            });

            // If home_ids column doesn't exist, retry without it
            if (insertError?.message?.includes("home_ids")) {
                console.log("home_ids column not found, inserting without it");
                const result = await supabase.from("invites").insert(inviteData);
                insertError = result.error;
            }

            if (insertError) throw insertError;

            // Store data outside component to survive re-renders
            pendingInviteData = {
                token: newToken,
                name: inviteName.trim(),
                label: inviteLabel.trim(),
                role: inviteRole,
                homeIds: finalHomeIds
            };

            setInviteToken(newToken);
            setShowInviteLink(true);
            onSuccess?.();
            // Refresh data - component will re-init from pendingInviteData
            refreshData();
        } catch (err: any) {
            console.error("Error generating invite:", err);
            setError(err.message || "Failed to generate invite");
        } finally {
            setGeneratingInvite(false);
        }
    };

    const handleCopyLink = () => {
        const inviteLink = `${window.location.origin}/invite/${inviteToken}`;
        navigator.clipboard.writeText(inviteLink);
        setSuccessMessage("Link copied to clipboard!");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    const handleClose = () => {
        // Clear the pending data so next open starts fresh
        pendingInviteData = null;
        setShowInviteLink(false);
        setInviteToken("");
        setInviteName("");
        setInviteLabel("");
        setInviteRole("");
        setSelectedHomeIds(homes.length === 1 ? [homes[0].id] : []);
        setSkipHomeSelection(false);
        setAskToCreateHome(false);
        setError("");
        onClose();
    };

    // Get home names for display
    const getSelectedHomeNames = () => {
        const homeNames = (pendingInviteData?.homeIds || selectedHomeIds)
            .map(id => homes.find(h => h.id === id)?.name)
            .filter(Boolean);
        
        if (homeNames.length > 0 && askToCreateHome) {
            return `${homeNames.join(", ")} + will create their own`;
        }
        if (askToCreateHome) {
            return `${inviteName || "They"} will create their own home(s)`;
        }
        if (homeNames.length > 0) {
            return homeNames.join(", ");
        }
        return "No homes selected (will be inactive)";
    };

    // Show invite link after successful generation
    if (showInviteLink) {
        return (
            <div className="card-organic p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-forest text-lg">Share Invite Link</h2>
                    <button
                        onClick={handleClose}
                        className="text-textSub hover:text-forest"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {successMessage && (
                    <div className="bg-softGreen border border-forest/20 rounded-xl px-4 py-3 text-sm text-forest font-medium">
                        {successMessage}
                    </div>
                )}

                <p className="text-sm text-textSub">
                    Send this link to <strong>{inviteName}</strong> ({inviteLabel}) so they can access {child?.name}'s information.
                </p>

                {/* Show which homes they'll have access to */}
                <div className="bg-cream/50 rounded-xl px-4 py-3">
                    <p className="text-xs text-forest/70 mb-1">Home access:</p>
                    <p className="text-sm text-forest font-medium">{getSelectedHomeNames()}</p>
                </div>

                <div className="flex justify-center py-4">
                    <div className="bg-white p-4 rounded-xl border border-border">
                        <QRCodeSVG
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteToken}`}
                            size={200}
                            level="M"
                            includeMargin={false}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteToken}`}
                        className="w-full px-3 py-2.5 bg-cream border border-border rounded-lg text-xs font-mono text-forest"
                    />
                    <button
                        onClick={handleCopyLink}
                        className="btn-secondary w-full"
                    >
                        Copy Link
                    </button>
                </div>

                <button
                    onClick={handleClose}
                    className="w-full text-sm text-textSub hover:text-forest py-2"
                >
                    Done
                </button>
            </div>
        );
    }

    // Show invite form
    return (
        <div className="card-organic p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-forest text-lg">Invite a Caregiver</h2>
                <button
                    onClick={handleClose}
                    className="text-textSub hover:text-forest"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <p className="text-sm text-textSub">
                Enter the details of the person you'd like to invite.
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="invitee-name" className="block text-sm font-semibold text-forest mb-1.5">
                        Full name
                    </label>
                    <input
                        id="invitee-name"
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                        placeholder="e.g., Ellis Martinez"
                    />
                </div>

                <div>
                    <label htmlFor="invitee-label" className="block text-sm font-semibold text-forest mb-1.5">
                        How does {child?.name || "your child"} call them?
                    </label>
                    <input
                        id="invitee-label"
                        type="text"
                        value={inviteLabel}
                        onChange={(e) => setInviteLabel(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                        placeholder='e.g., "Daddy", "Grandma", "Aunt Lisa"'
                    />
                    <p className="text-xs text-textSub mt-1">
                        This name will be shown throughout {child?.name || "your child"}'s space.
                    </p>
                </div>

                <div>
                    <label htmlFor="invitee-role" className="block text-sm font-semibold text-forest mb-1.5">
                        Role
                    </label>
                    <MobileSelect
                        value={inviteRole}
                        onChange={setInviteRole}
                        options={ROLE_OPTIONS}
                        placeholder="Select role..."
                        title="Select role"
                    />
                </div>

                {/* Home Access Selection */}
                <div>
                    <label className="block text-sm font-semibold text-forest mb-1.5">
                        Home Access
                    </label>
                    <p className="text-xs text-textSub mb-3">
                        Select which homes this caregiver can access.
                    </p>

                    {homes.length === 1 ? (
                        // Single home - show toggleable options
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handleToggleHome(homes[0].id)}
                                className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                                    selectedHomeIds.includes(homes[0].id)
                                        ? "bg-softGreen/50 border-forest/20"
                                        : "bg-white border-border hover:border-forest/30"
                                }`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 ${selectedHomeIds.includes(homes[0].id) ? "text-forest" : "text-textSub"}`}>
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                <span className={`text-sm font-medium flex-1 text-left ${selectedHomeIds.includes(homes[0].id) ? "text-forest" : "text-textSub"}`}>{homes[0].name}</span>
                                {selectedHomeIds.includes(homes[0].id) && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>

                            {/* Ask to create their own home */}
                            <button
                                type="button"
                                onClick={handleToggleAskToCreateHome}
                                className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                                    askToCreateHome
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-white border-border hover:border-forest/30"
                                }`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 ${askToCreateHome ? "text-blue-600" : "text-textSub"}`}>
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <line x1="12" y1="14" x2="12" y2="18" />
                                    <line x1="10" y1="16" x2="14" y2="16" />
                                </svg>
                                <span className={`text-sm font-medium flex-1 text-left ${askToCreateHome ? "text-blue-700" : "text-textSub"}`}>
                                    Ask {inviteName || "them"} to create their home(s)
                                </span>
                                {askToCreateHome && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>

                            {askToCreateHome && (
                                <p className="text-xs text-blue-600 mt-1">
                                    {inviteName || "They"} will also be asked to set up their own home(s) when accepting the invite.
                                </p>
                            )}
                        </div>
                    ) : (
                        // Multiple homes - show checkboxes
                        <div className="space-y-2">
                            {homes.map((home) => {
                                const isSelected = selectedHomeIds.includes(home.id);
                                return (
                                    <button
                                        key={home.id}
                                        type="button"
                                        onClick={() => handleToggleHome(home.id)}
                                        className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${isSelected
                                                ? "bg-softGreen/50 border-forest/20"
                                                : "bg-white border-border hover:border-forest/30"
                                            }`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 ${isSelected ? "text-forest" : "text-textSub"}`}>
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                        <span className={`text-sm font-medium flex-1 text-left ${isSelected ? "text-forest" : "text-textSub"}`}>
                                            {home.name}
                                        </span>
                                        {isSelected && (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}

                            {/* Ask to create their own home */}
                            <button
                                type="button"
                                onClick={handleToggleAskToCreateHome}
                                className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                                    askToCreateHome
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-white border-border hover:border-forest/30"
                                }`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 ${askToCreateHome ? "text-blue-600" : "text-textSub"}`}>
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <line x1="12" y1="14" x2="12" y2="18" />
                                    <line x1="10" y1="16" x2="14" y2="16" />
                                </svg>
                                <span className={`text-sm font-medium flex-1 text-left ${askToCreateHome ? "text-blue-700" : "text-textSub"}`}>
                                    Ask {inviteName || "them"} to create their home(s)
                                </span>
                                {askToCreateHome && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>

                            {askToCreateHome && selectedHomeIds.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1">
                                    {inviteName || "They"} will have access to selected homes and also be asked to set up their own.
                                </p>
                            )}

                            {askToCreateHome && selectedHomeIds.length === 0 && (
                                <p className="text-xs text-blue-600 mt-1">
                                    {inviteName || "They"} will be asked to set up their own home(s) when accepting the invite.
                                </p>
                            )}

                            {/* Skip for now option */}
                            <button
                                type="button"
                                onClick={handleSkipHomeSelection}
                                className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${skipHomeSelection
                                        ? "bg-amber-50 border-amber-200"
                                        : "bg-white border-border hover:border-forest/30"
                                    }`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 ${skipHomeSelection ? "text-amber-600" : "text-textSub"}`}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                                <span className={`text-sm font-medium flex-1 text-left ${skipHomeSelection ? "text-amber-700" : "text-textSub"}`}>
                                    Skip for now
                                </span>
                                {skipHomeSelection && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>

                            {skipHomeSelection && (
                                <p className="text-xs text-amber-600 mt-1">
                                    The caregiver will be inactive until you add them to a home.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={handleClose}
                    className="btn-secondary flex-1"
                >
                    Cancel
                </button>
                <button
                    onClick={handleGenerateInvite}
                    disabled={generatingInvite || !inviteName.trim() || !inviteLabel.trim() || !inviteRole}
                    className="btn-primary flex-1 disabled:opacity-50"
                >
                    {generatingInvite ? "Creating..." : "Create Invite"}
                </button>
            </div>
        </div>
    );
}
