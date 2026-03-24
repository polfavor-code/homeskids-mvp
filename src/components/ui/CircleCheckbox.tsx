"use client";

import { useState, useEffect } from "react";

interface CircleCheckboxProps {
    checked: boolean;
    onChange?: () => void;
    disabled?: boolean;
    size?: number;
    className?: string;
}

export function CircleCheckbox({
    checked,
    onChange,
    disabled = false,
    size = 28,
    className = "",
}: CircleCheckboxProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [showCheck, setShowCheck] = useState(checked);

    useEffect(() => {
        setShowCheck(checked);
    }, [checked]);

    const handleClick = () => {
        if (disabled || !onChange) return;

        setIsAnimating(true);
        onChange();

        setTimeout(() => {
            setIsAnimating(false);
        }, 300);
    };

    const sharedClassName = `
        relative flex items-center justify-center
        rounded-lg transition-all duration-300 ease-out
        ${isAnimating ? "scale-95" : "scale-100"}
        ${className}
    `;

    const sharedStyle = {
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
    };

    const content = (
        <>
            {/* Checkbox background */}
            <div
                className={`
                    absolute inset-0 rounded-lg transition-all duration-300 ease-out
                    ${showCheck
                        ? "bg-forest"
                        : "bg-white border border-gray-300"
                    }
                    ${isAnimating && !checked ? "animate-check-bounce" : ""}
                `}
            />

            {/* Checkmark SVG */}
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`
                    relative z-10 transition-all duration-300 ease-out
                    ${showCheck ? "opacity-100 scale-100" : "opacity-0 scale-75"}
                `}
                style={{
                    width: size * 0.55,
                    height: size * 0.55,
                }}
            >
                <path
                    d="M5 12.5L10 17.5L19 6.5"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={showCheck ? "animate-draw-check" : ""}
                    style={{
                        strokeDasharray: 24,
                        strokeDashoffset: showCheck ? 0 : 24,
                    }}
                />
            </svg>
        </>
    );

    // Render as div when no onChange (purely visual, can be inside a button)
    if (!onChange) {
        return (
            <div
                className={sharedClassName}
                style={sharedStyle}
            >
                {content}
            </div>
        );
    }

    // Render as button when interactive
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={disabled}
            onClick={handleClick}
            className={`
                ${sharedClassName}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2
                ${disabled ? "cursor-default" : "cursor-pointer"}
            `}
            style={sharedStyle}
        >
            {content}
        </button>
    );
}
