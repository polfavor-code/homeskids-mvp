"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DesktopNav from "@/components/layout/DesktopNav";
import MobileNav from "@/components/layout/MobileNav";
import { PlusIcon } from "@/components/icons/DuotoneIcons";

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();

    // Hide + button on onboarding routes
    const isOnboarding = pathname === "/onboarding";

    return (
        <div className="min-h-screen bg-cream flex">
            {/* Desktop Side Navigation */}
            <DesktopNav />

            {/* Main Content Area */}
            <main className="flex-1 min-h-screen pb-20 lg:pb-6">
                <div className="max-w-[1200px] mx-auto px-6 py-6">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileNav />


        </div>
    );
}
