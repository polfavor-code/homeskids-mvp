"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppState, HomeProfile } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function ConfirmHomePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { homes, refreshData, isLoaded } = useAppState();

    const [assignedHomes, setAssignedHomes] = useState<HomeProfile[]>([]);
    const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Force refresh data when page loads to ensure fresh data after invite flow
    const ensureFreshData = useCallback(async () => {
        if (user && !initialLoadDone) {
            console.log("🏠 ConfirmHome: Forcing data refresh for fresh homes data");
            await refreshData();
            setInitialLoadDone(true);
        }
    }, [user, refreshData, initialLoadDone]);

    useEffect(() => {
        ensureFreshData();
    }, [ensureFreshData]);

    // Find assigned homes (homes where user has access but owner_caregiver_id is null)
    useEffect(() => {
        if (isLoaded && initialLoadDone && homes.length > 0) {
            // Find unclaimed homes (owner_caregiver_id is null) that user has access to
            const unclaimed = homes.filter(h => !h.ownerCaregiverId);
            setAssignedHomes(unclaimed);

            // Auto-select the first unclaimed home (preselect assigned home)
            if (unclaimed.length > 0 && !selectedHomeId) {
                setSelectedHomeId(unclaimed[0].id);
            }

            // If no unclaimed homes, redirect to dashboard
            if (unclaimed.length === 0) {
                router.push("/");
            }
        }
    }, [isLoaded, initialLoadDone, homes, router, selectedHomeId]);

    const handleConfirmHome = async () => {
        if (!selectedHomeId || !user) {
            setError("Please select a home to confirm.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // Update the home to set the owner_caregiver_id
            const { error: updateError } = await supabase
                .from("homes")
                .update({ owner_caregiver_id: user.id })
                .eq("id", selectedHomeId);

            if (updateError) throw updateError;

            // Refresh data and navigate to dashboard
            await refreshData();
            router.push("/");
        } catch (err: any) {
            console.error("Error confirming home:", err);
            setError(err.message || "Failed to confirm home. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        // User doesn't want to confirm any home, just go to dashboard
        router.push("/");
    };

    // Show loading state while auth is loading, data is loading, or initial refresh hasn't completed
    if (authLoading || !isLoaded || !initialLoadDone) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />

                <p className="text-lg opacity-90 mt-4 mb-8">Confirm your home</p>

                <ul className="max-w-sm space-y-4">
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Another parent assigned this home to you.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Confirming connects you to this home.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>You will be able to update its details and stay in sync.</span>
                    </li>
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <h2 className="font-dmSerif text-2xl text-forest mb-1">Confirm your home</h2>
                            <p className="text-textSub text-sm">
                                Another parent assigned this home to you.
                            </p>
                        </div>

                        {/* Home selection */}
                        <div className="space-y-3">
                            {assignedHomes.map((home) => {
                                const isSelected = selectedHomeId === home.id;
                                return (
                                    <button
                                        key={home.id}
                                        type="button"
                                        onClick={() => setSelectedHomeId(home.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                                            isSelected
                                                ? "bg-softGreen/50 border-forest/20"
                                                : "bg-white border-border hover:border-forest/30"
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            isSelected ? "bg-forest text-white" : "bg-cream text-forest"
                                        }`}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className={`font-semibold ${isSelected ? "text-forest" : "text-textSub"}`}>
                                                {home.name}
                                            </p>
                                            <p className="text-xs text-textSub">
                                                {home.address || "No address set"}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-xs text-textSub">
                            Confirming connects you to this home and gives you full access to manage all its details.
                        </p>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleSkip}
                                className="px-6 py-3 border border-border rounded-xl font-medium text-forest hover:bg-white transition-colors"
                            >
                                Skip for now
                            </button>
                            <button
                                onClick={handleConfirmHome}
                                disabled={saving || !selectedHomeId}
                                className="flex-1 py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                            >
                                {saving ? "Confirming..." : "Confirm this home"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
