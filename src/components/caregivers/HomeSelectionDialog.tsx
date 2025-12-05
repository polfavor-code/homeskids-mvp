"use client";

import React, { useState, useEffect, useRef } from "react";
import { HomeProfile } from "@/lib/AppStateContext";

interface HomeSelectionDialogProps {
    isOpen: boolean;
    caregiverName: string;
    homes: HomeProfile[];
    onCancel: () => void;
    onConfirm: (selectedHomeIds: string[]) => void;
    isLoading?: boolean;
}

/**
 * Dialog for selecting which homes a caregiver should have access to.
 * Used when enabling an inactive caregiver.
 */
export default function HomeSelectionDialog({
    isOpen,
    caregiverName,
    homes,
    onCancel,
    onConfirm,
    isLoading = false,
}: HomeSelectionDialogProps) {
    const [selectedHomeIds, setSelectedHomeIds] = useState<string[]>([]);
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Reset selection when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedHomeIds([]);
            cancelButtonRef.current?.focus();
        }
    }, [isOpen]);

    // Escape key handling
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isLoading) {
                onCancel();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isLoading, onCancel]);

    // Prevent body scroll when dialog is open
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

    if (!isOpen) return null;

    const handleToggleHome = (homeId: string) => {
        setSelectedHomeIds(prev => {
            if (prev.includes(homeId)) {
                return prev.filter(id => id !== homeId);
            } else {
                return [...prev, homeId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedHomeIds.length === homes.length) {
            setSelectedHomeIds([]);
        } else {
            setSelectedHomeIds(homes.map(h => h.id));
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={!isLoading ? onCancel : undefined}
                aria-hidden="true"
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
                style={{ boxShadow: "0 20px 50px rgba(44, 62, 45, 0.15)" }}
            >
                {/* Header */}
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-softGreen flex items-center justify-center mx-auto mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <h2 id="dialog-title" className="text-xl font-dmSerif text-forest">
                        Select home access
                    </h2>
                </div>

                {/* Body */}
                <div>
                    <p className="text-sm text-textSub text-center mb-4">
                        Choose which homes <strong>{caregiverName}</strong> should have access to.
                    </p>

                    {/* Select all option */}
                    {homes.length > 1 && (
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="w-full text-left text-sm text-forest font-medium mb-3 hover:underline"
                        >
                            {selectedHomeIds.length === homes.length ? "Deselect all" : "Select all homes"}
                        </button>
                    )}

                    {/* Home list */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {homes.map((home) => {
                            const isSelected = selectedHomeIds.includes(home.id);
                            return (
                                <button
                                    key={home.id}
                                    type="button"
                                    onClick={() => handleToggleHome(home.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                        isSelected
                                            ? "bg-softGreen/50 border-forest/20"
                                            : "bg-white border-border hover:border-forest/30"
                                    }`}
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className={`flex-shrink-0 ${isSelected ? "text-forest" : "text-textSub"}`}
                                    >
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    <span className={`text-sm font-medium flex-1 text-left ${isSelected ? "text-forest" : "text-textSub"}`}>
                                        {home.name}
                                    </span>
                                    {isSelected && (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        ref={cancelButtonRef}
                        onClick={onCancel}
                        disabled={isLoading}
                        className="btn-secondary flex-1 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(selectedHomeIds)}
                        disabled={isLoading || selectedHomeIds.length === 0}
                        className="btn-primary flex-1 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            </span>
                        ) : (
                            `Enable access (${selectedHomeIds.length})`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
