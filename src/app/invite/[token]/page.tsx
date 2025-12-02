"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const { setOnboardingCompleted } = useAppState();

    // Mock data for the invite
    // In a real app, we would fetch this from the backend using the token
    const inviteData = {
        inviterName: "Paul",
        inviteeName: "Alice",
        childName: "June",
    };

    const [view, setView] = useState<"landing" | "login" | "signup">("landing");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleAccept = () => {
        // In a real app, we might check if the email exists here
        // For now, let's default to signup as it's the most common case for new invites
        setView("signup");
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement real join logic (auth + link to family)

        // CRITICAL: Skip onboarding for invited users
        setOnboardingCompleted(true);
        router.push("/");
    };

    // Marketing block component
    const MarketingBlock = () => (
        <div className="mb-6">
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
    );

    if (view === "landing") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                            👋
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Hi {inviteData.inviteeName}, {inviteData.inviterName} invited you to homes.kids.
                        </h1>

                        <MarketingBlock />

                        <p className="text-sm text-gray-600 mb-8">
                            You've been added as a caretaker for {inviteData.childName}. Join to help track what moves between homes.
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={handleAccept}
                                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                            >
                                Accept invite
                            </button>
                            <button className="text-sm text-gray-400 hover:text-gray-600">
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === "login") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Welcome back
                            </h1>
                            <p className="text-sm text-gray-600">
                                Log in to join {inviteData.childName}'s family
                            </p>
                        </div>

                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                            >
                                Log in and join
                            </button>
                        </form>
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setView("signup")}
                                className="text-sm text-primary hover:underline"
                            >
                                Need an account? Create one
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Signup view
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Create account
                        </h1>
                        <p className="text-sm text-gray-600">
                            Create an account to join {inviteData.childName}'s family
                        </p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Create account and join
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setView("login")}
                            className="text-sm text-primary hover:underline"
                        >
                            Already have an account? Log in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
