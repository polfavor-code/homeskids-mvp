"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isRouteActive } from '@/lib/navigation';
import { useAppState, Household, HouseholdRole } from '@/lib/AppStateContext';
import { useAuth } from '@/lib/AuthContext';
import Avatar from '@/components/Avatar';
import {
    ItemsIcon,
    CalendarIcon,
    ContactsIcon,
    DocumentsIcon,
    HealthIcon,
    SettingsIcon,
    ManageIcon,
    DayHubIcon,
    ChevronDownIcon,
} from '@/components/icons/DuotoneIcons';

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
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles[role]}`}>
            {labels[role]}
        </span>
    );
}

// Stacked avatars for household members
function MemberAvatarStack({
    members,
    maxDisplay = 4,
    size = 28,
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
                    className="flex items-center justify-center bg-gray-200 text-gray-600 text-[10px] font-bold rounded-full border-2 border-white"
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

// Logo icon for center home button - matches Logo.tsx exactly
function LogoIcon({ size = 24, isActive = false }: { size?: number; isActive?: boolean }) {
    const id = isActive ? "logoGradNav-active" : "logoGradNav-inactive";
    const fillOpacity = isActive ? 0.3 : 0.15;
    const strokeColor = isActive ? "#FFFFFF" : "#4B5563";
    const fillColor = isActive ? "#FFFFFF" : "#9CA3AF";

    return (
        <svg
            width={size}
            height={size * 0.83}
            viewBox="0 0 120 100"
            className="overflow-visible"
        >
            <defs>
                <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isActive ? "#FFFFFF" : "#6B7280"} />
                    <stop offset="100%" stopColor={isActive ? "#FFFFFF" : "#9CA3AF"} />
                </linearGradient>
            </defs>

            {/* House 1 (Left, Back) */}
            <path
                d="M15 45V75H45V45L30 30Z"
                stroke={strokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={fillColor}
                fillOpacity={fillOpacity}
                opacity={0.6}
            />

            {/* House 2 (Right, Back) */}
            <path
                d="M75 45V75H105V45L90 30Z"
                stroke={strokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={fillColor}
                fillOpacity={fillOpacity}
                opacity={0.6}
            />

            {/* House 3 (Center, Front) */}
            <path
                d="M35 85V50L60 25L85 50V85H35Z"
                stroke={strokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={fillColor}
                fillOpacity={0.5}
            />
        </svg>
    );
}

export default function MobileNav() {
    const pathname = usePathname();
    const { caregivers, households, currentHousehold, setCurrentHouseholdId } = useAppState();
    const { user } = useAuth();
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showHouseholdPicker, setShowHouseholdPicker] = useState(false);

    // Get current user from caregivers
    const currentUser = caregivers.find(c => c.isCurrentUser);
    const emailPrefix = user?.email?.split('@')[0] || "";
    const userLabel = currentUser?.label || currentUser?.name || emailPrefix || "Account";
    const userName = currentUser?.name?.trim();
    const userInitials = currentUser?.avatarInitials || (userName ? userName[0] : null) || (emailPrefix ? emailPrefix[0].toUpperCase() : "U");
    const userAvatarUrl = currentUser?.avatarUrl;

    // Check if any "more" item is active
    const isMoreActive = isRouteActive(pathname, '/day-hub') ||
        isRouteActive(pathname, '/documents') ||
        isRouteActive(pathname, '/health') ||
        isRouteActive(pathname, '/manage') ||
        isRouteActive(pathname, '/settings');

    // Build member list for current household avatar stack
    const currentHouseholdMembers = currentHousehold ? [
        ...currentHousehold.children.map((c) => ({
            name: c.name,
            avatarUrl: c.avatarUrl,
            avatarInitials: c.avatarInitials,
            avatarColor: "#4A7C59",
            isChild: true,
        })),
        ...currentHousehold.pets.map((p) => ({
            name: p.name,
            avatarUrl: p.avatarUrl,
            avatarInitials: p.avatarInitials,
            avatarColor: p.avatarColor || "#22C55E",
            isChild: false,
        })),
    ] : [];

    const hasMultipleHouseholds = households.length > 1;

    const handleHouseholdSelect = (householdId: string) => {
        setCurrentHouseholdId(householdId);
        setShowHouseholdPicker(false);
    };

    // Build stats string for a household
    const getStats = (household: Household) => {
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
        return stats.join(" · ");
    };

    return (
        <>
            {/* Bottom Navigation Bar - 5 items */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 safe-area-bottom">
                <div className="flex items-center justify-around px-1 py-1.5">
                    {/* 1. Items */}
                    <Link
                        href="/items"
                        className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                            isRouteActive(pathname, '/items')
                                ? 'text-forest'
                                : 'text-gray-400'
                        }`}
                    >
                        <ItemsIcon size={24} />
                        <span className="text-[10px] mt-0.5 font-medium">Items</span>
                    </Link>

                    {/* 2. Calendar */}
                    <Link
                        href="/calendar"
                        className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                            isRouteActive(pathname, '/calendar')
                                ? 'text-forest'
                                : 'text-gray-400'
                        }`}
                    >
                        <CalendarIcon size={24} />
                        <span className="text-[10px] mt-0.5 font-medium">Calendar</span>
                    </Link>

                    {/* 3. Home (Dashboard) - Center with logo, elevated */}
                    <Link
                        href="/"
                        className="flex items-center justify-center -mt-7 transition-all"
                    >
                        <div className={`w-[68px] h-[68px] rounded-2xl flex items-center justify-center shadow-lg border-4 border-white ${
                            pathname === '/' ? 'bg-gradient-forest' : 'bg-gray-200'
                        }`}>
                            <div className="-mt-[2px]">
                                <LogoIcon size={52} isActive={pathname === '/'} />
                            </div>
                        </div>
                    </Link>

                    {/* 4. Contacts */}
                    <Link
                        href="/contacts"
                        className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                            isRouteActive(pathname, '/contacts')
                                ? 'text-forest'
                                : 'text-gray-400'
                        }`}
                    >
                        <ContactsIcon size={24} />
                        <span className="text-[10px] mt-0.5 font-medium">Contacts</span>
                    </Link>

                    {/* 5. More */}
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                            showMoreMenu || isMoreActive
                                ? 'text-forest'
                                : 'text-gray-400'
                        }`}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                        </svg>
                        <span className="text-[10px] mt-0.5 font-medium">More</span>
                    </button>
                </div>
            </nav>

            {/* More Menu - Slides up but keeps bottom nav visible */}
            {showMoreMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="lg:hidden fixed inset-0 bg-black/20 z-40"
                        onClick={() => {
                            setShowMoreMenu(false);
                            setShowHouseholdPicker(false); // Reset picker when closing menu
                        }}
                    />

                    {/* Menu Panel - positioned above the nav bar, accounting for elevated home button */}
                    <div className="lg:hidden fixed left-0 right-0 bottom-[82px] z-40 animate-slide-up">
                        <div className="mx-3 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            {/* Household Switcher at top */}
                            {currentHousehold && (
                                <div className="p-2 border-b border-gray-100">
                                    <p className="text-[11px] text-textSub font-medium uppercase tracking-wide px-4 mb-1">
                                        Active household
                                    </p>
                                    <button
                                        onClick={() => hasMultipleHouseholds && setShowHouseholdPicker(!showHouseholdPicker)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                            showHouseholdPicker ? 'bg-softGreen' : 'bg-cream/50 hover:bg-cream'
                                        }`}
                                        disabled={!hasMultipleHouseholds}
                                    >
                                        {/* Name + role badge */}
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-[15px] font-semibold text-forest leading-tight truncate">
                                                {currentHousehold.name}
                                            </p>
                                            <RoleBadge role={currentHousehold.userRole} />
                                        </div>

                                        {/* Avatar stack */}
                                        <MemberAvatarStack
                                            members={currentHouseholdMembers}
                                            maxDisplay={3}
                                            size={28}
                                        />

                                        {/* Chevron */}
                                        {hasMultipleHouseholds && (
                                            <ChevronDownIcon
                                                size={18}
                                                className={`text-textSub flex-shrink-0 transition-transform ${showHouseholdPicker ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </button>

                                    {/* Household picker dropdown */}
                                    {showHouseholdPicker && hasMultipleHouseholds && (
                                        <div className="mt-2 space-y-1">
                                            {households.map((household) => {
                                                const isActive = household.id === currentHousehold.id;
                                                const hMembers = [
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

                                                return (
                                                    <button
                                                        key={household.id}
                                                        onClick={() => handleHouseholdSelect(household.id)}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                            isActive
                                                                ? 'bg-softGreen'
                                                                : 'bg-white hover:bg-cream'
                                                        }`}
                                                    >
                                                        {/* Checkmark first (or placeholder for alignment) */}
                                                        <div className="w-5 h-5 flex-shrink-0">
                                                            {isActive && (
                                                                <div className="w-5 h-5 rounded-full bg-forest flex items-center justify-center">
                                                                    <svg
                                                                        width="10"
                                                                        height="10"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="white"
                                                                        strokeWidth="3"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    >
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Name */}
                                                        <span className={`flex-1 text-sm text-left ${isActive ? 'font-semibold text-forest' : 'text-forest'}`}>
                                                            {household.name}
                                                        </span>

                                                        {/* Avatar stack */}
                                                        <MemberAvatarStack
                                                            members={hMembers}
                                                            maxDisplay={3}
                                                            size={28}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Menu Items */}
                            <div className="p-2">
                                {/* Day Hub */}
                                <Link
                                    href="/day-hub"
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isRouteActive(pathname, '/day-hub')
                                            ? 'bg-softGreen text-forest font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <DayHubIcon size={22} />
                                    <span className="text-[15px]">Day Hub</span>
                                </Link>

                                {/* Documents */}
                                <Link
                                    href="/documents"
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isRouteActive(pathname, '/documents')
                                            ? 'bg-softGreen text-forest font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <DocumentsIcon size={22} />
                                    <span className="text-[15px]">Documents</span>
                                </Link>

                                {/* Health */}
                                <Link
                                    href="/health"
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isRouteActive(pathname, '/health')
                                            ? 'bg-softGreen text-forest font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <HealthIcon size={22} />
                                    <span className="text-[15px]">Health</span>
                                </Link>

                                {/* Manage household */}
                                <Link
                                    href="/manage"
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isRouteActive(pathname, '/manage')
                                            ? 'bg-softGreen text-forest font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <ManageIcon size={22} />
                                    <span className="text-[15px]">Manage household</span>
                                </Link>

                                {/* Settings */}
                                <Link
                                    href="/settings"
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isRouteActive(pathname, '/settings')
                                            ? 'bg-softGreen text-forest font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <SettingsIcon size={22} />
                                    <span className="text-[15px]">Settings</span>
                                </Link>

                                {/* Divider */}
                                <div className="border-t border-gray-100 my-1 mx-2" />

                                {/* Account - with avatar matching child switcher style */}
                                <Link
                                    href="/settings/account"
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        pathname === '/settings/account'
                                            ? 'bg-softGreen text-forest font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <Avatar
                                        src={userAvatarUrl}
                                        initial={userInitials}
                                        size={28}
                                        bgColor="#2C3E2D"
                                    />
                                    <span className="text-[15px]">{userLabel}&apos;s Account</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.2s ease-out;
                }
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0);
                }
            `}</style>
        </>
    );
}
