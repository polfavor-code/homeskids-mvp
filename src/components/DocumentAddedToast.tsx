"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDocumentAddedAlert, DocumentAddedAlert } from "@/lib/DocumentAddedAlertContext";

// Document icon for the toast
function DocumentIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

// Category labels
const categoryLabels: Record<string, string> = {
    id: "ID",
    school: "School",
    health: "Health",
    travel: "Travel",
    legal: "Legal",
    other: "Other",
};

interface DocumentAddedToastItemProps {
    alert: DocumentAddedAlert;
    onDismiss: () => void;
    onViewDocuments: () => void;
}

function DocumentAddedToastItem({ alert, onDismiss, onViewDocuments }: DocumentAddedToastItemProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };

    const handleViewDocuments = () => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss();
            onViewDocuments();
        }, 150);
    };

    // Build message based on whether it's own action or from other user
    let title: string;
    let message: string;

    if (alert.isOwnAction) {
        title = "Document added";
        message = `"${alert.documentName}" was added to ${categoryLabels[alert.documentCategory] || "Documents"}.`;
    } else {
        title = "New document added";
        message = `${alert.addedByName} added "${alert.documentName}" to ${categoryLabels[alert.documentCategory] || "Documents"}.`;
    }

    return (
        <div
            className={`
                bg-cream border-border
                ${isExiting ? "animate-slide-out" : "animate-slide-in"}
                border rounded-2xl p-4 shadow-lg max-w-sm w-full
            `}
        >
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-teal/20 text-teal flex items-center justify-center flex-shrink-0">
                    <DocumentIcon />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-forest text-sm">{title}</h4>
                    <p className="text-xs text-textSub mt-0.5">{message}</p>
                    <button
                        onClick={handleViewDocuments}
                        className="mt-2 text-xs text-teal font-semibold hover:text-forest transition-colors"
                    >
                        View documents &rarr;
                    </button>
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-textSub/50 hover:text-textSub p-1 -mr-1 -mt-1"
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 4L4 12M4 4L12 12" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export function DocumentAddedToastContainer() {
    const router = useRouter();
    const { alerts, dismissAlert } = useDocumentAddedAlert();

    if (alerts.length === 0) return null;

    const handleViewDocuments = () => {
        router.push("/documents");
    };

    return (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2">
            {alerts.map((alert) => (
                <DocumentAddedToastItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                    onViewDocuments={handleViewDocuments}
                />
            ))}
        </div>
    );
}
