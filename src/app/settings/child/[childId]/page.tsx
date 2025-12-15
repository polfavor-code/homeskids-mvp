"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { processImageForUpload } from "@/lib/imageUtils";
import ImageCropper from "@/components/ImageCropper";
import Avatar from "@/components/Avatar";

export default function ChildEditPage() {
    useEnsureOnboarding();

    const router = useRouter();
    const params = useParams();
    const childId = params.childId as string;
    
    const { user, loading: authLoading } = useAuth();
    const { children, refreshData, isLoaded } = useAppState();

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

    useEffect(() => {
        if (contextChild) {
            setName(contextChild.name || "");
            loadChildData();
        }
    }, [contextChild]);

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
