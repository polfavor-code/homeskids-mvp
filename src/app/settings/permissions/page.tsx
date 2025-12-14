"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContextV2";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import Link from "next/link";

export default function PermissionsPage() {
    useEnsureOnboarding();

    const { user, loading: authLoading } = useAuth();
    const { child, caregivers, homes, isLoaded } = useAppState();

    // Filter active caregivers
    const activeCaregivers = caregivers.filter(c => !c.id.startsWith("pending-"));

    // Get homes for a caregiver
    const getCaregiverHomes = (caregiverId: string): string[] => {
        return homes
            .filter(home => home.accessibleCaregiverIds?.includes(caregiverId))
            .map(home => home.name);
    };

    // Loading state
    if (authLoading || !isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/settings"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Settings
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Permissions</h1>
                    <p className="text-sm text-textSub">
                        Who can see what will be configured here.
                    </p>
                </div>

                {/* Intro Card */}
                <div className="card-organic p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blush/30 flex items-center justify-center text-blush flex-shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-forest font-medium mb-1">
                                Fine-grained permissions coming soon
                            </p>
                            <p className="text-sm text-textSub">
                                Later, this page will let you choose what each caregiver can see and edit.
                                For now, all caregivers have the same basic access to {child?.name || "your child"}'s information.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Caregivers List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-forest">
                            Current Access ({activeCaregivers.length})
                        </h2>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                            Coming soon
                        </span>
                    </div>

                    {activeCaregivers.map((caregiver) => {
                        const connectedHomes = getCaregiverHomes(caregiver.id);
                        return (
                            <div key={caregiver.id} className="card-organic p-4">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <Avatar
                                        src={caregiver.avatarUrl}
                                        initial={caregiver.avatarInitials}
                                        size={44}
                                        bgColor={caregiver.avatarColor.startsWith("bg-") ? "#6B7280" : caregiver.avatarColor}
                                    />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-forest">{caregiver.label}</h3>
                                            {caregiver.isCurrentUser && (
                                                <span className="text-xs bg-softGreen text-forest px-2 py-0.5 rounded-full font-medium">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-textSub">
                                            {caregiver.relationship
                                                ? caregiver.relationship.charAt(0).toUpperCase() + caregiver.relationship.slice(1).replace('_', ' ')
                                                : caregiver.name}
                                        </p>
                                        {connectedHomes.length > 0 && (
                                            <p className="text-xs text-textSub/70 mt-0.5">
                                                {connectedHomes.join(", ")}
                                            </p>
                                        )}
                                    </div>

                                    {/* Access Level */}
                                    <div className="text-right">
                                        <span className="text-xs bg-softGreen text-forest px-2.5 py-1 rounded-full font-medium">
                                            Full Access
                                        </span>
                                        <p className="text-xs text-textSub/60 mt-1">
                                            Same as you
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {activeCaregivers.length === 0 && (
                        <div className="card-organic p-6 text-center">
                            <p className="text-sm text-textSub">
                                No caregivers yet.{" "}
                                <Link href="/settings/caregivers" className="text-teal hover:underline">
                                    Invite someone
                                </Link>
                            </p>
                        </div>
                    )}
                </div>

                {/* What's Coming Section */}
                <div className="card-organic p-5">
                    <h2 className="font-semibold text-forest mb-4">What's coming</h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-cream flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <polyline points="9 11 12 14 22 4" />
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-forest">View-only access</p>
                                <p className="text-xs text-textSub">Let helpers see information without editing</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-cream flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-forest">Home-specific access</p>
                                <p className="text-xs text-textSub">Limit what each caregiver sees based on their connected homes</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-cream flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-forest">Section restrictions</p>
                                <p className="text-xs text-textSub">Control access to health records, documents, contacts separately</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="card-organic p-4 bg-softGreen/50">
                    <div className="flex items-start gap-3">
                        <div className="text-forest mt-0.5">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-forest font-medium mb-1">About Permissions</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Right now, all caregivers have full access to view and edit {child?.name || "your child"}'s information.
                                We're working on granular permissions to give you more control over who sees what.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
