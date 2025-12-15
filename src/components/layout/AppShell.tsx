"use client";

import React from "react";
import DesktopNav from "@/components/layout/DesktopNav";
import MobileNav from "@/components/layout/MobileNav";
import ChildContextBar from "@/components/layout/ChildContextBar";

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-cream flex">
            {/* Desktop Side Navigation */}
            <DesktopNav />

            {/* Main Content Area */}
            <main className="flex-1 min-h-screen pb-20 lg:pb-6">
                {/* Mobile Child Context Bar - sticky at top */}
                <ChildContextBar />
                
                <div className="max-w-[1200px] mx-auto px-6 py-6">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileNav />
        </div>
    );
}
