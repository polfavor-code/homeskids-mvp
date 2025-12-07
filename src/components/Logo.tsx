"use client";

import React from "react";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    variant?: "dark" | "light"; // light = white logo for dark backgrounds
    showText?: boolean;
}

export default function Logo({ size = "md", variant = "dark", showText = true }: LogoProps) {
    const sizes = {
        sm: { svg: 48, text: 20 },
        md: { svg: 72, text: 28 },
        lg: { svg: 120, text: 42 },
    };

    const { svg: svgSize, text: textSize } = sizes[size];
    const isLight = variant === "light";

    return (
        <div className="flex flex-col items-center gap-3">
            <svg
                width={svgSize}
                height={svgSize * 0.83}
                viewBox="0 0 120 100"
                className="overflow-visible"
            >
                <defs>
                    <linearGradient id={`logoGrad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={isLight ? "#FFFFFF" : "#2C3E2D"} />
                        <stop offset="100%" stopColor={isLight ? "#FFFFFF" : "#4CA1AF"} />
                    </linearGradient>
                </defs>

                {/* House 1 (Left, Back) */}
                <path
                    d="M15 45V75H45V45L30 30Z"
                    stroke={`url(#logoGrad-${variant})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={`url(#logoGrad-${variant})`}
                    fillOpacity={isLight ? 0.3 : 0.15}
                    opacity={0.6}
                />

                {/* House 2 (Right, Back) */}
                <path
                    d="M75 45V75H105V45L90 30Z"
                    stroke={`url(#logoGrad-${variant})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={`url(#logoGrad-${variant})`}
                    fillOpacity={isLight ? 0.3 : 0.15}
                    opacity={0.6}
                />

                {/* House 3 (Center, Front) */}
                <path
                    d="M35 85V50L60 25L85 50V85H35Z"
                    stroke={`url(#logoGrad-${variant})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={`url(#logoGrad-${variant})`}
                    fillOpacity={isLight ? 0.3 : 0.15}
                />

                {/* Ground Line */}
                <path
                    d="M10 85H110"
                    stroke={`url(#logoGrad-${variant})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>

            {showText && (
                <span
                    className={`font-dmSerif ${!isLight ? "bg-gradient-to-br from-forest to-teal bg-clip-text text-transparent" : ""}`}
                    style={{
                        fontSize: textSize,
                        color: isLight ? "white" : undefined,
                    }}
                >
                    homes.kids
                </span>
            )}
        </div>
    );
}
