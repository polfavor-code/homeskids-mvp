"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError("");

        try {
            // 1. Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (authData.user) {
                const userId = authData.user.id;

                // 2. Create Profile
                const { error: profileError } = await supabase
                    .from("profiles")
                    .insert({
                        id: userId,
                        email: email,
                        name: email.split("@")[0], // Default name from email
                        avatar_initials: email[0].toUpperCase(),
                        avatar_color: "bg-blue-500", // Default color
                    });

                if (profileError) {
                    console.error("Profile creation failed:", profileError);
                    // Continue anyway, can be fixed later or via triggers
                }

                // 3. Create Family
                const { data: familyData, error: familyError } = await supabase
                    .from("families")
                    .insert({
                        name: `${email.split("@")[0]}'s Family`,
                    })
                    .select()
                    .single();

                if (familyError || !familyData) {
                    console.error("Family creation failed:", familyError);
                    setError("Failed to create family space.");
                    return;
                }

                // 4. Link User to Family
                const { error: memberError } = await supabase
                    .from("family_members")
                    .insert({
                        family_id: familyData.id,
                        user_id: userId,
                        role: "parent",
                    });

                if (memberError) {
                    console.error("Failed to join family:", memberError);
                }

                router.push("/onboarding");
            }
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                            Create account
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="text-sm text-gray-600"
                        >
                            Already have an account?{" "}
                            <span className="text-primary hover:underline">Log in</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
