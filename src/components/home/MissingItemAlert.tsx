"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Item } from "@/lib/mockData";
import { CloseIcon } from "@/components/icons/DuotoneIcons";

interface AwaitingLocationAlertProps {
    awaitingLocationItems: Item[];
}

export default function AwaitingLocationAlert({ awaitingLocationItems }: AwaitingLocationAlertProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [viewed, setViewed] = useState<Set<string>>(new Set());

    // Load dismissed and viewed state from localStorage
    useEffect(() => {
        const dismissedStr = localStorage.getItem("dismissedAwaitingLocationAlerts");
        const viewedStr = localStorage.getItem("viewedAwaitingLocationAlerts");

        if (dismissedStr) {
            try {
                setDismissed(new Set(JSON.parse(dismissedStr)));
            } catch (e) {
                // Ignore parse errors
            }
        }

        if (viewedStr) {
            try {
                setViewed(new Set(JSON.parse(viewedStr)));
            } catch (e) {
                // Ignore parse errors
            }
        }
    }, []);

    const handleDismiss = () => {
        // Dismiss all current awaiting location items
        const newDismissed = new Set(dismissed);
        awaitingLocationItems.forEach(item => newDismissed.add(item.id));
        setDismissed(newDismissed);
        localStorage.setItem("dismissedAwaitingLocationAlerts", JSON.stringify(Array.from(newDismissed)));
    };

    const handleView = () => {
        // Mark all current awaiting location items as viewed
        const newViewed = new Set(viewed);
        awaitingLocationItems.forEach(item => newViewed.add(item.id));
        setViewed(newViewed);
        localStorage.setItem("viewedAwaitingLocationAlerts", JSON.stringify(Array.from(newViewed)));
    };

    // Filter to items that haven't been dismissed or viewed
    const activeAlerts = awaitingLocationItems.filter(item => !dismissed.has(item.id) && !viewed.has(item.id));

    if (activeAlerts.length === 0) return null;

    // Build the message based on count - neutral, non-alarming language
    const alertMessage = activeAlerts.length === 1
        ? `${activeAlerts[0].name} is awaiting location`
        : `${activeAlerts.length} items awaiting location`;

    return (
        <div className="bg-gray-100 text-gray-700 p-4 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0" aria-label="Info">📍</span>
                <span className="font-medium text-[15px] truncate">{alertMessage}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                    href="/items/awaiting-location"
                    onClick={handleView}
                    className="bg-forest text-white hover:bg-forest/90 px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors"
                >
                    View
                </Link>
                <button
                    onClick={handleDismiss}
                    className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors opacity-60 hover:opacity-100"
                    aria-label="Dismiss alert"
                >
                    <CloseIcon size={14} />
                </button>
            </div>
        </div>
    );
}
