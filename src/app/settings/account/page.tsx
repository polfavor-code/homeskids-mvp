"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AvatarUploader from "@/components/AvatarUploader";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";

export default function MyAccountPage() {
    useEnsureOnboarding();

    const router = useRouter();
    const { user, signOut, loading: authLoading } = useAuth();
    const { refreshData, isLoaded } = useAppState();

    const [profile, setProfile] = useState<any>(null);
    const [name, setName] = useState("");
    const [label, setLabel] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        if (user) {
            loadProfileData();
        }
    }, [user]);

    const loadProfileData = async () => {
        try {
            const { data: profileData, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user?.id)
                .single();

            if (error) throw error;

            setProfile(profileData);
            setName(profileData?.name || "");
            setLabel(profileData?.label || "");
        } catch (err) {
            console.error("Error loading profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    name: name.trim(),
                    label: label.trim() || null,
                    avatar_initials: name.trim()[0].toUpperCase(),
                })
                .eq("id", user?.id);

            if (updateError) throw updateError;

            await refreshData();
            setSuccessMessage("Profile updated!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error updating profile:", err);
            setError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            router.push("/login");
        } catch (err) {
            console.error("Logout error:", err);
            router.push("/login");
        }
    };

    // Loading state
    if (authLoading || !isLoaded || loading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">My Account</h1>
                    <p className="text-sm text-textSub">Manage your profile and preferences</p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-softGreen border border-forest/20 rounded-xl px-4 py-3 text-sm text-forest font-medium">
                        {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Profile Photo */}
                <div className="card-organic p-6">
                    <h2 className="font-bold text-forest text-lg mb-4">Profile Photo</h2>
                    <AvatarUploader
                        userId={user.id}
                        currentAvatarUrl={profile?.avatar_url}
                        userName={profile?.name || user.email || "User"}
                        onUploadSuccess={async () => {
                            await loadProfileData();
                            await refreshData();
                        }}
                    />
                </div>

                {/* Profile Info */}
                <div className="card-organic p-6 space-y-4">
                    <h2 className="font-bold text-forest text-lg">Profile Info</h2>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="user-name" className="block text-sm font-semibold text-forest mb-1.5">
                                Your Name
                            </label>
                            <input
                                id="user-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="user-label" className="block text-sm font-semibold text-forest mb-1.5">
                                Home Label
                            </label>
                            <input
                                id="user-label"
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                placeholder="e.g., Daddy, Mommy, Grandma"
                            />
                            <p className="text-xs text-textSub mt-1.5">
                                This is how your home appears in the app (e.g., "Daddy's")
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-forest mb-1.5">
                                Email
                            </label>
                            <div className="px-4 py-3 rounded-xl border border-border bg-cream/50 text-textSub text-sm">
                                {user.email}
                            </div>
                            <p className="text-xs text-textSub mt-1.5">
                                Email cannot be changed
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* Security */}
                <div className="card-organic p-6 space-y-4">
                    <h2 className="font-bold text-forest text-lg">Security</h2>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-cream/50">
                            <div>
                                <p className="font-semibold text-forest text-sm">Password</p>
                                <p className="text-xs text-textSub">Last changed: Unknown</p>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
                                            redirectTo: `${window.location.origin}/reset-password`,
                                        });
                                        if (error) throw error;
                                        setSuccessMessage("Password reset email sent!");
                                        setTimeout(() => setSuccessMessage(""), 3000);
                                    } catch (err: any) {
                                        setError(err.message || "Failed to send reset email");
                                    }
                                }}
                                className="text-sm font-semibold text-forest hover:text-forest/70"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                </div>

                {/* Log Out */}
                <div className="card-organic p-6">
                    <h2 className="font-bold text-forest text-lg mb-4">Session</h2>
                    <button
                        onClick={handleLogout}
                        className="btn-secondary w-full text-terracotta border-terracotta hover:bg-terracotta/10"
                    >
                        Log out
                    </button>
                </div>

                {/* Account Info */}
                <div className="text-center text-xs text-textSub py-4">
                    <p>Account ID: {user.id.slice(0, 8)}...</p>
                </div>
            </div>
        </AppShell>
    );
}
