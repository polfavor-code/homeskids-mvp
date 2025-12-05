"use client";

import React, { useEffect, useRef } from "react";

export type CaregiverAction = "disable" | "enable" | "remove";

interface CaregiverConfirmDialogProps {
    isOpen: boolean;
    caregiverName: string;
    intendedAction: CaregiverAction;
    currentStatus?: "active" | "inactive"; // Active = has homes, Inactive = no homes
    onCancel: () => void;
    onConfirm: (action: CaregiverAction) => void; // Passes the action back
    isLoading?: boolean;
}

/**
 * Confirmation dialog for caregiver actions.
 *
 * REMOVE action for active caregivers: Shows option to disable instead.
 * - "Disable access" = Remove all home connections (caregiver becomes inactive)
 * - "Remove caregiver" = Remove from family entirely
 *
 * REMOVE action for inactive caregivers: Shows option to enable instead.
 * - "Enable access" = Opens home selection (handled by parent)
 * - "Remove caregiver" = Remove from family entirely
 */
export default function CaregiverConfirmDialog({
    isOpen,
    caregiverName,
    intendedAction,
    currentStatus = "active",
    onCancel,
    onConfirm,
    isLoading = false,
}: CaregiverConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Focus trap and escape key handling
    useEffect(() => {
        if (!isOpen) return;

        cancelButtonRef.current?.focus();

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

    // Get icon based on action
    const getIcon = () => {
        if (intendedAction === "remove") {
            return (
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-red-500"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                    <line x1="18" y1="8" x2="23" y2="13" />
                    <line x1="23" y1="8" x2="18" y2="13" />
                </svg>
            );
        }
        return (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-forest"
            >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        );
    };

    // REMOVE action for ACTIVE caregiver - show disable alternative
    if (intendedAction === "remove" && currentStatus === "active") {
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
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                            {getIcon()}
                        </div>
                        <h2 id="dialog-title" className="text-xl font-dmSerif text-forest">
                            Remove caregiver?
                        </h2>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-textSub leading-relaxed">
                            If you only want to pause their access, you can disable them instead and re-enable anytime without sending a new invite.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            ref={cancelButtonRef}
                            onClick={onCancel}
                            disabled={isLoading}
                            className="btn-secondary flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm("disable")}
                            disabled={isLoading}
                            className="btn-primary flex-1 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                </span>
                            ) : (
                                "Disable access"
                            )}
                        </button>
                        <button
                            onClick={() => onConfirm("remove")}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // REMOVE action for INACTIVE caregiver - show enable alternative
    if (intendedAction === "remove" && currentStatus === "inactive") {
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
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                            {getIcon()}
                        </div>
                        <h2 id="dialog-title" className="text-xl font-dmSerif text-forest">
                            Remove caregiver?
                        </h2>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-textSub leading-relaxed">
                            You can re-enable their access, or remove them from your family completely.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            ref={cancelButtonRef}
                            onClick={onCancel}
                            disabled={isLoading}
                            className="btn-secondary flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm("enable")}
                            disabled={isLoading}
                            className="btn-primary flex-1 disabled:opacity-50"
                        >
                            Enable access
                        </button>
                        <button
                            onClick={() => onConfirm("remove")}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Standard dialog for disable/enable actions
    const getDialogContent = () => {
        switch (intendedAction) {
            case "disable":
                return {
                    title: "Disable access?",
                    body: `${caregiverName} will be removed from all homes and lose access to family information. You can re-enable their access anytime without sending a new invite.`,
                    confirmText: "Disable access",
                    confirmClass: "px-4 py-3 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors",
                };
            case "enable":
                return {
                    title: "Enable access?",
                    body: `Select which homes ${caregiverName} should have access to.`,
                    confirmText: "Select homes",
                    confirmClass: "btn-primary",
                };
            case "remove":
                return {
                    title: "Remove caregiver?",
                    body: `${caregiverName} will be permanently removed from your family. They will lose all access and you'll need to send a new invite if you want to add them again.`,
                    confirmText: "Remove",
                    confirmClass: "px-4 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors",
                };
        }
    };

    const content = getDialogContent();

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
                <div className="text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                        intendedAction === "remove" ? "bg-red-50" : "bg-cream"
                    }`}>
                        {getIcon()}
                    </div>
                    <h2 id="dialog-title" className="text-xl font-dmSerif text-forest">
                        {content.title}
                    </h2>
                </div>

                <div className="text-center">
                    <p className="text-sm text-textSub leading-relaxed">
                        {content.body}
                    </p>
                </div>

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
                        onClick={() => onConfirm(intendedAction)}
                        disabled={isLoading}
                        className={`flex-1 disabled:opacity-50 ${content.confirmClass}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                                Processing...
                            </span>
                        ) : (
                            content.confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
