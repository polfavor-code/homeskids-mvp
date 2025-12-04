"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ItemPhotoProps {
    photoPath: string | undefined;
    itemName: string;
    className?: string;
}

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
