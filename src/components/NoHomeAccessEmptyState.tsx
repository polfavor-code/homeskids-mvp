"use client";

import React from "react";
import Link from "next/link";

interface NoHomeAccessEmptyStateProps {
    inviterName: string;
    onCreateHome?: () => void;
    onWaitForAccess?: () => void;
}

/**
 * Empty state shown to invited caregivers who have no home access yet.
 * This happens when an invite was set up with "Skip for now" for home access.
 */
export default function NoHomeAccessEmptyState({
    inviterName,
    onCreateHome,
    onWaitForAccess,
}: NoHomeAccessEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
            {/* Icon badge */}
            <div className="w-20 h-20 bg-softGreen rounded-full flex items-center justify-center text-4xl mb-6">
                👋
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-dmSerif text-forest mb-3">
                You're invited, but not assigned yet
            </h1>

            {/* Subtext */}
            <p className="text-textSub mb-8 leading-relaxed">
                You were invited by <strong className="text-forest">{inviterName}</strong>, but no home has been assigned to you yet.
                <br />
                Ask {inviterName} to add you to a home, or create a home for your own child.
            </p>

            {/* Primary action */}
            <Link
                href="/setup-home?new=true"
                onClick={onCreateHome}
                className="btn-primary w-full max-w-xs mb-3"
            >
                Create a home
            </Link>

            {/* Secondary action */}
            <button
                onClick={onWaitForAccess}
                className="w-full max-w-xs py-3 px-6 rounded-full border border-forest text-forest font-semibold hover:bg-softGreen transition-colors"
            >
                I'll wait for access
            </button>

            {/* Info box */}
            <div className="mt-8 p-4 bg-cream rounded-xl border border-border text-left w-full max-w-xs">
                <p className="text-sm text-textSub">
                    Once you're added to a home, you'll be able to view schedules, items, and your child's details.
                </p>
            </div>

            {/* Footer */}
            <p className="mt-8 text-xs text-textSub/60">
                If you think this is a mistake, contact {inviterName}.
            </p>
        </div>
    );
}
