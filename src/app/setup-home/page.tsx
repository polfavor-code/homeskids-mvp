"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContextV2";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function SetupHomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const childId = searchParams.get("child_id");

    const { user } = useAuth();
    const { setOnboardingCompleted, refreshData } = useAppState();

    const [homeName, setHomeName] = useState("");
    const [childName, setChildName] = useState("");
    const [userLabel, setUserLabel] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Load child name and user label for display
    useEffect(() => {
        const loadData = async () => {
            if (!childId || !user) return;

            // Get child name
            const { data: child } = await supabase
                .from("children_v2")
                .select("name")
                .eq("id", childId)
                .single();

            if (child) {
                setChildName(child.name);
            }

            // Get user's label for default home name
            const { data: profile } = await supabase
                .from("profiles")
                .select("label, name")
                .eq("id", user.id)
                .single();

            if (profile) {
                setUserLabel(profile.label || profile.name || "");
                if (profile.label) {
                    setHomeName(`${profile.label}'s home`);
                }
            }
        };

        loadData();
    }, [childId, user]);

    const handleSubmit = async () => {
        if (!homeName.trim()) {
            setError("Please enter a name for your home.");
            return;
        }

        if (!user || !childId) {
            setError("Session error. Please try again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // 1. Create home
            const { data: newHome, error: homeError } = await supabase
                .from("homes_v2")
                .insert({
                    name: homeName.trim(),
                    created_by: user.id,
                })
                .select()
                .single();

            if (homeError) throw homeError;

            // 2. Create home_membership for this user
            await supabase.from("home_memberships").insert({
                home_id: newHome.id,
                user_id: user.id,
                is_home_admin: true,
            });

            // 3. Create child_space linking child to this home
            const { data: newChildSpace, error: csError } = await supabase
                .from("child_spaces")
                .insert({
                    home_id: newHome.id,
                    child_id: childId,
                })
                .select()
                .single();

            if (csError) throw csError;

            // 4. Grant child_space_access to this user
            await supabase.from("child_space_access").insert({
                child_space_id: newChildSpace.id,
                user_id: user.id,
                can_view_address: true,
            });

            // 5. Mark onboarding as complete
            await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            // 6. Update app state and redirect
            setOnboardingCompleted(true);
            await refreshData();

            router.replace("/");
        } catch (err: any) {
            console.error("Error creating home:", err);
            setError(err.message || "Failed to create home. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />
                <p className="text-lg opacity-90 mt-4 mb-8">Set up your home for {childName || "your child"}.</p>
                <ul className="max-w-sm space-y-4">
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>This is where {childName || "your child"} stays with you.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Track items as they move between homes.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Both parents see the same information.</span>
                    </li>
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Co-parenting made simple.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-forest mb-2">Set up your home</h1>
                            <p className="text-gray-600">
                                Create a home for {childName || "your child"} to stay at
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Home name
                            </label>
                            <input
                                type="text"
                                value={homeName}
                                onChange={e => setHomeName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                placeholder={userLabel ? `${userLabel}'s home` : "My home"}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                This helps {childName || "your child"} know which home they're at.
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="w-full py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                        >
                            {saving ? "Creating..." : "Create home and continue"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
