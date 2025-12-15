"use client";

import React, { useEffect } from "react";
import Avatar from "./Avatar";

/**
 * ChildScopeSelector - Reusable component for selecting which child(ren) an entity belongs to
 * 
 * Used for: Add Home, Add Item, etc. where scope matters
 * Multi-select enabled, with validation support
 */

export interface ChildOption {
    id: string;
    name: string;
    avatarUrl?: string;
    avatarInitials?: string;
}

interface ChildScopeSelectorProps {
    childrenList: ChildOption[];
    selectedChildIds: string[];
    onChange: (selectedIds: string[]) => void;
    error?: string;
    disabled?: boolean;
}

export default function ChildScopeSelector({
    childrenList,
    selectedChildIds,
    onChange,
    error,
    disabled = false,
}: ChildScopeSelectorProps) {
    // Auto-select if only 1 child exists and nothing is selected
    useEffect(() => {
        if (childrenList.length === 1 && selectedChildIds.length === 0) {
            onChange([childrenList[0].id]);
        }
    }, [childrenList, selectedChildIds.length, onChange]);

    const handleToggle = (childId: string) => {
        if (disabled) return;
        
        if (selectedChildIds.includes(childId)) {
            // Deselect - but only if there are multiple children
            // If only 1 child, keep them selected
            if (childrenList.length > 1) {
                onChange(selectedChildIds.filter(id => id !== childId));
            }
        } else {
            // Select
            onChange([...selectedChildIds, childId]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, childId: string) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle(childId);
        }
    };

    // Edge case: No children exist
    if (childrenList.length === 0) {
        return (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-forest">Which child is this home for?</h3>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-800">
                        No children found. Please add a child first before creating a home.
                    </p>
                </div>
            </div>
        );
    }

    // Helper text based on selection and child count
    const getHelperText = () => {
        if (childrenList.length === 1) {
            return "This home will be saved for this child.";
        }
        if (selectedChildIds.length === 0) {
            return "Select which child(ren) this home belongs to.";
        }
        if (selectedChildIds.length === 1) {
            return "This home will be saved only for the selected child.";
        }
        return "This home will appear in multiple children's spaces.";
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-forest">Which child is this home for?</h3>
            
            {/* Child chips row - horizontal scroll on mobile */}
            <div className="flex flex-wrap gap-2">
                {childrenList.map((child) => {
                    const isSelected = selectedChildIds.includes(child.id);
                    
                    return (
                        <button
                            key={child.id}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-pressed={isSelected}
                            tabIndex={0}
                            onClick={() => handleToggle(child.id)}
                            onKeyDown={(e) => handleKeyDown(e, child.id)}
                            disabled={disabled}
                            className={`
                                flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all
                                focus:outline-none focus:ring-2 focus:ring-forest/30 focus:ring-offset-1
                                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                ${isSelected 
                                    ? "bg-forest text-white border-forest" 
                                    : "bg-white text-forest border-border hover:border-forest/50"
                                }
                            `}
                        >
                            <Avatar
                                src={child.avatarUrl}
                                initial={child.avatarInitials || child.name?.charAt(0)}
                                size={24}
                                className={isSelected ? "ring-2 ring-white/30" : ""}
                            />
                            <span className="text-sm font-medium">{child.name}</span>
                            {isSelected && (
                                <svg 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="3"
                                    className="ml-0.5"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Helper text - only show if multiple children */}
            {childrenList.length > 1 && (
                <p className="text-xs text-textSub">
                    {getHelperText()}
                </p>
            )}

            {/* Error message */}
            {error && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

/**
 * Helper to format the "Saving for" text
 */
export function formatSavingForText(selectedChildIds: string[], childrenList: ChildOption[]): string {
    if (selectedChildIds.length === 0) {
        return "";
    }
    if (selectedChildIds.length === 1) {
        const child = childrenList.find(c => c.id === selectedChildIds[0]);
        return `Saving for: ${child?.name || "1 child"}`;
    }
    return `Saving for: ${selectedChildIds.length} children`;
}

/**
 * Helper to format the success message
 */
export function formatSuccessMessage(selectedChildIds: string[], childrenList: ChildOption[]): string {
    if (selectedChildIds.length === 1) {
        const child = childrenList.find(c => c.id === selectedChildIds[0]);
        return `Home saved to ${child?.name || "child"}'s space`;
    }
    if (selectedChildIds.length === childrenList.length && childrenList.length > 1) {
        return `Home saved to all children's spaces`;
    }
    return `Home saved to ${selectedChildIds.length} children's spaces`;
}
