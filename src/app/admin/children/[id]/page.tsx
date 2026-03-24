"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ChildDetail {
    id: string;
    name: string;
    dob: string | null;
    avatar_url: string | null;
    notes: string | null;
    created_at: string;
    guardians: Array<{
        id: string;
        guardian_role: string;
        profile: {
            id: string;
            name: string | null;
            email: string | null;
            avatar_initials: string | null;
            avatar_color: string | null;
        };
    }>;
    helpers: Array<{
        id: string;
        helper_type: string;
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

export default function ChildDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const [child, setChild] = useState<ChildDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchChild = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError('Not authenticated');
                    return;
                }

                // Fetch child data
                const { data: childData, error: childError } = await supabase
                    .from('children')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (childError) throw childError;

                // Fetch guardians
                const { data: guardianData } = await supabase
                    .from('child_guardians')
                    .select(`
                        id,
                        guardian_role,
                        user_id,
                        profiles (
                            id,
                            name,
                            email,
                            avatar_initials,
                            avatar_color
                        )
                    `)
                    .eq('child_id', id);

                // Fetch helpers (from child_access where role_type = 'helper')
                const { data: helperData } = await supabase
                    .from('child_access')
                    .select(`
                        id,
                        helper_type,
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
                    .eq('child_id', id)
                    .eq('role_type', 'helper');

                // Fetch homes via child_spaces
                const { data: childSpaces } = await supabase
                    .from('child_spaces')
                    .select(`
                        homes (
                            id,
                            name
                        )
                    `)
                    .eq('child_id', id);

                setChild({
                    ...childData,
                    guardians: guardianData?.map(g => ({
                        id: g.id,
                        guardian_role: g.guardian_role,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        profile: g.profiles as any,
                    })) || [],
                    helpers: helperData?.map(h => ({
                        id: h.id,
                        helper_type: h.helper_type || 'helper',
                        access_level: h.access_level,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        profile: h.profiles as any,
                    })) || [],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    homes: childSpaces?.map(cs => cs.homes as any).filter(Boolean) || [],
                });
            } catch (err) {
                console.error('Error fetching child:', err);
                setError(err instanceof Error ? err.message : 'Failed to load child');
            } finally {
                setLoading(false);
            }
        };

        fetchChild();
    }, [id]);

    const calculateAge = (dob: string): string => {
        const today = new Date();
        const birthDate = new Date(dob);
        let years = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            years--;
        }
        return `${years} years old`;
    };

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

    if (error || !child) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
                    {error || 'Child not found'}
                </div>
                <Link href="/admin/children" className="text-forest">
                    &larr; Back to Children
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <Link href="/admin/children" className="text-textSub hover:text-forest text-sm mb-2 inline-block">
                    &larr; Back to Children
                </Link>
                <h1 className="font-dmSerif text-3xl text-forest">{child.name}</h1>
                {child.dob && <p className="text-textSub mt-1">{calculateAge(child.dob)}</p>}
            </div>

            {/* Child Info */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-terracotta/20 rounded-full flex items-center justify-center text-terracotta font-bold text-3xl">
                        {child.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-xl text-forest mb-2">{child.name}</h2>
                        <p className="text-textSub mb-4">
                            {child.dob ? calculateAge(child.dob) : 'Age not set'}
                        </p>
                        {child.notes && (
                            <div className="bg-softGreen/50 p-3 rounded-lg">
                                <p className="text-sm text-forest">{child.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Guardians */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <h3 className="font-semibold text-forest mb-4">Guardians ({child.guardians.length})</h3>
                {child.guardians.length === 0 ? (
                    <p className="text-textSub text-sm">No guardians assigned</p>
                ) : (
                    <div className="space-y-3">
                        {child.guardians.map(guardian => (
                            <Link
                                key={guardian.id}
                                href={`/admin/users/${guardian.profile.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                    style={{ backgroundColor: guardian.profile.avatar_color || '#4A7C59' }}
                                >
                                    {guardian.profile.avatar_initials || guardian.profile.name?.[0] || '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-forest">{guardian.profile.name || 'Unnamed'}</p>
                                    <p className="text-xs text-textSub">{guardian.profile.email}</p>
                                </div>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                                    {guardian.guardian_role}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Helpers */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <h3 className="font-semibold text-forest mb-4">Helpers ({child.helpers.length})</h3>
                {child.helpers.length === 0 ? (
                    <p className="text-textSub text-sm">No helpers assigned</p>
                ) : (
                    <div className="space-y-3">
                        {child.helpers.map(helper => (
                            <Link
                                key={helper.id}
                                href={`/admin/users/${helper.profile.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                    style={{ backgroundColor: helper.profile.avatar_color || '#D76F4B' }}
                                >
                                    {helper.profile.avatar_initials || helper.profile.name?.[0] || '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-forest">{helper.profile.name || 'Unnamed'}</p>
                                    <p className="text-xs text-textSub">{helper.profile.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full capitalize">
                                        {helper.helper_type.replace('_', ' ')}
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full capitalize">
                                        {helper.access_level}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Homes */}
            <div className="bg-white rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-forest mb-4">Homes ({child.homes.length})</h3>
                {child.homes.length === 0 ? (
                    <p className="text-textSub text-sm">No homes linked</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {child.homes.map(home => (
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
