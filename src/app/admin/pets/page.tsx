"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Pet {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    dob: string | null;
    avatar_url: string | null;
    avatar_initials: string | null;
    avatar_color: string | null;
    created_at: string;
    ownerCount: number;
    caretakerCount: number;
    homeCount: number;
}

const speciesEmoji: Record<string, string> = {
    dog: '🐕',
    cat: '🐈',
    bird: '🐦',
    fish: '🐟',
    reptile: '🦎',
    small_mammal: '🐹',
    other: '🐾',
};

export default function AdminPetsPage() {
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [speciesFilter, setSpeciesFilter] = useState('all');

    const fetchPets = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (speciesFilter !== 'all') params.set('species', speciesFilter);

            const response = await fetch(`/api/admin/pets?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch pets');
            }

            const data = await response.json();
            setPets(data.pets);
        } catch (err) {
            console.error('Error fetching pets:', err);
            setError(err instanceof Error ? err.message : 'Failed to load pets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPets();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, speciesFilter]);

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-dmSerif text-3xl text-forest mb-2">Pets</h1>
                <p className="text-textSub">Manage all pets in the system.</p>
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
                                placeholder="Search by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                            />
                        </div>
                    </div>

                    {/* Species Filter */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'dog', label: '🐕 Dogs' },
                            { value: 'cat', label: '🐈 Cats' },
                            { value: 'bird', label: '🐦 Birds' },
                            { value: 'other', label: '🐾 Other' },
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setSpeciesFilter(option.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    speciesFilter === option.value
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
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <p className="text-sm text-textSub mb-4">
                        Showing {pets.length} pet{pets.length !== 1 ? 's' : ''}
                    </p>

                    {/* Pets Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pets.map(pet => (
                            <Link
                                key={pet.id}
                                href={`/admin/pets/${pet.id}`}
                                className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4 mb-3">
                                    {/* Avatar */}
                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                                        style={{ backgroundColor: pet.avatar_color || '#E9D5FF' }}
                                    >
                                        {speciesEmoji[pet.species] || '🐾'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-forest group-hover:text-purple-600 transition-colors truncate">
                                            {pet.name}
                                        </h3>
                                        <p className="text-sm text-textSub capitalize">
                                            {pet.breed || pet.species.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-xs text-textSub pt-3 border-t border-border">
                                    <span className="flex items-center gap-1">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                        </svg>
                                        {pet.ownerCount + pet.caretakerCount} people
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        </svg>
                                        {pet.homeCount} home{pet.homeCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {pets.length === 0 && !loading && (
                        <div className="text-center py-12 text-textSub">
                            <p className="text-4xl mb-4">🐾</p>
                            <p>No pets found.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
