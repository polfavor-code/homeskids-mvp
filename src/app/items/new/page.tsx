"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import MobileSelect from "@/components/MobileSelect";
import MobileMultiSelect from "@/components/MobileMultiSelect";
import ImageCropper from "@/components/ImageCropper";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { processImageForUpload, generateImagePaths } from "@/lib/imageUtils";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
    "Clothing",
    "Toys",
    "School stuff",
    "Sports",
    "Musical instruments",
    "Medicine",
    "Electronics",
    "Other",
];

export default function AddItemPage() {
    const router = useRouter();
    const { addItem } = useItems();
    const { caregivers, activeHomes, homes, child, children, currentHomeId } = useAppState();

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>("");
    const [uploading, setUploading] = useState(false);

    // Child selection state (which children own this item)
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
    
    // Origin home state (where this item originates from)
    const [originHomeId, setOriginHomeId] = useState<string>("");

    // Image cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string>("");

    // Auto-select child if only one exists
    useEffect(() => {
        if (children.length === 1 && selectedChildIds.length === 0) {
            setSelectedChildIds([children[0].id]);
        }
    }, [children, selectedChildIds.length]);

    // Default origin home to current home
    useEffect(() => {
        if (currentHomeId && !originHomeId) {
            setOriginHomeId(currentHomeId);
        }
    }, [currentHomeId, originHomeId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !category || !location) {
            setError("Please fill in all required fields.");
            return;
        }
        if (selectedChildIds.length === 0) {
            setError("Please select at least one child.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            // Get user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setError("Please log in to add items.");
                setUploading(false);
                return;
            }

            // Get folder ID for storage - use family_id for consistency with bucket policies
            // First try family_members (V1), then fall back to child.id (V2)
            let folderId: string | undefined;

            // Try V1: family_members.family_id
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", session.user.id)
                .single();

            if (familyMember?.family_id) {
                folderId = familyMember.family_id;
            } else if (child?.id) {
                // Fallback to V2: child.id
                folderId = child.id;
            }

            if (!folderId) {
                setError("No family or child found. Please complete onboarding.");
                setUploading(false);
                return;
            }
            
            console.log("[Image Upload] Using folder ID:", folderId);

            let photoUrl = "";

            // Upload photo if selected
            if (photoFile) {
                try {
                    console.log("[Image Upload] Starting upload for file:", photoFile.name, "size:", photoFile.size);
                    
                    // Process image: create original and display versions
                    const processed = await processImageForUpload(photoFile);
                    const paths = generateImagePaths(folderId, photoFile.name);

                    console.log("[Image Upload] Original size:", processed.originalWidth, "x", processed.originalHeight);
                    console.log("[Image Upload] Display size:", processed.displayWidth, "x", processed.displayHeight);
                    console.log("[Image Upload] Needs resize:", processed.needsResize);
                    console.log("[Image Upload] Original path:", paths.originalPath);
                    console.log("[Image Upload] Display path:", paths.displayPath);

                    // Upload original (full resolution)
                    const { error: originalError, data: originalData } = await supabase.storage
                        .from("item-photos")
                        .upload(paths.originalPath, processed.original, {
                            cacheControl: "31536000", // 1 year cache for originals
                            upsert: false,
                        });

                    if (originalError) {
                        console.error("[Image Upload] Original upload error:", originalError);
                        setError(`Failed to upload photo: ${originalError.message}`);
                        setUploading(false);
                        return;
                    }
                    console.log("[Image Upload] Original uploaded successfully:", originalData);

                    // Upload display version (max 300px) - only if different from original
                    if (processed.needsResize) {
                        const { error: displayError } = await supabase.storage
                            .from("item-photos")
                            .upload(paths.displayPath, processed.display, {
                                cacheControl: "3600", // 1 hour cache for display
                                upsert: false,
                            });

                        if (displayError) {
                            console.error("[Image Upload] Display upload error:", displayError);
                            // Continue anyway - we have the original
                        } else {
                            console.log("[Image Upload] Display uploaded successfully");
                        }
                        // Use display path when resized
                        photoUrl = paths.displayPath;
                    } else {
                        // No resize needed - use original path for display too
                        console.log("[Image Upload] No resize needed, using original as display");
                        photoUrl = paths.originalPath;
                    }
                    
                    console.log("[Image Upload] Final photoUrl to save:", photoUrl);
                } catch (uploadError) {
                    console.error("[Image Upload] Unexpected error:", uploadError);
                    setError("Failed to process photo. Please try again.");
                    setUploading(false);
                    return;
                }
            }

            const isMissing = location === "Missing";
            const isUnassigned = location === "Unassigned";
            // Use home-based location - find the selected home from ALL homes (in case item is at hidden home)
            const selectedHome = homes.find((h) => h.id === location);
            const locationHomeId = (isMissing || isUnassigned) ? null : (selectedHome?.id || null);
            // Keep legacy caregiver ID for backwards compatibility
            const locationCaregiverId = (isMissing || isUnassigned)
                ? (caregivers[0]?.id || "")
                : (selectedHome?.ownerCaregiverId || caregivers[0]?.id || "");

            const newItem = {
                id: `item-${Date.now()}`,
                name,
                category,
                locationCaregiverId,
                locationHomeId,
                isRequestedForNextVisit: false,
                isPacked: false,
                isMissing,
                isRequestCanceled: false,
                photoUrl: photoUrl || undefined,
                notes: notes || undefined,
                // Child ownership - which children own this item
                childIds: selectedChildIds,
                // Origin home - where this item originates from
                originHomeId: originHomeId || locationHomeId || undefined,
            };

            console.log("[Create Item] Saving item with photoUrl:", newItem.photoUrl);
            const result = await addItem(newItem);
            console.log("[Create Item] Result:", result);

            if (!result.success) {
                setError(result.error || "Failed to create item. Please try again.");
                setUploading(false);
                return;
            }

            router.push("/items");
        } catch (err) {
            console.error("Error creating item:", err);
            setError("Failed to create item. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <AppShell>
            {/* Back link */}
            <Link
                href="/items"
                className="text-sm text-forest hover:text-forest/70 inline-flex items-center gap-1 mb-4"
            >
                ← Back
            </Link>

            {/* Page header */}
            <div className="mb-6">
                <h1 className="font-dmSerif text-2xl text-forest mt-2">Add a new item</h1>
                <p className="text-sm text-textSub mt-1">Add one of {child?.name || "your child"}&apos;s things.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                {/* Photo Upload */}
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        id="photo-upload"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setImageToCrop(reader.result as string);
                                    setShowCropper(true);
                                };
                                reader.readAsDataURL(file);
                            }
                            // Reset input so same file can be selected again
                            e.target.value = "";
                        }}
                    />
                    {photoPreview ? (
                        <div className="relative">
                            <img
                                src={photoPreview}
                                alt="Preview"
                                className="w-full h-48 object-cover rounded-2xl"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setPhotoFile(null);
                                    setPhotoPreview("");
                                }}
                                className="absolute top-3 right-3 bg-forest text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-forest/80 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <label
                            htmlFor="photo-upload"
                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-2xl bg-cream/50 cursor-pointer hover:border-forest/50 hover:bg-cream transition-all"
                        >
                            <div className="text-2xl mb-2">📷</div>
                            <span className="text-sm font-medium text-teal">Add photo</span>
                        </label>
                    )}
                </div>

                {/* Image Cropper Modal */}
                {showCropper && imageToCrop && (
                    <ImageCropper
                        imageSrc={imageToCrop}
                        onCropComplete={(croppedBlob) => {
                            // Convert blob to file
                            const file = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" });
                            setPhotoFile(file);
                            // Create preview URL
                            const previewUrl = URL.createObjectURL(croppedBlob);
                            setPhotoPreview(previewUrl);
                            setShowCropper(false);
                            setImageToCrop("");
                        }}
                        onCancel={() => {
                            setShowCropper(false);
                            setImageToCrop("");
                        }}
                        aspectRatio={4 / 3}
                        cropShape="rect"
                    />
                )}

                {/* Name */}
                <div>
                    <label className="block text-xs font-semibold text-forest mb-1.5">
                        Name <span className="text-terracotta">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Red dress, iPad..."
                        className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-forest bg-white placeholder:text-gray-400"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-xs font-semibold text-forest mb-1.5">
                        Category <span className="text-terracotta">*</span>
                    </label>
                    <MobileSelect
                        value={category}
                        onChange={setCategory}
                        options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                        placeholder="Select category"
                        title="Select category"
                        required
                    />
                </div>

                {/* Location */}
                <div>
                    <label className="block text-xs font-semibold text-forest mb-1.5">
                        Location <span className="text-terracotta">*</span>
                    </label>
                    <MobileSelect
                        value={location}
                        onChange={setLocation}
                        options={[
                            { value: "Unassigned", label: activeHomes.length === 0 ? "No home yet" : "Unassigned" },
                            ...activeHomes.map((home) => ({ value: home.id, label: home.name })),
                            { value: "Missing", label: "Missing" }
                        ]}
                        placeholder={activeHomes.length === 0 ? "Select location" : "Select home"}
                        title={activeHomes.length === 0 ? "Select location" : "Select home"}
                        required
                    />
                </div>

                {/* Belongs to (Child selection) */}
                <div>
                    <label className="block text-xs font-semibold text-forest mb-1.5">
                        Belongs to <span className="text-terracotta">*</span>
                    </label>
                    {children.length === 1 ? (
                        // Single child - show as read-only pill
                        <div className="px-4 py-3 border border-border rounded-xl bg-cream/50 text-sm text-forest">
                            {children[0].name}
                        </div>
                    ) : (
                        // Multiple children - show multi-select
                        <MobileMultiSelect
                            values={selectedChildIds}
                            onChange={setSelectedChildIds}
                            options={children.map((c) => ({ 
                                value: c.id, 
                                label: c.name 
                            }))}
                            allOption={children.length > 1 ? {
                                value: "all",
                                label: "All children"
                            } : undefined}
                            placeholder="Select child(ren)"
                            title="Who does this item belong to?"
                        />
                    )}
                    {selectedChildIds.length === 0 && (
                        <p className="text-xs text-terracotta mt-1">At least one child must be selected</p>
                    )}
                </div>

                {/* Origin home */}
                <div>
                    <label className="block text-xs font-semibold text-forest mb-1.5">
                        Origin home
                    </label>
                    <MobileSelect
                        value={originHomeId}
                        onChange={setOriginHomeId}
                        options={homes.map((home) => ({ value: home.id, label: home.name }))}
                        placeholder="Select origin home"
                        title="Where did this item come from?"
                    />
                    <p className="text-xs text-textSub mt-1">
                        Where this item originally came from (used for packing/returns)
                    </p>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-xs font-semibold text-forest mb-1.5">
                        Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this item..."
                        rows={3}
                        className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-forest bg-white placeholder:text-gray-400 resize-none"
                    />
                </div>

                {error && <p className="text-sm text-terracotta">{error}</p>}

                <button
                    type="submit"
                    className="w-full py-3.5 bg-forest text-white font-semibold rounded-xl hover:bg-forest/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading || !name || !category || !location || selectedChildIds.length === 0}
                >
                    {uploading ? "Saving..." : "Save item"}
                </button>
            </form>
        </AppShell>
    );
}
