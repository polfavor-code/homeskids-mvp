"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ItemPhotoProps {
    photoPath: string | undefined;
    itemName: string;
    className?: string;
}

/**
 * Renders an item image fetched from Supabase storage or a fallback placeholder while loading or when no photo exists.
 *
 * Renders a placeholder with the item's initial if `photoPath` is not provided or a signed URL is not available, a loading placeholder while the signed URL is being retrieved, and the image element when the signed URL is obtained.
 *
 * @param photoPath - Path to the photo in Supabase storage; when undefined or empty a placeholder is shown
 * @param itemName - Item name used for the image `alt` attribute and the placeholder initial
 * @param className - Optional additional CSS classes applied to the rendered element
 * @returns A JSX element displaying the image, a loading state, or a placeholder depending on `photoPath` and fetch status
 */
export default function ItemPhoto({ photoPath, itemName, className = "" }: ItemPhotoProps) {
    const [photoUrl, setPhotoUrl] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!photoPath) {
            setLoading(false);
            return;
        }

        const getSignedUrl = async () => {
            try {
                const { data, error } = await supabase.storage
                    .from("item-photos")
                    .createSignedUrl(photoPath, 3600); // 1 hour expiry

                if (error) {
                    console.error("Error getting signed URL:", error);
                    setLoading(false);
                    return;
                }

                setPhotoUrl(data.signedUrl);
            } catch (err) {
                console.error("Failed to load photo:", err);
            } finally {
                setLoading(false);
            }
        };

        getSignedUrl();
    }, [photoPath]);

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