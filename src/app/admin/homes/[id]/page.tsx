"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface HomeDetail {
    id: string;
    name: string;
    address: string | null;
    notes: string | null;
    created_at: string;
    members: Array<{
        id: string;
        is_home_admin: boolean;
        profile: {
            id: string;
            name: string | null;
            email: string | null;
            avatar_initials: string | null;
            avatar_color: string | null;
        };
    }>;
    children: Array<{
        id: string;
        name: string;
    }>;
    pets: Array<{
        id: string;
        name: string;
        species: string;
    }>;
}

export default function HomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [home, setHome] = useState<HomeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHome = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError('Not authenticated');
                    return;
                }

                // Fetch home data directly using Supabase client
                const { data: homeData, error: homeError } = await supabase
                    .from('homes_v2')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (homeError) throw homeError;

                // Fetch members
                const { data: memberships } = await supabase
                    .from('home_memberships')
                    .select(`
                        id,
                        is_home_admin,
                        user_id,
                        profiles (
                            id,
                            name,
                            email,
                            avatar_initials,
                            avatar_color
                        )
                    `)
                    .eq('home_id', id);

                // Fetch children via child_spaces
                const { data: childSpaces } = await supabase
                    .from('child_spaces')
                    .select(`
                        children_v2 (
                            id,
                            name
                        )
                    `)
                    .eq('home_id', id);

                // Fetch pets via pet_spaces
                const { data: petSpaces } = await supabase
                    .from('pet_spaces')
                    .select(`
                        pets (
                            id,
                            name,
                            species
                        )
                    `)
                    .eq('home_id', id);

                setHome({
                    ...homeData,
                    members: memberships?.map(m => ({
                        id: m.id,
                        is_home_admin: m.is_home_admin,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        profile: m.profiles as any,
                    })) || [],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    children: childSpaces?.map(cs => cs.children_v2 as any).filter(Boolean) || [],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pets: petSpaces?.map(ps => ps.pets as any).filter(Boolean) || [],
                });
            } catch (err) {
                console.error('Error fetching home:', err);
                setError(err instanceof Error ? err.message : 'Failed to load home');
            } finally {
                setLoading(false);
            }
        };

        fetchHome();
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

    if (error || !home) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
                    {error || 'Home not found'}
                </div>
                <Link href="/admin/homes" className="text-forest">
                    &larr; Back to Homes
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <Link href="/admin/homes" className="text-textSub hover:text-forest text-sm mb-2 inline-block">
                    &larr; Back to Homes
                </Link>
                <h1 className="font-dmSerif text-3xl text-forest">{home.name}</h1>
                {home.address && <p className="text-textSub mt-1">{home.address}</p>}
            </div>

            {/* Home Info */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-teal/10 rounded-xl flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-xl text-forest mb-2">{home.name}</h2>
                        <p className="text-textSub mb-4">{home.address || 'No address set'}</p>
                        {home.notes && (
                            <div className="bg-softGreen/50 p-3 rounded-lg">
                                <p className="text-sm text-forest">{home.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Members */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <h3 className="font-semibold text-forest mb-4">Members ({home.members.length})</h3>
                {home.members.length === 0 ? (
                    <p className="text-textSub text-sm">No members</p>
                ) : (
                    <div className="space-y-3">
                        {home.members.map(member => (
                            <Link
                                key={member.id}
                                href={`/admin/users/${member.profile.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-softGreen/50 hover:bg-softGreen transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                    style={{ backgroundColor: member.profile.avatar_color || '#4A7C59' }}
                                >
                                    {member.profile.avatar_initials || member.profile.name?.[0] || '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-forest">{member.profile.name || 'Unnamed'}</p>
                                    <p className="text-xs text-textSub">{member.profile.email}</p>
                                </div>
                                {member.is_home_admin && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                        Home Admin
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Children */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <h3 className="font-semibold text-forest mb-4">Children ({home.children.length})</h3>
                {home.children.length === 0 ? (
                    <p className="text-textSub text-sm">No children linked to this home</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {home.children.map(child => (
                            <Link
                                key={child.id}
                                href={`/admin/children/${child.id}`}
                                className="flex items-center gap-2 px-3 py-2 bg-terracotta/10 text-terracotta rounded-lg hover:bg-terracotta/20 transition-colors"
                            >
                                <span className="font-medium">{child.name}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Pets */}
            <div className="bg-white rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-forest mb-4">Pets ({home.pets.length})</h3>
                {home.pets.length === 0 ? (
                    <p className="text-textSub text-sm">No pets linked to this home</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {home.pets.map(pet => (
                            <Link
                                key={pet.id}
                                href={`/admin/pets/${pet.id}`}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                                <span className="font-medium">{pet.name}</span>
                                <span className="text-xs opacity-70 capitalize">({pet.species})</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
