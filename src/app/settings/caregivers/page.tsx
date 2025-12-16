"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import MobileSelect from "@/components/MobileSelect";
import InviteCaregiverPanel from "@/components/InviteCaregiverPanel";
import CaregiverStatusPill from "@/components/caregivers/CaregiverStatusPill";
import CaregiverConfirmDialog, { CaregiverAction } from "@/components/caregivers/CaregiverConfirmDialog";
import HomeSelectionDialog from "@/components/caregivers/HomeSelectionDialog";
import { useAuth } from "@/lib/AuthContext";
import { useAppState, CaregiverProfile, HomeProfile, ChildRoleMapping } from "@/lib/AppStateContext";
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

// Helper to format role label
const getRoleLabel = (role: string): string => {
    const option = ROLE_OPTIONS.find(r => r.value === role);
    return option?.label || role || "Caregiver";
};

// Helper to format child roles for display
// Returns something like "Parent of June & Elodie" or "Parent of Elodie, Step-parent of June"
const formatChildRoles = (childRoles: ChildRoleMapping[] | undefined): string => {
    if (!childRoles || childRoles.length === 0) return "";
    
    // Group by role
    const roleGroups: Record<string, string[]> = {};
    for (const cr of childRoles) {
        const roleLabel = getRoleLabel(cr.role);
        if (!roleGroups[roleLabel]) {
            roleGroups[roleLabel] = [];
        }
        roleGroups[roleLabel].push(cr.childName);
    }
    
    // Format each role group
    const parts: string[] = [];
    for (const [role, names] of Object.entries(roleGroups)) {
        if (names.length <= 3) {
            // Show all names: "Parent of June & Elodie"
            const nameStr = names.length === 1 
                ? names[0] 
                : names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
            parts.push(`${role} of ${nameStr}`);
        } else {
            // Show first 3 names + count: "Parent of June, Elodie, Max & +3 more"
            const shown = names.slice(0, 3).join(", ");
            const remaining = names.length - 3;
            parts.push(`${role} of ${shown} & +${remaining} more`);
        }
    }
    
    return parts.join(", ");
};

export default function CaregiversPage() {
    useEnsureOnboarding();

    const { user, loading: authLoading } = useAuth();
    const { child, children, caregivers, homes, refreshData, isLoaded, currentUserPermissions, getHomeChildrenWithStatus, currentChildId, accessibleHomes } = useAppState();
    const searchParams = useSearchParams();
    
    // Check if user has home access (inactive users shouldn't see caregiver details)
    const hasHomeAccess = accessibleHomes.length > 0;
    
    // Check if current user is a guardian (can edit) or helper (read-only)
    const isGuardian = currentUserPermissions.isGuardian;

    const [expandedCaregiverId, setExpandedCaregiverId] = useState<string | null>(null);
    const [editingCaregiverId, setEditingCaregiverId] = useState<string | null>(null);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Check for invite query parameter on mount
    useEffect(() => {
        if (searchParams.get('invite') === 'true') {
            setShowInviteForm(true);
        }
    }, [searchParams]);

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
    
    // Visible children state - derived from caregiver's home connections
    const [visibleChildrenByCaregiver, setVisibleChildrenByCaregiver] = useState<
        Record<string, { id: string; name: string; avatarUrl?: string }[]>
    >({});
    const [loadingChildrenFor, setLoadingChildrenFor] = useState<string | null>(null);
    
    // Other caregivers state - caregivers in account not connected to this child
    type OtherCaregiverChildRole = { childName: string; role: string };
    type OtherCaregiver = {
        id: string;
        name: string;
        label: string;
        avatarUrl?: string;
        avatarInitials: string;
        avatarColor: string;
        childRoles: OtherCaregiverChildRole[]; // role per child this caregiver IS connected to
    };
    const [otherCaregivers, setOtherCaregivers] = useState<OtherCaregiver[]>([]);
    const [loadingOtherCaregivers, setLoadingOtherCaregivers] = useState(false);
    
    // Adding caregiver state
    const [addingCaregiverId, setAddingCaregiverId] = useState<string | null>(null);
    
    // Role picker modal state
    const [rolePickerModal, setRolePickerModal] = useState<{
        isOpen: boolean;
        caregiver: OtherCaregiver | null;
        selectedRole: string;
        nickname: string;
    }>({ isOpen: false, caregiver: null, selectedRole: "", nickname: "" });
    
    // Trigger to force refresh otherCaregivers
    const [otherCaregiversRefreshTrigger, setOtherCaregiversRefreshTrigger] = useState(0);

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

    // Helper function to derive visible children from caregiver's accessible homes
    const loadVisibleChildrenForCaregiver = async (caregiverId: string, homeIds: string[]) => {
        if (homeIds.length === 0) {
            setVisibleChildrenByCaregiver(prev => ({ ...prev, [caregiverId]: [] }));
            return;
        }
        
        setLoadingChildrenFor(caregiverId);
        try {
            const childrenMap = new Map<string, { id: string; name: string; avatarUrl?: string }>();
            
            // Get children from each home the caregiver has access to
            for (const homeId of homeIds) {
                const homeChildren = await getHomeChildrenWithStatus(homeId);
                for (const child of homeChildren.filter(c => c.status === 'active')) {
                    if (!childrenMap.has(child.childId)) {
                        childrenMap.set(child.childId, {
                            id: child.childId,
                            name: child.childName,
                            avatarUrl: child.childAvatarUrl
                        });
                    }
                }
            }
            
            setVisibleChildrenByCaregiver(prev => ({
                ...prev,
                [caregiverId]: Array.from(childrenMap.values())
            }));
        } catch (err) {
            console.error("Error loading visible children:", err);
            setVisibleChildrenByCaregiver(prev => ({ ...prev, [caregiverId]: [] }));
        } finally {
            setLoadingChildrenFor(null);
        }
    };
    
    // Load visible children when a caregiver card is expanded
    useEffect(() => {
        if (expandedCaregiverId) {
            const caregiver = caregivers.find(c => c.id === expandedCaregiverId);
            if (caregiver && !visibleChildrenByCaregiver[expandedCaregiverId]) {
                loadVisibleChildrenForCaregiver(expandedCaregiverId, caregiver.accessibleHomeIds || []);
            }
        }
    }, [expandedCaregiverId, caregivers]);

    // Load other caregivers (caregivers in account not connected to this child)
    useEffect(() => {
        const loadOtherCaregivers = async () => {
            if (!currentChildId || !user) return;
            
            setLoadingOtherCaregivers(true);
            try {
                // Get IDs of caregivers already connected to this child
                const connectedCaregiverIds = new Set(caregivers.map(c => c.id));
                
                // Get all child_access records in the account (for all children the user can see)
                // This gives us all caregivers across all children
                const childIds = children.map(c => c.id);
                if (childIds.length === 0) {
                    setOtherCaregivers([]);
                    return;
                }
                
                const { data: allChildAccess, error: accessError } = await supabase
                    .from("child_access")
                    .select(`
                        user_id,
                        child_id,
                        role_type,
                        helper_type,
                        profiles (
                            id,
                            name,
                            label,
                            avatar_initials,
                            avatar_color,
                            avatar_url
                        )
                    `)
                    .in("child_id", childIds);
                
                if (accessError) {
                    console.error("Error fetching all child_access:", accessError);
                    return;
                }
                
                // Build map of caregivers with their connected children and roles
                const caregiverMap = new Map<string, OtherCaregiver>();
                
                // Helper to get role label
                const getRoleLabelForAccess = (ca: any): string => {
                    if (ca.role_type === "guardian") {
                        return "Parent";
                    } else if (ca.helper_type) {
                        const helperLabels: Record<string, string> = {
                            "nanny": "Nanny",
                            "babysitter": "Babysitter",
                            "family_member": "Family member",
                            "family_friend": "Family friend",
                            "friend": "Family friend", // DB stores "friend" for family_friend
                            "other": "Helper"
                        };
                        return helperLabels[ca.helper_type] || "Helper";
                    }
                    return "Caregiver";
                };
                
                for (const ca of (allChildAccess || []) as any[]) {
                    if (!ca.profiles) continue;
                    
                    // Skip if this caregiver is already connected to the current child
                    if (connectedCaregiverIds.has(ca.user_id)) continue;
                    
                    const profile = ca.profiles;
                    const childName = children.find(c => c.id === ca.child_id)?.name || "Unknown";
                    const roleLabel = getRoleLabelForAccess(ca);
                    
                    if (caregiverMap.has(ca.user_id)) {
                        // Add child-role to existing caregiver's list
                        const existing = caregiverMap.get(ca.user_id)!;
                        const alreadyHasChild = existing.childRoles.some(cr => cr.childName === childName);
                        if (!alreadyHasChild) {
                            existing.childRoles.push({ childName, role: roleLabel });
                        }
                    } else {
                        // Get avatar URL if exists
                        let avatarUrl: string | undefined;
                        if (profile.avatar_url) {
                            const { data: urlData } = await supabase.storage
                                .from("avatars")
                                .createSignedUrl(profile.avatar_url, 3600);
                            avatarUrl = urlData?.signedUrl;
                        }
                        
                        const displayName = profile.label || profile.name || "Unknown";
                        const initials = profile.avatar_initials || displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                        
                        // Generate consistent color
                        const colors = ["#6B7280", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];
                        const colorIndex = profile.id.charCodeAt(0) % colors.length;
                        
                        caregiverMap.set(ca.user_id, {
                            id: ca.user_id,
                            name: profile.name || "Unknown",
                            label: displayName,
                            avatarUrl,
                            avatarInitials: initials,
                            avatarColor: profile.avatar_color || colors[colorIndex],
                            childRoles: [{ childName, role: roleLabel }]
                        });
                    }
                }
                
                setOtherCaregivers(Array.from(caregiverMap.values()));
            } catch (err) {
                console.error("Error loading other caregivers:", err);
            } finally {
                setLoadingOtherCaregivers(false);
            }
        };
        
        loadOtherCaregivers();
    }, [currentChildId, user, children, caregivers, otherCaregiversRefreshTrigger]);

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

    // Helper to map role selection to helper_type (DB constraint: family_member, friend, nanny)
    const mapRoleToHelperType = (role: string): string => {
        switch (role) {
            case "nanny": return "nanny";
            case "babysitter": return "nanny"; // map babysitter to nanny
            case "family_member": return "family_member";
            case "family_friend": return "friend";
            default: return "friend";
        }
    };
    
    // Add caregiver directly to this child (creates child_access record)
    // Role determines permissions: guardian = manage, helper = view
    // Home access is always explicit - they start as inactive until added to homes
    const handleAddCaregiverToChild = async (caregiver: OtherCaregiver, selectedRole: string, nickname?: string) => {
        if (!currentChildId) return;

        setAddingCaregiverId(caregiver.id);
        try {
            // Determine role type based on selection
            const isGuardianRole = selectedRole === "parent" || selectedRole === "step_parent";
            const roleType = isGuardianRole ? "guardian" : "helper";
            const helperType = isGuardianRole ? null : mapRoleToHelperType(selectedRole);
            const accessLevel = isGuardianRole ? "manage" : "view";

            // Create child_access record with selected role and optional nickname
            // They start as "inactive" (no home overlap) regardless of role
            // Home access must be explicitly granted later
            const accessData: Record<string, unknown> = {
                user_id: caregiver.id,
                child_id: currentChildId,
                role_type: roleType,
                helper_type: helperType,
                access_level: accessLevel
            };
            
            // Add nickname (label) if provided
            if (nickname?.trim()) {
                accessData.label = nickname.trim();
            }

            const { error: accessError } = await supabase
                .from("child_access")
                .upsert(accessData, { onConflict: "user_id,child_id" });

            if (accessError) {
                console.error("Error creating child access:", accessError);
                throw accessError;
            }

            // Close role picker modal
            setRolePickerModal({ isOpen: false, caregiver: null, selectedRole: "", nickname: "" });

            // Refresh data and trigger otherCaregivers refresh
            await refreshData();
            setOtherCaregiversRefreshTrigger(prev => prev + 1);

            const roleLabel = ROLE_OPTIONS.find(r => r.value === selectedRole)?.label || selectedRole;
            showToast(`${caregiver.label} added as ${roleLabel} (inactive until added to a home)`);
        } catch (err: any) {
            console.error("Error adding caregiver to child:", err);
            showToast(err.message || "Failed to add caregiver", true);
        } finally {
            setAddingCaregiverId(null);
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

    // Disable caregiver access - remove from child_space_access and home_memberships (V2)
    const disableCaregiverAccess = async (caregiverId: string) => {
        if (!child) throw new Error("No child context");

        console.log("🔧 Disabling caregiver (V2):", caregiverId, "for child:", child.id);

        // Remove from child_space_access for this child's spaces
        const { data: childSpaces } = await supabase
            .from("child_spaces")
            .select("id, home_id")
            .eq("child_id", child.id);

        if (childSpaces && childSpaces.length > 0) {
            const childSpaceIds = childSpaces.map(cs => cs.id);
            const homeIds = childSpaces.map(cs => cs.home_id);

            // Remove from child_space_access
            const { error: csaError } = await supabase
                .from("child_space_access")
                .delete()
                .eq("user_id", caregiverId)
                .in("child_space_id", childSpaceIds);

            if (csaError) {
                console.log("🔧 child_space_access delete error:", csaError);
            } else {
                console.log("🔧 Removed from child_space_access");
            }

            // Remove from home_memberships
            const { error: hmError } = await supabase
                .from("home_memberships")
                .delete()
                .eq("user_id", caregiverId)
                .in("home_id", homeIds);

            if (hmError) {
                console.log("🔧 home_memberships delete error:", hmError);
            } else {
                console.log("🔧 Removed from home_memberships");
            }
        }

        console.log("🔧 Refreshing data...");
        await refreshData();
    };

    // Enable caregiver access - add to child_space_access and home_memberships (V2)
    const handleEnableAccess = async (selectedHomeIds: string[]) => {
        const caregiver = homeSelectionDialog.caregiver;
        if (!caregiver || selectedHomeIds.length === 0 || !child) return;

        try {
            setSaving(true);

            // Get child_spaces for selected homes
            const { data: childSpaces } = await supabase
                .from("child_spaces")
                .select("id, home_id")
                .eq("child_id", child.id)
                .in("home_id", selectedHomeIds);

            if (childSpaces) {
                // Add to child_space_access
                for (const cs of childSpaces) {
                    await supabase
                        .from("child_space_access")
                        .upsert({ child_space_id: cs.id, user_id: caregiver.id })
                        .select();
                }
            }

            // Add to home_memberships
            for (const homeId of selectedHomeIds) {
                await supabase
                    .from("home_memberships")
                    .upsert({ home_id: homeId, user_id: caregiver.id })
                    .select();
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

    // Remove caregiver from child entirely (V2)
    const removeCaregiver = async (caregiver: CaregiverProfile) => {
        if (!child) throw new Error("No child context");

        console.log("🔧 Removing caregiver (V2):", caregiver.id, "from child:", child.id);

        // Get child's spaces and homes
        const { data: childSpaces } = await supabase
            .from("child_spaces")
            .select("id, home_id")
            .eq("child_id", child.id);

        if (childSpaces && childSpaces.length > 0) {
            const childSpaceIds = childSpaces.map(cs => cs.id);
            const homeIds = childSpaces.map(cs => cs.home_id);

            // Remove from child_space_access
            await supabase
                .from("child_space_access")
                .delete()
                .eq("user_id", caregiver.id)
                .in("child_space_id", childSpaceIds);

            // Remove from home_memberships
            await supabase
                .from("home_memberships")
                .delete()
                .eq("user_id", caregiver.id)
                .in("home_id", homeIds);
        }

        // Remove from child_guardians
        await supabase
            .from("child_guardians")
            .delete()
            .eq("user_id", caregiver.id)
            .eq("child_id", child.id);

        // Remove from child_permission_overrides
        await supabase
            .from("child_permission_overrides")
            .delete()
            .eq("user_id", caregiver.id)
            .eq("child_id", child.id);

        // Remove from child_access
        await supabase
            .from("child_access")
            .delete()
            .eq("user_id", caregiver.id)
            .eq("child_id", child.id);

        console.log("🔧 Caregiver removed, refreshing...");
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

    // Add caregiver to a home (V2)
    const handleAddToHome = async (caregiverId: string, homeId: string) => {
        if (!child) return;
        
        try {
            // Get child_space for this home
            const { data: childSpace } = await supabase
                .from("child_spaces")
                .select("id")
                .eq("child_id", child.id)
                .eq("home_id", homeId)
                .single();

            if (childSpace) {
                // Add to child_space_access
                await supabase
                    .from("child_space_access")
                    .upsert({ child_space_id: childSpace.id, user_id: caregiverId });
            }

            // Add to home_memberships
            await supabase
                .from("home_memberships")
                .upsert({ home_id: homeId, user_id: caregiverId });

            await refreshData();
        } catch (err: any) {
            console.error("Error adding caregiver to home:", err);
            showToast(err.message || "Failed to add to home", true);
        }
    };

    // Remove caregiver from a home (V2)
    const handleRemoveFromHome = async (caregiverId: string, homeId: string) => {
        if (!child) return;
        
        try {
            // Get child_space for this home
            const { data: childSpace } = await supabase
                .from("child_spaces")
                .select("id")
                .eq("child_id", child.id)
                .eq("home_id", homeId)
                .single();

            if (childSpace) {
                // Remove from child_space_access
                await supabase
                    .from("child_space_access")
                    .delete()
                    .eq("child_space_id", childSpace.id)
                    .eq("user_id", caregiverId);
            }

            // Remove from home_memberships
            await supabase
                .from("home_memberships")
                .delete()
                .eq("home_id", homeId)
                .eq("user_id", caregiverId);

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

            // Try invites first (V2 model), then fall back to invites (V1 model)
            const { error: v2Error } = await supabase
                .from("invites")
                .delete()
                .eq("id", inviteId);

            if (v2Error) {
                // Try V1 table
                const { error: v1Error } = await supabase
                    .from("invites")
                    .delete()
                    .eq("id", inviteId);

                if (v1Error) throw v1Error;
            }

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
                                                <p className="text-xs text-forest/70 mt-0.5">
                                                    {getRoleLabel(caregiver.relationship)}{child?.name ? ` of ${child.name}` : ""}
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
                                    <MobileSelect
                                        value={formData.relationship}
                                        onChange={(value) => setFormData({ ...formData, relationship: value })}
                                        options={ROLE_OPTIONS}
                                        placeholder="Select role..."
                                        title="Select role"
                                    />
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
                                    <h4 className="text-sm font-semibold text-forest mb-2">Connected homes</h4>
                                    <p className="text-xs text-textSub mb-3">
                                        Homes this caregiver has access to.
                                    </p>
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
                                                    {isGuardian && !caregiver.isCurrentUser && (
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

                                        {/* Add to Home Dropdown - Guardian only */}
                                        {isGuardian && availableHomes.length > 0 && !caregiver.isCurrentUser && (
                                            <div className="pt-1">
                                                <MobileSelect
                                                    value=""
                                                    onChange={(value) => {
                                                        if (value) {
                                                            handleAddToHome(caregiver.id, value);
                                                        }
                                                    }}
                                                    options={availableHomes.map((home) => ({
                                                        value: home.id,
                                                        label: home.name
                                                    }))}
                                                    placeholder="+ Connect to a home"
                                                    title="Connect to a home"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Visible Children - Derived from home connections */}
                                <div>
                                    <h4 className="text-sm font-semibold text-forest mb-2">Visible children</h4>
                                    <p className="text-xs text-textSub mb-3">
                                        Children visible through home connections. {isGuardian && "Edit via Home or Child settings."}
                                    </p>
                                    <div className="space-y-2">
                                        {loadingChildrenFor === caregiver.id ? (
                                            <div className="flex items-center justify-center py-4">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-forest"></div>
                                            </div>
                                        ) : (visibleChildrenByCaregiver[caregiver.id] || []).length > 0 ? (
                                            (visibleChildrenByCaregiver[caregiver.id] || []).map((childInfo) => (
                                                <Link
                                                    key={childInfo.id}
                                                    href={`/settings/child/${childInfo.id}`}
                                                    className="flex items-center gap-2 p-2 rounded-lg bg-orange-50/50 hover:bg-orange-100/50 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                        {childInfo.avatarUrl ? (
                                                            <img 
                                                                src={childInfo.avatarUrl} 
                                                                alt={childInfo.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-orange-600 font-bold text-sm">
                                                                {childInfo.name?.charAt(0) || "?"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-forest flex-1">{childInfo.name}</span>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSub/50 flex-shrink-0">
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                </Link>
                                            ))
                                        ) : (
                                            <p className="text-sm text-textSub/60 italic">No children visible through current home connections</p>
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

                                {/* Actions - Guardian only */}
                                {isGuardian && (
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
                                )}
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
                    <h1 className="text-2xl font-dmSerif text-forest">
                        {hasHomeAccess ? `${child?.name || "Child"}'s Caregivers` : "Caregivers"}
                    </h1>
                    <p className="text-sm text-textSub">
                        {hasHomeAccess 
                            ? `Manage who has access to ${child?.name || "your child"}'s information.`
                            : "Manage who has access to your children's information."
                        }
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
                        {!hasHomeAccess 
                            ? "Add a child and set up a home to start inviting caregivers."
                            : isGuardian 
                                ? `Add parents, babysitters, and helpers so they can see the information they need for ${child?.name || "your child"}.`
                                : `View who has access to ${child?.name || "your child"}'s information.`
                        }
                    </p>
                    {hasHomeAccess && isGuardian && !showInviteForm && (
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

                {/* Invite Form - Guardian only */}
                {isGuardian && showInviteForm && (
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
                            These caregivers have no home access yet. Add them to a home to activate their access.
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
                        {pendingCaregivers.map((caregiver) => {
                            const roleDisplay = formatChildRoles(caregiver.childRoles);
                            return (
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
                                            {roleDisplay && (
                                                <p className="text-xs text-forest/70 mt-0.5">{roleDisplay}</p>
                                            )}
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
                                                    size={200}
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

                                        {/* Revoke action - Guardian only */}
                                        {isGuardian && (
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
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                        })}
                    </div>
                )}

                {/* Other Caregivers Section - caregivers in account not connected to this child */}
                {(otherCaregivers.length > 0 || loadingOtherCaregivers) && (
                    <div className="space-y-3 pt-2">
                        <div>
                            <h2 className="text-sm font-semibold text-forest flex items-center gap-2">
                                Other caregivers
                                {!loadingOtherCaregivers && (
                                    <span className="text-sm font-normal text-textSub">({otherCaregivers.length})</span>
                                )}
                            </h2>
                            <p className="text-xs text-textSub mt-1">
                                Caregivers in your account who aren't connected to {child?.name || "this child"} yet.
                            </p>
                        </div>

                        {loadingOtherCaregivers ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {otherCaregivers.map((caregiver) => (
                                    <div
                                        key={caregiver.id}
                                        className="card-organic p-4 flex items-center gap-4"
                                    >
                                        {/* Avatar */}
                                        <div 
                                            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                                            style={{ backgroundColor: caregiver.avatarUrl ? 'transparent' : caregiver.avatarColor }}
                                        >
                                            {caregiver.avatarUrl ? (
                                                <img 
                                                    src={caregiver.avatarUrl} 
                                                    alt={caregiver.label}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-white font-bold text-sm">
                                                    {caregiver.avatarInitials}
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-forest text-base truncate">{caregiver.label}</h3>
                                            {caregiver.name !== caregiver.label && (
                                                <p className="text-sm text-textSub truncate">{caregiver.name}</p>
                                            )}
                                            {caregiver.childRoles && caregiver.childRoles.length > 0 && (
                                                <p className="text-xs text-forest/70 mt-0.5">
                                                    {formatChildRoles(caregiver.childRoles)}
                                                </p>
                                            )}
                                        </div>

                                        {/* Add Button - Guardians only */}
                                        {isGuardian && (
                                            <button
                                                onClick={() => setRolePickerModal({ isOpen: true, caregiver, selectedRole: "", nickname: "" })}
                                                className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium hover:bg-forest/90 transition-colors flex-shrink-0"
                                            >
                                                Add to {child?.name || "child"}&apos;s caregivers
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Role Picker Modal */}
                {rolePickerModal.isOpen && rolePickerModal.caregiver && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                            <div className="p-4 border-b border-border/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-forest text-lg">
                                        Add {rolePickerModal.caregiver.label} to {child?.name || "child"}
                                    </h3>
                                    <button
                                        onClick={() => setRolePickerModal({ isOpen: false, caregiver: null, selectedRole: "", nickname: "" })}
                                        className="p-2 text-textSub hover:text-forest rounded-lg"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-4 space-y-5">
                                {/* Role Dropdown */}
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1.5">
                                        What is {rolePickerModal.caregiver.label}&apos;s relationship to {child?.name || "this child"}?
                                    </label>
                                    <MobileSelect
                                        value={rolePickerModal.selectedRole}
                                        onChange={(value) => setRolePickerModal(prev => ({ ...prev, selectedRole: value }))}
                                        options={[
                                            { value: "parent", label: "Parent", description: "Full access to manage child's information" },
                                            { value: "step_parent", label: "Step-parent", description: "Full access to manage child's information" },
                                            { value: "family_member", label: "Family member", description: "Can view child's information" },
                                            { value: "nanny", label: "Nanny", description: "Can view and contribute to child's information" },
                                            { value: "babysitter", label: "Babysitter", description: "Can view child's information" },
                                            { value: "family_friend", label: "Family friend", description: "Can view child's information" },
                                        ]}
                                        placeholder="Select relationship..."
                                        title="Select relationship"
                                    />
                                </div>

                                {/* Nickname Input */}
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1.5">
                                        How does {child?.name || "your child"} call them?
                                    </label>
                                    <input
                                        type="text"
                                        value={rolePickerModal.nickname}
                                        onChange={(e) => setRolePickerModal(prev => ({ ...prev, nickname: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 placeholder:text-gray-400"
                                        placeholder='e.g., "Daddy", "Grandma", "Aunt Lisa"'
                                    />
                                    <p className="text-xs text-textSub mt-1.5">
                                        This name will be shown throughout {child?.name || "your child"}&apos;s space.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 border-t border-border/30 flex gap-3">
                                <button
                                    onClick={() => setRolePickerModal({ isOpen: false, caregiver: null, selectedRole: "", nickname: "" })}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (rolePickerModal.caregiver && rolePickerModal.selectedRole) {
                                            handleAddCaregiverToChild(rolePickerModal.caregiver, rolePickerModal.selectedRole, rolePickerModal.nickname);
                                        }
                                    }}
                                    disabled={!rolePickerModal.selectedRole || addingCaregiverId === rolePickerModal.caregiver?.id}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {addingCaregiverId === rolePickerModal.caregiver?.id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                    ) : (
                                        "Add caregiver"
                                    )}
                                </button>
                            </div>
                        </div>
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
                        <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-forest flex items-center justify-center mt-0.5">
                            <span className="text-forest text-xs font-semibold leading-none">i</span>
                        </div>
                        <div>
                            <p className="text-sm text-forest font-medium mb-1">About Caregivers</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Caregivers get access through specific homes. Add or remove their home access to control what they can see for {child?.name || "this child"}.
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
