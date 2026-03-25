"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState, Household, HouseholdMember, HouseholdRole } from "@/lib/AppStateContext";
import Avatar from "@/components/Avatar";
import { ChevronDownIcon } from "@/components/icons/DuotoneIcons";

interface HouseholdSwitcherProps {
    /** Whether sidebar is collapsed */
    isCollapsed: boolean;
}

// Role badge component
function RoleBadge({ role }: { role: HouseholdRole }) {
    const styles: Record<HouseholdRole, string> = {
        owner: "bg-teal/10 text-teal",
        caregiver: "bg-orange-100 text-orange-600",
        helper: "bg-gray-100 text-gray-600",
    };
    const labels: Record<HouseholdRole, string> = {
        owner: "Owner",
        caregiver: "Caregiver",
        helper: "View only",
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[role]}`}>
            {labels[role]}
        </span>
    );
}

// Stacked avatars for household members
function MemberAvatarStack({
    members,
    maxDisplay = 4,
    size = 24,
}: {
    members: HouseholdMember[];
    maxDisplay?: number;
    size?: number;
}) {
    const displayed = members.slice(0, maxDisplay);
    const overflow = members.length - maxDisplay;

    return (
        <div className="flex items-center" style={{ marginLeft: size * 0.3 }}>
            {displayed.map((member, idx) => (
                <div
                    key={member.id}
                    style={{
                        marginLeft: idx === 0 ? 0 : -(size * 0.3),
                        zIndex: maxDisplay - idx,
                    }}
                >
                    <Avatar
                        src={member.avatarUrl}
                        initial={member.avatarInitials || member.name[0]}
                        size={size}
                        bgColor={member.avatarColor || (member.isChild ? "#4A7C59" : "#22C55E")}
                    />
                </div>
            ))}
            {overflow > 0 && (
                <div
                    className="flex items-center justify-center bg-gray-200 text-gray-600 text-xs font-bold rounded-full border-2 border-white"
                    style={{
                        width: size,
                        height: size,
                        marginLeft: -(size * 0.3),
                        zIndex: 0,
                    }}
                >
                    +{overflow}
                </div>
            )}
        </div>
    );
}

/**
 * HouseholdSwitcher - Sidebar component for switching between households
 *
 * Shows current household with member avatars and user role.
 * When clicked, opens dropdown to switch to another household.
 *
 * Replaces the child switcher in the sidebar footer.
 */
export default function HouseholdSwitcher({ isCollapsed }: HouseholdSwitcherProps) {
    const router = useRouter();
    const {
        households,
        currentHousehold,
        setCurrentHouseholdId,
        householdMembers,
    } = useAppState();

    const [isOpen, setIsOpen] = useState(false);

    // Don't render if no household
    if (!currentHousehold || households.length === 0) {
        return null;
    }

    const hasMultipleHouseholds = households.length > 1;

    const handleSwitch = (householdId: string) => {
        if (householdId === currentHousehold.id) {
            // Navigate to manage page
            router.push("/manage");
        } else {
            setCurrentHouseholdId(householdId);
        }
        setIsOpen(false);
    };

    // Collapsed view: single avatar with count badge
    if (isCollapsed) {
        const firstMember = householdMembers[0];
        const otherCount = householdMembers.length - 1;

        return (
            <div className="relative flex flex-col items-center px-2 py-3 border-t border-border">
                <button
                    onClick={() => hasMultipleHouseholds && setIsOpen(!isOpen)}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                        hasMultipleHouseholds ? "hover:bg-softGreen/50 cursor-pointer" : ""
                    }`}
                    title={currentHousehold.name}
                    disabled={!hasMultipleHouseholds}
                >
                    {/* Single avatar with count badge */}
                    <div className="relative">
                        {firstMember ? (
                            <Avatar
                                src={firstMember.avatarUrl}
                                initial={firstMember.avatarInitials || firstMember.name[0]}
                                size={36}
                                bgColor={firstMember.avatarColor || (firstMember.isChild ? "#4A7C59" : "#22C55E")}
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-forest/20 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </svg>
                            </div>
                        )}
                        {/* Count badge */}
                        {otherCount > 0 && (
                            <div className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] bg-forest text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-cream">
                                +{otherCount}
                            </div>
                        )}
                    </div>
                    {/* Multiple households indicator */}
                    {hasMultipleHouseholds && (
                        <ChevronDownIcon size={12} className={`text-textSub transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    )}
                </button>

                {/* Collapsed dropdown - positioned to the right of sidebar */}
                {isOpen && hasMultipleHouseholds && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="fixed left-16 bottom-16 bg-white rounded-2xl border border-border shadow-2xl overflow-hidden z-50 w-72">
                            <div className="px-4 py-3 border-b border-border/50">
                                <p className="text-xs font-semibold text-textSub uppercase tracking-wider">
                                    Switch household
                                </p>
                            </div>
                            <div className="p-2 space-y-1">
                                {households.map((household) => {
                                    const isActive = household.id === currentHousehold.id;
                                    const hMembers: HouseholdMember[] = [
                                        ...household.children.map((c) => ({
                                            id: `child-${c.id}`,
                                            entityId: c.id,
                                            name: c.name,
                                            type: "child" as const,
                                            avatarUrl: c.avatarUrl,
                                            avatarInitials: c.avatarInitials,
                                            isChild: true,
                                            isPet: false,
                                        })),
                                        ...household.pets.map((p) => ({
                                            id: `pet-${p.id}`,
                                            entityId: p.id,
                                            name: p.name,
                                            type: (p.species || "other") as HouseholdMember["type"],
                                            avatarUrl: p.avatarUrl,
                                            avatarInitials: p.avatarInitials,
                                            avatarColor: p.avatarColor,
                                            isChild: false,
                                            isPet: true,
                                            species: p.species,
                                        })),
                                    ];
                                    return (
                                        <button
                                            key={household.id}
                                            onClick={() => handleSwitch(household.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                isActive
                                                    ? "bg-softGreen"
                                                    : "hover:bg-cream"
                                            }`}
                                        >
                                            {/* Checkmark first (placeholder for alignment) */}
                                            <div className="w-5 h-5 flex-shrink-0">
                                                {isActive && (
                                                    <div className="w-5 h-5 rounded-full bg-forest flex items-center justify-center">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Name */}
                                            <span className={`flex-1 text-sm text-left ${isActive ? "font-semibold text-forest" : "text-forest"}`}>
                                                {household.name}
                                            </span>
                                            {/* Right: Avatars */}
                                            <MemberAvatarStack members={hMembers} maxDisplay={3} size={24} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Expanded view with dropdown
    return (
        <div className="px-3 py-3 border-t border-border">
            <div className="relative">
                {/* Trigger button - horizontal layout with name on left, avatars on right */}
                <button
                    onClick={() => hasMultipleHouseholds && setIsOpen(!isOpen)}
                    className={`w-full px-3 py-3 rounded-xl border transition-all ${
                        isOpen
                            ? "bg-white border-forest/20 shadow-sm"
                            : "bg-softGreen/50 border-border hover:border-forest/20 hover:bg-white"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {/* Left: name + badge */}
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-forest leading-tight mb-1 truncate">
                                {currentHousehold.name}
                            </p>
                            <RoleBadge role={currentHousehold.userRole} />
                        </div>
                        {/* Right: avatars */}
                        <MemberAvatarStack members={householdMembers} maxDisplay={3} size={28} />
                        {/* Chevron */}
                        {hasMultipleHouseholds && (
                            <ChevronDownIcon
                                size={16}
                                className={`text-textSub transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                            />
                        )}
                    </div>
                </button>

                {/* Dropdown */}
                {isOpen && hasMultipleHouseholds && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown panel */}
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl border border-border shadow-2xl overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-border/50">
                                <p className="text-xs font-semibold text-textSub uppercase tracking-wider">
                                    Switch household
                                </p>
                            </div>
                            <div className="p-2 space-y-1 max-h-[50vh] overflow-y-auto">
                                {households.map((household) => {
                                    const isActive = household.id === currentHousehold.id;
                                    const hMembers: HouseholdMember[] = [
                                        ...household.children.map((c) => ({
                                            id: `child-${c.id}`,
                                            entityId: c.id,
                                            name: c.name,
                                            type: "child" as const,
                                            avatarUrl: c.avatarUrl,
                                            avatarInitials: c.avatarInitials,
                                            isChild: true,
                                            isPet: false,
                                        })),
                                        ...household.pets.map((p) => ({
                                            id: `pet-${p.id}`,
                                            entityId: p.id,
                                            name: p.name,
                                            type: (p.species || "other") as HouseholdMember["type"],
                                            avatarUrl: p.avatarUrl,
                                            avatarInitials: p.avatarInitials,
                                            avatarColor: p.avatarColor,
                                            isChild: false,
                                            isPet: true,
                                            species: p.species,
                                        })),
                                    ];

                                    return (
                                        <button
                                            key={household.id}
                                            onClick={() => handleSwitch(household.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                isActive
                                                    ? "bg-softGreen"
                                                    : "hover:bg-cream"
                                            }`}
                                        >
                                            {/* Checkmark first (placeholder for alignment) */}
                                            <div className="w-5 h-5 flex-shrink-0">
                                                {isActive && (
                                                    <div className="w-5 h-5 rounded-full bg-forest flex items-center justify-center">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Name */}
                                            <span className={`flex-1 text-sm text-left ${isActive ? "font-semibold text-forest" : "text-forest"}`}>
                                                {household.name}
                                            </span>
                                            {/* Right: Avatars */}
                                            <MemberAvatarStack members={hMembers} maxDisplay={3} size={24} />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer actions */}
                            <div className="border-t border-border/50 p-2">
                                <Link
                                    href="/manage"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-forest hover:bg-cream rounded-xl transition-colors"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                    </svg>
                                    Manage households
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
