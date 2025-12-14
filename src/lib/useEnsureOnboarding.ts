"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContextV2";
import { useAuth } from "@/lib/AuthContext";

/**
 * Hook to ensure user is authenticated and onboarding is completed before accessing main app screens.
 * Redirects to /login if not authenticated, or /onboarding if not completed.
 */
export function useEnsureOnboarding() {
    const { user, loading } = useAuth();
    const { onboardingCompleted, isLoaded } = useAppState();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (loading) return; // Wait for auth to load
        if (!isLoaded) return; // Wait for app state to load

        // Avoid redirect loops - don't redirect if already on auth or onboarding pages
        if (pathname?.startsWith("/login") || pathname?.startsWith("/register") || pathname?.startsWith("/forgot-password") || pathname?.startsWith("/invite")) {
            return;
        }

        // First check: redirect to login if not authenticated
        if (!user) {
            router.push("/login");
            return;
        }

        // Avoid redirect loops - don't redirect if already on onboarding
        if (pathname?.startsWith("/onboarding")) {
            return;
        }

        // Second check: redirect to onboarding if not completed
        if (!onboardingCompleted) {
            router.push("/onboarding");
        }
    }, [user, loading, isLoaded, onboardingCompleted, pathname, router]);
}
