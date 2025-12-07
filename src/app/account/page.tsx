"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to the new settings account page
export default function AccountRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/settings/account");
    }, [router]);

    return (
        <div className="min-h-screen bg-cream flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
        </div>
    );
}
