"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

    // Check if we have a valid recovery session
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            // Check URL for recovery token (Supabase adds this after email click)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get("access_token");
            const type = hashParams.get("type");

            if (type === "recovery" && accessToken) {
                // Set the session from the recovery token
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: hashParams.get("refresh_token") || "",
                });

                if (error) {
                    console.error("Error setting recovery session:", error);
                    setIsValidSession(false);
                } else {
                    setIsValidSession(true);
                }
            } else if (session) {
                // User might already be logged in and changing password from settings
                setIsValidSession(true);
            } else {
                setIsValidSession(false);
            }
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password) {
            setError("Please enter a new password.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords don't match.");
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) {
                throw updateError;
            }

            setSuccess(true);

            // Redirect to home after a short delay
            setTimeout(() => {
                router.push("/");
            }, 2000);
        } catch (err: any) {
            console.error("Password update error:", err);
            setError(err.message || "Failed to update password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Loading state while checking session
    if (isValidSession === null) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    // Invalid or expired link
    if (!isValidSession) {
        return (
            <div className="min-h-screen flex">
                {/* Brand Side */}
                <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                    <Logo size="lg" variant="light" />
                    <p className="text-lg opacity-90 mt-4">Co-parenting central hub.</p>
                </div>

                {/* Content Side */}
                <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-sm text-center">
                        <div className="lg:hidden mb-8">
                            <Logo size="md" variant="dark" />
                        </div>

                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="font-dmSerif text-2xl text-forest mb-2">Link Expired</h2>
                        <p className="text-textSub mb-6">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-block py-3 px-6 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors"
                        >
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex">
                {/* Brand Side */}
                <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                    <Logo size="lg" variant="light" />
                    <p className="text-lg opacity-90 mt-4">Password updated!</p>
                </div>

                {/* Content Side */}
                <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-sm text-center">
                        <div className="lg:hidden mb-8">
                            <Logo size="md" variant="dark" />
                        </div>

                        <div className="w-16 h-16 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="font-dmSerif text-2xl text-forest mb-2">Password Updated</h2>
                        <p className="text-textSub mb-6">
                            Your password has been successfully updated. Redirecting you now...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Password reset form
    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />

                <p className="text-lg opacity-90 mt-4 mb-8">
                    Create a new password
                </p>

                <ul className="max-w-sm space-y-4">
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Choose a strong password with at least 6 characters.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Use a mix of letters, numbers, and symbols.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Don't reuse passwords from other sites.</span>
                    </li>
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-sm">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Create a new password</p>
                    </div>

                    <h2 className="font-dmSerif text-2xl text-forest mb-6">
                        Set new password
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>

                    <div className="mt-6 space-y-3">
                        <Link
                            href="/login"
                            className="block text-center text-sm text-textSub hover:text-forest transition-colors"
                        >
                            ← Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
