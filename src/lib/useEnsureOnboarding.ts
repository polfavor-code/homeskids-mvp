"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";

/**
 * Hook to ensure onboarding is completed before accessing main app screens.
 * Redirects to /onboarding if not completed, unless already on onboarding page.
 */
export function useEnsureOnboarding() {
    const { onboardingCompleted } = useAppState();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Avoid redirect loops - don't redirect if already on onboarding
        if (pathname?.startsWith("/onboarding")) {
            return;
        }

        // Redirect to onboarding if not completed
        if (!onboardingCompleted) {
            router.push("/onboarding");
        }
    }, [onboardingCompleted, pathname, router]);
}
