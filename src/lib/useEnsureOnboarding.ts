"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
    "/login",
    "/register", 
    "/forgot-password",
    "/reset-password",
    "/invite",
];

// Routes that don't require child/home context (but do require auth)
const CONTEXT_FREE_ROUTES = [
    "/onboarding",
    "/select-child",
    "/select-home",
    "/setup-home",
    "/settings/account",
];

/**
 * Hook to ensure user is authenticated, onboarding is completed, and child context is set
 * before accessing main app screens.
 * 
 * Redirect hierarchy:
 * 1. If not authenticated → /login
 * 2. If onboarding not completed → /onboarding
 * 
 * NOTE: Child and home selection are NON-BLOCKING.
 * - Child is auto-selected (first child), sidebar switcher allows changing
 * - Home is auto-selected (first accessible home or last-used), no blocking page
 */
export function useEnsureOnboarding() {
    const { user, loading } = useAuth();
    const { 
        onboardingCompleted, 
        isLoaded,
        children,
        currentChild,
        setCurrentChildId,
    } = useAppState();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (loading) return; // Wait for auth to load
        if (!isLoaded) return; // Wait for app state to load

        // Check if current route is public (no auth required)
        const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
        if (isPublicRoute) {
            return;
        }

        // First check: redirect to login if not authenticated
        if (!user) {
            router.push("/login");
            return;
        }

        // Check if current route doesn't require child/home context
        const isContextFreeRoute = CONTEXT_FREE_ROUTES.some(route => pathname?.startsWith(route));
        
        // Second check: redirect to onboarding if not completed
        if (!onboardingCompleted && !pathname?.startsWith("/onboarding")) {
            router.push("/onboarding");
            return;
        }

        // Skip context checks for context-free routes
        if (isContextFreeRoute) {
            return;
        }

        // Auto-select first child if none selected (non-blocking)
        // The sidebar child switcher allows easy switching between children
        if (children.length > 0 && !currentChild) {
            setCurrentChildId(children[0].id);
            return;
        }

        // Home selection is handled automatically by AppStateContext
        // No blocking redirect needed - always auto-selects first available home
    }, [user, loading, isLoaded, onboardingCompleted, pathname, router, children, currentChild, setCurrentChildId]);
}
