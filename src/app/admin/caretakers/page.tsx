"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Caretaker {
    id: string;
    role_type: string;
    helper_type: string | null;
    access_level: string;
    created_at: string;
    user_id: string;
    child_id: string;
    profiles: {
        id: string;
        name: string | null;
        email: string | null;
        avatar_initials: string | null;
        avatar_color: string | null;
    };
    children_v2: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
    homes: Array<{
        id: string;
        name: string;
    }>;
}

function RoleBadge({ roleType, helperType }: { roleType: string; helperType: string | null }) {
    if (roleType === 'guardian') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Guardian
            </span>
        );
    }
    const type = helperType || 'helper';
    const typeLabel = type.replace('_', ' ');
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
            {typeLabel}
        </span>
    );
}

function AccessBadge({ level }: { level: string }) {
    const colors = {
        view: 'bg-gray-100 text-gray-600',
        contribute: 'bg-green-100 text-green-700',
        manage: 'bg-purple-100 text-purple-700',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[level as keyof typeof colors] || colors.view}`}>
            {level}
        </span>
    );
}

export default function AdminCaretakersPage() {
    const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchCaretakers = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            const params = new URLSearchParams();
            if (roleFilter !== 'all') params.set('role', roleFilter);

            const response = await fetch(`/api/admin/caretakers?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch caretakers');
            }

            const data = await response.json();
            setCaretakers(data.caretakers);
        } catch (err) {
            console.error('Error fetching caretakers:', err);
            setError(err instanceof Error ? err.message : 'Failed to load caretakers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCaretakers();
    }, [roleFilter]);

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-dmSerif text-3xl text-forest mb-2">Caretakers</h1>
                <p className="text-textSub">View all caretaker relationships between users and children.</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-border p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'all', label: 'All Roles' },
                        { value: 'guardians', label: 'Guardians' },
                        { value: 'helpers', label: 'All Helpers' },
                        { value: 'family_member', label: 'Family' },
                        { value: 'nanny', label: 'Nanny' },
                        { value: 'friend', label: 'Friend' },
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

            {/* Error State */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
                    {error}
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
                        Showing {caretakers.length} caretaker relationship{caretakers.length !== 1 ? 's' : ''}
                    </p>

                    {/* Caretakers List */}
                    <div className="space-y-3">
                        {caretakers.map(caretaker => (
                            <div
                                key={caretaker.id}
                                className="bg-white rounded-xl border border-border p-4"
                            >
                                <div className="flex items-center gap-4">
                                    {/* User Avatar */}
                                    <Link
                                        href={`/admin/users/${caretaker.profiles.id}`}
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 hover:ring-2 hover:ring-forest hover:ring-offset-2 transition-all"
                                        style={{ backgroundColor: caretaker.profiles.avatar_color || '#4A7C59' }}
                                    >
                                        {caretaker.profiles.avatar_initials || caretaker.profiles.name?.[0]?.toUpperCase() || '?'}
                                    </Link>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Link
                                                href={`/admin/users/${caretaker.profiles.id}`}
                                                className="font-semibold text-forest truncate hover:underline"
                                            >
                                                {caretaker.profiles.name || 'Unnamed User'}
                                            </Link>
                                            <RoleBadge roleType={caretaker.role_type} helperType={caretaker.helper_type} />
                                            <AccessBadge level={caretaker.access_level} />
                                        </div>
                                        <p className="text-sm text-textSub truncate">{caretaker.profiles.email}</p>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex items-center gap-2 text-textSub px-4">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>

                                    {/* Child Info */}
                                    <Link
                                        href={`/admin/children/${caretaker.children_v2.id}`}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-softGreen/50 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta font-semibold">
                                            {caretaker.children_v2.name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-forest">{caretaker.children_v2.name}</p>
                                            <p className="text-xs text-textSub">Child</p>
                                        </div>
                                    </Link>

                                    {/* Homes */}
                                    {caretaker.homes.length > 0 && (
                                        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-border">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSub">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            </svg>
                                            <div className="flex items-center gap-1">
                                                {caretaker.homes.slice(0, 2).map(home => (
                                                    <Link
                                                        key={home.id}
                                                        href={`/admin/homes/${home.id}`}
                                                        className="text-xs text-textSub hover:text-forest px-2 py-1 bg-softGreen/50 rounded"
                                                    >
                                                        {home.name}
                                                    </Link>
                                                ))}
                                                {caretaker.homes.length > 2 && (
                                                    <span className="text-xs text-textSub">+{caretaker.homes.length - 2}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {caretakers.length === 0 && !loading && (
                            <div className="text-center py-12 text-textSub">
                                <svg
                                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197" />
                                </svg>
                                <p>No caretakers found matching your filters.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
