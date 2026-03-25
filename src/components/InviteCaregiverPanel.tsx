"use client";

import React, { useState, useEffect, useMemo } from "react";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { QRCodeSVG } from "qrcode.react";
// MobileSelect removed - using checkboxes for multi-select roles

interface InviteCaregiverPanelProps {
    onClose: () => void;
    onSuccess?: () => void;
}

// Base roles (always available when something is selected)
const BASE_ROLES = [
    { value: "family_member", label: "Family member" },
    { value: "family_friend", label: "Family friend" },
    { value: "other", label: "Other" },
];

// Child-specific roles (only shown when children are selected)
const CHILD_ROLES = [
    { value: "nanny", label: "Nanny" },
    { value: "babysitter", label: "Babysitter" },
];

// Pet-specific roles (only shown when pets are selected)
const PET_ROLES = [
    { value: "pet_sitter", label: "Pet sitter" },
];

// Track invite link data outside component to survive re-renders
let pendingInviteData: {
    token: string;
    name: string;
    label: string;
    roles: string[];
    homeIds: string[];
    childIds: string[];
    petIds: string[];
} | null = null;

export default function InviteCaregiverPanel({ onClose, onSuccess }: InviteCaregiverPanelProps) {
    const { user } = useAuth();
    const { child, children, pets, homes, childSpaces, refreshData } = useAppState();

    // Initialize from pending data if exists (survives re-renders from context updates)
    const [showInviteLink, setShowInviteLink] = useState(() => pendingInviteData !== null);
    const [inviteName, setInviteName] = useState(() => pendingInviteData?.name || "");
    const [inviteLabel, setInviteLabel] = useState(() => pendingInviteData?.label || "");
    const [selectedRoles, setSelectedRoles] = useState<string[]>(() => pendingInviteData?.roles || []);
    const [inviteToken, setInviteToken] = useState(() => pendingInviteData?.token || "");

    // Home selection - REQUIRED, can select multiple homes
    const [selectedHomeIds, setSelectedHomeIds] = useState<string[]>(() => {
        if (pendingInviteData?.homeIds) return pendingInviteData.homeIds;
        // If only one home, auto-select it
        return homes.length === 1 ? [homes[0].id] : [];
    });

    // Children/Pet selection - helpers select which children/pets they can access at that home
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>(() => {
        return pendingInviteData?.childIds || [];
    });
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>(() => {
        return pendingInviteData?.petIds || [];
    });

    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Pet spaces data - maps pets to homes
    const [petSpaces, setPetSpaces] = useState<{ petId: string; homeId: string }[]>([]);

    // Fetch pet_spaces for the user's pets
    useEffect(() => {
        const fetchPetSpaces = async () => {
            if (pets.length === 0) {
                setPetSpaces([]);
                return;
            }

            const { data, error } = await supabase
                .from("pet_spaces")
                .select("pet_id, home_id")
                .in("pet_id", pets.map(p => p.id))
                .eq("status", "active");

            if (!error && data) {
                setPetSpaces(data.map(ps => ({ petId: ps.pet_id, homeId: ps.home_id })));
            } else if (error) {
                console.error("Error fetching pet_spaces:", error);
            }
        };

        fetchPetSpaces();
    }, [pets]);

    // Filter children based on selected homes - only show children that have a space at one of the selected homes
    const filteredChildren = selectedHomeIds.length > 0
        ? children.filter(c =>
            childSpaces.some(cs =>
                cs.childId === c.id &&
                selectedHomeIds.includes(cs.homeId) &&
                cs.status === 'active'
            )
        )
        : [];

    // Filter pets based on selected homes - only show pets that have a pet_space at the selected home(s)
    const filteredPets = selectedHomeIds.length > 0
        ? pets.filter(p => petSpaces.some(ps => ps.petId === p.id && selectedHomeIds.includes(ps.homeId)))
        : [];

    // Compute available roles based on children/pets selection
    const availableRoles = useMemo(() => {
        const roles: { value: string; label: string }[] = [];

        // Add child-specific roles if children are selected
        if (selectedChildIds.length > 0) {
            roles.push(...CHILD_ROLES);
        }

        // Add pet-specific roles if pets are selected
        if (selectedPetIds.length > 0) {
            roles.push(...PET_ROLES);
        }

        // Always add base roles at the end
        roles.push(...BASE_ROLES);

        return roles;
    }, [selectedChildIds.length, selectedPetIds.length]);

    // Clear invalid roles when selection changes (e.g., if pet_sitter selected but then pets unselected)
    useEffect(() => {
        const validRoleValues = availableRoles.map(r => r.value);
        setSelectedRoles(prev => prev.filter(role => validRoleValues.includes(role)));
    }, [availableRoles]);

    // Toggle role selection
    const handleToggleRole = (roleValue: string) => {
        setSelectedRoles(prev =>
            prev.includes(roleValue)
                ? prev.filter(r => r !== roleValue)
                : [...prev, roleValue]
        );
    };

    // Toggle home selection (multi-select)
    const handleToggleHome = (homeId: string) => {
        const newHomeIds = selectedHomeIds.includes(homeId)
            ? selectedHomeIds.filter(id => id !== homeId)
            : [...selectedHomeIds, homeId];

        setSelectedHomeIds(newHomeIds);

        // Clear any selected children that are no longer valid for the new home selection
        if (newHomeIds.length > 0) {
            const validChildIds = children
                .filter(c =>
                    childSpaces.some(cs =>
                        cs.childId === c.id &&
                        newHomeIds.includes(cs.homeId) &&
                        cs.status === 'active'
                    )
                )
                .map(c => c.id);

            setSelectedChildIds(prev => prev.filter(id => validChildIds.includes(id)));

            // Clear any selected pets that are no longer valid for the new home selection
            const validPetIds = pets
                .filter(p => petSpaces.some(ps => ps.petId === p.id && newHomeIds.includes(ps.homeId)))
                .map(p => p.id);
            setSelectedPetIds(prev => prev.filter(id => validPetIds.includes(id)));
        } else {
            // No homes selected, clear all selections
            setSelectedChildIds([]);
            setSelectedPetIds([]);
        }
    };

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
        // Validate home selection FIRST (helpers are home-scoped)
        if (selectedHomeIds.length === 0) {
            setError("Please select at least one home this helper will have access to");
            return;
        }

        // Validate at least one child or pet is selected (from available ones at the selected homes)
        const hasAvailableChildren = filteredChildren.length > 0;
        const hasAvailablePets = filteredPets.length > 0;

        if (selectedChildIds.length === 0 && selectedPetIds.length === 0) {
            if (hasAvailableChildren || hasAvailablePets) {
                setError("Please select at least one child or pet for this helper to have access to");
            } else {
                setError("No children or pets are linked to the selected home(s). Please link them first.");
            }
            return;
        }

        if (!inviteName.trim()) {
            setError("Please enter their full name");
            return;
        }

        if (selectedRoles.length === 0) {
            setError("Please select at least one role");
            return;
        }

        try {
            setGeneratingInvite(true);
            setError("");

            // Generate short invite token (8 chars, ~218 trillion combinations)
            const newToken = nanoid(8);

            // Build invite data for helper (home-scoped)
            const inviteData: Record<string, unknown> = {
                child_id: selectedChildIds[0] || child?.id, // Primary child for backward compat
                invited_by: user?.id,
                token: newToken,
                status: "pending",
                invitee_name: inviteName.trim(),
                invitee_label: inviteLabel.trim() || inviteName.trim(), // Fall back to name if not provided
                invitee_role: selectedRoles[0] || null, // Primary role for backward compat
                has_own_home: false, // Helpers don't create their own home
                home_id: selectedHomeIds[0], // Primary home for backward compat
                invite_type: "helper", // Mark as helper invite (home-scoped)
            };

            // Try to include new array columns if they exist
            let { error: insertError } = await supabase.from("invites").insert({
                ...inviteData,
                selected_child_ids: selectedChildIds,
                selected_pet_ids: selectedPetIds,
                invitee_roles: selectedRoles, // New: multiple roles
            });

            // If columns don't exist, retry without them
            if (insertError?.message?.includes("selected_child_ids") || insertError?.message?.includes("selected_pet_ids") || insertError?.message?.includes("invitee_roles")) {
                console.log("Array columns not found, inserting without them");
                const result = await supabase.from("invites").insert(inviteData);
                insertError = result.error;
            }

            if (insertError) throw insertError;

            // Store data outside component to survive re-renders
            pendingInviteData = {
                token: newToken,
                name: inviteName.trim(),
                label: inviteLabel.trim(),
                roles: selectedRoles,
                homeIds: selectedHomeIds,
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
        setSelectedRoles([]);
        setSelectedHomeIds(homes.length === 1 ? [homes[0].id] : []);
        setSelectedChildIds([]);
        setSelectedPetIds([]);
        setError("");
        onClose();
    };

    // Get home names for display
    const getSelectedHomeNames = () => {
        const homeIds = pendingInviteData?.homeIds || selectedHomeIds;
        const homeNames = homeIds
            .map(id => homes.find(h => h.id === id)?.name)
            .filter(Boolean);
        if (homeNames.length === 0) return "No homes selected";
        return homeNames.join(", ");
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
                    Send this link to <strong>{inviteName}</strong> so they can help care for your family.
                </p>

                {/* Show access summary */}
                <div className="bg-cream/50 rounded-xl px-4 py-3 space-y-2">
                    <div>
                        <p className="text-xs text-forest/70">Home access:</p>
                        <p className="text-sm text-forest font-medium">{getSelectedHomeNames()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-forest/70">Children & pets:</p>
                        <p className="text-sm text-forest font-medium">{getSelectedNames()}</p>
                    </div>
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
                <h2 className="font-bold text-forest text-lg">Invite a Helper</h2>
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
                Helpers have access to a single home and selected children/pets only.
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {/* Home Selection - REQUIRED FIRST for helpers (can select multiple) */}
                <div>
                    <label className="block text-sm font-semibold text-forest mb-1.5">
                        Homes <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-textSub mb-3">
                        Select which homes this helper will have access to.
                    </p>

                    {homes.length === 0 ? (
                        <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
                            You need to create a home first before inviting a helper.
                        </p>
                    ) : homes.length === 1 ? (
                        // Single home - auto-selected, show as info
                        <div className="bg-softGreen/50 border border-forest/20 rounded-xl p-3 flex items-center gap-2">
                            <div className="w-4 h-4 rounded border-2 flex items-center justify-center border-forest bg-forest">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest flex-shrink-0">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span className="text-sm font-medium text-forest">{homes[0].name}</span>
                        </div>
                    ) : (
                        // Multiple homes - checkbox selection (multi-select)
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
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 ${isSelected ? "text-forest" : "text-textSub"}`}>
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                        <span className={`text-sm font-medium flex-1 text-left ${isSelected ? "text-forest" : "text-textSub"}`}>
                                            {home.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Children Selection - only show after home is selected, filtered by home */}
                {selectedHomeIds.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Children <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-textSub mb-3">
                            Select which children this helper can access at the selected home{selectedHomeIds.length > 1 ? "s" : ""}.
                        </p>
                        {filteredChildren.length === 0 ? (
                            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
                                No children are linked to the selected home{selectedHomeIds.length > 1 ? "s" : ""}. You may need to add children to this home first.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {filteredChildren.map((c) => {
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
                        )}
                    </div>
                )}

                {/* Pets Selection - show after home is selected, filtered by home */}
                {selectedHomeIds.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Pets
                        </label>
                        <p className="text-xs text-textSub mb-3">
                            Optionally select which pets this helper can care for at the selected home{selectedHomeIds.length > 1 ? "s" : ""}.
                        </p>
                        {filteredPets.length === 0 ? (
                            <p className="text-sm text-textSub/70 bg-cream/50 rounded-xl p-3">
                                No pets are linked to the selected home{selectedHomeIds.length > 1 ? "s" : ""}.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {filteredPets.map((p) => {
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
                        )}
                    </div>
                )}

                {/* Full name */}
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

                {/* "How does child call them?" - only show if children selected */}
                {selectedChildIds.length > 0 && (
                    <div>
                        <label htmlFor="invitee-label" className="block text-sm font-semibold text-forest mb-1.5">
                            {selectedChildIds.length === 1
                                ? `How does ${filteredChildren.find(c => c.id === selectedChildIds[0])?.name || "your child"} call them?`
                                : "How do the children call them?"}
                        </label>
                        <input
                            id="invitee-label"
                            type="text"
                            value={inviteLabel}
                            onChange={(e) => setInviteLabel(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                            placeholder='e.g., "Miss Sarah", "Grandma", "Aunt Lisa"'
                        />
                        <p className="text-xs text-textSub mt-1">
                            {selectedChildIds.length === 1
                                ? `This name will be shown throughout ${filteredChildren.find(c => c.id === selectedChildIds[0])?.name || "your child"}'s space.`
                                : "This name will be shown throughout the children's spaces."}
                        </p>
                    </div>
                )}

                {/* Role - only show after children or pets are selected */}
                {(selectedChildIds.length > 0 || selectedPetIds.length > 0) && (
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-textSub mb-3">
                            Select one or more roles for this helper.
                        </p>
                        <div className="space-y-2">
                            {availableRoles.map((role) => {
                                const isSelected = selectedRoles.includes(role.value);
                                return (
                                    <button
                                        key={role.value}
                                        type="button"
                                        onClick={() => handleToggleRole(role.value)}
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
                                            {role.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
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
                    disabled={
                        generatingInvite ||
                        !inviteName.trim() ||
                        selectedRoles.length === 0 ||
                        selectedHomeIds.length === 0 ||
                        (selectedChildIds.length === 0 && selectedPetIds.length === 0)
                    }
                    className="btn-primary flex-1 disabled:opacity-50"
                >
                    {generatingInvite ? "Creating..." : "Create Invite"}
                </button>
            </div>
        </div>
    );
}
