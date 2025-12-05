import React from "react";

interface ArrowSeparatorProps {
    className?: string;
}

export default function ArrowSeparator({ className = "" }: ArrowSeparatorProps) {
    return (
        <div className={`flex justify-center py-1.5 ${className}`}>
            <div
                className="flex flex-col items-center"
                style={{ opacity: 0.2 }}
            >
                <div
                    className="w-px h-2 bg-gradient-to-b from-transparent to-forest/40"
                />
                <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-forest"
                >
                    <path
                        d="M5 6L0.5 0L9.5 0L5 6Z"
                        fill="currentColor"
                        fillOpacity="0.5"
                    />
                </svg>
            </div>
        </div>
    );
}
