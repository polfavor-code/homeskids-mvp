"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface HouseholdRole {
    householdId: string;
    householdName: string;
    role: 'parent' | 'caregiver' | 'member';
    isHomeAdmin: boolean;
    helperTypes: string[];
}

interface User {
    id: string;
    name: string | null;
    label: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    avatar_initials: string | null;
    avatar_color: string | null;
    manages_children: boolean;
    manages_pets: boolean;
    is_admin: boolean;
    created_at: string;
    last_sign_in_at: string | null;
    homeCount: number;
    childCount: number;
    petCount: number;
    isGuardian: boolean;
    isHelper: boolean;
    helperTypes: string[];
    hasAccess: boolean;
    householdRoles: HouseholdRole[];
}

function HouseholdRoleBadge({ role, helperTypes }: { role: string; helperTypes?: string[] }) {
    if (role === 'parent') {
        return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                Parent
            </span>
        );
    }
    if (role === 'caregiver') {
        const type = helperTypes?.[0]?.replace('_', ' ') || 'caregiver';
        return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 capitalize">
                {type}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
            Member
        </span>
    );
}

function AdminBadge() {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            Admin
        </span>
    );
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('Session error:', sessionError);
                setError(`Session error: ${sessionError.message}`);
                return;
            }

            if (!session) {
                setError('Not authenticated - please log in at /admin/login');
                return;
            }

            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (roleFilter !== 'all') params.set('role', roleFilter);

            const response = await fetch(`/api/admin/users?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('API error:', response.status, data);
                throw new Error(data.error || `API error: ${response.status}`);
            }

            setUsers(data.users);
            setError('');
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatRelativeTime = (dateString: string | null) => {
        if (!dateString) return 'Never';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return formatDate(dateString);
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-dmSerif text-3xl text-forest mb-2">Users</h1>
                <p className="text-textSub">Manage all registered users and their household roles.</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-border p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                            />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div className="flex gap-2">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'parents', label: 'Parents' },
                            { value: 'caregivers', label: 'Caregivers' },
                            { value: 'no-access', label: 'No Access' },
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setRoleFilter(option.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    roleFilter === option.value
                                        ? 'bg-forest text-white'
                                        : 'bg-softGreen text-forest hover:bg-forest/10'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
                    <p className="font-semibold mb-2">Error:</p>
                    <p>{error}</p>
                    <p className="mt-2 text-sm text-red-500">
                        Make sure you are logged in with an admin account (info@paulsnetwork.com or psomers82@icloud.com).
                        Try logging out and back in at <a href="/admin/login" className="underline">/admin/login</a>.
                    </p>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-48 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <p className="text-sm text-textSub mb-4">
                        Showing {users.length} user{users.length !== 1 ? 's' : ''}
                    </p>

                    {/* Users List */}
                    <div className="space-y-3">
                        {users.map(user => (
                            <Link
                                key={user.id}
                                href={`/admin/users/${user.id}`}
                                className="block bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                                        style={{ backgroundColor: user.avatar_color || '#4A7C59' }}
                                    >
                                        {user.avatar_initials || user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-forest truncate">
                                                {user.name || 'Unnamed User'}
                                            </h3>
                                            {user.is_admin && <AdminBadge />}
                                        </div>
                                        <p className="text-sm text-textSub truncate">{user.email}</p>

                                        {/* Household Roles */}
                                        {user.householdRoles && user.householdRoles.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {user.householdRoles.map(hr => (
                                                    <div
                                                        key={hr.householdId}
                                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-softGreen/50 rounded-lg"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal">
                                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                        </svg>
                                                        <span className="text-xs text-forest truncate max-w-[100px]">{hr.householdName}</span>
                                                        <HouseholdRoleBadge role={hr.role} helperTypes={hr.helperTypes} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-textSub mt-1">No household memberships</p>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-4 text-sm text-textSub">
                                        <div className="text-center min-w-[50px]">
                                            <p className="font-semibold text-forest">{user.householdRoles?.length || 0}</p>
                                            <p className="text-[10px]">Households</p>
                                        </div>
                                        <div className="text-center min-w-[50px]">
                                            <p className="font-semibold text-forest">{user.childCount}</p>
                                            <p className="text-[10px]">Children</p>
                                        </div>
                                    </div>

                                    {/* Last Login & Arrow */}
                                    <div className="flex items-center gap-4">
                                        <div className="hidden lg:block text-right">
                                            <p className={`text-xs ${user.last_sign_in_at ? 'text-textSub' : 'text-orange-500'}`}>
                                                {user.last_sign_in_at ? formatRelativeTime(user.last_sign_in_at) : 'Never logged in'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">Last login</p>
                                        </div>
                                        <svg
                                            className="w-5 h-5 text-gray-300 group-hover:text-forest group-hover:translate-x-1 transition-all"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {users.length === 0 && !loading && (
                            <div className="text-center py-12 text-textSub">
                                <svg
                                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                </svg>
                                <p>No users found matching your filters.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
