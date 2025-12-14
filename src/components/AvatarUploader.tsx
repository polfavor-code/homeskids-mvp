"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContextV2";
import { supabase } from "@/lib/supabase";
import { processImageForUpload } from "@/lib/imageUtils";
import ImageCropper from "./ImageCropper";

interface AvatarUploaderProps {
    userId: string;
    currentAvatarUrl?: string;
    userName: string;
    onUploadSuccess?: () => void;
}

export default function AvatarUploader({ userId, currentAvatarUrl, userName, onUploadSuccess }: AvatarUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [error, setError] = useState("");
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch user's family ID on mount
    useEffect(() => {
        const fetchFamilyId = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return;

                const { data: familyMember } = await supabase
                    .from("family_members")
                    .select("family_id")
                    .eq("user_id", session.user.id)
                    .single();

                if (familyMember) {
                    setFamilyId(familyMember.family_id);
                }
            } catch (err) {
                console.error("Failed to fetch family ID:", err);
            }
        };

        fetchFamilyId();
    }, []);

    useEffect(() => {
        if (currentAvatarUrl) {
            loadAvatar(currentAvatarUrl);
        }
    }, [currentAvatarUrl]);

    const loadAvatar = async (path: string) => {
        try {
            const { data, error } = await supabase.storage
                .from("avatars")
                .createSignedUrl(path, 3600);

            if (error) {
                console.error("Error loading avatar:", error);
                return;
            }

            setAvatarUrl(data.signedUrl);
        } catch (err) {
            console.error("Failed to load avatar:", err);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log("handleFileChange triggered");

        if (!event.target.files || event.target.files.length === 0) {
            console.log("No files selected");
            return;
        }

        if (!familyId) {
            console.log("No familyId");
            setError("No family found. Please complete onboarding.");
            return;
        }

        const file = event.target.files[0];
        console.log("File selected:", file.name, file.type, file.size);

        try {
            // Create object URL for cropper
            const imageUrl = URL.createObjectURL(file);
            console.log("Object URL created:", imageUrl);
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
        try {
            setError("");
            setCropperImage(null);
            setUploading(true);

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Process cropped image: create original and display versions
            const croppedFile = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
            const processed = await processImageForUpload(croppedFile);

            const originalPath = `${familyId}/${userId}-${timestamp}-${random}_original.jpg`;
            const displayPath = `${familyId}/${userId}-${timestamp}-${random}_display.jpg`;

            // Upload original (full resolution)
            const { error: originalError } = await supabase.storage
                .from("avatars")
                .upload(originalPath, processed.original, {
                    cacheControl: "31536000", // 1 year cache
                    upsert: true,
                });

            if (originalError) {
                throw originalError;
            }

            let finalPath = originalPath;

            // Upload display version (max 1024px) - only if resize was needed
            if (processed.needsResize) {
                const { error: displayError } = await supabase.storage
                    .from("avatars")
                    .upload(displayPath, processed.display, {
                        cacheControl: "3600",
                        upsert: true,
                    });

                if (displayError) {
                    console.error("Display upload error:", displayError);
                    // Continue anyway - we have the original
                } else {
                    finalPath = displayPath;
                }
            }

            // Update profile with path for UI usage
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: finalPath })
                .eq("id", userId);

            if (updateError) {
                throw updateError;
            }

            // Load the new avatar
            await loadAvatar(finalPath);

            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (err: any) {
            console.error("Error uploading avatar:", err);
            setError(err.message || "Failed to upload avatar");
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

    const initials = userName.charAt(0).toUpperCase();

    return (
        <>
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

            <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                    <input
                        ref={fileInputRef}
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                <button
                    type="button"
                    onClick={() => {
                        console.log("Avatar button clicked");
                        fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                    className={`block w-24 h-24 rounded-full overflow-hidden cursor-pointer border-4 border-border hover:border-forest transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={userName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-forest text-white flex items-center justify-center text-3xl font-bold">
                            {initials}
                        </div>
                    )}
                </button>
                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 border-2 border-forest shadow-md">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                </div>
            </div>

            {uploading && (
                <p className="text-xs text-textSub">Uploading...</p>
            )}

            {error && (
                <p className="text-xs text-terracotta">{error}</p>
            )}

            <p className="text-xs text-textSub text-center">Click to change photo</p>
            </div>
        </>
    );
}
