"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "@/components/icons/DuotoneIcons";

export interface MultiSelectOption {
    value: string;
    label: string;
    description?: string;
}

interface MobileMultiSelectProps {
    values: string[];
    onChange: (values: string[]) => void;
    options: MultiSelectOption[];
    allOption?: {
        value: string;
        label: string;
    };
    placeholder?: string;
    label?: string;
    title?: string;
    className?: string;
    buttonClassName?: string;
}

export default function MobileMultiSelect({
    values,
    onChange,
    options,
    allOption,
    placeholder = "Select...",
    label,
    title,
    className = "",
    buttonClassName = "",
}: MobileMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Check if "all" is effectively selected (all individual options selected)
    const allIndividualIds = options.map(o => o.value);
    const isAllSelected = allOption ? allIndividualIds.every(id => values.includes(id)) : false;

    // Get display text
    const getDisplayText = () => {
        if (values.length === 0) return placeholder;
        if (isAllSelected && allOption) return allOption.label;

        const selectedLabels = options
            .filter(opt => values.includes(opt.value))
            .map(opt => opt.label);

        if (selectedLabels.length === 0) return placeholder;
        if (selectedLabels.length <= 2) return selectedLabels.join(", ");
        return `${selectedLabels.length} selected`;
    };

    const handleToggle = (optionValue: string) => {
        if (values.includes(optionValue)) {
            onChange(values.filter(v => v !== optionValue));
        } else {
            onChange([...values, optionValue]);
        }
    };

    const handleAllToggle = () => {
        if (isAllSelected) {
            // Deselect all
            onChange([]);
        } else {
            // Select all individual options
            onChange(allIndividualIds);
        }
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

    const Checkbox = ({ checked }: { checked: boolean }) => (
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            checked
                ? "bg-forest border-forest"
                : "border-gray-300 bg-white"
        }`}>
            {checked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
        </div>
    );

    return (
        <div className={`mobile-multi-select-container relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 border border-border rounded-xl text-sm bg-white focus:outline-none focus:border-forest transition-colors ${
                    values.length > 0 ? "text-forest" : "text-gray-400"
                } ${buttonClassName}`}
            >
                <span className="truncate">{getDisplayText()}</span>
                <ChevronDownIcon
                    size={16}
                    className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Desktop Dropdown */}
            {isOpen && (
                <div className="hidden sm:block absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[300px] overflow-y-auto py-1">
                    {/* Individual options */}
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleToggle(option.value)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
                        >
                            <Checkbox checked={values.includes(option.value)} />
                            <div>
                                <span className="text-gray-700">{option.label}</span>
                                {option.description && (
                                    <span className="block text-xs text-gray-400 mt-0.5">{option.description}</span>
                                )}
                            </div>
                        </button>
                    ))}

                    {/* All option at the bottom */}
                    {allOption && (
                        <button
                            type="button"
                            onClick={handleAllToggle}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left border-t border-gray-100 ${
                                isAllSelected ? "bg-softGreen/30" : "hover:bg-gray-50"
                            }`}
                        >
                            <Checkbox checked={isAllSelected} />
                            <span className={isAllSelected ? "text-forest font-semibold" : "text-gray-700"}>
                                {allOption.label}
                            </span>
                        </button>
                    )}
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

                    {/* Sheet */}
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
                            {/* Individual options */}
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleToggle(option.value)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left hover:bg-gray-50"
                                >
                                    <Checkbox checked={values.includes(option.value)} />
                                    <div>
                                        <span className="text-gray-700">{option.label}</span>
                                        {option.description && (
                                            <span className="block text-xs text-gray-400 mt-0.5">{option.description}</span>
                                        )}
                                    </div>
                                </button>
                            ))}

                            {/* All option at the bottom with separator */}
                            {allOption && (
                                <button
                                    type="button"
                                    onClick={handleAllToggle}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                        isAllSelected ? "bg-softGreen" : "hover:bg-gray-50"
                                    }`}
                                >
                                    <Checkbox checked={isAllSelected} />
                                    <span className={isAllSelected ? "text-forest font-semibold" : "text-gray-700"}>
                                        {allOption.label}
                                    </span>
                                </button>
                            )}
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
