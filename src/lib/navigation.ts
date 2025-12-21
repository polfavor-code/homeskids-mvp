import { ReactNode } from 'react';

export interface NavSubItem {
    label: string;
    route: string;
}

export interface NavItem {
    label: string;
    icon: string; // Icon component name
    route: string;
    subItems?: NavSubItem[];
}

export const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        icon: 'HomeIcon',
        route: '/',
    },
    {
        label: "{childName}'s Items",
        icon: 'ItemsIcon',
        route: '/items',
    },
    {
        label: 'Calendar',
        icon: 'CalendarIcon',
        route: '/calendar',
    },
    {
        label: 'Contacts',
        icon: 'ContactsIcon',
        route: '/contacts',
    },
    {
        label: 'Documents',
        icon: 'DocumentsIcon',
        route: '/documents',
    },
    {
        label: 'Health',
        icon: 'HealthIcon',
        route: '/health',
    },
    {
        label: 'Homes',
        icon: 'HomesIcon',
        route: '/settings/homes',
    },
    {
        label: 'Caregivers',
        icon: 'CaregiversIcon',
        route: '/settings/caregivers',
    },
    {
        label: 'Settings',
        icon: 'SettingsIcon',
        route: '/settings',
    },
];

export const accountNavItem: NavItem = {
    label: "{userName}'s Account",
    icon: 'UserIcon',
    route: '/settings/account',
};

/**
 * Check if the current pathname matches the nav route
 * Handles both exact matches and sub-route matches
 */
export function isRouteActive(pathname: string, route: string): boolean {
    if (route === '/') {
        return pathname === '/';
    }
    
    // Special case for /settings - don't match if on /settings/homes or /settings/caregivers
    // since those have their own nav items
    if (route === '/settings') {
        if (pathname === '/settings') return true;
        if (pathname.startsWith('/settings/homes')) return false;
        if (pathname.startsWith('/settings/caregivers')) return false;
        return pathname.startsWith('/settings/');
    }
    
    return pathname === route || pathname.startsWith(route + '/');
}

/**
 * Check if any sub-item is active
 */
export function hasActiveSubItem(pathname: string, subItems?: NavSubItem[]): boolean {
    if (!subItems) return false;
    return subItems.some(item => isRouteActive(pathname, item.route));
}
