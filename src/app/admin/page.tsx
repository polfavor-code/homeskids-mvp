"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface SignupDataPoint {
    date: string;
    total: number;
    parents: number;
    caregivers: number;
    other: number;
    label: string;
}

interface Stats {
    users: number;
    households: number;
    children: number;
    pets: number;
    newUsersThisWeek: number;
    parents: number;
    caregivers: number;
    signupTimeline: SignupDataPoint[];
}

function StatCard({
    label,
    value,
    icon,
    href,
    color = 'forest'
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    href?: string;
    color?: 'forest' | 'teal' | 'terracotta' | 'purple';
}) {
    const colorClasses = {
        forest: 'bg-forest/10 text-forest',
        teal: 'bg-teal/10 text-teal',
        terracotta: 'bg-terracotta/10 text-terracotta',
        purple: 'bg-purple-100 text-purple-600',
    };

    const content = (
        <>
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                    {icon}
                </div>
                {href && (
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-300 group-hover:text-forest group-hover:translate-x-1 transition-all"
                    >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                )}
            </div>
            <p className="text-3xl font-bold text-forest mb-1">{value.toLocaleString()}</p>
            <p className="text-sm text-textSub">{label}</p>
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-all group"
            >
                {content}
            </Link>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-border p-6">
            {content}
        </div>
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError('Not authenticated');
                    setLoading(false);
                    return;
                }

                const response = await fetch('/api/admin/stats', {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to fetch stats');
                }

                const data = await response.json();
                setStats(data.stats);
            } catch (err) {
                console.error('Error fetching stats:', err);
                setError(err instanceof Error ? err.message : 'Failed to load stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-gray-200 rounded"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-dmSerif text-3xl text-forest mb-2">Admin Dashboard</h1>
                <p className="text-textSub">Overview of all households, users, children, and pets in the system.</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Total Households"
                    value={stats?.households || 0}
                    href="/admin/households"
                    color="teal"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    }
                />
                <StatCard
                    label="Total Users"
                    value={stats?.users || 0}
                    href="/admin/users"
                    color="forest"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    }
                />
                <StatCard
                    label="Total Children"
                    value={stats?.children || 0}
                    color="terracotta"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="5" />
                            <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2" />
                        </svg>
                    }
                />
                <StatCard
                    label="Total Pets"
                    value={stats?.pets || 0}
                    color="purple"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
                            <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
                            <path d="M8 14v.5M16 14v.5" />
                            <path d="M11.25 16.25h1.5L12 17l-.75-.75z" />
                            <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a13.152 13.152 0 0 0-.42-3.31" />
                        </svg>
                    }
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-forest">{stats?.newUsersThisWeek || 0}</p>
                            <p className="text-sm text-textSub">New users this week</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-forest">{stats?.parents || 0}</p>
                            <p className="text-sm text-textSub">Parents</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-forest">{stats?.caregivers || 0}</p>
                            <p className="text-sm text-textSub">Caregivers</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Signup Chart */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-forest">User Signups (Last 30 Days)</h2>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-[#3B82F6]"></div>
                            <span className="text-textSub">Parents</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-[#F97316]"></div>
                            <span className="text-textSub">Caregivers</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-[#9CA3AF]"></div>
                            <span className="text-textSub">Other</span>
                        </div>
                    </div>
                </div>
                <div className="h-64">
                    {stats?.signupTimeline && stats.signupTimeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={stats.signupTimeline}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorParents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2} />
                                    </linearGradient>
                                    <linearGradient id="colorCaregivers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.2} />
                                    </linearGradient>
                                    <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#E5E7EB' }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#E5E7EB' }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                    }}
                                    labelStyle={{ fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}
                                    formatter={(value, name) => {
                                        const labels: Record<string, string> = {
                                            parents: 'Parents',
                                            caregivers: 'Caregivers',
                                            other: 'Other Users',
                                        };
                                        return [`${value}`, labels[name as string] || name];
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="parents"
                                    stackId="1"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorParents)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="caregivers"
                                    stackId="1"
                                    stroke="#F97316"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCaregivers)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="other"
                                    stackId="1"
                                    stroke="#9CA3AF"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorOther)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-textSub">
                            No signup data available
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl border border-border p-6">
                <h2 className="font-semibold text-forest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <Link
                        href="/admin/households"
                        className="flex items-center gap-3 p-4 rounded-xl bg-softGreen/50 hover:bg-softGreen transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span className="text-sm font-medium text-forest">View Households</span>
                    </Link>
                    <Link
                        href="/admin/users"
                        className="flex items-center gap-3 p-4 rounded-xl bg-softGreen/50 hover:bg-softGreen transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                        </svg>
                        <span className="text-sm font-medium text-forest">View Users</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
