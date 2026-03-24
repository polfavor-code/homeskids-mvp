"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Home {
    id: string;
    name: string;
    address: string | null;
    photo_url: string | null;
    status: 'active' | 'archived' | null;
    archived_at: string | null;
    created_at: string;
    household_name: string | null;
    parentCount: number;
    caregiverCount: number;
    childCount: number;
    petCount: number;
    memberCount: number;
    homeCount: number;
}

interface GroupedHousehold {
    household_name: string;
    homes: Home[];
    parentCount: number;
    caregiverCount: number;
    childCount: number;
    petCount: number;
    memberCount: number;
    homeCount: number;
    created_at: string;
}

type Household = Home; // For backwards compatibility

// Helper to check if household is archived (using both status and archived_at)
function isHouseholdArchived(household: Household): boolean {
    return household.status === 'archived' || household.archived_at !== null;
}

export default function AdminHouseholdsPage() {
    const [households, setHouseholds] = useState<Household[]>([]);
    const [groupedHouseholds, setGroupedHouseholds] = useState<GroupedHousehold[]>([]);
    const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
    const [showRestoreModal, setShowRestoreModal] = useState<Household | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<Household | null>(null);
    const [guardianUserId, setGuardianUserId] = useState('');
    const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [expandedHouseholds, setExpandedHouseholds] = useState<Set<string>>(new Set());

    const fetchHouseholds = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            const params = new URLSearchParams();
            if (search) params.set('search', search);
            params.set('status', statusFilter);
            if (viewMode === 'grouped') {
                params.set('groupBy', 'household');
            }

            const response = await fetch(`/api/admin/households?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch households');
            }

            const data = await response.json();
            if (data.groupedBy === 'household') {
                setGroupedHouseholds(data.households);
                setHouseholds([]);
            } else {
                setHouseholds(data.households);
                setGroupedHouseholds([]);
            }
        } catch (err) {
            console.error('Error fetching households:', err);
            setError(err instanceof Error ? err.message : 'Failed to load households');
        } finally {
            setLoading(false);
        }
    };

    const toggleHouseholdExpanded = (householdName: string) => {
        setExpandedHouseholds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(householdName)) {
                newSet.delete(householdName);
            } else {
                newSet.add(householdName);
            }
            return newSet;
        });
    };

    const fetchUsers = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setAllUsers(data.users.map((u: { id: string; name: string | null; email: string | null }) => ({
                    id: u.id,
                    name: u.name || 'Unnamed',
                    email: u.email || '',
                })));
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const handleRestore = async () => {
        if (!showRestoreModal || !guardianUserId) return;

        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(`/api/admin/households/${showRestoreModal.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'restore',
                    guardianUserId,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to restore household');
            }

            const data = await response.json();
            showToast(data.message);
            setShowRestoreModal(null);
            setGuardianUserId('');
            fetchHouseholds();
        } catch (err) {
            console.error('Error restoring household:', err);
            setError(err instanceof Error ? err.message : 'Failed to restore household');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePermanentDelete = async () => {
        if (!showDeleteModal) return;

        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(`/api/admin/households/${showDeleteModal.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete household');
            }

            const data = await response.json();
            showToast(data.message);
            setShowDeleteModal(null);
            fetchHouseholds();
        } catch (err) {
            console.error('Error deleting household:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete household');
        } finally {
            setActionLoading(false);
        }
    };

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(''), 3000);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHouseholds();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, viewMode]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="p-8">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 bg-forest text-white px-4 py-2 rounded-xl shadow-lg z-50">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <h1 className="font-dmSerif text-3xl text-forest mb-2">Households</h1>
                <p className="text-textSub">Manage all households in the system.</p>
            </div>

            {/* Status Filter Tabs & View Toggle */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                            statusFilter === 'active'
                                ? 'bg-forest text-white'
                                : 'bg-white border border-border text-textSub hover:bg-softGreen'
                        }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setStatusFilter('archived')}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                            statusFilter === 'archived'
                                ? 'bg-amber-600 text-white'
                                : 'bg-white border border-border text-textSub hover:bg-amber-50'
                        }`}
                    >
                        Archived
                    </button>
                </div>
                <div className="flex gap-1 bg-white border border-border rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('grouped')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            viewMode === 'grouped'
                                ? 'bg-forest text-white'
                                : 'text-textSub hover:bg-softGreen'
                        }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                        </svg>
                        Grouped
                    </button>
                    <button
                        onClick={() => setViewMode('flat')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            viewMode === 'flat'
                                ? 'bg-forest text-white'
                                : 'text-textSub hover:bg-softGreen'
                        }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                        All Homes
                    </button>
                </div>
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
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-56 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <p className="text-sm text-textSub mb-4">
                        {viewMode === 'grouped'
                            ? `Showing ${groupedHouseholds.length} household${groupedHouseholds.length !== 1 ? 's' : ''} (${groupedHouseholds.reduce((sum, h) => sum + h.homeCount, 0)} homes)`
                            : `Showing ${households.length} home${households.length !== 1 ? 's' : ''}`
                        }
                    </p>

                    {/* Grouped View */}
                    {viewMode === 'grouped' && (
                        <div className="space-y-4">
                            {groupedHouseholds.map(household => (
                                <div key={household.household_name} className="bg-white rounded-2xl border border-border overflow-hidden">
                                    {/* Household Header */}
                                    <button
                                        onClick={() => toggleHouseholdExpanded(household.household_name)}
                                        className="w-full p-5 flex items-center gap-4 hover:bg-softGreen/30 transition-colors"
                                    >
                                        {/* Expand/Collapse Icon */}
                                        <div className={`w-6 h-6 flex items-center justify-center transition-transform ${
                                            expandedHouseholds.has(household.household_name) ? 'rotate-90' : ''
                                        }`}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </div>

                                        {/* Household Icon */}
                                        <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                            </svg>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 text-left min-w-0">
                                            <h3 className="font-semibold text-lg text-forest">
                                                {household.household_name}
                                            </h3>
                                            <p className="text-sm text-textSub">
                                                {household.homeCount} home{household.homeCount !== 1 ? 's' : ''}
                                            </p>
                                        </div>

                                        {/* Counts */}
                                        <div className="hidden md:flex items-center gap-6">
                                            <div className="text-center min-w-[60px]">
                                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                    </svg>
                                                    <p className="font-semibold text-forest">{household.parentCount}</p>
                                                </div>
                                                <p className="text-[10px] text-textSub uppercase">Parents</p>
                                            </div>
                                            <div className="text-center min-w-[60px]">
                                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
                                                        <path d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197" />
                                                    </svg>
                                                    <p className="font-semibold text-forest">{household.caregiverCount}</p>
                                                </div>
                                                <p className="text-[10px] text-textSub uppercase">Caregivers</p>
                                            </div>
                                            <div className="text-center min-w-[60px]">
                                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-terracotta">
                                                        <circle cx="12" cy="8" r="5" />
                                                        <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2" />
                                                    </svg>
                                                    <p className="font-semibold text-forest">{household.childCount}</p>
                                                </div>
                                                <p className="text-[10px] text-textSub uppercase">Children</p>
                                            </div>
                                            <div className="text-center min-w-[60px]">
                                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
                                                        <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7" />
                                                    </svg>
                                                    <p className="font-semibold text-forest">{household.petCount}</p>
                                                </div>
                                                <p className="text-[10px] text-textSub uppercase">Pets</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Homes List */}
                                    {expandedHouseholds.has(household.household_name) && (
                                        <div className="border-t border-border bg-gray-50/50">
                                            {household.homes.map((home, idx) => (
                                                <Link
                                                    key={home.id}
                                                    href={`/admin/households/${home.id}`}
                                                    className={`flex items-center gap-4 p-4 pl-16 hover:bg-softGreen/30 transition-colors ${
                                                        idx !== household.homes.length - 1 ? 'border-b border-border/50' : ''
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
                                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                            <polyline points="9 22 9 12 15 12 15 22" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-forest">{home.name}</h4>
                                                        <p className="text-xs text-textSub truncate">{home.address || 'No address'}</p>
                                                    </div>
                                                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {groupedHouseholds.length === 0 && !loading && (
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
                                    <p>No {statusFilter} households found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Flat View (All Homes) */}
                    {viewMode === 'flat' && (
                    <div className="space-y-3">
                        {households.map(household => (
                            <div
                                key={household.id}
                                className={`bg-white rounded-xl border p-5 transition-all ${
                                    isHouseholdArchived(household)
                                        ? 'border-amber-200 bg-amber-50/30'
                                        : 'border-border hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <Link
                                        href={`/admin/households/${household.id}`}
                                        className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            isHouseholdArchived(household)
                                                ? 'bg-amber-100'
                                                : 'bg-teal/10'
                                        }`}
                                    >
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isHouseholdArchived(household) ? 'text-amber-600' : 'text-teal'}>
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                    </Link>

                                    {/* Info */}
                                    <Link
                                        href={`/admin/households/${household.id}`}
                                        className="flex-1 min-w-0"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`font-semibold text-lg ${
                                                isHouseholdArchived(household)
                                                    ? 'text-amber-800'
                                                    : 'text-forest hover:text-teal'
                                            } transition-colors`}>
                                                {household.name}
                                            </h3>
                                            {isHouseholdArchived(household) && (
                                                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
                                                    Archived
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-textSub truncate">
                                                {household.address || 'No address'}
                                            </p>
                                            {household.household_name && (
                                                <span className="px-2 py-0.5 bg-teal/10 text-teal text-xs font-medium rounded-full whitespace-nowrap">
                                                    {household.household_name}
                                                </span>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Counts */}
                                    <div className="hidden md:flex items-center gap-6">
                                        <div className="text-center min-w-[60px]">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                </svg>
                                                <p className="font-semibold text-forest">{household.parentCount}</p>
                                            </div>
                                            <p className="text-[10px] text-textSub uppercase">Parents</p>
                                        </div>
                                        <div className="text-center min-w-[60px]">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
                                                    <path d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197" />
                                                </svg>
                                                <p className="font-semibold text-forest">{household.caregiverCount}</p>
                                            </div>
                                            <p className="text-[10px] text-textSub uppercase">Caregivers</p>
                                        </div>
                                        <div className="text-center min-w-[60px]">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-terracotta">
                                                    <circle cx="12" cy="8" r="5" />
                                                    <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2" />
                                                </svg>
                                                <p className="font-semibold text-forest">{household.childCount}</p>
                                            </div>
                                            <p className="text-[10px] text-textSub uppercase">Children</p>
                                        </div>
                                        <div className="text-center min-w-[60px]">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
                                                    <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7" />
                                                </svg>
                                                <p className="font-semibold text-forest">{household.petCount}</p>
                                            </div>
                                            <p className="text-[10px] text-textSub uppercase">Pets</p>
                                        </div>
                                    </div>

                                    {/* Date & Actions */}
                                    <div className="flex items-center gap-3">
                                        <p className="text-xs text-textSub hidden lg:block">
                                            {formatDate(household.created_at)}
                                        </p>
                                        {isHouseholdArchived(household) ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowRestoreModal(household)}
                                                    className="px-3 py-1.5 bg-forest text-white text-sm rounded-lg font-medium hover:bg-forest/90"
                                                >
                                                    Restore
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteModal(household)}
                                                    className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg font-medium hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ) : (
                                            <Link href={`/admin/households/${household.id}`}>
                                                <svg
                                                    className="w-5 h-5 text-gray-300 hover:text-forest transition-all"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile counts */}
                                <div className="flex md:hidden items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-textSub">
                                    <span className="flex items-center gap-1">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                        {household.parentCount} parents
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
                                            <path d="M12 4.354a4 4 0 1 1 0 5.292" />
                                        </svg>
                                        {household.caregiverCount} caregivers
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-terracotta">
                                            <circle cx="12" cy="8" r="5" />
                                        </svg>
                                        {household.childCount} children
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
                                            <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3" />
                                        </svg>
                                        {household.petCount} pets
                                    </span>
                                </div>
                            </div>
                        ))}

                        {households.length === 0 && !loading && (
                            <div className="text-center py-12 text-textSub">
                                <svg
                                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </svg>
                                <p>No {statusFilter} homes found.</p>
                            </div>
                        )}
                    </div>
                    )}
                </>
            )}

            {/* Restore Modal */}
            {showRestoreModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="font-semibold text-xl text-forest mb-2">Restore Household</h3>
                        <p className="text-textSub mb-4">
                            Restore <strong>{showRestoreModal.name}</strong> by assigning a new guardian.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-forest mb-2">
                                Select Guardian
                            </label>
                            <select
                                value={guardianUserId}
                                onChange={(e) => setGuardianUserId(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30"
                            >
                                <option value="">Choose a user...</option>
                                {allUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-textSub mt-2">
                                This user will become the guardian of {showRestoreModal.childCount} child(ren) and {showRestoreModal.petCount} pet(s).
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRestoreModal(null);
                                    setGuardianUserId('');
                                }}
                                className="flex-1 px-4 py-2 border border-border rounded-xl font-medium hover:bg-softGreen"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRestore}
                                disabled={actionLoading || !guardianUserId}
                                className="flex-1 px-4 py-2 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 disabled:opacity-50"
                            >
                                {actionLoading ? 'Restoring...' : 'Restore Household'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="font-semibold text-xl text-red-600 mb-2">Permanently Delete Household</h3>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-red-700 text-sm">
                                <strong>Warning:</strong> This action cannot be undone. The following will be permanently deleted:
                            </p>
                            <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                                <li>{showDeleteModal.childCount} child(ren) (if not in other homes)</li>
                                <li>{showDeleteModal.petCount} pet(s) (if not in other homes)</li>
                                <li>All associated data (tasks, events, logs, etc.)</li>
                            </ul>
                        </div>

                        <p className="text-textSub mb-6">
                            Are you sure you want to permanently delete <strong>{showDeleteModal.name}</strong>?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="flex-1 px-4 py-2 border border-border rounded-xl font-medium hover:bg-softGreen"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePermanentDelete}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
