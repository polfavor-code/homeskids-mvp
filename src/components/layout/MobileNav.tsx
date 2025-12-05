"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems, accountNavItem, isRouteActive } from '@/lib/navigation';
import { useAppState } from '@/lib/AppStateContext';
import {
    HomeIcon,
    ItemsIcon,
    CalendarIcon,
    MoreIcon,
    ContactsIcon,
    DocumentsIcon,
    HealthIcon,
    SettingsIcon,
    UserIcon,
    CloseIcon,
} from '@/components/icons/DuotoneIcons';

const iconMap = {
    HomeIcon,
    ItemsIcon,
    CalendarIcon,
    ContactsIcon,
    DocumentsIcon,
    HealthIcon,
    SettingsIcon,
    UserIcon,
};

// Primary items shown on bottom nav
const primaryNavItems = ['Homes', "June's Items", 'Calendar'];

export default function MobileNav() {
    const pathname = usePathname();
    const { caregivers } = useAppState();
    const [showMoreSheet, setShowMoreSheet] = useState(false);

    // Get current user from caregivers
    const currentUser = caregivers.find(c => c.isCurrentUser);
    const userLabel = currentUser?.label || "Account";

    const renderIcon = (iconName: string) => {
        const IconComponent = iconMap[iconName as keyof typeof iconMap];
        if (!IconComponent) return null;
        return <IconComponent size={24} />;
    };

    // Filter items for primary nav
    const primaryItems = navItems.filter(item => primaryNavItems.includes(item.label));

    // Remaining items for "More" sheet
    const moreItems = navItems.filter(item => !primaryNavItems.includes(item.label));

    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-50">
                <div className="flex items-center justify-around px-2 py-2">
                    {/* Primary navigation items */}
                    {primaryItems.map((item) => {
                        const isActive = isRouteActive(pathname, item.route);
                        return (
                            <Link
                                key={item.route}
                                href={item.route}
                                className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${isActive
                                    ? 'bg-gradient-forest text-white shadow-md'
                                    : 'text-textSub'
                                    }`}
                            >
                                {renderIcon(item.icon)}
                            </Link>
                        );
                    })}

                    {/* More button */}
                    <button
                        onClick={() => setShowMoreSheet(true)}
                        className="flex flex-col items-center justify-center w-14 h-14 rounded-xl text-textSub hover:bg-black/5 transition-colors"
                    >
                        <MoreIcon size={24} />
                    </button>
                </div>
            </nav>

            {/* More Menu Sheet */}
            {showMoreSheet && (
                <>
                    {/* Backdrop */}
                    <div
                        className="lg:hidden fixed inset-0 bg-black/30 z-40"
                        onClick={() => setShowMoreSheet(false)}
                    />

                    {/* Sheet */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slide-up max-h-[80vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-lg font-dmSerif text-forest">More</h2>
                            <button
                                onClick={() => setShowMoreSheet(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 text-forest"
                            >
                                <CloseIcon size={20} />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="px-4 py-4 space-y-2">
                            {moreItems.map((item) => {
                                const isActive = isRouteActive(pathname, item.route);
                                return (
                                    <Link
                                        key={item.route}
                                        href={item.route}
                                        onClick={() => setShowMoreSheet(false)}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${isActive
                                            ? 'bg-gradient-forest text-white shadow-md font-bold'
                                            : 'text-forest hover:bg-softGreen font-semibold'
                                            }`}
                                    >
                                        {renderIcon(item.icon)}
                                        <span className="text-[15px]">{item.label}</span>
                                    </Link>
                                );
                            })}

                            {/* Divider */}
                            <div className="border-t border-border my-2" />

                            {/* Account Link */}
                            <Link
                                href={accountNavItem.route}
                                onClick={() => setShowMoreSheet(false)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${isRouteActive(pathname, accountNavItem.route)
                                    ? 'bg-gradient-forest text-white shadow-md font-bold'
                                    : 'text-forest hover:bg-softGreen font-semibold'
                                    }`}
                            >
                                <UserIcon size={24} />
                                <span className="text-[15px]">{userLabel}'s Account</span>
                            </Link>
                        </div>

                        {/* Bottom padding for safe area */}
                        <div className="h-4" />
                    </div>
                </>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
