"use client";

import React from "react";

export type TravelBagTab = "current" | "previous" | "history";

interface TravelBagTabsProps {
    activeTab: TravelBagTab;
    onTabChange: (tab: TravelBagTab) => void;
}

export default function TravelBagTabs({ activeTab, onTabChange }: TravelBagTabsProps) {
    const tabs: { id: TravelBagTab; label: string }[] = [
        { id: "current", label: "Current packlist" },
        { id: "previous", label: "Previous trip" },
        { id: "history", label: "Bag history" },
    ];

    return (
        <div className="flex gap-1.5">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
                        px-3 py-1.5 rounded-full text-xs font-medium transition-all
                        ${activeTab === tab.id
                            ? "bg-forest text-white"
                            : "bg-transparent text-gray-400 hover:text-gray-600"
                        }
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
