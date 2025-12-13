"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Item } from "@/lib/mockData";
import { CloseIcon } from "@/components/icons/DuotoneIcons";

interface MissingItemAlertProps {
    missingItems: Item[];
}

export default function MissingItemAlert({ missingItems }: MissingItemAlertProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [viewed, setViewed] = useState<Set<string>>(new Set());

    // Load dismissed and viewed state from localStorage
    useEffect(() => {
        const dismissedStr = localStorage.getItem("dismissedMissingAlerts");
        const viewedStr = localStorage.getItem("viewedMissingAlerts");

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
        // Dismiss all current missing items
        const newDismissed = new Set(dismissed);
        missingItems.forEach(item => newDismissed.add(item.id));
        setDismissed(newDismissed);
        localStorage.setItem("dismissedMissingAlerts", JSON.stringify(Array.from(newDismissed)));
    };

    const handleView = () => {
        // Mark all current missing items as viewed
        const newViewed = new Set(viewed);
        missingItems.forEach(item => newViewed.add(item.id));
        setViewed(newViewed);
        localStorage.setItem("viewedMissingAlerts", JSON.stringify(Array.from(newViewed)));
    };

    // Filter to items that haven't been dismissed or viewed
    const activeAlerts = missingItems.filter(item => !dismissed.has(item.id) && !viewed.has(item.id));

    if (activeAlerts.length === 0) return null;

    // Build the message based on count
    const alertMessage = activeAlerts.length === 1
        ? `${activeAlerts[0].name} is missing`
        : `${activeAlerts.length} items are missing`;

    return (
        <div className="bg-terracotta text-white p-4 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0" aria-label="Warning">⚠️</span>
                <span className="font-semibold text-[15px] truncate">{alertMessage}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                    href="/items/missing"
                    onClick={handleView}
                    className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors"
                >
                    View
                </Link>
                <button
                    onClick={handleDismiss}
                    className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors opacity-60 hover:opacity-100"
                    aria-label="Dismiss alert"
                >
                    <CloseIcon size={14} />
                </button>
            </div>
        </div>
    );
}
