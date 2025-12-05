"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { QRCodeSVG } from "qrcode.react";

interface InviteCaregiverPanelProps {
    onClose: () => void;
    onSuccess?: () => void;
}

const ROLE_OPTIONS = [
    { value: "parent", label: "Co-parent" },
    { value: "grandparent", label: "Grandparent" },
    { value: "nanny", label: "Nanny" },
    { value: "babysitter", label: "Babysitter" },
    { value: "aunt_uncle", label: "Aunt/Uncle" },
    { value: "family_friend", label: "Family Friend" },
    { value: "other", label: "Other" },
];

// Track invite link data outside component to survive re-renders
let pendingInviteData: { token: string; name: string; label: string; role: string; homeIds: string[] } | null = null;

export default function InviteCaregiverPanel({ onClose, onSuccess }: InviteCaregiverPanelProps) {
    const { user } = useAuth();
    const { homes, refreshData } = useAppState();

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

    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleToggleHome = (homeId: string) => {
        // If only one home, don't allow deselection
        if (homes.length === 1) return;

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
        setSelectedHomeIds([]);
    };

    const handleGenerateInvite = async () => {
        if (!inviteName.trim() || !inviteLabel.trim()) {
            setError("Please fill in both name and what your child calls them");
            return;
        }

        // Validate home selection (unless skipped or only 1 home)
        if (homes.length > 1 && !skipHomeSelection && selectedHomeIds.length === 0) {
            setError("Please select at least one home or choose 'Skip for now'");
            return;
        }

        try {
            setGeneratingInvite(true);
            setError("");

            // Get family ID
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user?.id)
                .single();

            if (!familyMember) {
                throw new Error("No family found");
            }

            // Generate new invite token
            const newToken = crypto.randomUUID();

            // Determine final home IDs (use selected, or first home if only one)
            const finalHomeIds = homes.length === 1 ? [homes[0].id] : selectedHomeIds;

            const { error: insertError } = await supabase.from("invites").insert({
                family_id: familyMember.family_id,
                token: newToken,
                status: "pending",
                invitee_name: inviteName.trim(),
                invitee_label: inviteLabel.trim(),
                invitee_role: inviteRole || null,
                home_ids: finalHomeIds,
            });

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
        setError("");
        onClose();
    };

    // Get home names for display
    const getSelectedHomeNames = () => {
        if (pendingInviteData?.homeIds && pendingInviteData.homeIds.length > 0) {
            return pendingInviteData.homeIds
                .map(id => homes.find(h => h.id === id)?.name)
                .filter(Boolean)
                .join(", ");
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
                    Send this link to <strong>{inviteName}</strong> so they can join your family.
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
                            size={140}
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
                        Their Name
                    </label>
                    <input
                        id="invitee-name"
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                        placeholder="e.g., Sarah"
                    />
                </div>

                <div>
                    <label htmlFor="invitee-label" className="block text-sm font-semibold text-forest mb-1.5">
                        What does your child call them?
                    </label>
                    <input
                        id="invitee-label"
                        type="text"
                        value={inviteLabel}
                        onChange={(e) => setInviteLabel(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                        placeholder="e.g., Mommy, Daddy, Grandma, Uncle Bob, Auntie May"
                    />
                    <p className="text-xs text-textSub mt-1.5">
                        This is the name your child uses. We show this across the app.
                    </p>
                </div>

                <div>
                    <label htmlFor="invitee-role" className="block text-sm font-semibold text-forest mb-1.5">
                        Role
                    </label>
                    <select
                        id="invitee-role"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                    >
                        <option value="">Select role...</option>
                        {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
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
                        // Single home - show pre-selected and non-removable
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-softGreen/50 border border-forest/20">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest flex-shrink-0">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span className="text-sm text-forest font-medium flex-1">{homes[0].name}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
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
                                        className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                                            isSelected
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

                            {/* Skip for now option */}
                            <button
                                type="button"
                                onClick={handleSkipHomeSelection}
                                className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                                    skipHomeSelection
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
                    disabled={generatingInvite || !inviteName.trim() || !inviteLabel.trim()}
                    className="btn-primary flex-1 disabled:opacity-50"
                >
                    {generatingInvite ? "Creating..." : "Create Invite"}
                </button>
            </div>
        </div>
    );
}
