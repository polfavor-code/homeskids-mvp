"use client";

import React, { useState, useRef, useEffect } from "react";
import Avatar from "@/components/Avatar";
import HouseholdSectionRow from "./HouseholdSectionRow";
import {
    HomesIcon,
    ChildrenIcon,
    CaregiversIcon,
} from "@/components/icons/DuotoneIcons";
import { Household, HouseholdRole, HouseholdMember } from "@/lib/AppStateContext";

// Pets icon (paw print)
function PetsIcon({ size = 20 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="4" r="2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="18" cy="8" r="2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="4" cy="8" r="2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="8" cy="8" r="2" fill="currentColor" fillOpacity="0.2" />
            <path d="M12 14c-2.5 0-4.5 2-4.5 4.5 0 1.5 1 2.5 2.5 2.5h4c1.5 0 2.5-1 2.5-2.5 0-2.5-2-4.5-4.5-4.5z" fill="currentColor" fillOpacity="0.2" />
        </svg>
    );
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
    maxDisplay = 5,
    size = 32,
}: {
    members: Array<{ name: string; avatarUrl?: string; avatarInitials?: string; avatarColor?: string; isChild?: boolean }>;
    maxDisplay?: number;
    size?: number;
}) {
    const displayed = members.slice(0, maxDisplay);
    const overflow = members.length - maxDisplay;

    if (members.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center" style={{ marginLeft: size * 0.3 }}>
            {displayed.map((member, idx) => (
                <div
                    key={idx}
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

// 3-dot kebab menu icon
function KebabIcon({ size = 20 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
        </svg>
    );
}

interface HouseholdCardProps {
    household: Household;
    onEdit?: (household: Household) => void;
    onDelete?: (household: Household) => void;
    onLeave?: (household: Household) => void;
}

/**
 * HouseholdCard - A card that displays a household with all its sections
 *
 * Contains:
 * - Header: avatars, name, role badge, 3-dot menu
 * - Divider
 * - Section rows: Children, Pets, Homes, Caregivers
 */
export default function HouseholdCard({
    household,
    onEdit,
    onDelete,
    onLeave,
}: HouseholdCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    // Build member list for avatar stack (children + pets)
    const members = [
        ...household.children.map((c) => ({
            name: c.name,
            avatarUrl: c.avatarUrl,
            avatarInitials: c.avatarInitials,
            avatarColor: "#4A7C59",
            isChild: true,
        })),
        ...household.pets.map((p) => ({
            name: p.name,
            avatarUrl: p.avatarUrl,
            avatarInitials: p.avatarInitials,
            avatarColor: p.avatarColor || "#22C55E",
            isChild: false,
        })),
    ];

    // Build stats string
    const stats: string[] = [];
    if (household.children.length > 0) {
        stats.push(`${household.children.length} ${household.children.length === 1 ? "child" : "children"}`);
    }
    if (household.pets.length > 0) {
        stats.push(`${household.pets.length} ${household.pets.length === 1 ? "pet" : "pets"}`);
    }
    if (household.homes.length > 0) {
        stats.push(`${household.homes.length} ${household.homes.length === 1 ? "home" : "homes"}`);
    }

    const isOwner = household.userRole === "owner";

    return (
        <div className="card-organic bg-white overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-softGreen/30">
                <div className="flex items-start gap-4">
                    {/* Name and stats */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-semibold text-forest text-lg">{household.name}</h2>
                            <RoleBadge role={household.userRole} />
                        </div>
                        {stats.length > 0 && (
                            <p className="text-sm text-textSub mt-1">
                                {stats.join(" · ")}
                            </p>
                        )}
                    </div>

                    {/* Avatar stack */}
                    <MemberAvatarStack
                        members={members}
                        maxDisplay={4}
                        size={40}
                    />

                    {/* 3-dot menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2 rounded-lg hover:bg-cream/70 transition-colors text-textSub hover:text-forest"
                            aria-label="Household menu"
                        >
                            <KebabIcon size={20} />
                        </button>

                        {/* Dropdown menu */}
                        {menuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-50">
                                {isOwner && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                onEdit?.(household);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-forest hover:bg-cream transition-colors text-left"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            Edit household
                                        </button>
                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                onDelete?.(household);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                            Delete household
                                        </button>
                                        <div className="border-t border-border" />
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onLeave?.(household);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    Leave household
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/50" />

            {/* Section rows */}
            <div className="py-2">
                <HouseholdSectionRow
                    href="/settings/children"
                    icon={<ChildrenIcon size={20} />}
                    label="Children"
                    count={household.children.length}
                    iconColor="text-orange-600"
                />
                <HouseholdSectionRow
                    href="/settings/pets"
                    icon={<PetsIcon size={20} />}
                    label="Pets"
                    count={household.pets.length}
                    iconColor="text-green-600"
                />
                <HouseholdSectionRow
                    href="/settings/homes"
                    icon={<HomesIcon size={20} />}
                    label="Homes"
                    count={household.homes.length}
                    iconColor="text-blue-600"
                />
                <HouseholdSectionRow
                    href="/settings/caregivers"
                    icon={<CaregiversIcon size={20} />}
                    label="Caregivers"
                    count={household.caregivers.length}
                    iconColor="text-purple-600"
                />
            </div>
        </div>
    );
}
