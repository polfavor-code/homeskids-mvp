"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { navItems, accountNavItem, isRouteActive, hasActiveSubItem } from '@/lib/navigation';
import { useAppState } from '@/lib/AppStateContext';
import { useAuth } from '@/lib/AuthContext';
import Avatar from '@/components/Avatar';
import {
    ItemsIcon,
    TravelBagIcon,
    CalendarIcon,
    ContactsIcon,
    DocumentsIcon,
    HealthIcon,
    SettingsIcon,
    UserIcon,
    ChevronDownIcon,
    ChevronRightIcon,
} from '@/components/icons/DuotoneIcons';

// Logo icon for home button - matches the brand logo
function LogoIcon({ size = 24, isActive = false }: { size?: number; isActive?: boolean }) {
    const id = isActive ? "logoGradDesktop-active" : "logoGradDesktop-inactive";
    const fillOpacity = isActive ? 0.3 : 0.15;
    const mainStrokeColor = isActive ? "#FFFFFF" : "#4B5563"; // gray-600 for middle house
    const mainFillColor = isActive ? "#FFFFFF" : "#9CA3AF"; // gray-400 for middle house fill
    // Width is 1.2x height to accommodate the wider logo
    const width = size * 1.2;
    const height = size;

    return (
        <svg
            width={width}
            height={height}
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
                stroke={mainStrokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={mainFillColor}
                fillOpacity={fillOpacity}
                opacity={0.6}
            />

            {/* House 2 (Right, Back) */}
            <path
                d="M75 45V75H105V45L90 30Z"
                stroke={mainStrokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={mainFillColor}
                fillOpacity={fillOpacity}
                opacity={0.6}
            />

            {/* House 3 (Center, Front) */}
            <path
                d="M35 85V50L60 25L85 50V85H35Z"
                stroke={mainStrokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={mainFillColor}
                fillOpacity={0.5}
            />

            {/* Ground Line */}
            <path
                d="M10 85H110"
                stroke={`url(#${id})`}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

const iconMap = {
    ItemsIcon,
    TravelBagIcon,
    CalendarIcon,
    ContactsIcon,
    DocumentsIcon,
    HealthIcon,
    SettingsIcon,
    UserIcon,
};

export default function DesktopNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { 
        caregivers, 
        children: childrenList, 
        currentChild, 
        setCurrentChildId,
        refreshData,
    } = useAppState();
    const { user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [isChildSwitcherOpen, setIsChildSwitcherOpen] = useState(false);

    // Get current user from caregivers (the one marked as current user)
    const currentUser = caregivers.find(c => c.isCurrentUser);

    // Handle child switch - one click to switch
    const handleChildSwitch = async (childId: string) => {
        if (childId === currentChild?.id) {
            // Clicking active child goes to child settings
            router.push("/settings/child");
            return;
        }
        
        setCurrentChildId(childId);
        await refreshData();
        // Home is auto-selected by AppStateContext (first accessible home or last-used)
        // No blocking redirect needed
    };

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

    const renderIcon = (iconName: string, size: number = 24, isActive: boolean = false) => {
        // Special case for Home - use logo icon
        if (iconName === 'HomeIcon') {
            return <LogoIcon size={size} isActive={isActive} />;
        }
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
                                <div className={`flex-shrink-0 flex items-center justify-center ${item.icon === 'HomeIcon' ? 'w-8 h-6 -mt-[2px]' : 'w-6 h-6'}`}>
                                    {renderIcon(item.icon, item.icon === 'HomeIcon' ? 32 : 24, isActive || hasActiveSub)}
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

            {/* Child Switcher - Footer Card Style */}
            {childrenList.length > 0 && (
                <div className={`flex-shrink-0 border-t border-border py-3 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                    {isCollapsed ? (
                        /* Collapsed: Show avatar stack */
                        <div className="flex flex-col items-center gap-2">
                            {childrenList.map((child) => {
                                const isActive = child.id === currentChild?.id;
                                return (
                                    <button
                                        key={child.id}
                                        onClick={() => handleChildSwitch(child.id)}
                                        className={`relative transition-all ${
                                            isActive
                                                ? 'ring-2 ring-forest ring-offset-2 ring-offset-cream rounded-full'
                                                : 'opacity-50 hover:opacity-100'
                                        }`}
                                        title={`${isActive ? 'Viewing' : 'Switch to'} ${child.name}`}
                                    >
                                        <Avatar
                                            src={child.avatarUrl}
                                            initial={child.avatarInitials}
                                            size={36}
                                            bgColor={isActive ? "#4A7C59" : "#9CA3AF"}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Expanded: Footer Card with dropdown */
                        <div className="relative">
                            {/* Main trigger button */}
                            <button
                                onClick={() => childrenList.length > 1 && setIsChildSwitcherOpen(!isChildSwitcherOpen)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                                    isChildSwitcherOpen 
                                        ? 'bg-white border-forest/20 shadow-sm' 
                                        : 'bg-softGreen/50 border-border hover:border-forest/20 hover:bg-white'
                                }`}
                            >
                                <div className="relative">
                                    <Avatar
                                        src={currentChild?.avatarUrl}
                                        initial={currentChild?.avatarInitials || "?"}
                                        size={36}
                                        bgColor="#4A7C59"
                                    />
                                    {childrenList.length > 1 && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-forest rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-cream">
                                            {childrenList.length}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-[10px] text-textSub font-medium uppercase tracking-wide">Viewing</p>
                                    <p className="text-sm font-semibold text-forest truncate">{currentChild?.name}'s Space</p>
                                </div>
                                {childrenList.length > 1 && (
                                    <div className={`flex items-center gap-1 text-teal transition-transform ${isChildSwitcherOpen ? 'rotate-180' : ''}`}>
                                        <ChevronDownIcon size={16} />
                                    </div>
                                )}
                            </button>

                            {/* Dropdown panel */}
                            {isChildSwitcherOpen && childrenList.length > 1 && (
                                <>
                                    {/* Backdrop */}
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setIsChildSwitcherOpen(false)}
                                    />
                                    
                                    {/* Dropdown */}
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-50">
                                        <div className="px-3 py-2 border-b border-border bg-cream/50">
                                            <p className="text-[10px] font-semibold text-forest/60 uppercase tracking-wide">Switch child</p>
                                        </div>
                                        <div className="p-1.5 space-y-1">
                                            {childrenList.map((child) => {
                                                const isActive = child.id === currentChild?.id;
                                                return (
                                                    <button
                                                        key={child.id}
                                                        onClick={() => {
                                                            handleChildSwitch(child.id);
                                                            setIsChildSwitcherOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                                            isActive
                                                                ? 'bg-softGreen border border-forest/20'
                                                                : 'hover:bg-cream'
                                                        }`}
                                                    >
                                                        <Avatar
                                                            src={child.avatarUrl}
                                                            initial={child.avatarInitials}
                                                            size={32}
                                                            bgColor={isActive ? "#4A7C59" : "#9CA3AF"}
                                                        />
                                                        <span className={`flex-1 text-left text-sm truncate ${
                                                            isActive ? 'font-semibold text-forest' : 'font-medium text-forest'
                                                        }`}>
                                                            {child.name}
                                                        </span>
                                                        {isActive && (
                                                            <div className="w-5 h-5 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

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
                    title={isCollapsed ? `${userLabel}` : undefined}
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
