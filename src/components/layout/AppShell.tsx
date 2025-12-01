import React from "react";
import Link from "next/link";
import { MOCK_CHILD } from "@/lib/mockData";

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Top App Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-between">
                <Link href="/" className="font-bold text-lg text-primary tracking-tight">
                    homes.kids
                </Link>
                <button
                    className="w-8 h-8 rounded-full bg-mint text-white flex items-center justify-center text-sm font-medium shadow-sm"
                    aria-label="Child profile"
                >
                    {MOCK_CHILD.avatarInitials}
                </button>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                {children}
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <Link
                    href="/items/new"
                    className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                    aria-label="Add item"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                        />
                    </svg>
                </Link>
            </div>
        </div>
    );
}
