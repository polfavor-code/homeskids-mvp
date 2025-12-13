"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ItemPhotoProps {
    photoPath: string | undefined;
    itemName: string;
    className?: string;
    useOriginal?: boolean; // If true, load original instead of display version
}

/**
 * Get possible original paths from a display path.
 * Display: {family}/{timestamp}-{random}_display.jpg
 * Original: {family}/{timestamp}-{random}_original.{ext}
 * Returns array of possible paths to try (different extensions)
 */
function getPossibleOriginalPaths(displayPath: string): string[] {
    if (displayPath.includes('_original')) {
        return [displayPath]; // Already original
    }
    if (displayPath.includes('_display')) {
        const basePath = displayPath.replace('_display.jpg', '_original');
        // Try common image extensions
        return [
            `${basePath}.jpg`,
            `${basePath}.jpeg`,
            `${basePath}.JPG`,
            `${basePath}.JPEG`,
            `${basePath}.png`,
            `${basePath}.PNG`,
            `${basePath}.heic`,
            `${basePath}.HEIC`,
        ];
    }
    // Legacy path without suffix - return as is
    return [displayPath];
}

/**
 * Try to get a signed URL for a path. Returns null if not found.
 */
async function tryGetSignedUrl(path: string): Promise<string | null> {
    try {
        const { data, error } = await supabase.storage
            .from("item-photos")
            .createSignedUrl(path, 3600);

        if (error || !data) {
            return null;
        }
        return data.signedUrl;
    } catch {
        return null;
    }
}

export default function ItemPhoto({ photoPath, itemName, className = "", useOriginal = false }: ItemPhotoProps) {
    const [photoUrl, setPhotoUrl] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!photoPath) {
            setLoading(false);
            return;
        }

        const loadPhoto = async () => {
            try {
                if (useOriginal) {
                    // Try to find the original file by testing different extensions
                    const possiblePaths = getPossibleOriginalPaths(photoPath);
                    console.log("[ItemPhoto] Looking for original, trying paths:", possiblePaths);

                    for (const path of possiblePaths) {
                        const url = await tryGetSignedUrl(path);
                        if (url) {
                            console.log("[ItemPhoto] Found original at:", path);
                            setPhotoUrl(url);
                            setLoading(false);
                            return;
                        }
                    }

                    // No original found, fall back to display path
                    console.log("[ItemPhoto] No original found, falling back to display:", photoPath);
                    const fallbackUrl = await tryGetSignedUrl(photoPath);
                    if (fallbackUrl) {
                        setPhotoUrl(fallbackUrl);
                    }
                } else {
                    // Just load the display path directly
                    const url = await tryGetSignedUrl(photoPath);
                    if (url) {
                        setPhotoUrl(url);
                    }
                }
            } catch (err) {
                console.error("Failed to load photo:", err);
            } finally {
                setLoading(false);
            }
        };

        loadPhoto();
    }, [photoPath, useOriginal]);

    if (!photoPath || !photoUrl) {
        // Show placeholder
        return (
            <div className={`bg-gray-100 rounded-2xl flex items-center justify-center text-4xl font-bold text-gray-400 ${className}`}>
                {itemName.charAt(0)}
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`bg-gray-100 rounded-2xl flex items-center justify-center ${className}`}>
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <img
            src={photoUrl}
            alt={itemName}
            className={`rounded-2xl object-cover ${className}`}
        />
    );
}
