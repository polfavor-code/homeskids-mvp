"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const { child, caregivers } = useAppState();

    const [caregiver1MenuOpen, setCaregiver1MenuOpen] = useState(false);
    const [childMenuOpen, setChildMenuOpen] = useState(false);
    const [caregiver2MenuOpen, setCaregiver2MenuOpen] = useState(false);

    // Hide + button on onboarding routes
    const isOnboarding = pathname === "/onboarding";

    const handleLogout = () => {
        // TODO: Implement logout logic
        console.log("Logout clicked");
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Top App Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-between">
                <Link href="/" className="font-bold text-lg text-primary tracking-tight">
                    homes.kids
                </Link>

                {/* Three Avatars */}
                <div className="flex items-center gap-2">
                    {/* Caretaker 1 Avatar */}
                    <div className="relative">
                        <button
                            onClick={() => setCaregiver1MenuOpen(!caregiver1MenuOpen)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm ${caregivers[0]?.avatarColor || "bg-blue-500"}`}
                            aria-label={caregivers[0]?.name || "Caretaker 1"}
                        >
                            {caregivers[0]?.avatarInitials || "C1"}
                        </button>
                        {caregiver1MenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Update profile photo
                                </button>
                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Edit details
                                </button>
                                <hr className="my-1" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Child Avatar */}
                    <div className="relative">
                        <button
                            onClick={() => setChildMenuOpen(!childMenuOpen)}
                            className="w-8 h-8 rounded-full bg-mint text-white flex items-center justify-center text-sm font-medium shadow-sm"
                            aria-label={child.name}
                        >
                            {child.avatarInitials}
                        </button>
                        {childMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Update profile photo
                                </button>
                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Edit details
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Caretaker 2 Avatar */}
                    <div className="relative">
                        <button
                            onClick={() => setCaregiver2MenuOpen(!caregiver2MenuOpen)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm ${caregivers[1]?.avatarColor || "bg-pink-500"}`}
                            aria-label={caregivers[1]?.name || "Caretaker 2"}
                        >
                            {caregivers[1]?.avatarInitials || "C2"}
                        </button>
                        {caregiver2MenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Update profile photo
                                </button>
                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Edit details
                                </button>
                                <hr className="my-1" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                {children}
            </main>

            {/* Floating Action Button - Hidden on onboarding */}
            {!isOnboarding && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Link
                        href="/items/new"
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-white shadow-lg hover:bg-blue-600 transition-colors"
                        aria-label="Add item"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                        <span className="text-sm font-semibold">Item</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
