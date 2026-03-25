"use client";

import React from "react";
import { HouseholdMember, PetSpecies } from "@/lib/AppStateContext";
import { Dog, Cat, Bird, Fish, Turtle, Rabbit, PawPrint } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Get icon for pet species
export function getSpeciesIcon(species: PetSpecies | string | undefined): LucideIcon {
    switch (species) {
        case "dog":
            return Dog;
        case "cat":
            return Cat;
        case "bird":
            return Bird;
        case "fish":
            return Fish;
        case "reptile":
            return Turtle;
        case "small_mammal":
            return Rabbit;
        default:
            return PawPrint;
    }
}

export interface HouseholdMemberFilterProps {
    /** All household members (children + pets) */
    members: HouseholdMember[];
    /** Currently selected member IDs */
    selectedMemberIds: Set<string>;
    /** Callback when a member is toggled */
    onToggleMember: (memberId: string) => void;
    /** Optional: Set of member IDs that have relevant data. Others shown greyed out */
    membersWithData?: Set<string>;
    /** Optional: callback to select all members with data */
    onSelectAllWithData?: () => void;
    /** Optional: layout mode */
    layout?: "scroll" | "wrap";
    /** Optional: custom class name */
    className?: string;
    /** Optional: show "Select all" button when none selected */
    showSelectAllButton?: boolean;
}

/**
 * HouseholdMemberFilter - Reusable multi-member selector
 *
 * Shows avatars for all household members (children + pets).
 * Users can click to select/deselect members for filtering data on a page.
 * Members without relevant data are shown greyed out and disabled.
 *
 * Extracted from Day Hub's family member filter pattern.
 */
export default function HouseholdMemberFilter({
    members,
    selectedMemberIds,
    onToggleMember,
    membersWithData,
    onSelectAllWithData,
    layout = "wrap",
    className = "",
    showSelectAllButton = true,
}: HouseholdMemberFilterProps) {
    if (members.length === 0) {
        return null;
    }

    // If no membersWithData provided, assume all members have data
    const hasDataSet = membersWithData || new Set(members.map((m) => m.id));

    // Check if no members are selected but some have data
    const noneSelected = selectedMemberIds.size === 0;
    const someHaveData = members.some((m) => hasDataSet.has(m.id));

    return (
        <div className={`${className}`}>
            <div
                className={`flex items-center justify-center gap-3 ${
                    layout === "scroll" ? "overflow-x-auto pb-2" : "flex-wrap"
                }`}
            >
                {members.map((member) => {
                    const isSelected = selectedMemberIds.has(member.id);
                    const hasData = hasDataSet.has(member.id);
                    const isClickable = hasData;

                    // Get icon for pets
                    const PetIcon = member.isPet ? getSpeciesIcon(member.species) : null;

                    return (
                        <button
                            key={member.id}
                            onClick={() => isClickable && onToggleMember(member.id)}
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-1.5 transition-all ${
                                !isClickable ? "cursor-not-allowed" : "cursor-pointer"
                            }`}
                        >
                            {/* Avatar with selection ring */}
                            <div
                                className={`relative transition-all ${
                                    isSelected && hasData
                                        ? "ring-2 ring-forest ring-offset-2 ring-offset-cream rounded-full"
                                        : ""
                                } ${
                                    !hasData
                                        ? "opacity-30 grayscale"
                                        : isSelected
                                        ? ""
                                        : "opacity-100"
                                }`}
                            >
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                                    style={{
                                        backgroundColor: member.avatarUrl
                                            ? "#f3f4f6"
                                            : member.avatarColor || (member.isChild ? "#E0F2F1" : "#D4EDDA"),
                                    }}
                                >
                                    {member.avatarUrl ? (
                                        <img
                                            src={member.avatarUrl}
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : PetIcon ? (
                                        <PetIcon size={24} className="text-forest" />
                                    ) : (
                                        <span className="text-lg font-semibold text-forest">
                                            {member.avatarInitials || member.name[0]}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Name label */}
                            <span
                                className={`text-[11px] font-medium max-w-[60px] truncate ${
                                    !hasData
                                        ? "text-textSub/50"
                                        : isSelected
                                        ? "text-forest"
                                        : "text-textSub"
                                }`}
                            >
                                {member.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Show "Select all" button if none selected and some have data */}
            {showSelectAllButton && noneSelected && someHaveData && onSelectAllWithData && (
                <div className="flex justify-center mt-3">
                    <button
                        onClick={onSelectAllWithData}
                        className="text-sm text-forest font-medium hover:underline"
                    >
                        Show all members
                    </button>
                </div>
            )}
        </div>
    );
}
