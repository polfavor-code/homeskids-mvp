"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "@/components/icons/DuotoneIcons";

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
}

interface MobileSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    label?: string;
    title?: string; // Title for mobile bottom sheet
    className?: string;
    buttonClassName?: string;
    required?: boolean;
}

export default function MobileSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    label,
    title,
    className = "",
    buttonClassName = "",
    required = false,
}: MobileSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);
    const displayText = selectedOption?.label || placeholder;

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("click", handleClickOutside);
        }
        return () => document.removeEventListener("click", handleClickOutside);
    }, [isOpen]);

    // Prevent body scroll when mobile sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <div className={`mobile-select-container relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 border border-border rounded-xl text-sm bg-white focus:outline-none focus:border-forest transition-colors ${
                    value ? "text-forest" : "text-gray-400"
                } ${buttonClassName}`}
            >
                <span className="truncate">{displayText}</span>
                <ChevronDownIcon
                    size={16}
                    className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Desktop Dropdown */}
            {isOpen && (
                <div className="hidden sm:block absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[300px] overflow-y-auto py-1">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                                value === option.value
                                    ? "text-forest font-semibold bg-softGreen/30"
                                    : "text-gray-700"
                            }`}
                        >
                            <span>{option.label}</span>
                            {option.description && (
                                <span className="block text-xs text-gray-400 mt-0.5">{option.description}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Mobile Bottom Sheet */}
            {isOpen && (
                <div className="sm:hidden fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Sheet - positioned above mobile nav */}
                    <div className="absolute bottom-[90px] left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[60vh] overflow-hidden mx-3 rounded-3xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-lg font-dmSerif text-forest">{title || label || "Select"}</h2>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 text-forest"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Options */}
                        <div className="px-4 py-4 space-y-2 overflow-y-auto max-h-[calc(60vh-80px)]">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                                        value === option.value
                                            ? "bg-softGreen text-forest font-semibold"
                                            : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="text-left">
                                        <span>{option.label}</span>
                                        {option.description && (
                                            <span className="block text-xs text-gray-400 mt-0.5">{option.description}</span>
                                        )}
                                    </div>
                                    {value === option.value && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest flex-shrink-0">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
