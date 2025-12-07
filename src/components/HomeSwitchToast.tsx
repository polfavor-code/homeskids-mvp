"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useHomeSwitchAlert, HomeSwitchAlert } from "@/lib/HomeSwitchAlertContext";

// Home icon for the toast
function HomeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

interface HomeSwitchToastItemProps {
    alert: HomeSwitchAlert;
    onDismiss: () => void;
    onViewItems: () => void;
}

function HomeSwitchToastItem({ alert, onDismiss, onViewItems }: HomeSwitchToastItemProps) {
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

    // Build message based on whether it's own action or from other user
    let title: string;
    let message: string;

    if (alert.isOwnAction) {
        title = alert.movedCount > 0 ? "Items moved with the bag" : "Home switched";
        if (alert.movedCount > 0) {
            message = `${alert.movedCount} item(s) moved from ${alert.fromHomeName} to ${alert.toHomeName}.`;
        } else {
            message = `${alert.childName}'s home was switched to ${alert.toHomeName}.`;
        }
    } else {
        title = `${alert.childName} arrived`;
        message = `${alert.childName} was switched from ${alert.fromHomeName} to ${alert.toHomeName}.`;
    }

    // Use success style for own action with items, info style for others
    const bgColor = alert.isOwnAction && alert.movedCount > 0
        ? "bg-softGreen border-forest/20"
        : "bg-cream border-border";

    const iconBg = alert.isOwnAction && alert.movedCount > 0
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
                    <HomeIcon />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-forest text-sm">{title}</h4>
                    <p className="text-xs text-textSub mt-0.5">{message}</p>
                    {alert.movedCount > 0 && (
                        <button
                            onClick={handleViewItems}
                            className="mt-2 text-xs text-teal font-semibold hover:text-forest transition-colors"
                        >
                            Review items &rarr;
                        </button>
                    )}
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

export function HomeSwitchToastContainer() {
    const router = useRouter();
    const { alerts, dismissAlert } = useHomeSwitchAlert();

    if (alerts.length === 0) return null;

    const handleViewItems = (alert: HomeSwitchAlert) => {
        router.push("/items/travel-bag?tab=previous");
    };

    return (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2">
            {alerts.map((alert) => (
                <HomeSwitchToastItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                    onViewItems={() => handleViewItems(alert)}
                />
            ))}
        </div>
    );
}
