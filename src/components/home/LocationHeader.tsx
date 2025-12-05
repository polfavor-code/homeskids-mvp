"use client";

import React from "react";
import Avatar, { getEmojiForLabel } from "@/components/Avatar";
import { CaregiverProfile, ChildProfile } from "@/lib/AppStateContext";

interface LocationHeaderProps {
    child: ChildProfile | null;
    caregivers: CaregiverProfile[];
    selectedCaregiverId: string;
    onToggle: (caregiverId: string) => void;
}

export default function LocationHeader({
    child,
    caregivers,
    selectedCaregiverId,
    onToggle,
}: LocationHeaderProps) {
    const currentCaregiver = caregivers.find((c) => c.id === selectedCaregiverId);

    return (
        <div className="space-y-4">
            {/* Header Title */}
            <div>
                <h1 className="font-dmSerif text-xl text-forest">
                    {child?.name || "Child"}'s home right now
                </h1>
                <p className="text-sm text-textSub mt-0.5">Tap a home to switch location.</p>
            </div>

            {/* Floating Cards Grid */}
            <div
                className={`grid gap-3 ${caregivers.length === 2
                    ? "grid-cols-2"
                    : caregivers.length === 3
                        ? "grid-cols-2 sm:grid-cols-3"
                        : "grid-cols-2"
                    }`}
            >
                {caregivers.map((caregiver) => {
                    const isSelected = selectedCaregiverId === caregiver.id;

                    return (
                        <button
                            key={caregiver.id}
                            onClick={() => onToggle(caregiver.id)}
                            className={`
                                relative bg-white rounded-2xl p-4 text-left
                                transition-all duration-200 ease-out
                                ${isSelected
                                    ? "border-2 border-forest bg-gradient-to-br from-softGreen/50 to-softGreen shadow-lg transform scale-[1.02]"
                                    : "border border-border hover:border-forest/30 hover:shadow-md hover:-translate-y-1"
                                }
                            `}
                            style={{
                                boxShadow: isSelected
                                    ? "0 8px 24px rgba(44, 62, 45, 0.15)"
                                    : "0 2px 8px rgba(44, 62, 45, 0.05)",
                            }}
                        >
                            {/* Avatar Section */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative">
                                    {/* Parent Avatar */}
                                    <Avatar
                                        src={caregiver.avatarUrl}
                                        initial={caregiver.avatarInitials}
                                        emoji={getEmojiForLabel(caregiver.label)}
                                        size={48}
                                        bgColor="#2C3E2D"
                                    />

                                    {/* June's Avatar (overlapping) - only on active home */}
                                    {isSelected && (
                                        <div
                                            className="absolute transition-all duration-200 ease-out"
                                            style={{
                                                top: -4,
                                                left: 28,
                                                transform: "rotate(-3deg)",
                                            }}
                                        >
                                            <Avatar
                                                src={child?.avatarUrl}
                                                initial={child?.name?.charAt(0)}
                                                emoji="👧"
                                                size={32}
                                                bgColor="#D76F4B"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-forest text-base truncate">
                                        {caregiver.label}'s
                                    </h3>
                                </div>
                            </div>

                            {/* Status Badge */}
                            {isSelected ? (
                                <div className="inline-flex items-center gap-1.5 bg-forest text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                                    <span>🏠</span>
                                    <span>{child?.name || "Child"} is here</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 bg-cream text-textSub px-3 py-1.5 rounded-full text-xs font-medium border border-border">
                                    <span>Switch here</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

