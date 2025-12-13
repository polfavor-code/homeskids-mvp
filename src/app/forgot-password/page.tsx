"use client";

import React, { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email.");
            return;
        }
        setError("");
        setLoading(true);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) {
                throw resetError;
            }

            setSubmitted(true);
        } catch (err: any) {
            console.error("Password reset error:", err);
            setError(err.message || "Failed to send reset email. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex">
                {/* Brand Side - Gradient */}
                <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                    <Logo size="lg" variant="light" />

                    <p className="text-lg opacity-90 mt-4 mb-8">
                        Check your inbox
                    </p>

                    <ul className="max-w-sm space-y-4">
                        <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                            <span className="opacity-60 mt-0.5">→</span>
                            <span>We've sent you a password reset link.</span>
                        </li>
                        <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                            <span className="opacity-60 mt-0.5">→</span>
                            <span>Click the link in your email to reset your password.</span>
                        </li>
                        <li className="flex items-start gap-3 text-white/85 text-sm pb-4">
                            <span className="opacity-60 mt-0.5">→</span>
                            <span>The link will expire in 24 hours.</span>
                        </li>
                    </ul>
                </div>

                {/* Form Side */}
                <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-sm">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <Logo size="md" variant="dark" />
                            <p className="text-textSub text-sm mt-2">Check your inbox</p>
                        </div>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="font-dmSerif text-2xl text-forest mb-3">
                                Check your email
                            </h2>
                            <p className="text-textSub">
                                We've sent a password reset link to <strong className="text-forest">{email}</strong>
                            </p>
                        </div>

                        <Link
                            href="/login"
                            className="block w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors text-center"
                        >
                            Back to login
                        </Link>

                        <p className="text-center text-sm text-textSub mt-6">
                            Didn't receive the email?{" "}
                            <button
                                onClick={() => setSubmitted(false)}
                                className="text-forest font-semibold hover:underline"
                            >
                                Try again
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />

                <p className="text-lg opacity-90 mt-4 mb-8">
                    Forgot your password?
                </p>

                <ul className="max-w-sm space-y-4">
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>No worries! Enter your email address below.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>We'll send you a link to reset your password.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Check your spam folder if you don't see it.</span>
                    </li>
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-sm">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Reset your password</p>
                    </div>

                    <h2 className="font-dmSerif text-2xl text-forest mb-6">
                        Reset password
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
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
                            {loading ? "Sending..." : "Send reset link"}
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
