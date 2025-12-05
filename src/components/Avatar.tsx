"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AvatarProps {
    // Direct URL (already signed or public)
    src?: string | null;
    // Path in Supabase storage (will be signed)
    storagePath?: string | null;
    // Bucket name for storage path
    bucket?: string;
    // Fallback initial letter
    initial?: string;
    // Fallback emoji
    emoji?: string;
    // Size in pixels
    size?: number;
    // Background color for initial/emoji
    bgColor?: string;
    // Additional class names
    className?: string;
}

// Emoji mapping for common labels
const labelEmojiMap: Record<string, string> = {
    daddy: "👨",
    dad: "👨",
    mommy: "👩",
    mom: "👩",
    grandma: "👵",
    grandmother: "👵",
    grandpa: "👴",
    grandfather: "👴",
    nanny: "👩‍🍼",
    babysitter: "👩‍🍼",
};

export function getEmojiForLabel(label: string): string {
    const key = label.toLowerCase().trim();
    return labelEmojiMap[key] || "👤";
}

export default function Avatar({
    src,
    storagePath,
    bucket = "avatars",
    initial,
    emoji,
    size = 40,
    bgColor = "#2C3E2D",
    className = "",
}: AvatarProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(src || null);
    const [loading, setLoading] = useState(!!storagePath && !src);
    const [error, setError] = useState(false);

    // Load signed URL from storage if storagePath is provided
    useEffect(() => {
        if (src) {
            setImageUrl(src);
            setLoading(false);
            return;
        }

        if (!storagePath) {
            setLoading(false);
            return;
        }

        const loadImage = async () => {
            try {
                const { data, error: urlError } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(storagePath, 3600); // 1 hour expiry

                if (urlError) {
                    console.error("Error getting signed URL:", urlError);
                    setError(true);
                } else {
                    setImageUrl(data.signedUrl);
                }
            } catch (err) {
                console.error("Failed to load avatar:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        loadImage();
    }, [src, storagePath, bucket]);

    const baseStyles: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        border: "2px solid white",
        boxShadow: "0 2px 8px rgba(44, 62, 45, 0.12)",
        flexShrink: 0,
    };

    // Show image if we have a valid URL and no error
    if (imageUrl && !error && !loading) {
        return (
            <div className={className} style={baseStyles}>
                <img
                    src={imageUrl}
                    alt="Avatar"
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    onError={() => setError(true)}
                />
            </div>
        );
    }

    // Show loading placeholder
    if (loading) {
        return (
            <div
                className={className}
                style={{
                    ...baseStyles,
                    backgroundColor: "#F0EDE5",
                }}
            >
                <div className="animate-pulse w-full h-full bg-gray-200 rounded-full" />
            </div>
        );
    }

    // Show initial if available
    if (initial) {
        return (
            <div
                className={className}
                style={{
                    ...baseStyles,
                    backgroundColor: bgColor,
                    color: "white",
                    fontWeight: 700,
                    fontSize: size * 0.4,
                }}
            >
                {initial.charAt(0).toUpperCase()}
            </div>
        );
    }

    // Show emoji fallback
    return (
        <div
            className={className}
            style={{
                ...baseStyles,
                backgroundColor: "#F0EDE5",
                fontSize: size * 0.5,
            }}
        >
            {emoji || "👤"}
        </div>
    );
}
