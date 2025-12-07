"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems, accountNavItem, isRouteActive, hasActiveSubItem } from '@/lib/navigation';
import { useAppState } from '@/lib/AppStateContext';
import { useAuth } from '@/lib/AuthContext';
import Avatar from '@/components/Avatar';
import {
    HomeIcon,
    ItemsIcon,
    CalendarIcon,
    ContactsIcon,
    DocumentsIcon,
    HealthIcon,
    SettingsIcon,
    UserIcon,
    ChevronDownIcon,
    ChevronRightIcon,
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

export default function DesktopNav() {
    const pathname = usePathname();
    const { caregivers } = useAppState();
    const { user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // Get current user from caregivers (the one marked as current user)
    const currentUser = caregivers.find(c => c.isCurrentUser);

    // Use label (what child calls them, e.g. "daddy"), fallback to name, then email prefix, then "Account"
    // Note: Check for empty string as well as undefined/null
    const emailPrefix = user?.email?.split('@')[0] || "";
    const label = currentUser?.label?.trim();
    const name = currentUser?.name?.trim();
    const userLabel = (label && label.length > 0 ? label : null) || (name && name.length > 0 ? name : null) || (emailPrefix || "Account");
    const userInitials = currentUser?.avatarInitials || (name ? name[0] : null) || (emailPrefix ? emailPrefix[0].toUpperCase() : "U");
    const userAvatarUrl = currentUser?.avatarUrl;

    const toggleSection = (label: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(label)) {
                newSet.delete(label);
            } else {
                newSet.add(label);
            }
            return newSet;
        });
    };

    // Auto-expand section if any sub-item is active
    React.useEffect(() => {
        navItems.forEach(item => {
            if (item.subItems && hasActiveSubItem(pathname, item.subItems)) {
                setExpandedSections(prev => new Set(prev).add(item.label));
            }
        });
    }, [pathname]);

    const renderIcon = (iconName: string, size: number = 24) => {
        const IconComponent = iconMap[iconName as keyof typeof iconMap];
        if (!IconComponent) return null;
        return <IconComponent size={size} />;
    };

    return (
        <nav
            className={`hidden lg:flex flex-col bg-cream border-r border-border h-screen sticky top-0 transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-[260px]'
                }`}
            style={{
                overflowY: 'auto',
                overflowX: 'hidden',
            }}
        >
            {/* Header */}
            <div className={`flex items-center flex-shrink-0 transition-all pt-6 pb-2 ${isCollapsed ? 'justify-center' : 'px-4 gap-3'}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors text-forest mt-2"
                    aria-label="Toggle navigation"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                {!isCollapsed && (
                    <Link href="/" className="font-dmSerif text-[21px] text-forest whitespace-nowrap overflow-hidden mt-1.5">
                        homes.kids
                    </Link>
                )}
            </div>

            {/* Navigation Items */}
            <div className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = isRouteActive(pathname, item.route);
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isExpanded = expandedSections.has(item.label);
                    const hasActiveSub = hasActiveSubItem(pathname, item.subItems);

                    return (
                        <div key={item.route}>
                            {/* Main nav item */}
                            <Link
                                href={item.route}
                                onClick={(e) => {
                                    if (hasSubItems) {
                                        e.preventDefault();
                                        if (isCollapsed) {
                                            // When collapsed, expand sidebar and open this section
                                            setIsCollapsed(false);
                                            setExpandedSections(prev => new Set(prev).add(item.label));
                                        } else {
                                            // When expanded, toggle the section
                                            toggleSection(item.label);
                                        }
                                    }
                                }}
                                className={`flex items-center h-12 rounded-2xl transition-all ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'
                                    } ${isActive || hasActiveSub
                                        ? 'bg-gradient-forest text-white shadow-active font-bold'
                                        : 'text-gray-700 hover:bg-softGreen hover:text-forest font-semibold'
                                    }`}
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                                    {renderIcon(item.icon, 24)}
                                </div>
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-[15px] whitespace-nowrap">
                                            {item.label}
                                        </span>
                                        {hasSubItems && (
                                            <div className="flex-shrink-0">
                                                {isExpanded ? (
                                                    <ChevronDownIcon size={16} />
                                                ) : (
                                                    <ChevronRightIcon size={16} />
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </Link>

                            {/* Submenu */}
                            {hasSubItems && !isCollapsed && isExpanded && (
                                <div className="ml-14 mt-1 space-y-1">
                                    {item.subItems!.map((subItem) => {
                                        const isSubActive = isRouteActive(pathname, subItem.route);
                                        return (
                                            <Link
                                                key={subItem.route}
                                                href={subItem.route}
                                                className={`block py-2 text-[13px] transition-colors relative ${isSubActive
                                                    ? 'text-forest font-bold'
                                                    : 'text-gray-600 hover:text-forest'
                                                    }`}
                                            >
                                                <span className="absolute left-[-12px] top-1/2 w-1.5 h-px bg-border" />
                                                {subItem.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

            </div>

            {/* User Profile - Fixed at bottom */}
            <div className={`flex-shrink-0 border-t border-border py-4 ${isCollapsed ? 'flex justify-center' : 'px-3'}`}>
                <Link
                    href={accountNavItem.route}
                    className={`flex items-center transition-colors rounded-full ${isCollapsed
                        ? 'justify-center w-12 h-12 p-0'
                        : 'gap-3 px-2 py-2'
                        } ${isRouteActive(pathname, accountNavItem.route)
                            ? 'bg-softGreen'
                            : 'hover:bg-black/5'
                        }`}
                >
                    <Avatar
                        src={userAvatarUrl}
                        initial={userInitials}
                        size={36}
                        bgColor="#2C3E2D"
                    />
                    {!isCollapsed && (
                        <div className="text-sm font-bold text-forest whitespace-nowrap">
                            {userLabel}'s Account
                        </div>
                    )}
                </Link>
            </div>
        </nav>
    );
}
