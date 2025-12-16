"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { useAppState, ChildHomeWithStatus, HomeProfile } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { processImageForUpload } from "@/lib/imageUtils";
import ImageCropper from "@/components/ImageCropper";
import Avatar from "@/components/Avatar";
import MobileMultiSelect from "@/components/MobileMultiSelect";

export default function ChildEditPage() {
    useEnsureOnboarding();

    const router = useRouter();
    const params = useParams();
    const childId = params.childId as string;
    
    const { user, loading: authLoading } = useAuth();
    const { 
        children, 
        refreshData, 
        isLoaded, 
        homes,
        currentUserPermissions,
        getChildHomesWithStatus, 
        toggleChildHomeStatus,
        linkChildToHome 
    } = useAppState();

    // Find the child from context
    const contextChild = children.find(c => c.id === childId);

    const [name, setName] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [gender, setGender] = useState<"boy" | "girl" | "">("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Connected Homes state
    const [connectedHomes, setConnectedHomes] = useState<ChildHomeWithStatus[]>([]);
    const [homesLoading, setHomesLoading] = useState(false);
    const [showInactiveHomes, setShowInactiveHomes] = useState(false);
    const [togglingHomeId, setTogglingHomeId] = useState<string | null>(null);
    const [showLinkHomeModal, setShowLinkHomeModal] = useState(false);
    
    // Connected Caregivers state (derived from active homes)
    type ConnectedCaregiver = {
        id: string;
        name: string;
        label: string;
        avatarUrl?: string;
        avatarInitials: string;
        avatarColor: string;
        role: string;
        viaHomes: { id: string; name: string }[];
    };
    const [connectedCaregivers, setConnectedCaregivers] = useState<ConnectedCaregiver[]>([]);
    const [caregiversLoading, setCaregiversLoading] = useState(false);

    useEffect(() => {
        if (contextChild) {
            setName(contextChild.name || "");
            loadChildData();
        }
    }, [contextChild]);
    
    // Load connected homes when childId changes
    useEffect(() => {
        const loadConnectedHomes = async () => {
            if (!childId) return;
            setHomesLoading(true);
            try {
                const homesData = await getChildHomesWithStatus(childId);
                setConnectedHomes(homesData);
            } catch (err) {
                console.error("Error loading connected homes:", err);
            } finally {
                setHomesLoading(false);
            }
        };
        loadConnectedHomes();
    }, [childId, getChildHomesWithStatus]);
    
    // Handle toggling a home's active status
    const handleToggleHomeStatus = async (homeId: string, currentStatus: 'active' | 'inactive') => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setTogglingHomeId(homeId);
        setError("");
        
        try {
            const result = await toggleChildHomeStatus(childId, homeId, newStatus);
            if (result.success) {
                // Refresh the connected homes list
                const homesData = await getChildHomesWithStatus(childId);
                setConnectedHomes(homesData);
                setSuccessMessage(newStatus === 'active' ? "Home connected!" : "Home disconnected");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setError(result.error || "Failed to update home connection");
            }
        } catch (err) {
            console.error("Error toggling home status:", err);
            setError("Failed to update home connection");
        } finally {
            setTogglingHomeId(null);
        }
    };
    
    // Handle linking a new home
    const handleLinkNewHome = async (homeId: string) => {
        setShowLinkHomeModal(false);
        setTogglingHomeId(homeId);
        setError("");
        
        try {
            const result = await linkChildToHome(childId, homeId);
            if (result.success) {
                const homesData = await getChildHomesWithStatus(childId);
                setConnectedHomes(homesData);
                setSuccessMessage("Home connected!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                setError(result.error || "Failed to link home");
            }
        } catch (err) {
            console.error("Error linking home:", err);
            setError("Failed to link home");
        } finally {
            setTogglingHomeId(null);
        }
    };
    
    // Get homes that can be linked (not already connected)
    const availableHomesToLink = homes.filter(
        home => !connectedHomes.some(ch => ch.homeId === home.id)
    );
    
    // Separate active and inactive homes
    const activeConnectedHomes = connectedHomes.filter(h => h.status === 'active');
    const inactiveConnectedHomes = connectedHomes.filter(h => h.status === 'inactive');
    
    // Create a stable key from active home IDs for useEffect dependencies
    // This ensures the effect re-runs when homes change, not just when count changes
    const activeHomeIdsKey = activeConnectedHomes.map(h => h.homeId).sort().join(',');
    
    // Load connected caregivers - derived from child_access (caregivers with access to this child)
    // and cross-referenced with active homes via child_space_access
    useEffect(() => {
        const loadConnectedCaregivers = async () => {
            if (!childId) {
                setConnectedCaregivers([]);
                return;
            }
            
            setCaregiversLoading(true);
            try {
                // 1. Query child_access for this child - this is the primary source of caregivers
                const { data: childAccessData, error: accessError } = await supabase
                    .from("child_access")
                    .select(`
                        user_id,
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
                    .eq("child_id", childId);
                
                if (accessError) {
                    console.error("Error fetching child_access:", accessError);
                    return;
                }
                
                if (!childAccessData || childAccessData.length === 0) {
                    setConnectedCaregivers([]);
                    return;
                }
                
                // 2. Get all child_spaces for this child (to map child_space_id -> home)
                const { data: childSpacesData } = await supabase
                    .from("child_spaces")
                    .select("id, home_id, status")
                    .eq("child_id", childId);
                
                const activeChildSpaceIds = childSpacesData
                    ?.filter(cs => cs.status === 'active')
                    .map(cs => cs.id) || [];
                
                // 3. Get child_space_access for all caregivers
                const userIds = childAccessData.map(ca => ca.user_id);
                const { data: spaceAccessData } = await supabase
                    .from("child_space_access")
                    .select("user_id, child_space_id")
                    .in("user_id", userIds)
                    .in("child_space_id", activeChildSpaceIds.length > 0 ? activeChildSpaceIds : ['none']);
                
                // Build caregiver list with their "Via homes"
                const caregiverList: ConnectedCaregiver[] = [];
                
                for (const ca of childAccessData as any[]) {
                    if (!ca.profiles) continue;
                    
                    const profile = ca.profiles;
                    
                    // Determine which homes this caregiver can access
                    // - If user has explicit child_space_access records, use those
                    // - If user is a guardian with NO explicit records (legacy), give them all active homes
                    const userSpaceAccess = spaceAccessData?.filter(sa => sa.user_id === ca.user_id) || [];
                    
                    let accessibleChildSpaceIds: string[];
                    if (userSpaceAccess.length > 0) {
                        // User has explicit access records - use those
                        accessibleChildSpaceIds = userSpaceAccess.map(sa => sa.child_space_id);
                    } else if (ca.role_type === "guardian") {
                        // Legacy guardian with no explicit access - give all active homes
                        accessibleChildSpaceIds = activeChildSpaceIds;
                    } else {
                        // Helper with no access - skip (they can't see this child through any home)
                        continue;
                    }
                    
                    // Map child_space_ids to homes
                    const viaHomes: { id: string; name: string }[] = [];
                    for (const csId of accessibleChildSpaceIds) {
                        const childSpace = childSpacesData?.find(cs => cs.id === csId);
                        if (childSpace) {
                            const homeInfo = activeConnectedHomes.find(h => h.homeId === childSpace.home_id);
                            if (homeInfo && !viaHomes.some(h => h.id === homeInfo.homeId)) {
                                viaHomes.push({ id: homeInfo.homeId, name: homeInfo.homeName });
                            }
                        }
                    }
                    
                    // Skip caregivers with no overlapping homes
                    if (viaHomes.length === 0) continue;
                    
                    // Get role label
                    let roleLabel = "Caregiver";
                    if (ca.role_type === "guardian") {
                        roleLabel = "Parent";
                    } else if (ca.helper_type) {
                        const helperLabels: Record<string, string> = {
                            "nanny": "Nanny",
                            "babysitter": "Babysitter",
                            "family_member": "Family member",
                            "family_friend": "Family friend",
                            "friend": "Family friend", // DB stores "friend" for family_friend
                            "other": "Helper"
                        };
                        roleLabel = helperLabels[ca.helper_type] || "Helper";
                    }
                    
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
                    
                    // Use avatar_color from profile, or generate consistent color
                    const colors = ["#6B7280", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];
                    const colorIndex = profile.id.charCodeAt(0) % colors.length;
                    const avatarColor = profile.avatar_color || colors[colorIndex];
                    
                    caregiverList.push({
                        id: ca.user_id,
                        name: profile.name || "Unknown",
                        label: displayName,
                        avatarUrl,
                        avatarInitials: initials,
                        avatarColor,
                        role: roleLabel,
                        viaHomes
                    });
                }
                
                setConnectedCaregivers(caregiverList);
            } catch (err) {
                console.error("Error loading connected caregivers:", err);
            } finally {
                setCaregiversLoading(false);
            }
        };
        
        loadConnectedCaregivers();
    }, [childId, activeHomeIdsKey]);

    const loadChildData = async () => {
        if (!contextChild || !user) return;

        try {
            // Use child data from context
            if (contextChild.avatarUrl) {
                setAvatarUrl(contextChild.avatarUrl);
            }
            if (contextChild.dob) {
                setBirthdate(contextChild.dob);
            }

            // Try direct query to children table for additional data
            const { data: childData, error: childError } = await supabase
                .from("children")
                .select("id, name, dob, avatar_url, gender")
                .eq("id", childId)
                .single();

            if (childData) {
                if (childData.dob) {
                    setBirthdate(childData.dob);
                }
                if (childData.gender) {
                    setGender(childData.gender);
                }
                if (childData.avatar_url) {
                    const { data: urlData } = await supabase.storage
                        .from("avatars")
                        .createSignedUrl(childData.avatar_url, 3600);
                    if (urlData?.signedUrl) {
                        setAvatarUrl(urlData.signedUrl);
                    }
                }
            }
        } catch (err) {
            console.error("Error loading child data:", err);
        }
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];

        try {
            const imageUrl = URL.createObjectURL(file);
            setCropperImage(imageUrl);
        } catch (err) {
            console.error("Error creating object URL:", err);
            setError("Failed to load image. Please try again.");
        }

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!childId) return;

        try {
            setError("");
            setCropperImage(null);
            setUploading(true);

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Process cropped image: create original and display versions
            const croppedFile = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
            const processed = await processImageForUpload(croppedFile);

            const originalPath = `child-${childId}-${timestamp}-${random}_original.jpg`;
            const displayPath = `child-${childId}-${timestamp}-${random}_display.jpg`;

            // Upload original (full resolution)
            const { error: originalError } = await supabase.storage
                .from("avatars")
                .upload(originalPath, processed.original, {
                    cacheControl: "31536000",
                    upsert: true,
                });

            if (originalError) throw originalError;

            let finalPath = originalPath;

            // Upload display version (max 1024px) - only if resize was needed
            if (processed.needsResize) {
                const { error: displayError } = await supabase.storage
                    .from("avatars")
                    .upload(displayPath, processed.display, {
                        cacheControl: "3600",
                        upsert: true,
                    });

                if (!displayError) {
                    finalPath = displayPath;
                }
            }

            // Update child with path for UI usage
            const { error: updateError } = await supabase
                .from("children")
                .update({ avatar_url: finalPath })
                .eq("id", childId);

            if (updateError) throw updateError;

            // Load the new avatar URL
            const { data: urlData } = await supabase.storage
                .from("avatars")
                .createSignedUrl(finalPath, 3600);

            if (urlData) {
                setAvatarUrl(urlData.signedUrl);
            }

            await refreshData();
            setSuccessMessage("Photo updated!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error uploading avatar:", err);
            setError(err.message || "Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    const handleCropCancel = () => {
        if (cropperImage) {
            URL.revokeObjectURL(cropperImage);
        }
        setCropperImage(null);
    };

    const handleSave = async () => {
        if (!childId || !name.trim()) {
            setError("Name is required");
            return;
        }

        try {
            setSaving(true);
            setError("");

            // Update name and dob
            const { error: updateError } = await supabase
                .from("children")
                .update({
                    name: name.trim(),
                    dob: birthdate || null,
                })
                .eq("id", childId);

            if (updateError) throw updateError;

            // Try to update gender separately
            if (gender !== undefined) {
                try {
                    await supabase
                        .from("children")
                        .update({ gender: gender || null })
                        .eq("id", childId);
                } catch {
                    console.log("Gender column not available yet, skipping gender update");
                }
            }

            await refreshData();
            await loadChildData();
            setSuccessMessage("Changes saved!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error saving child:", err);
            setError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== contextChild?.name) {
            setError(`Please type "${contextChild?.name}" to confirm deletion`);
            return;
        }

        try {
            setSaving(true);
            setError("");

            // Delete child (this will cascade to items)
            const { error: deleteError } = await supabase
                .from("children")
                .delete()
                .eq("id", childId);

            if (deleteError) throw deleteError;

            await refreshData();

            // Redirect to children list
            router.push("/settings/children");
        } catch (err: any) {
            console.error("Error deleting child:", err);
            setError(err.message || "Failed to delete");
            setSaving(false);
        }
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

    // Child not found
    if (!contextChild) {
        return (
            <AppShell>
                <Link
                    href="/settings/children"
                    className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
                >
                    ← Back to Children
                </Link>
                <div className="card-organic p-8 text-center">
                    <h2 className="text-xl font-dmSerif text-forest mb-2">Child not found</h2>
                    <p className="text-sm text-textSub mb-4">
                        This child profile doesn't exist or you don't have access to it.
                    </p>
                    <Link href="/settings/children" className="btn-primary">
                        Go to Children
                    </Link>
                </div>
            </AppShell>
        );
    }

    const initials = name ? name[0].toUpperCase() : "?";

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/settings/children"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Children
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Edit Profile</h1>
                    <p className="text-sm text-textSub">Manage {contextChild.name}'s profile</p>
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

                {/* Image Cropper Modal */}
                {cropperImage && (
                    <ImageCropper
                        imageSrc={cropperImage}
                        onCropComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                        aspectRatio={1}
                        cropShape="round"
                    />
                )}

                {/* Profile Photo */}
                <div className="card-organic p-6">
                    <h2 className="font-bold text-forest text-lg mb-4">Profile Photo</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="child-avatar-upload"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleAvatarChange}
                                disabled={uploading}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className={`block w-28 h-28 rounded-full overflow-hidden cursor-pointer border-4 border-border hover:border-forest transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={contextChild.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-orange-100 text-orange-600 flex items-center justify-center text-4xl font-bold">
                                        {initials}
                                    </div>
                                )}
                            </button>
                            <div className="absolute bottom-0 right-0 bg-white rounded-full p-2 border-2 border-forest shadow-md">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-textSub">{uploading ? "Uploading..." : "Click to change photo"}</p>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="card-organic p-6 space-y-4">
                    <h2 className="font-bold text-forest text-lg">Basic Info</h2>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="child-name" className="block text-sm font-semibold text-forest mb-1.5">
                                Name
                            </label>
                            <input
                                id="child-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                placeholder="Child's name"
                            />
                        </div>

                        <div>
                            <label htmlFor="child-birthdate" className="block text-sm font-semibold text-forest mb-1.5">
                                Birthdate <span className="text-textSub font-normal">(optional)</span>
                            </label>
                            <input
                                id="child-birthdate"
                                type="date"
                                value={birthdate}
                                onChange={(e) => setBirthdate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                            />
                            <p className="text-xs text-textSub mt-1.5">
                                Used to show age and track milestones
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-forest mb-1.5">
                                Gender <span className="text-textSub font-normal">(optional)</span>
                            </label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setGender("boy")}
                                    className={`flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                                        gender === "boy"
                                            ? "bg-blue-50 border-blue-300 text-blue-700"
                                            : "border-border bg-white text-textSub hover:border-forest/30"
                                    }`}
                                >
                                    Boy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGender("girl")}
                                    className={`flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                                        gender === "girl"
                                            ? "bg-pink-50 border-pink-300 text-pink-700"
                                            : "border-border bg-white text-textSub hover:border-forest/30"
                                    }`}
                                >
                                    Girl
                                </button>
                            </div>
                            {gender && (
                                <button
                                    type="button"
                                    onClick={() => setGender("")}
                                    className="text-xs text-textSub hover:text-forest mt-2"
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* Connected Homes */}
                <div className="card-organic p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-forest text-lg">Connected Homes</h2>
                        {currentUserPermissions.isGuardian && availableHomesToLink.length > 0 && (
                            <button
                                onClick={() => setShowLinkHomeModal(true)}
                                className="text-sm text-teal hover:text-forest font-medium flex items-center gap-1"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Link home
                            </button>
                        )}
                    </div>
                    
                    <p className="text-xs text-textSub mb-4">
                        Homes where {contextChild.name} stays. {currentUserPermissions.isGuardian ? "Toggle to connect or disconnect homes." : "Only guardians can edit."}
                    </p>
                    
                    {homesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Active Homes */}
                            {activeConnectedHomes.length === 0 ? (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <p className="text-sm text-amber-700">
                                        No homes connected. {currentUserPermissions.isGuardian ? "Link a home to get started." : ""}
                                    </p>
                                </div>
                            ) : (
                                activeConnectedHomes.map((home) => (
                                    <div
                                        key={home.homeId}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-softGreen/30 border border-forest/20"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center flex-shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-forest truncate">{home.homeName}</p>
                                            <p className="text-xs text-textSub">Active</p>
                                        </div>
                                        {currentUserPermissions.isGuardian && (
                                            <button
                                                onClick={() => handleToggleHomeStatus(home.homeId, 'active')}
                                                disabled={togglingHomeId === home.homeId || activeConnectedHomes.length === 1}
                                                className="p-2 text-textSub hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                title={activeConnectedHomes.length === 1 ? "Cannot disconnect the only home" : "Disconnect from home"}
                                            >
                                                {togglingHomeId === home.homeId ? (
                                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-forest rounded-full animate-spin" />
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                            
                            {/* Previously Connected (Inactive) Homes */}
                            {inactiveConnectedHomes.length > 0 && (
                                <div className="pt-3">
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
                                            className={`transition-transform ${showInactiveHomes ? "rotate-90" : ""}`}
                                        >
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                        Previously connected ({inactiveConnectedHomes.length})
                                    </button>
                                    
                                    {showInactiveHomes && (
                                        <div className="mt-2 space-y-2">
                                            {inactiveConnectedHomes.map((home) => (
                                                <div
                                                    key={home.homeId}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 opacity-70"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                            <polyline points="9 22 9 12 15 12 15 22" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-600 truncate">{home.homeName}</p>
                                                        <p className="text-xs text-gray-400">Inactive</p>
                                                    </div>
                                                    {currentUserPermissions.isGuardian && (
                                                        <button
                                                            onClick={() => handleToggleHomeStatus(home.homeId, 'inactive')}
                                                            disabled={togglingHomeId === home.homeId}
                                                            className="px-3 py-1.5 text-sm font-medium text-teal hover:text-forest disabled:opacity-50 transition-colors"
                                                        >
                                                            {togglingHomeId === home.homeId ? (
                                                                <div className="w-4 h-4 border-2 border-gray-300 border-t-teal rounded-full animate-spin" />
                                                            ) : (
                                                                "Reconnect"
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Link Home Modal */}
                {showLinkHomeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
                            <div className="p-4 border-b border-border/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-forest text-lg">Link Home</h3>
                                    <button
                                        onClick={() => setShowLinkHomeModal(false)}
                                        className="p-2 text-textSub hover:text-forest rounded-lg"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm text-textSub mt-1">
                                    Select a home to connect to {contextChild.name}
                                </p>
                            </div>
                            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                                {availableHomesToLink.map((home) => (
                                    <button
                                        key={home.id}
                                        onClick={() => handleLinkNewHome(home.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-forest/30 hover:bg-softGreen/10 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center flex-shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                        <span className="font-medium text-forest text-left flex-1 truncate">
                                            {home.name}
                                        </span>
                                    </button>
                                ))}
                                {availableHomesToLink.length === 0 && (
                                    <p className="text-sm text-textSub text-center py-4">
                                        All homes are already connected
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Connected Caregivers - Derived from active home connections */}
                <div className="card-organic p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-forest text-lg">Connected caregivers</h2>
                        {currentUserPermissions.isGuardian && (
                            <Link
                                href="/settings/caregivers"
                                className="text-sm text-teal hover:text-forest font-medium flex items-center gap-1"
                            >
                                Manage caregivers
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </Link>
                        )}
                    </div>
                    
                    <p className="text-xs text-textSub mb-4">
                        Caregivers who can see {contextChild.name} through the connected homes.
                    </p>
                    
                    {caregiversLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest"></div>
                        </div>
                    ) : connectedCaregivers.length === 0 ? (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-sm text-textSub text-center">
                                No caregivers yet. {currentUserPermissions.isGuardian && (
                                    <>
                                        <Link href="/settings/caregivers?invite=true" className="text-teal hover:text-forest">
                                            Invite a caregiver
                                        </Link> or connect this child to a home where caregivers are already connected.
                                    </>
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {connectedCaregivers.map((caregiver) => {
                                // Format "Via" text - show up to 2 homes, then "+N"
                                const viaText = caregiver.viaHomes.length <= 2
                                    ? caregiver.viaHomes.map(h => h.name).join(", ")
                                    : `${caregiver.viaHomes.slice(0, 2).map(h => h.name).join(", ")} +${caregiver.viaHomes.length - 2}`;
                                
                                return (
                                    <div
                                        key={caregiver.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-cream/50 border border-border/30"
                                    >
                                        {/* Avatar */}
                                        <div 
                                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
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
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-forest truncate">{caregiver.label}</p>
                                                {caregiver.id === user?.id && (
                                                    <span className="text-xs bg-softGreen text-forest px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-textSub">{caregiver.role}</p>
                                            <p className="text-xs text-forest/60 mt-0.5">
                                                Via: {viaText}
                                            </p>
                                        </div>
                                        
                                        {/* Link to caregiver page */}
                                        <Link
                                            href="/settings/caregivers"
                                            className="p-2 text-textSub/50 hover:text-forest transition-colors flex-shrink-0"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Remove Profile */}
                <div className="card-organic p-6">
                    <h2 className="font-medium text-forest text-base mb-1">Remove {contextChild.name}'s profile</h2>
                    <p className="text-sm text-textSub mb-4">
                        This will permanently delete {contextChild.name}'s items and all associated data.
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-200 hover:border-red-300 hover:text-red-500 transition-colors"
                        >
                            Remove profile
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-textSub">
                                Type <span className="font-medium text-forest">"{contextChild.name}"</span> to confirm:
                            </p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                placeholder={contextChild.name}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteConfirmText("");
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={saving || deleteConfirmText !== contextChild.name}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm text-red-500 border border-red-200 hover:border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {saving ? "Removing..." : "Remove"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
