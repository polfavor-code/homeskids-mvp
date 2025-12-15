"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect from old /items/missing URL to new /items/awaiting-location
export default function MissingRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/items/awaiting-location");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Redirecting...</p>
        </div>
    );
}
