"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import ImageCropper from "@/components/ImageCropper";
import { useAuth } from "@/lib/AuthContext";
import { useAppState, HomeProfile } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { processImageForUpload } from "@/lib/imageUtils";
import { ToastContainer, ToastData } from "@/components/Toast";
import MobileMultiSelect from "@/components/MobileMultiSelect";

// Calculate age from birthdate
function calculateAge(birthdate: string): string {
    const birth = new Date(birthdate);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    
    // Adjust if birthday hasn't occurred this year
    const adjustedYears = months < 0 || (months === 0 && today.getDate() < birth.getDate()) 
        ? years - 1 
        : years;
    
    if (adjustedYears === 0) {
        const adjustedMonths = months < 0 ? months + 12 : months;
        return `${adjustedMonths} month${adjustedMonths !== 1 ? "s" : ""} old`;
    }
    
    return `${adjustedYears} year${adjustedYears !== 1 ? "s" : ""} old`;
}

export default function ChildrenPage() {
    useEnsureOnboarding();

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { children, setCurrentChildId, refreshData, isLoaded, homes, childSpaces, currentHomeId } = useAppState();

    const [showAddModal, setShowAddModal] = useState(false);
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const addToast = (title: string, message: string, type: "success" | "info" | "error" = "success") => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, title, message, type }]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleChildAdded = async (childName: string) => {
        setShowAddModal(false);
        await refreshData();
        addToast("Child added", `${childName} has been added to your family.`, "success");
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-dmSerif text-forest">Children</h1>
                        <p className="text-sm text-textSub">Manage children profiles</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add child
                    </button>
                </div>

                {/* Children List */}
                <div className="space-y-3">
                    {children.length === 0 ? (
                        <div className="card-organic p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">👶</span>
                            </div>
                            <h3 className="font-bold text-forest text-lg mb-2">No children yet</h3>
                            <p className="text-sm text-textSub mb-4">
                                Add a child to start tracking their items and information.
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary"
                            >
                                Add your first child
                            </button>
                        </div>
                    ) : (
                        children.map((child) => (
                            <Link
                                key={child.id}
                                href={`/settings/child/${child.id}`}
                                className="card-organic p-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
                            >
                                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                                    {child.avatarUrl ? (
                                        <Avatar
                                            src={child.avatarUrl}
                                            initial={child.avatarInitials || child.name?.charAt(0)}
                                            size={56}
                                            bgColor="#E07B39"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-orange-100 flex items-center justify-center text-xl font-bold text-orange-600">
                                            {child.avatarInitials || child.name?.charAt(0) || "?"}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-forest text-lg">{child.name}</h3>
                                    {child.dob && (
                                        <p className="text-sm text-textSub mt-0.5">{calculateAge(child.dob)}</p>
                                    )}
                                </div>
                                <svg 
                                    className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors flex-shrink-0" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </Link>
                        ))
                    )}
                </div>

                {/* Add another child button (when children exist) */}
                {children.length > 0 && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full py-4 border-2 border-dashed border-border rounded-xl text-sm font-medium text-textSub hover:border-forest hover:text-forest transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add another child
                    </button>
                )}

                {/* Info card */}
                <div className="card-organic p-4 bg-softGreen/30">
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-forest flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-forest text-xs font-bold">i</span>
                        </div>
                        <div>
                            <p className="text-sm text-forest font-medium mb-1">About Children</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Each child has their own profile, items, and can be associated with different homes.
                                You can switch between children using the child selector in the navigation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Child Modal */}
            {showAddModal && (
                <AddChildModal
                    onClose={() => setShowAddModal(false)}
                    onChildAdded={handleChildAdded}
                    homes={homes}
                    childSpaces={childSpaces}
                    currentHomeId={currentHomeId}
                />
            )}

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </AppShell>
    );
}

// Add Child Modal Component
interface AddChildModalProps {
    onClose: () => void;
    onChildAdded: (childName: string) => void;
    homes: HomeProfile[];
    childSpaces: { id: string; childId: string; homeId: string }[];
    currentHomeId?: string;
}

function AddChildModal({ onClose, onChildAdded, homes, currentHomeId }: AddChildModalProps) {
    const { user } = useAuth();
    const { setCurrentChildId, refreshData } = useAppState();
    
    const [name, setName] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [gender, setGender] = useState<"boy" | "girl" | "">("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [avatarPath, setAvatarPath] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Connected homes - preselect current home if available, otherwise select all if only one
    const [selectedHomeIds, setSelectedHomeIds] = useState<string[]>(() => {
        if (currentHomeId && homes.some(h => h.id === currentHomeId)) {
            return [currentHomeId];
        }
        if (homes.length === 1) {
            return [homes[0].id];
        }
        return [];
    });

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
        if (!user) {
            setError("Please log in to upload a photo");
            return;
        }

        try {
            setError("");
            setCropperImage(null);
            setUploading(true);

            // Verify session is valid
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error("Session expired. Please refresh the page.");
            }

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Process cropped image
            const croppedFile = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
            const processed = await processImageForUpload(croppedFile);

            const tempPath = `temp-${user.id}-${timestamp}-${random}_display.jpg`;

            console.log("[AddChild] Uploading avatar to:", tempPath);

            // Upload to temp location (will be updated with child ID after creation)
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(tempPath, processed.display, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                console.error("[AddChild] Avatar upload error:", uploadError);
                throw uploadError;
            }

            console.log("[AddChild] Avatar uploaded successfully");

            // Store the path for later
            setAvatarPath(tempPath);

            // Get signed URL for preview
            const { data: urlData } = await supabase.storage
                .from("avatars")
                .createSignedUrl(tempPath, 3600);

            if (urlData) {
                setAvatarUrl(urlData.signedUrl);
            }
        } catch (err: any) {
            console.error("[AddChild] Error uploading avatar:", err);
            setError(err.message || "Failed to upload photo. Please try again.");
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

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError("Please enter a name");
            return;
        }
        if (selectedHomeIds.length === 0) {
            setError("Please select at least one home for the child");
            return;
        }
        if (!user) {
            setError("Authentication error. Please try again.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            // Verify auth session is valid before proceeding
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error("Session expired. Please refresh the page and try again.");
            }

            console.log("[AddChild] Creating child for user:", user.id);

            // Create child - include avatar path directly
            const { data: newChild, error: childError } = await supabase
                .from("children")
                .insert({
                    name: name.trim(),
                    dob: birthdate || null,
                    gender: gender || null,
                    avatar_url: avatarPath || null,
                    created_by: user.id,
                })
                .select()
                .single();

            if (childError) {
                console.error("[AddChild] Error creating child:", childError);
                throw childError;
            }

            console.log("[AddChild] Child created:", newChild.id);

            // CRITICAL: Add current user as guardian with child_access FIRST
            // This must succeed for the user to see the child
            const { error: accessError } = await supabase
                .from("child_access")
                .upsert({
                    child_id: newChild.id,
                    user_id: user.id,
                    role_type: "guardian",
                    access_level: "manage",
                }, {
                    onConflict: "child_id,user_id",
                });

            if (accessError) {
                console.error("[AddChild] CRITICAL: Error creating child_access:", accessError);
                // Don't throw - child was created, we should continue
            } else {
                console.log("[AddChild] child_access created successfully");
            }

            // If we uploaded an avatar to temp path, rename it to include child ID
            if (avatarPath && newChild) {
                const newAvatarPath = avatarPath.replace(`temp-${user.id}`, `child-${newChild.id}`);
                
                console.log("[AddChild] Renaming avatar from", avatarPath, "to", newAvatarPath);
                
                // Copy to new path
                const { error: copyError } = await supabase.storage
                    .from("avatars")
                    .copy(avatarPath, newAvatarPath);

                if (copyError) {
                    console.error("[AddChild] Error copying avatar:", copyError);
                    // Avatar stays at temp path, which is still valid
                } else {
                    // Update child with new path
                    const { error: updateError } = await supabase
                        .from("children")
                        .update({ avatar_url: newAvatarPath })
                        .eq("id", newChild.id);

                    if (updateError) {
                        console.error("[AddChild] Error updating avatar path:", updateError);
                    } else {
                        console.log("[AddChild] Avatar path updated successfully");
                        // Delete temp file (best effort)
                        await supabase.storage
                            .from("avatars")
                            .remove([avatarPath]);
                    }
                }
            }

            // Link child to SELECTED homes only (not all homes)
            const selectedHomes = homes.filter(h => selectedHomeIds.includes(h.id));
            for (const home of selectedHomes) {
                // Create child_space for each selected home with status='active'
                const { data: newChildSpace, error: csError } = await supabase
                    .from("child_spaces")
                    .insert({
                        home_id: home.id,
                        child_id: newChild.id,
                        status: "active", // Explicitly set active status
                    })
                    .select()
                    .single();

                if (csError) {
                    console.error("[AddChild] Error creating child_space:", csError);
                    continue;
                }

                // Grant current user child_space_access
                const { error: csaError } = await supabase.from("child_space_access").insert({
                    child_space_id: newChildSpace.id,
                    user_id: user.id,
                    can_view_address: true,
                });

                if (csaError) {
                    console.error("[AddChild] Error creating child_space_access:", csaError);
                }
            }
            
            console.log("[AddChild] Linked child to", selectedHomes.length, "homes");

            // Set the newly created child as active
            setCurrentChildId(newChild.id);

            // Wait a moment for database to propagate, then refresh
            await new Promise(resolve => setTimeout(resolve, 500));

            // Refresh app data
            await refreshData();

            console.log("[AddChild] Child creation complete:", newChild.id);

            // Notify parent
            onChildAdded(name.trim());
        } catch (err: any) {
            console.error("[AddChild] Error creating child:", err);
            setError(err.message || "Failed to create child. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const initials = name ? name[0].toUpperCase() : "?";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-border/30 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-dmSerif text-forest">Add Child</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-textSub hover:text-forest rounded-lg hover:bg-cream transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
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
                    <div className="flex flex-col items-center gap-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleAvatarChange}
                            disabled={uploading}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className={`relative w-24 h-24 rounded-full overflow-hidden cursor-pointer border-4 border-border hover:border-forest transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Child photo"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-orange-100 flex items-center justify-center text-3xl font-bold text-orange-600">
                                    {initials}
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 border-2 border-forest shadow-md">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                        </button>
                        <p className="text-xs text-textSub">
                            {uploading ? "Uploading..." : "Tap to add photo (optional)"}
                        </p>
                    </div>

                    {/* Name */}
                    <div>
                        <label htmlFor="child-name" className="block text-sm font-semibold text-forest mb-1.5">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="child-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                            placeholder="Child's name"
                            autoFocus
                        />
                    </div>

                    {/* Birthdate */}
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

                    {/* Gender */}
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

                    {/* Connected Homes - Required */}
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Connected Homes <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-textSub mb-3">
                            Select which homes this child stays in.
                        </p>
                        {homes.length === 0 ? (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <p className="text-sm text-amber-700">
                                    You need to create at least one home before adding a child.
                                </p>
                            </div>
                        ) : homes.length === 1 ? (
                            // Single home - show as pre-selected with info
                            <div className="p-4 bg-softGreen/30 rounded-xl border border-forest/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-forest">{homes[0].name}</p>
                                        <p className="text-xs text-textSub">This child will be added to your home.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Multiple homes - show multi-select
                            <div className="space-y-2">
                                {homes.map((home) => {
                                    const isSelected = selectedHomeIds.includes(home.id);
                                    return (
                                        <button
                                            key={home.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedHomeIds(prev => 
                                                    prev.includes(home.id) 
                                                        ? prev.filter(id => id !== home.id)
                                                        : [...prev, home.id]
                                                );
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                                isSelected
                                                    ? "bg-softGreen/30 border-forest/20"
                                                    : "bg-white border-border hover:border-forest/30"
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                isSelected
                                                    ? "border-forest bg-forest"
                                                    : "border-gray-300"
                                            }`}>
                                                {isSelected && (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isSelected ? "text-forest" : "text-textSub"}>
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                    <polyline points="9 22 9 12 15 12 15 22" />
                                                </svg>
                                                <span className={`text-sm font-medium truncate ${isSelected ? "text-forest" : "text-textSub"}`}>
                                                    {home.name}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                                {selectedHomeIds.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Select at least one home
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-border/30 px-6 py-4 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="btn-secondary flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !name.trim()}
                        className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Adding..." : "Add child"}
                    </button>
                </div>
            </div>
        </div>
    );
}
