"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContextV2";
import { useAuth } from "@/lib/AuthContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { SettingsIcon, UserIcon, HomeIcon } from "@/components/icons/DuotoneIcons";
import Avatar from "@/components/Avatar";

export default function SettingsPage() {
    useEnsureOnboarding();
    const { child, caregivers, homes } = useAppState();
    const { user } = useAuth();
    const childName = child?.name || "your child";

    // Get current user from caregivers
    const currentUser = caregivers.find(c => c.isCurrentUser);
    const emailPrefix = user?.email?.split('@')[0] || "";
    const userLabel = currentUser?.label || currentUser?.name || emailPrefix || "Account";

    // Count stats
    const activeHomes = homes.filter(h => h.status === "active").length;
    const activeCaregivers = caregivers.filter(c => c.status === "active").length;

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Settings</h1>
                    <p className="text-sm text-textSub mt-1">
                        Manage {childName}&apos;s profile, homes, and caregivers.
                    </p>
                </div>

                {/* Info Card */}
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

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="card-organic p-4 text-center">
                        <div className="text-2xl font-bold text-forest">{activeHomes}</div>
                        <div className="text-xs text-textSub">Active Homes</div>
                    </div>
                    <div className="card-organic p-4 text-center">
                        <div className="text-2xl font-bold text-forest">{activeCaregivers}</div>
                        <div className="text-xs text-textSub">Caregivers</div>
                    </div>
                </div>

                {/* Settings Categories */}
                <div className="card-organic p-5">
                    <h2 className="font-bold text-forest text-lg mb-4">Settings Categories</h2>

                    <div className="space-y-3">
                        {/* Child Profile */}
                        <Link
                            href="/settings/child"
                            className="flex items-center gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-100 hover:border-orange-200 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                                {child?.avatarUrl ? (
                                    <Avatar
                                        src={child.avatarUrl}
                                        initial={child.avatarInitials || child.name?.charAt(0)}
                                        size={48}
                                        bgColor="#E07B39"
                                    />
                                ) : (
                                    <span className="text-xl">{child?.avatarInitials || child?.name?.charAt(0) || "👶"}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">Child Profile</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    {child?.name || "Set up"} &middot; Name, birthday, photo
                                </p>
                            </div>
                            <svg className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>

                        {/* Homes */}
                        <Link
                            href="/settings/homes"
                            className="flex items-center gap-4 p-4 rounded-xl bg-green-50/50 border border-green-100 hover:border-green-200 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:scale-105 transition-transform">
                                <HomeIcon size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">Homes</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    {activeHomes} home{activeHomes !== 1 ? "s" : ""} set up &middot; Add or edit homes
                                </p>
                            </div>
                            <svg className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>

                        {/* Caregivers */}
                        <Link
                            href="/settings/caregivers"
                            className="flex items-center gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-forest">Caregivers</h3>
                                <p className="text-xs text-textSub mt-0.5">
                                    {activeCaregivers} caregiver{activeCaregivers !== 1 ? "s" : ""} &middot; Invite & manage access
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
