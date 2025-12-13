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
        label: 'Homes',
        icon: 'HomeIcon',
        route: '/',
    },
    {
        label: "June's Items",
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
        label: 'Settings',
        icon: 'SettingsIcon',
        route: '/settings',
    },
];

export const accountNavItem: NavItem = {
    label: "Daddy's Account",
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
    return pathname === route || pathname.startsWith(route + '/');
}

/**
 * Check if any sub-item is active
 */
export function hasActiveSubItem(pathname: string, subItems?: NavSubItem[]): boolean {
    if (!subItems) return false;
    return subItems.some(item => isRouteActive(pathname, item.route));
}
