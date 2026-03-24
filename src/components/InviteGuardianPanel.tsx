"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { QRCodeSVG } from "qrcode.react";
import MobileSelect from "@/components/MobileSelect";

interface InviteGuardianPanelProps {
    onClose: () => void;
    onSuccess?: () => void;
}

// Guardian role options - for child/pet-centric access (follows child globally)
const GUARDIAN_ROLE_OPTIONS = [
    { value: "parent", label: "Parent" },
    { value: "stepparent", label: "Step-parent" },
];

// Track invite link data outside component to survive re-renders
let pendingInviteData: {
    token: string;
    name: string;
    label: string;
    role: string;
    childIds: string[];
    petIds: string[];
} | null = null;

export default function InviteGuardianPanel({ onClose, onSuccess }: InviteGuardianPanelProps) {
    const { user } = useAuth();
    const { child, children, pets, refreshData } = useAppState();

    // Initialize from pending data if exists (survives re-renders from context updates)
    const [showInviteLink, setShowInviteLink] = useState(() => pendingInviteData !== null);
    const [inviteName, setInviteName] = useState(() => pendingInviteData?.name || "");
    const [inviteLabel, setInviteLabel] = useState(() => pendingInviteData?.label || "");
    const [inviteRole, setInviteRole] = useState(() => pendingInviteData?.role || "");
    const [inviteToken, setInviteToken] = useState(() => pendingInviteData?.token || "");

    // Child/Pet selection - guardians follow children/pets globally (no home selection needed)
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>(() => {
        if (pendingInviteData?.childIds) return pendingInviteData.childIds;
        // Default to current child if only one
        return child ? [child.id] : [];
    });
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>(() => {
        return pendingInviteData?.petIds || [];
    });

    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Toggle child selection
    const handleToggleChild = (childId: string) => {
        setSelectedChildIds(prev =>
            prev.includes(childId)
                ? prev.filter(id => id !== childId)
                : [...prev, childId]
        );
    };

    // Toggle pet selection
    const handleTogglePet = (petId: string) => {
        setSelectedPetIds(prev =>
            prev.includes(petId)
                ? prev.filter(id => id !== petId)
                : [...prev, petId]
        );
    };

    const handleGenerateInvite = async () => {
        // Validate at least one child or pet is selected
        if (selectedChildIds.length === 0 && selectedPetIds.length === 0) {
            setError("Please select at least one child or pet for this guardian to have access to");
            return;
        }

        if (!inviteName.trim()) {
            setError("Please enter their full name");
            return;
        }

        if (!inviteRole) {
            setError("Please select a role");
            return;
        }

        try {
            setGeneratingInvite(true);
            setError("");

            // Generate new invite token
            const newToken = crypto.randomUUID();

            // Build invite data for guardian (child/pet-centric, follows globally)
            const inviteData: Record<string, unknown> = {
                child_id: selectedChildIds[0] || child?.id, // Primary child for backward compat
                invited_by: user?.id,
                token: newToken,
                status: "pending",
                invitee_name: inviteName.trim(),
                invitee_label: inviteLabel.trim() || inviteName.trim(), // Fall back to name if label not provided
                invitee_role: inviteRole,
                has_own_home: true, // Guardians get access to all homes linked to children
                invite_type: "guardian", // Mark as guardian invite (child/pet-centric)
            };

            // Try to include selected_child_ids and selected_pet_ids if columns exist
            let { error: insertError } = await supabase.from("invites").insert({
                ...inviteData,
                selected_child_ids: selectedChildIds,
                selected_pet_ids: selectedPetIds,
            });

            // If columns don't exist, retry without them
            if (insertError?.message?.includes("selected_child_ids") || insertError?.message?.includes("selected_pet_ids")) {
                console.log("selected_child_ids/selected_pet_ids columns not found, inserting without them");
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
                childIds: selectedChildIds,
                petIds: selectedPetIds,
            };

            setInviteToken(newToken);
            setShowInviteLink(true);
            onSuccess?.();
            // Refresh data - component will re-init from pendingInviteData
            refreshData();
        } catch (err: unknown) {
            console.error("Error generating invite:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate invite";
            setError(errorMessage);
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
        setSelectedChildIds(child ? [child.id] : []);
        setSelectedPetIds([]);
        setError("");
        onClose();
    };

    // Get child/pet names for display
    const getSelectedNames = () => {
        const childIds = pendingInviteData?.childIds || selectedChildIds;
        const petIds = pendingInviteData?.petIds || selectedPetIds;

        const childNames = childIds
            .map(id => children.find(c => c.id === id)?.name)
            .filter(Boolean);
        const petNames = petIds
            .map(id => pets.find(p => p.id === id)?.name)
            .filter(Boolean);

        const allNames = [...childNames, ...petNames];
        if (allNames.length === 0) return "None selected";
        return allNames.join(", ");
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
                    Send this link to <strong>{inviteName}</strong> ({inviteLabel}) so they can access your family's information.
                </p>

                {/* Show which children/pets they'll have access to */}
                <div className="bg-cream/50 rounded-xl px-4 py-3">
                    <p className="text-xs text-forest/70 mb-1">Access to children & pets:</p>
                    <p className="text-sm text-forest font-medium">{getSelectedNames()}</p>
                    <p className="text-xs text-forest/50 mt-1">Guardians automatically get access to all homes linked to these children.</p>
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
                <h2 className="font-bold text-forest text-lg">Invite a Guardian</h2>
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
                Guardians have full access to manage children and all their homes.
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {/* Children Selection */}
                {children.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Children <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-textSub mb-3">
                            Select which children this guardian will have access to.
                        </p>
                        <div className="space-y-2">
                            {children.map((c) => {
                                const isSelected = selectedChildIds.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleToggleChild(c.id)}
                                        className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                                            isSelected
                                                ? "bg-softGreen/50 border-forest/20"
                                                : "bg-white border-border hover:border-forest/30"
                                        }`}
                                    >
                                        {/* Checkbox indicator */}
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                            isSelected ? "border-forest bg-forest" : "border-textSub"
                                        }`}>
                                            {isSelected && (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className={`text-sm font-medium flex-1 text-left ${isSelected ? "text-forest" : "text-textSub"}`}>
                                            {c.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pets Selection */}
                {pets.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Pets
                        </label>
                        <p className="text-xs text-textSub mb-3">
                            Optionally select which pets this guardian will have access to.
                        </p>
                        <div className="space-y-2">
                            {pets.map((p) => {
                                const isSelected = selectedPetIds.includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleTogglePet(p.id)}
                                        className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                                            isSelected
                                                ? "bg-softGreen/50 border-forest/20"
                                                : "bg-white border-border hover:border-forest/30"
                                        }`}
                                    >
                                        {/* Checkbox indicator */}
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                            isSelected ? "border-forest bg-forest" : "border-textSub"
                                        }`}>
                                            {isSelected && (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className={`text-sm font-medium flex-1 text-left ${isSelected ? "text-forest" : "text-textSub"}`}>
                                            {p.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                        placeholder="e.g., John Smith"
                    />
                </div>

                {/* Only show "what do children call them" field if at least one child is selected */}
                {selectedChildIds.length > 0 && (
                    <div>
                        <label htmlFor="invitee-label" className="block text-sm font-semibold text-forest mb-1.5">
                            {selectedChildIds.length === 1
                                ? `How does ${children.find(c => c.id === selectedChildIds[0])?.name || "your child"} call them?`
                                : "How do the children call them?"}
                        </label>
                        <input
                            id="invitee-label"
                            type="text"
                            value={inviteLabel}
                            onChange={(e) => setInviteLabel(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                            placeholder='e.g., "Daddy", "Mommy", "Papa"'
                        />
                        <p className="text-xs text-textSub mt-1">
                            {selectedChildIds.length === 1
                                ? `This name will be shown throughout ${children.find(c => c.id === selectedChildIds[0])?.name || "your child"}'s space.`
                                : "This name will be shown throughout the children's spaces."}
                        </p>
                    </div>
                )}

                <div>
                    <label htmlFor="invitee-role" className="block text-sm font-semibold text-forest mb-1.5">
                        Role
                    </label>
                    <MobileSelect
                        value={inviteRole}
                        onChange={setInviteRole}
                        options={GUARDIAN_ROLE_OPTIONS}
                        placeholder="Select role..."
                        title="Select role"
                    />
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
                    disabled={generatingInvite || !inviteName.trim() || !inviteRole || (selectedChildIds.length === 0 && selectedPetIds.length === 0)}
                    className="btn-primary flex-1 disabled:opacity-50"
                >
                    {generatingInvite ? "Creating..." : "Create Invite"}
                </button>
            </div>
        </div>
    );
}
