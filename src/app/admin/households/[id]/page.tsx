"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Profile {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    avatar_initials: string | null;
    avatar_color: string | null;
}

interface Member {
    id: string;
    userId: string;
    isHomeAdmin: boolean;
    householdRole: 'parent' | 'caregiver' | 'member';
    helperTypes: string[];
    joinedAt: string;
    profile: Profile;
    childrenCount: number;
}

interface Child {
    id: string;
    name: string;
    dob: string | null;
    avatar_url: string | null;
    notes: string | null;
    age: number | null;
    addedAt: string;
    parents: Array<{
        userId: string;
        profile: Profile;
        accessLevel: string;
    }>;
    caregivers: Array<{
        userId: string;
        profile: Profile;
        helperType: string;
        accessLevel: string;
    }>;
}

interface Pet {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    dob: string | null;
    avatar_url: string | null;
    avatar_initials: string | null;
    avatar_color: string | null;
    notes: string | null;
    addedAt: string;
}

interface Home {
    id: string;
    name: string;
    address: string | null;
    photo_url: string | null;
}

interface Household {
    id: string;
    name: string;
    address: string | null;
    photo_url: string | null;
    notes: string | null;
    created_at: string;
    parentCount: number;
    caregiverCount: number;
    childCount: number;
    petCount: number;
    memberCount: number;
    homeCount: number;
}

type Tab = 'overview' | 'members' | 'children' | 'pets' | 'homes';

function RoleBadge({ role, helperTypes }: { role: string; helperTypes?: string[] }) {
    if (role === 'parent') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Parent
            </span>
        );
    }
    if (role === 'caregiver') {
        const type = helperTypes?.[0]?.replace('_', ' ') || 'caregiver';
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                {type}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Member
        </span>
    );
}

function Avatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    };

    return (
        <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
            style={{ backgroundColor: profile.avatar_color || '#4A7C59' }}
        >
            {profile.avatar_initials || profile.name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
        </div>
    );
}

export default function HouseholdDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const [household, setHousehold] = useState<Household | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [children, setChildren] = useState<Child[]>([]);
    const [pets, setPets] = useState<Pet[]>([]);
    const [homes, setHomes] = useState<Home[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    useEffect(() => {
        const fetchHousehold = async () => {
            try {
                setLoading(true);
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError('Not authenticated');
                    return;
                }

                const response = await fetch(`/api/admin/households/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to fetch household');
                }

                const data = await response.json();
                setHousehold(data.household);
                setMembers(data.members);
                setChildren(data.children);
                setPets(data.pets);
                setHomes(data.homes);
            } catch (err) {
                console.error('Error fetching household:', err);
                setError(err instanceof Error ? err.message : 'Failed to load household');
            } finally {
                setLoading(false);
            }
        };

        fetchHousehold();
    }, [id]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'members', label: 'Members', count: household?.memberCount },
        { key: 'children', label: 'Children', count: household?.childCount },
        { key: 'pets', label: 'Pets', count: household?.petCount },
        { key: 'homes', label: 'Homes', count: household?.homeCount },
    ];

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-gray-200 rounded"></div>
                    <div className="h-40 bg-gray-200 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (error || !household) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl">
                    {error || 'Household not found'}
                </div>
                <Link href="/admin/households" className="text-forest hover:underline mt-4 inline-block">
                    Back to Households
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Back Link */}
            <Link href="/admin/households" className="inline-flex items-center gap-2 text-textSub hover:text-forest mb-6">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Households
            </Link>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-teal/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h1 className="font-dmSerif text-2xl text-forest mb-1">{household.name}</h1>
                        <p className="text-textSub">{household.address || 'No address'}</p>
                        <p className="text-xs text-textSub mt-2">Created {formatDate(household.created_at)}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-forest">{household.parentCount}</p>
                        <p className="text-xs text-textSub">Parents</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-forest">{household.caregiverCount}</p>
                        <p className="text-xs text-textSub">Caregivers</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-forest">{household.childCount}</p>
                        <p className="text-xs text-textSub">Children</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-forest">{household.petCount}</p>
                        <p className="text-xs text-textSub">Pets</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-forest">{household.memberCount}</p>
                        <p className="text-xs text-textSub">Total Members</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="flex border-b border-border overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.key
                                    ? 'text-forest border-b-2 border-forest bg-softGreen/30'
                                    : 'text-textSub hover:text-forest hover:bg-softGreen/10'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                    activeTab === tab.key ? 'bg-forest text-white' : 'bg-gray-100 text-textSub'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {household.notes && (
                                <div>
                                    <h3 className="font-semibold text-forest mb-2">Notes</h3>
                                    <p className="text-textSub">{household.notes}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Parents */}
                                <div>
                                    <h3 className="font-semibold text-forest mb-3">Parents ({household.parentCount})</h3>
                                    <div className="space-y-2">
                                        {members.filter(m => m.householdRole === 'parent').slice(0, 3).map(member => (
                                            <Link
                                                key={member.userId}
                                                href={`/admin/users/${member.userId}`}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-softGreen/30 transition-colors"
                                            >
                                                <Avatar profile={member.profile} size="sm" />
                                                <span className="text-sm text-forest">{member.profile.name || member.profile.email}</span>
                                            </Link>
                                        ))}
                                        {household.parentCount > 3 && (
                                            <button
                                                onClick={() => setActiveTab('members')}
                                                className="text-sm text-teal hover:underline"
                                            >
                                                View all {household.parentCount} parents
                                            </button>
                                        )}
                                        {household.parentCount === 0 && (
                                            <p className="text-sm text-textSub">No parents</p>
                                        )}
                                    </div>
                                </div>

                                {/* Caregivers */}
                                <div>
                                    <h3 className="font-semibold text-forest mb-3">Caregivers ({household.caregiverCount})</h3>
                                    <div className="space-y-2">
                                        {members.filter(m => m.householdRole === 'caregiver').slice(0, 3).map(member => (
                                            <Link
                                                key={member.userId}
                                                href={`/admin/users/${member.userId}`}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-softGreen/30 transition-colors"
                                            >
                                                <Avatar profile={member.profile} size="sm" />
                                                <span className="text-sm text-forest">{member.profile.name || member.profile.email}</span>
                                                {member.helperTypes[0] && (
                                                    <span className="text-xs text-textSub capitalize">({member.helperTypes[0].replace('_', ' ')})</span>
                                                )}
                                            </Link>
                                        ))}
                                        {household.caregiverCount > 3 && (
                                            <button
                                                onClick={() => setActiveTab('members')}
                                                className="text-sm text-teal hover:underline"
                                            >
                                                View all {household.caregiverCount} caregivers
                                            </button>
                                        )}
                                        {household.caregiverCount === 0 && (
                                            <p className="text-sm text-textSub">No caregivers</p>
                                        )}
                                    </div>
                                </div>

                                {/* Children */}
                                <div>
                                    <h3 className="font-semibold text-forest mb-3">Children ({household.childCount})</h3>
                                    <div className="space-y-2">
                                        {children.slice(0, 3).map(child => (
                                            <div
                                                key={child.id}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-softGreen/10"
                                            >
                                                <div className="w-8 h-8 bg-terracotta/20 rounded-full flex items-center justify-center text-terracotta text-xs font-semibold">
                                                    {child.name[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-sm text-forest">{child.name}</span>
                                                    {child.age !== null && (
                                                        <span className="text-xs text-textSub ml-2">{child.age} years old</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {household.childCount > 3 && (
                                            <button
                                                onClick={() => setActiveTab('children')}
                                                className="text-sm text-teal hover:underline"
                                            >
                                                View all {household.childCount} children
                                            </button>
                                        )}
                                        {household.childCount === 0 && (
                                            <p className="text-sm text-textSub">No children</p>
                                        )}
                                    </div>
                                </div>

                                {/* Pets */}
                                <div>
                                    <h3 className="font-semibold text-forest mb-3">Pets ({household.petCount})</h3>
                                    <div className="space-y-2">
                                        {pets.slice(0, 3).map(pet => (
                                            <div
                                                key={pet.id}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-softGreen/10"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                                    style={{ backgroundColor: pet.avatar_color || '#9333ea' }}
                                                >
                                                    {pet.avatar_initials || pet.name[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-sm text-forest">{pet.name}</span>
                                                    <span className="text-xs text-textSub ml-2 capitalize">{pet.species}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {household.petCount > 3 && (
                                            <button
                                                onClick={() => setActiveTab('pets')}
                                                className="text-sm text-teal hover:underline"
                                            >
                                                View all {household.petCount} pets
                                            </button>
                                        )}
                                        {household.petCount === 0 && (
                                            <p className="text-sm text-textSub">No pets</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Members Tab */}
                    {activeTab === 'members' && (
                        <div className="space-y-3">
                            {members.length === 0 ? (
                                <p className="text-textSub text-center py-8">No members in this household</p>
                            ) : (
                                members.map(member => (
                                    <Link
                                        key={member.userId}
                                        href={`/admin/users/${member.userId}`}
                                        className="flex items-center gap-4 p-4 rounded-xl border border-border hover:shadow-md transition-all group"
                                    >
                                        <Avatar profile={member.profile} size="lg" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-forest group-hover:text-teal transition-colors">
                                                    {member.profile.name || 'Unnamed'}
                                                </h4>
                                                <RoleBadge role={member.householdRole} helperTypes={member.helperTypes} />
                                                {member.isHomeAdmin && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                        Home Admin
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-textSub">{member.profile.email}</p>
                                            {member.childrenCount > 0 && (
                                                <p className="text-xs text-textSub mt-1">
                                                    Access to {member.childrenCount} {member.childrenCount === 1 ? 'child' : 'children'}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-xs text-textSub">
                                            Joined {formatDate(member.joinedAt)}
                                        </div>
                                        <svg
                                            className="w-5 h-5 text-gray-300 group-hover:text-forest transition-colors"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}

                    {/* Children Tab */}
                    {activeTab === 'children' && (
                        <div className="space-y-4">
                            {children.length === 0 ? (
                                <p className="text-textSub text-center py-8">No children in this household</p>
                            ) : (
                                children.map(child => (
                                    <div
                                        key={child.id}
                                        className="p-4 rounded-xl border border-border"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-terracotta/20 rounded-full flex items-center justify-center text-terracotta text-lg font-semibold">
                                                {child.name[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-forest">{child.name}</h4>
                                                {child.age !== null && (
                                                    <p className="text-sm text-textSub">{child.age} years old</p>
                                                )}
                                                {child.notes && (
                                                    <p className="text-sm text-textSub mt-2">{child.notes}</p>
                                                )}

                                                {/* Parents */}
                                                {child.parents.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-xs text-textSub font-medium mb-1">Parents:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {child.parents.map(parent => (
                                                                <Link
                                                                    key={parent.userId}
                                                                    href={`/admin/users/${parent.userId}`}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg text-xs text-blue-700 hover:bg-blue-100"
                                                                >
                                                                    {parent.profile.name || parent.profile.email}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Caregivers */}
                                                {child.caregivers.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-xs text-textSub font-medium mb-1">Caregivers:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {child.caregivers.map(caregiver => (
                                                                <Link
                                                                    key={caregiver.userId}
                                                                    href={`/admin/users/${caregiver.userId}`}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-lg text-xs text-orange-700 hover:bg-orange-100"
                                                                >
                                                                    {caregiver.profile.name || caregiver.profile.email}
                                                                    {caregiver.helperType && (
                                                                        <span className="text-orange-500">({caregiver.helperType.replace('_', ' ')})</span>
                                                                    )}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-textSub">
                                                Added {formatDate(child.addedAt)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Pets Tab */}
                    {activeTab === 'pets' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pets.length === 0 ? (
                                <p className="text-textSub text-center py-8 col-span-2">No pets in this household</p>
                            ) : (
                                pets.map(pet => (
                                    <div
                                        key={pet.id}
                                        className="p-4 rounded-xl border border-border"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold"
                                                style={{ backgroundColor: pet.avatar_color || '#9333ea' }}
                                            >
                                                {pet.avatar_initials || pet.name[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-forest">{pet.name}</h4>
                                                <p className="text-sm text-textSub capitalize">
                                                    {pet.species}
                                                    {pet.breed && ` - ${pet.breed}`}
                                                </p>
                                                {pet.notes && (
                                                    <p className="text-sm text-textSub mt-2">{pet.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Homes Tab */}
                    {activeTab === 'homes' && (
                        <div className="space-y-4">
                            {homes.length === 0 ? (
                                <p className="text-textSub text-center py-8">No homes linked to this household</p>
                            ) : (
                                homes.map(home => (
                                    <div
                                        key={home.id}
                                        className="p-4 rounded-xl border border-border"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                    <polyline points="9 22 9 12 15 12 15 22" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-forest">{home.name}</h4>
                                                <p className="text-sm text-textSub">{home.address || 'No address'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
