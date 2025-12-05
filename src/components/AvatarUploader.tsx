"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { supabase } from "@/lib/supabase";

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
        try {
            setError("");
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;

            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                throw uploadError;
            }

            // Update profile with new avatar path
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: fileName })
                .eq("id", userId);

            if (updateError) {
                throw updateError;
            }

            // Load the new avatar
            await loadAvatar(fileName);

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

    const initials = userName.charAt(0).toUpperCase();

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative group">
                <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
                <label
                    htmlFor="avatar-upload"
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
                </label>
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
    );
}
