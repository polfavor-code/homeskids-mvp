"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAwaitingLocationAlert, AwaitingLocationAlert } from "@/lib/AwaitingLocationAlertContext";

// Question mark icon for "awaiting location"
function QuestionIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

interface AwaitingLocationToastItemProps {
    alert: AwaitingLocationAlert;
    onDismiss: () => void;
    onViewItem: () => void;
}

function AwaitingLocationToastItem({ alert, onDismiss, onViewItem }: AwaitingLocationToastItemProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };

    const handleViewItem = () => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss();
            onViewItem();
        }, 150);
    };

    // Build message: "Paul marked an item as awaiting location"
    const message = `${alert.markedByFirstName} marked an item as awaiting location`;

    return (
        <div
            className={`
                bg-amber-50 border-amber-200
                ${isExiting ? "animate-slide-out" : "animate-slide-in"}
                border rounded-2xl p-4 shadow-lg max-w-sm w-full
            `}
        >
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <QuestionIcon />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-amber-800 text-sm">Awaiting location</h4>
                    <p className="text-xs text-amber-700 mt-0.5">{message}</p>
                    <p className="text-xs text-amber-600 mt-0.5 truncate">
                        &quot;{alert.itemName}&quot;
                    </p>
                    <button
                        onClick={handleViewItem}
                        className="mt-2 text-xs text-amber-700 font-semibold hover:text-amber-900 transition-colors"
                    >
                        Help locate &rarr;
                    </button>
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-amber-400 hover:text-amber-600 p-1 -mr-1 -mt-1"
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 4L4 12M4 4L12 12" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export function AwaitingLocationToastContainer() {
    const router = useRouter();
    const { alerts, dismissAlert } = useAwaitingLocationAlert();

    if (alerts.length === 0) return null;

    const handleViewItem = (alert: AwaitingLocationAlert) => {
        // Navigate to awaiting location page
        router.push("/items/awaiting-location");
    };

    return (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2">
            {alerts.map((alert) => (
                <AwaitingLocationToastItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                    onViewItem={() => handleViewItem(alert)}
                />
            ))}
        </div>
    );
}
