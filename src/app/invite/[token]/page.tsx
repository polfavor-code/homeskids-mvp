"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import { supabase } from "@/lib/supabase";

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const { setOnboardingCompleted } = useAppState();

    const [invite, setInvite] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"landing" | "login" | "signup">("landing");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        const fetchInvite = async () => {
            const { data, error } = await supabase
                .from("invites")
                .select("*, families(name)")
                .eq("token", token)
                .single();

            if (data) {
                setInvite(data);
            }
            setLoading(false);
        };
        if (token) fetchInvite();
    }, [token]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite) return;

        try {
            let userId;

            if (view === "signup") {
                // Sign up
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (authError) throw authError;
                userId = authData.user?.id;

                // Create Profile
                if (userId) {
                    const { error: profileError } = await supabase.from("profiles").insert({
                        id: userId,
                        email,
                        name: invite.invitee_name || email.split("@")[0],
                        label: invite.invitee_label, // Save the label from the invite
                        avatar_initials: invite.invitee_name?.[0]?.toUpperCase() || email[0].toUpperCase(),
                        onboarding_completed: true, // Skip onboarding for invited users
                    });
                    if (profileError) {
                        console.error("Profile creation error:", profileError);
                        throw new Error("Failed to create profile");
                    }
                }

            } else {
                // Login
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (authError) throw authError;
                userId = authData.user?.id;
            }

            if (userId) {
                // 3. Add to family_members
                const { error: memberError } = await supabase.from("family_members").insert({
                    family_id: invite.family_id,
                    user_id: userId,
                    role: "parent", // Default role
                });

                if (memberError) {
                    console.error("Family member creation error:", memberError);
                    throw new Error("Failed to join family");
                }

                // 4. Migrate items assigned to this invite to the new user
                const { error: updateItemsError } = await supabase
                    .from("items")
                    .update({
                        location_caregiver_id: userId,
                        location_invite_id: null
                    })
                    .eq("location_invite_id", invite.id);

                if (updateItemsError) {
                    console.error("Failed to migrate items:", updateItemsError);
                    // Don't throw here, as the user is already joined. Just log it.
                }

                // 5. Update invite status
                await supabase
                    .from("invites")
                    .update({ status: "accepted" })
                    .eq("id", invite.id);

                // Refresh app state (will happen automatically on redirect/mount)
                setOnboardingCompleted(true);
                window.location.href = "/";
            }

        } catch (err: any) {
            console.error("Join failed:", err);
            alert(err.message);
        }
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

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!invite) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
                    <p className="text-gray-600">This invite link is invalid or has expired.</p>
                    <Link href="/" className="text-primary hover:underline mt-4 inline-block">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    if (view === "landing") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                            👋
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            You've been invited to join {invite.families?.name || "a family"}.
                        </h1>

                        <MarketingBlock />

                        <p className="text-sm text-gray-600 mb-8">
                            Join to help track what moves between homes.
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={() => setView("signup")}
                                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                            >
                                Accept invite
                            </button>
                            <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600">
                                Decline
                            </Link>
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
                                Log in to join {invite?.families?.name || "the family"}
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
                            Create an account to join {invite?.families?.name || "the family"}
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
