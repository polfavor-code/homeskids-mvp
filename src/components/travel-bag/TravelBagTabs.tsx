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
        <div className="flex gap-2 border-b border-border/30 pb-3 mb-4">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${activeTab === tab.id
                            ? "bg-forest text-white"
                            : "bg-cream/70 text-forest/70 hover:bg-cream hover:text-forest"
                        }
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
