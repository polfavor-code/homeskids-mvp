"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Home {
    id: string;
    name: string;
    address: string | null;
    photo_url: string | null;
    created_at: string;
    memberCount: number;
    childCount: number;
    petCount: number;
}

export default function AdminHomesPage() {
    const [homes, setHomes] = useState<Home[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const fetchHomes = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const response = await fetch(`/api/admin/homes?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch homes');
            }

            const data = await response.json();
            setHomes(data.homes);
        } catch (err) {
            console.error('Error fetching homes:', err);
            setError(err instanceof Error ? err.message : 'Failed to load homes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHomes();
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

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-dmSerif text-3xl text-forest mb-2">Homes</h1>
                <p className="text-textSub">Manage all homes in the system.</p>
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
                        placeholder="Search by name or address..."
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
                            <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 w-48 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <p className="text-sm text-textSub mb-4">
                        Showing {homes.length} home{homes.length !== 1 ? 's' : ''}
                    </p>

                    {/* Homes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {homes.map(home => (
                            <Link
                                key={home.id}
                                href={`/admin/homes/${home.id}`}
                                className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all group"
                            >
                                {/* Home Icon/Image */}
                                <div className="h-24 bg-teal/10 rounded-lg flex items-center justify-center mb-4">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                </div>

                                {/* Info */}
                                <h3 className="font-semibold text-forest mb-1 group-hover:text-teal transition-colors">
                                    {home.name}
                                </h3>
                                <p className="text-sm text-textSub mb-3 line-clamp-1">
                                    {home.address || 'No address'}
                                </p>

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-xs text-textSub">
                                    <span className="flex items-center gap-1">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                        </svg>
                                        {home.memberCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="8" r="5" />
                                            <path d="M3 21v-2a7 7 0 0 1 7-7h4" />
                                        </svg>
                                        {home.childCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7" />
                                        </svg>
                                        {home.petCount}
                                    </span>
                                    <span className="ml-auto">
                                        {formatDate(home.created_at)}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {homes.length === 0 && !loading && (
                        <div className="text-center py-12 text-textSub">
                            <svg
                                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            </svg>
                            <p>No homes found.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
