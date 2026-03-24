"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface PetDetail {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    dob: string | null;
    avatar_url: string | null;
    notes: string | null;
    created_at: string;
    owners: Array<{
        id: string;
        role_type: string;
        access_level: string;
        profile: {
            id: string;
            name: string | null;
            email: string | null;
            avatar_initials: string | null;
            avatar_color: string | null;
        };
    }>;
    homes: Array<{
        id: string;
        name: string;
    }>;
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

export default function PetDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const [pet, setPet] = useState<PetDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPet = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError('Not authenticated');
                    return;
                }

                // Fetch pet data
                const { data: petData, error: petError } = await supabase
                    .from('pets')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (petError) throw petError;

                // Fetch owners/caretakers
                const { data: accessData } = await supabase
                    .from('pet_access')
                    .select(`
                        id,
                        role_type,
                        access_level,
                        user_id,
                        profiles (
                            id,
                            name,
                            email,
                            avatar_initials,
                            avatar_color
                        )
                    `)
                    .eq('pet_id', id);

                // Fetch homes via pet_spaces
                const { data: petSpaces } = await supabase
                    .from('pet_spaces')
                    .select(`
                        homes (
                            id,
                            name
                        )
                    `)
                    .eq('pet_id', id);

                setPet({
                    ...petData,
                    owners: accessData?.map(a => ({
                        id: a.id,
                        role_type: a.role_type,
                        access_level: a.access_level,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        profile: a.profiles as any,
                    })) || [],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    homes: petSpaces?.map(ps => ps.homes as any).filter(Boolean) || [],
                });
            } catch (err) {
                console.error('Error fetching pet:', err);
                setError(err instanceof Error ? err.message : 'Failed to load pet');
            } finally {
                setLoading(false);
            }
        };

        fetchPet();
    }, [id]);

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-32 bg-gray-200 rounded"></div>
                    <div className="h-48 bg-gray-200 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (error || !pet) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
                    {error || 'Pet not found'}
                </div>
                <Link href="/admin/pets" className="text-forest">
                    &larr; Back to Pets
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <Link href="/admin/pets" className="text-textSub hover:text-forest text-sm mb-2 inline-block">
                    &larr; Back to Pets
                </Link>
                <h1 className="font-dmSerif text-3xl text-forest">{pet.name}</h1>
                <p className="text-textSub mt-1 capitalize">{pet.breed || pet.species.replace('_', ' ')}</p>
            </div>

            {/* Pet Info */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-4xl">
                        {speciesEmoji[pet.species] || '🐾'}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-xl text-forest mb-2">{pet.name}</h2>
                        <p className="text-textSub mb-4 capitalize">
                            {pet.breed ? `${pet.breed} (${pet.species})` : pet.species.replace('_', ' ')}
                        </p>
                        {pet.notes && (
                            <div className="bg-softGreen/50 p-3 rounded-lg">
                                <p className="text-sm text-forest">{pet.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Owners & Caretakers */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <h3 className="font-semibold text-forest mb-4">Owners & Caretakers ({pet.owners.length})</h3>
                {pet.owners.length === 0 ? (
                    <p className="text-textSub text-sm">No owners or caretakers assigned</p>
                ) : (
                    <div className="space-y-3">
                        {pet.owners.map(owner => (
                            <Link
                                key={owner.id}
                                href={`/admin/users/${owner.profile.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                    style={{ backgroundColor: owner.profile.avatar_color || '#7C3AED' }}
                                >
                                    {owner.profile.avatar_initials || owner.profile.name?.[0] || '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-forest">{owner.profile.name || 'Unnamed'}</p>
                                    <p className="text-xs text-textSub">{owner.profile.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full capitalize">
                                        {owner.role_type}
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full capitalize">
                                        {owner.access_level}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Homes */}
            <div className="bg-white rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-forest mb-4">Homes ({pet.homes.length})</h3>
                {pet.homes.length === 0 ? (
                    <p className="text-textSub text-sm">No homes linked</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {pet.homes.map(home => (
                            <Link
                                key={home.id}
                                href={`/admin/homes/${home.id}`}
                                className="flex items-center gap-2 px-3 py-2 bg-teal/10 text-teal rounded-lg hover:bg-teal/20 transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </svg>
                                <span className="font-medium">{home.name}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
