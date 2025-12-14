"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import MobileSelect from "@/components/MobileSelect";
import ImageCropper from "@/components/ImageCropper";
import { useItems } from "@/lib/ItemsContextV2";
import { useAppState } from "@/lib/AppStateContextV2";
import { processImageForUpload, generateImagePaths } from "@/lib/imageUtils";

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
    const { caregivers, activeHomes, homes } = useAppState();

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>("");
    const [uploading, setUploading] = useState(false);

    // Image cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !category || !location) {
            setError("Please fill in all required fields.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const { supabase } = await import("@/lib/supabase");

            // Get user's family ID for family-folder structure
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setError("Please log in to add items.");
                setUploading(false);
                return;
            }

            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", session.user.id)
                .single();

            if (!familyMember) {
                setError("No family found. Please complete onboarding.");
                setUploading(false);
                return;
            }

            let photoUrl = "";

            // Upload photo if selected
            if (photoFile) {
                // Process image: create original and display versions
                const processed = await processImageForUpload(photoFile);
                const paths = generateImagePaths(familyMember.family_id, photoFile.name);

                console.log("[Image Upload] Original size:", processed.originalWidth, "x", processed.originalHeight);
                console.log("[Image Upload] Display size:", processed.displayWidth, "x", processed.displayHeight);
                console.log("[Image Upload] Needs resize:", processed.needsResize);
                console.log("[Image Upload] Original path:", paths.originalPath);
                console.log("[Image Upload] Display path:", paths.displayPath);

                // Upload original (full resolution)
                const { error: originalError } = await supabase.storage
                    .from("item-photos")
                    .upload(paths.originalPath, processed.original, {
                        cacheControl: "31536000", // 1 year cache for originals
                        upsert: false,
                    });

                if (originalError) {
                    console.error("Original upload error:", originalError);
                    setError("Failed to upload photo. Please try again.");
                    setUploading(false);
                    return;
                }
                console.log("[Image Upload] Original uploaded successfully");

                // Upload display version (max 1024px) - only if different from original
                if (processed.needsResize) {
                    const { error: displayError } = await supabase.storage
                        .from("item-photos")
                        .upload(paths.displayPath, processed.display, {
                            cacheControl: "3600", // 1 hour cache for display
                            upsert: false,
                        });

                    if (displayError) {
                        console.error("Display upload error:", displayError);
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
            }

            const isMissing = location === "Missing";
            // Use home-based location - find the selected home from ALL homes (in case item is at hidden home)
            const selectedHome = homes.find((h) => h.id === location);
            const locationHomeId = isMissing ? null : (selectedHome?.id || null);
            // Keep legacy caregiver ID for backwards compatibility
            const locationCaregiverId = isMissing
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
                // Origin is auto-set by the context (no UI prompt needed)
            };

            const result = await addItem(newItem);

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
                <p className="text-sm text-textSub mt-1">Add one of June&apos;s things.</p>
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
                            ...activeHomes.map((home) => ({ value: home.id, label: home.name })),
                            { value: "Missing", label: "Missing" }
                        ]}
                        placeholder="Select home"
                        title="Select home"
                        required
                    />
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
                    disabled={uploading || !name || !category || !location}
                >
                    {uploading ? "Saving..." : "Save item"}
                </button>
            </form>
        </AppShell>
    );
}
