"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/AdminAuthContext';

const adminNavItems = [
    { label: 'Dashboard', route: '/admin', icon: 'dashboard' },
    { label: 'Households', route: '/admin/households', icon: 'households' },
    { label: 'Users', route: '/admin/users', icon: 'users' },
];

function getIcon(icon: string, isActive: boolean) {
    const color = isActive ? 'currentColor' : 'currentColor';

    switch (icon) {
        case 'dashboard':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
            );
        case 'households':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            );
        case 'users':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        default:
            return null;
    }
}

export default function AdminNav() {
    const pathname = usePathname();
    const { user, signOut } = useAdminAuth();

    const isActive = (route: string) => {
        if (route === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(route);
    };

    return (
        <nav className="w-64 bg-[#1a1a2e] text-white flex flex-col h-screen sticky top-0">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <Link href="/admin" className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="9" rx="1" />
                            <rect x="14" y="3" width="7" height="5" rx="1" />
                            <rect x="14" y="12" width="7" height="9" rx="1" />
                            <rect x="3" y="16" width="7" height="5" rx="1" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-sm">homes.kids</p>
                        <p className="text-[10px] text-white/60 uppercase tracking-wider">Admin</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4 space-y-1">
                {adminNavItems.map((item) => {
                    const active = isActive(item.route);
                    return (
                        <Link
                            key={item.route}
                            href={item.route}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                active
                                    ? 'bg-white/20 text-white font-semibold'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {getIcon(item.icon, active)}
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Footer - User info and logout */}
            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-4 py-2 mb-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-semibold">
                        {user?.email?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span className="text-sm">Sign Out</span>
                </button>
                <Link
                    href="/"
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all mt-1"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm">Back to App</span>
                </Link>
            </div>
        </nav>
    );
}
