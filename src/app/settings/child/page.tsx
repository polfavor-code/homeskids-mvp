"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import AppShell from "@/components/layout/AppShell";

/**
 * Legacy /settings/child route - redirects to the new structure
 * 
 * If user has one child, redirects to that child's edit page
 * If user has multiple children, redirects to children list
 */
export default function ChildRedirectPage() {
    const router = useRouter();
    const { children, child, isLoaded } = useAppState();

    useEffect(() => {
        if (!isLoaded) return;

        if (children.length === 1) {
            // Single child - go directly to edit page
            router.replace(`/settings/child/${children[0].id}`);
        } else if (child) {
            // Multiple children but one is active - go to that child's edit page
            router.replace(`/settings/child/${child.id}`);
        } else {
            // Multiple children or no children - go to children list
            router.replace("/settings/children");
        }
    }, [isLoaded, children, child, router]);

    // Show loading while redirecting
    return (
        <AppShell>
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        </AppShell>
    );
}
