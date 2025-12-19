"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { SettingsIcon, UserIcon } from "@/components/icons/DuotoneIcons";
import Avatar from "@/components/Avatar";

export default function SettingsPage() {
    useEnsureOnboarding();
    const { child, caregivers, accessibleHomes } = useAppState();
    const { user } = useAuth();

    // Check if user has any home access
    const hasHomeAccess = accessibleHomes.length > 0;
    
    // Only show child name if user has home access
    const childName = hasHomeAccess ? (child?.name || "your child") : "your child";

    // Get current user from caregivers
    const currentUser = caregivers.find(c => c.isCurrentUser);
    const emailPrefix = user?.email?.split('@')[0] || "";
    const userLabel = currentUser?.label || currentUser?.name || emailPrefix || "Account";

    // Count stats - only from accessible homes/caregivers
    const activeHomesCount = hasHomeAccess ? accessibleHomes.filter(h => h.status === "active").length : 0;
    // Only count caregivers that share homes with current user (for helpers)
    const visibleCaregivers = hasHomeAccess ? caregivers.filter(c => c.status === "active").length : 0;

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Settings</h1>
                    <p className="text-sm text-textSub mt-1">
                        {hasHomeAccess 
                            ? `Manage ${childName}'s profile, homes, and caregivers.`
                            : "Manage your profile, homes, and caregivers."
                        }
                    </p>
                </div>

                {/* Info Card - different message based on access */}
                {hasHomeAccess ? (
                    <div className="card-organic p-5 bg-softGreen/30">
                        <div className="flex items-start gap-3">
                            <div className="text-forest mt-0.5">
                                <SettingsIcon size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-forest leading-relaxed">
                                    Configure everything about {childName}&apos;s shared care setup.
                                    Set up homes, invite caregivers, and manage permissions so
                                    everyone has access to what they need.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card-organic p-5 bg-amber-50/50 border-amber-200">
                        <div className="flex items-start gap-3">
                            <div className="text-amber-600 mt-0.5">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    You don&apos;t have access to any homes yet. Once you&apos;re added to a home,
                                    you&apos;ll be able to see and manage settings here.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Stats - always show, with 0 for no home access */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="card-organic p-4 text-center">
                        <div className="text-2xl font-bold text-forest">{activeHomesCount}</div>
                        <div className="text-xs text-textSub">Active Homes</div>
                    </div>
                    <div className="card-organic p-4 text-center">
                        <div className="text-2xl font-bold text-forest">{visibleCaregivers}</div>
                        <div className="text-xs text-textSub">Caregivers</div>
                    </div>
                </div>

                {/* Settings Categories */}
                <div className="card-organic p-5">
                    <h2 className="font-bold text-forest text-lg mb-4">Settings Categories</h2>

                    <div className="space-y-3">
                        {/* Children */}
                        <Link
                            href="/settings/children"
                            className="flex items-center gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-100 hover:border-orange-200 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                                {hasHomeAccess && child?.avatarUrl ? (
                                    <Avatar
                                        src={child.avatarUrl}
                                        initial={child.avatarInitials || child.name?.charAt(0)}
                                        size={48}
                                        bgColor="#E07B39"
                                    />
                                ) : (
                                    <span className="text-xl">👶</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">Children</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    {hasHomeAccess ? "Manage children profiles" : "Add your children"}
                                </p>
                            </div>
                            <svg className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>

                        {/* Permissions */}
                        <Link
                            href="/settings/permissions"
                            className="flex items-center gap-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100 hover:border-purple-200 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">Permissions</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    Who can see and edit what
                                </p>
                            </div>
                            <svg className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>

                        {/* Integrations */}
                        <Link
                            href="/settings/integrations"
                            className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-200 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">Integrations</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    Connect Google Calendar & more
                                </p>
                            </div>
                            <svg className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>

                        {/* Notifications */}
                        <Link
                            href="/settings/notifications"
                            className="flex items-center gap-4 p-4 rounded-xl bg-amber-50/50 border border-amber-100 hover:border-amber-200 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">Notifications</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    Push notifications &amp; alerts
                                </p>
                            </div>
                            <svg className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>

                        {/* My Account */}
                        <Link
                            href="/settings/account"
                            className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 border border-gray-200 hover:border-gray-300 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:scale-105 transition-transform overflow-hidden">
                                {currentUser?.avatarUrl ? (
                                    <Avatar
                                        src={currentUser.avatarUrl}
                                        initial={currentUser.avatarInitials || currentUser.name?.charAt(0)}
                                        size={48}
                                        bgColor="#2C3E2D"
                                    />
                                ) : (
                                    <UserIcon size={24} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">My Account</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    {userLabel}&apos;s account &middot; Profile, email, password
                                </p>
                            </div>
                            <svg className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
