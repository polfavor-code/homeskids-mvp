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
        subItems: [
            { label: 'All Items', route: '/items' },
            { label: 'Travel Bag', route: '/items/travel-bag' },
        ],
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
        subItems: [
            { label: 'All Contacts', route: '/contacts' },
            { label: 'Medical', route: '/contacts/medical' },
            { label: 'School', route: '/contacts/school' },
        ],
    },
    {
        label: 'Documents',
        icon: 'DocumentsIcon',
        route: '/documents',
        subItems: [
            { label: 'All Documents', route: '/documents' },
            { label: 'Important IDs', route: '/documents/ids' },
            { label: 'School Docs', route: '/documents/school' },
        ],
    },
    {
        label: 'Health',
        icon: 'HealthIcon',
        route: '/health',
        subItems: [
            { label: 'Overview', route: '/health' },
            { label: 'Medication', route: '/health/medication' },
            { label: 'Allergies', route: '/health/allergies' },
            { label: 'Dietary Needs', route: '/health/diet' },
        ],
    },
    {
        label: 'Settings',
        icon: 'SettingsIcon',
        route: '/settings',
        subItems: [
            { label: 'Child Profile', route: '/settings/child' },
            { label: 'Homes', route: '/settings/homes' },
            { label: 'Caregivers', route: '/settings/caregivers' },
            { label: 'Permissions', route: '/settings/permissions' },
            { label: 'My Account', route: '/settings/account' },
        ],
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
