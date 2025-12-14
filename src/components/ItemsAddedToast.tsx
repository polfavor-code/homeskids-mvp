"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useItemsAddedAlert, ItemsAddedAlert } from "@/lib/ItemsAddedAlertContext";
import { useAppState } from "@/lib/AppStateContext";

// Bag/items icon for the toast
function ItemsIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    );
}

interface ItemsAddedToastItemProps {
    alert: ItemsAddedAlert;
    onDismiss: () => void;
    onViewItems: () => void;
    showHomeName: boolean;
}

function ItemsAddedToastItem({ alert, onDismiss, onViewItems, showHomeName }: ItemsAddedToastItemProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };

    const handleViewItems = () => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss();
            onViewItems();
        }, 150);
    };

    // Build message
    const itemWord = alert.count === 1 ? "item" : "items";
    let message: string;

    if (showHomeName) {
        // User is in different home context
        message = `${alert.addedByDisplayName} added ${alert.count} ${itemWord} in ${alert.homeName}.`;
    } else {
        message = `${alert.addedByDisplayName} added ${alert.count} ${itemWord}.`;
    }

    // Determine title based on whether it's own items or not
    const title = alert.isOwnItems ? "Items added" : "New items";

    // Use success style for own items, info style for others
    const bgColor = alert.isOwnItems
        ? "bg-softGreen border-forest/20"
        : "bg-cream border-border";

    const iconBg = alert.isOwnItems
        ? "bg-forest/20 text-forest"
        : "bg-teal/20 text-teal";

    return (
        <div
            className={`
                ${bgColor}
                ${isExiting ? "animate-slide-out" : "animate-slide-in"}
                border rounded-2xl p-4 shadow-lg max-w-sm w-full
            `}
        >
            <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <ItemsIcon />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-forest text-sm">{title}</h4>
                    <p className="text-xs text-textSub mt-0.5">{message}</p>
                    <button
                        onClick={handleViewItems}
                        className="mt-2 text-xs text-teal font-semibold hover:text-forest transition-colors"
                    >
                        View items &rarr;
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

export function ItemsAddedToastContainer() {
    const router = useRouter();
    const { alerts, dismissAlert, markHomeItemsAsSeen } = useItemsAddedAlert();
    const { currentHomeId } = useAppState();

    if (alerts.length === 0) return null;

    const handleViewItems = async (alert: ItemsAddedAlert) => {
        // Mark items as seen for this home
        await markHomeItemsAsSeen(alert.homeId);

        // Navigate to items page
        // If it's a different home than current, we might want to switch or just go to items
        router.push(`/items?home=${alert.homeId}`);
    };

    return (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2">
            {alerts.map((alert) => (
                <ItemsAddedToastItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                    onViewItems={() => handleViewItems(alert)}
                    showHomeName={alert.homeId !== currentHomeId}
                />
            ))}
        </div>
    );
}
