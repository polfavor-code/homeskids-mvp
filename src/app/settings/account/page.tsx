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

    // Email editing state
    const [email, setEmail] = useState("");
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [savingEmail, setSavingEmail] = useState(false);

    // Password editing state
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            loadProfileData();
            setEmail(user.email || "");
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

    const handleEmailSave = async () => {
        const newEmail = email.trim().toLowerCase();
        const currentEmail = user?.email?.toLowerCase();

        setEmailError("");

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            setEmailError("Please enter a valid email address");
            return;
        }

        // Check if email is the same
        if (newEmail === currentEmail) {
            setEmailError("This is already your email");
            return;
        }

        setSavingEmail(true);

        try {
            // Use server-side API to update email (bypasses verification requirement)
            const response = await fetch("/api/update-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user?.id,
                    newEmail: newEmail,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setEmailError(result.error || "Failed to update email");
                setSavingEmail(false);
                return;
            }

            // Force refresh the auth session to get updated user data
            await supabase.auth.refreshSession();
            await refreshData();
            setIsEditingEmail(false);
            setEmail(newEmail);
            setSuccessMessage("Email updated successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error updating email:", err);
            setEmailError(err.message || "Failed to update email");
        } finally {
            setSavingEmail(false);
        }
    };

    const handleEmailCancel = () => {
        setEmail(user?.email || "");
        setEmailError("");
        setIsEditingEmail(false);
    };

    const handlePasswordSave = async () => {
        setPasswordError("");

        // Validate inputs
        if (!currentPassword) {
            setPasswordError("Please enter your current password");
            return;
        }

        if (!newPassword) {
            setPasswordError("Please enter a new password");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordError("New passwords don't match");
            return;
        }

        setSavingPassword(true);

        try {
            // First, verify current password by re-authenticating
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email || "",
                password: currentPassword,
            });

            if (signInError) {
                setPasswordError("Current password is incorrect");
                setSavingPassword(false);
                return;
            }

            // Update to new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                throw updateError;
            }

            // Success - reset form
            setIsEditingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setSuccessMessage("Password updated successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error updating password:", err);
            setPasswordError(err.message || "Failed to update password");
        } finally {
            setSavingPassword(false);
        }
    };

    const handlePasswordCancel = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setPasswordError("");
        setIsEditingPassword(false);
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
                            {isEditingEmail ? (
                                <div className="space-y-2">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setEmailError("");
                                        }}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                        placeholder="your@email.com"
                                        autoFocus
                                    />
                                    {emailError && (
                                        <p className="text-xs text-terracotta">{emailError}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleEmailSave}
                                            disabled={savingEmail}
                                            className="flex-1 py-2 px-4 rounded-xl bg-forest text-white text-sm font-semibold hover:bg-forest/90 disabled:opacity-50"
                                        >
                                            {savingEmail ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={handleEmailCancel}
                                            disabled={savingEmail}
                                            className="flex-1 py-2 px-4 rounded-xl border border-border text-forest text-sm font-semibold hover:bg-cream disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 px-4 py-3 rounded-xl border border-border bg-cream/50 text-textSub text-sm">
                                        {user.email}
                                    </div>
                                    <button
                                        onClick={() => setIsEditingEmail(true)}
                                        className="px-4 py-3 rounded-xl border border-border text-forest text-sm font-semibold hover:bg-cream"
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}
                            <p className="text-xs text-textSub mt-1.5">
                                This is also your login email
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
                        {isEditingPassword ? (
                            <div className="p-4 rounded-xl bg-cream/50 space-y-3">
                                <p className="font-semibold text-forest text-sm mb-2">Change Password</p>

                                <div>
                                    <label className="block text-xs font-medium text-forest mb-1">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => {
                                            setCurrentPassword(e.target.value);
                                            setPasswordError("");
                                        }}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-forest text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-forest mb-1">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setPasswordError("");
                                        }}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-forest text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-forest mb-1">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => {
                                            setConfirmNewPassword(e.target.value);
                                            setPasswordError("");
                                        }}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-forest text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    />
                                </div>

                                {passwordError && (
                                    <p className="text-xs text-terracotta">{passwordError}</p>
                                )}

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={handlePasswordSave}
                                        disabled={savingPassword}
                                        className="flex-1 py-2 px-4 rounded-xl bg-forest text-white text-sm font-semibold hover:bg-forest/90 disabled:opacity-50"
                                    >
                                        {savingPassword ? "Saving..." : "Update Password"}
                                    </button>
                                    <button
                                        onClick={handlePasswordCancel}
                                        disabled={savingPassword}
                                        className="flex-1 py-2 px-4 rounded-xl border border-border text-forest text-sm font-semibold hover:bg-cream disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-cream/50">
                                <div>
                                    <p className="font-semibold text-forest text-sm">Password</p>
                                    <p className="text-xs text-textSub">Change your account password</p>
                                </div>
                                <button
                                    onClick={() => setIsEditingPassword(true)}
                                    className="text-sm font-semibold text-forest hover:text-forest/70"
                                >
                                    Change
                                </button>
                            </div>
                        )}
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
