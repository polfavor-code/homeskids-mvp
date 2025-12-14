"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";

export default function SelectChildPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { 
        children, 
        setCurrentChildId, 
        isLoaded,
        getAccessibleHomesForChild,
        refreshData
    } = useAppState();

    // Handle child selection
    const handleSelectChild = async (childId: string) => {
        setCurrentChildId(childId);
        
        // Refresh data for the new child
        // Home is auto-selected by AppStateContext (first accessible or last-used)
        await refreshData();
        
        // Always go to dashboard - home selection is non-blocking
        router.push("/");
    };

    // Show loading state
    if (authLoading || !isLoaded) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        router.push("/login");
        return null;
    }

    // If only one child, auto-select and redirect
    if (children.length === 1) {
        handleSelectChild(children[0].id);
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    // If no children, redirect to onboarding
    if (children.length === 0) {
        router.push("/onboarding");
        return null;
    }

    return (
        <div className="min-h-screen bg-cream flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-center py-6">
                <Logo size="md" variant="dark" />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center px-6 py-8">
                <div className="w-full max-w-md">
                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="font-dmSerif text-3xl text-forest mb-2">
                            Who are you helping today?
                        </h1>
                        <p className="text-textSub">
                            Select a child to see their homes, items, and schedule.
                        </p>
                    </div>

                    {/* Child List */}
                    <div className="space-y-3">
                        {children.map((child) => {
                            const accessibleHomes = getAccessibleHomesForChild(child.id);
                            const homeCount = accessibleHomes.length;
                            
                            return (
                                <button
                                    key={child.id}
                                    onClick={() => handleSelectChild(child.id)}
                                    className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-border hover:border-forest hover:shadow-md transition-all text-left"
                                >
                                    {/* Avatar */}
                                    <Avatar
                                        src={child.avatarUrl}
                                        initial={child.avatarInitials}
                                        size={56}
                                        bgColor="#4A7C59"
                                    />
                                    
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-forest text-lg truncate">
                                            {child.name}
                                        </h3>
                                        <p className="text-sm text-textSub">
                                            {homeCount === 0 && "No homes set up yet"}
                                            {homeCount === 1 && "1 home"}
                                            {homeCount > 1 && `${homeCount} homes`}
                                        </p>
                                    </div>

                                    {/* Arrow */}
                                    <svg 
                                        className="w-5 h-5 text-gray-400 flex-shrink-0" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M9 5l7 7-7 7" 
                                        />
                                    </svg>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
