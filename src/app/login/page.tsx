"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setError("");

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            router.push("/");
        } catch (err) {
            setError("An unexpected error occurred.");
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        homes.kids
                    </h1>
                    <p className="text-gray-500 font-medium mb-4">
                        Co-parenting central hub.
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1 inline-block text-left">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            All info and schedules in one place.
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Track what moves between homes.
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Share important contacts.
                        </li>
                    </ul>
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
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
                            Log in
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <Link
                            href="/register"
                            className="block text-sm text-primary hover:underline"
                        >
                            Create an account
                        </Link>
                        <Link
                            href="/forgot-password"
                            className="block text-sm text-gray-500 hover:text-gray-900"
                        >
                            Forgot your password?
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
