"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Child {
    id: string;
    name: string;
    dob: string | null;
    avatar_url: string | null;
    age: number | null;
    created_at: string;
    guardianCount: number;
    helperCount: number;
    homeCount: number;
}

export default function AdminChildrenPage() {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const fetchChildren = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const response = await fetch(`/api/admin/children?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch children');
            }

            const data = await response.json();
            setChildren(data.children);
        } catch (err) {
            console.error('Error fetching children:', err);
            setError(err instanceof Error ? err.message : 'Failed to load children');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchChildren();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-dmSerif text-3xl text-forest mb-2">Children</h1>
                <p className="text-textSub">Manage all children in the system.</p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-border p-4 mb-6">
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
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                    />
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
                                <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <p className="text-sm text-textSub mb-4">
                        Showing {children.length} child{children.length !== 1 ? 'ren' : ''}
                    </p>

                    {/* Children List */}
                    <div className="space-y-3">
                        {children.map(child => (
                            <Link
                                key={child.id}
                                href={`/admin/children/${child.id}`}
                                className="flex items-center gap-4 bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all group"
                            >
                                {/* Avatar */}
                                <div className="w-14 h-14 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta font-bold text-xl flex-shrink-0">
                                    {child.name?.[0]?.toUpperCase() || '?'}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-forest group-hover:text-teal transition-colors">
                                        {child.name}
                                    </h3>
                                    <p className="text-sm text-textSub">
                                        {child.age !== null ? `${child.age} years old` : 'Age not set'}
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="hidden md:flex items-center gap-6 text-sm text-textSub">
                                    <div className="text-center">
                                        <p className="font-semibold text-forest">{child.guardianCount}</p>
                                        <p className="text-xs">Guardians</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-forest">{child.helperCount}</p>
                                        <p className="text-xs">Helpers</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-forest">{child.homeCount}</p>
                                        <p className="text-xs">Homes</p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <svg
                                    className="w-5 h-5 text-gray-300 group-hover:text-forest group-hover:translate-x-1 transition-all"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        ))}
                    </div>

                    {children.length === 0 && !loading && (
                        <div className="text-center py-12 text-textSub">
                            <svg
                                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <circle cx="12" cy="8" r="5" />
                                <path d="M3 21v-2a7 7 0 0 1 7-7h4" />
                            </svg>
                            <p>No children found.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
