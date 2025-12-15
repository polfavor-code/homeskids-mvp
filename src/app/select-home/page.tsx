"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";

export default function SelectHomePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { 
        currentChild,
        accessibleHomes, // Use accessibleHomes instead of homes
        setCurrentHomeId, 
        isLoaded,
        children,
        clearChildSelection
    } = useAppState();

    // Handle home selection
    const handleSelectHome = (homeId: string) => {
        setCurrentHomeId(homeId);
        router.push("/");
    };

    // Handle going back to child selection
    const handleBackToChildSelection = () => {
        clearChildSelection();
        router.push("/select-child");
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

    // Redirect to child selection if no child selected
    if (!currentChild) {
        router.push("/select-child");
        return null;
    }

    // If only one accessible home, auto-select and redirect
    if (accessibleHomes.length === 1) {
        handleSelectHome(accessibleHomes[0].id);
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    // If no accessible homes, redirect to setup
    if (accessibleHomes.length === 0) {
        router.push("/setup-home");
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
                    {/* Back button - only show if multiple children */}
                    {children.length > 1 && (
                        <button
                            onClick={handleBackToChildSelection}
                            className="flex items-center gap-2 text-forest mb-4 hover:text-teal transition-colors"
                        >
                            <svg 
                                className="w-5 h-5" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M15 19l-7-7 7-7" 
                                />
                            </svg>
                            <span className="text-sm font-medium">Change child</span>
                        </button>
                    )}

                    {/* Child indicator */}
                    <div className="flex items-center gap-3 mb-6 p-3 bg-softGreen/30 rounded-xl">
                        <Avatar
                            src={currentChild.avatarUrl}
                            initial={currentChild.avatarInitials}
                            size={40}
                            bgColor="#4A7C59"
                        />
                        <span className="text-sm text-forest">
                            Showing homes for <span className="font-semibold">{currentChild.name}</span>
                        </span>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="font-dmSerif text-3xl text-forest mb-2">
                            Choose a home
                        </h1>
                        <p className="text-textSub">
                            Pick the home you want to work in right now.
                        </p>
                    </div>

                    {/* Home List */}
                    <div className="space-y-3">
                        {accessibleHomes.map((home) => (
                            <button
                                key={home.id}
                                onClick={() => handleSelectHome(home.id)}
                                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-border hover:border-forest hover:shadow-md transition-all text-left"
                            >
                                {/* Home Icon or Photo */}
                                {home.photoUrl ? (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                                        <img 
                                            src={home.photoUrl} 
                                            alt={home.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-softGreen flex items-center justify-center flex-shrink-0">
                                        <svg 
                                            className="w-7 h-7 text-forest" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth={1.5} 
                                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                                            />
                                        </svg>
                                    </div>
                                )}
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-forest text-lg truncate">
                                        {home.name}
                                    </h3>
                                    {home.address && (
                                        <p className="text-sm text-textSub truncate">
                                            {home.address}
                                        </p>
                                    )}
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
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}


