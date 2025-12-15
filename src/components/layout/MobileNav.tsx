"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isRouteActive } from '@/lib/navigation';
import { useAppState } from '@/lib/AppStateContext';
import { useAuth } from '@/lib/AuthContext';
import {
    ItemsIcon,
    CalendarIcon,
    ContactsIcon,
    DocumentsIcon,
    HealthIcon,
    SettingsIcon,
    UserIcon,
} from '@/components/icons/DuotoneIcons';

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
    const { caregivers } = useAppState();
    const { user } = useAuth();
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Get current user from caregivers
    const currentUser = caregivers.find(c => c.isCurrentUser);
    const emailPrefix = user?.email?.split('@')[0] || "";
    const userLabel = currentUser?.label || currentUser?.name || emailPrefix || "Account";

    // Check if any "more" item is active
    const isMoreActive = isRouteActive(pathname, '/documents') ||
        isRouteActive(pathname, '/health') ||
        isRouteActive(pathname, '/settings');

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
                        onClick={() => setShowMoreMenu(false)}
                    />

                    {/* Menu Panel - positioned above the nav bar, accounting for elevated home button */}
                    <div className="lg:hidden fixed left-0 right-0 bottom-[82px] z-40 animate-slide-up">
                        <div className="mx-3 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            {/* Menu Items */}
                            <div className="p-2">
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

                                {/* Account */}
                                <Link
                                    href="/settings/account"
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        pathname === '/settings/account'
                                            ? 'bg-softGreen text-forest font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <UserIcon size={22} />
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
