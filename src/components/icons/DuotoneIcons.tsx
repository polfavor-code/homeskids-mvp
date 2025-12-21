import React from 'react';

export interface IconProps {
    size?: number;
    className?: string;
}

/**
 * Base wrapper for duotone icons following the Organic DS
 * Applies the duotone effect with 20% fill opacity
 */
export function DuotoneIcon({
    size = 24,
    className = '',
    children
}: IconProps & { children: React.ReactNode }) {
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
            className={`duotone-icon ${className}`}
            style={{
                // Duotone effect: paths/circles/rects get 20% fill
                '--fill-opacity': '0.2'
            } as React.CSSProperties}
        >
            {children}
        </svg>
    );
}

// Home Icons
export function HomeIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" fillOpacity="0.2" />
            <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

// Homes Icon (Location pin with house - for Homes menu item)
export function HomesIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="currentColor" fillOpacity="0.2" />
            <path d="M12 6.5l4 3v4.5h-8v-4.5L12 6.5z" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

// Caregivers Icon (Person with heart - for Caregivers menu item)
export function CaregiversIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.2" />
            <path d="M19 10l.5-.5a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83L19 15.5l-3.33-3.17a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.5.5z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function ActivityIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" fill="currentColor" fillOpacity="0.2" />
            <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

// Items Icons
export function ItemsIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="currentColor" fillOpacity="0.2" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" fill="none" />
            <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function TravelBagIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M19 20c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11z" fill="currentColor" fillOpacity="0.2" />
            <path d="M16 5V3a2 2 0 0 0-4 0v2" stroke="currentColor" fill="none" />
            <circle cx="12" cy="14" r="2" fill="currentColor" fillOpacity="0.2" />
        </DuotoneIcon>
    );
}

export function MissingIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="11" cy="11" r="8" fill="currentColor" fillOpacity="0.2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function HistoryIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
            <polyline points="12 6 12 12 16 14" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function CategoryIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" fill="currentColor" fillOpacity="0.2" />
            <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" />
        </DuotoneIcon>
    );
}

// Calendar Icons
export function CalendarIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="currentColor" fillOpacity="0.2" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" />
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" />
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" />
        </DuotoneIcon>
    );
}

// Contacts Icons
export function ContactsIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.2" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" fill="none" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function MedicalIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" fill="currentColor" fillOpacity="0.2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="currentColor" fill="none" />
            <path d="M12 11v6" stroke="currentColor" fill="none" />
            <path d="M9 14h6" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function SchoolIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="currentColor" fill="none" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" fill="currentColor" fillOpacity="0.2" />
        </DuotoneIcon>
    );
}

// Documents Icons
export function DocumentsIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.2" />
            <polyline points="14 2 14 8 20 8" stroke="currentColor" fill="none" />
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" />
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" />
            <polyline points="10 9 9 9 8 9" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function IdDocIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="12" cy="10" r="3" stroke="currentColor" fill="none" />
            <path d="M7 18v-1a5 5 0 0 1 10 0v1" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function InsuranceIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.2" />
        </DuotoneIcon>
    );
}

// Health Icons
export function HealthIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function MedicationIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
            <path d="M8 12h8" stroke="currentColor" fill="none" />
            <path d="M12 8v8" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function AllergyIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="currentColor" fillOpacity="0.2" />
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" />
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" />
        </DuotoneIcon>
    );
}

// Settings Icon
export function SettingsIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

// User/Account Icon
export function UserIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity="0.2" />
        </DuotoneIcon>
    );
}

// UI Essential Icons
export function PlusIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function CloseIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function CheckIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <polyline points="20 6 9 17 4 12" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function SearchIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="11" cy="11" r="8" fill="currentColor" fillOpacity="0.2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function EditIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="currentColor" fillOpacity="0.2" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function TrashIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <polyline points="3 6 5 6 21 6" stroke="currentColor" fill="none" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="currentColor" fillOpacity="0.2" />
        </DuotoneIcon>
    );
}

export function LogoutIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" fill="none" />
            <polyline points="16 17 21 12 16 7" stroke="currentColor" fill="none" />
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function ChevronDownIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <polyline points="6 9 12 15 18 9" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function ChevronRightIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <polyline points="9 18 15 12 9 6" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function MoreIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="5" r="1" fill="currentColor" />
            <circle cx="12" cy="19" r="1" fill="currentColor" />
        </DuotoneIcon>
    );
}

// Contact Category Icons
export function FamilyIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.2" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" fill="none" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" fill="none" />
        </DuotoneIcon>
    );
}

export function FriendsIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" fill="none" />
            <line x1="9" y1="9" x2="9.01" y2="9" stroke="currentColor" strokeWidth="2" />
            <line x1="15" y1="9" x2="15.01" y2="9" stroke="currentColor" strokeWidth="2" />
        </DuotoneIcon>
    );
}

export function ActivitiesIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" fillOpacity="0.4" stroke="currentColor" />
        </DuotoneIcon>
    );
}

export function OtherIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="8" cy="12" r="1" fill="currentColor" />
            <circle cx="16" cy="12" r="1" fill="currentColor" />
        </DuotoneIcon>
    );
}

export function GridIcon(props: IconProps) {
    return (
        <DuotoneIcon {...props}>
            <rect x="3" y="3" width="7" height="7" fill="currentColor" fillOpacity="0.2" />
            <rect x="14" y="3" width="7" height="7" fill="currentColor" fillOpacity="0.2" />
            <rect x="14" y="14" width="7" height="7" fill="currentColor" fillOpacity="0.2" />
            <rect x="3" y="14" width="7" height="7" fill="currentColor" fillOpacity="0.2" />
        </DuotoneIcon>
    );
}
