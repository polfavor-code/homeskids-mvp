"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email.");
            return;
        }
        setError("");

        // TODO: Implement real password reset email
        // For now, just show success message
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                            ✓
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            Check your email
                        </h2>
                        <p className="text-gray-600 mb-6">
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        homes.kids
                    </h1>
                    <p className="text-gray-600">
                        Reset your password
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Send reset link
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="text-sm text-gray-500 hover:text-gray-900"
                        >
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
