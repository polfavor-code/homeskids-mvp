"use client";

import React from "react";
import Image from "next/image";

interface AvatarBubbleProps {
    src?: string | null;
    fallbackInitial?: string;
    fallbackEmoji?: string;
    size?: number;
    className?: string;
    bgColor?: string;
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
    auntie: "👩",
    uncle: "👨",
};

export function getEmojiForLabel(label: string): string {
    const key = label.toLowerCase().trim();
    return labelEmojiMap[key] || "🏠";
}

export default function AvatarBubble({
    src,
    fallbackInitial,
    fallbackEmoji,
    size = 40,
    className = "",
    bgColor = "#2C3E2D",
}: AvatarBubbleProps) {
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

    // Priority 1: Show image if src exists
    if (src) {
        return (
            <div className={className} style={baseStyles}>
                <Image
                    src={src}
                    alt="Avatar"
                    width={size}
                    height={size}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
            </div>
        );
    }

    // Priority 2: Show initial if available
    if (fallbackInitial) {
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
                {fallbackInitial.charAt(0).toUpperCase()}
            </div>
        );
    }

    // Priority 3: Show emoji fallback
    return (
        <div
            className={className}
            style={{
                ...baseStyles,
                backgroundColor: "#F0EDE5",
                fontSize: size * 0.5,
            }}
        >
            {fallbackEmoji || "👤"}
        </div>
    );
}
