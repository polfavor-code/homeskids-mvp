"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import { UserIcon } from "@/components/icons/DuotoneIcons";

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const { setOnboardingCompleted, refreshData } = useAppState();

    const [invite, setInvite] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"landing" | "login" | "signup">("landing");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchInvite = async () => {
            console.log("Fetching invite with token:", token);
            const { data, error } = await supabase
                .from("invites")
                .select("*, families(name)")
                .eq("token", token)
                .single();

            console.log("Invite fetch result:", { data, error });

            if (error) {
                console.error("Error fetching invite:", error);
            }

            if (data) {
                // Fetch child name and avatar for display (e.g., "June's Family" instead of family name)
                const { data: childData, error: childError } = await supabase
                    .from("children")
                    .select("name, avatar_url")
                    .eq("family_id", data.family_id)
                    .limit(1)
                    .single();

                console.log("Child data fetch:", { childData, childError, family_id: data.family_id });

                // Get public URL for avatar if it exists
                // Use getPublicUrl since the invite page is viewed by unauthenticated users
                let childAvatarUrl = null;
                if (childData?.avatar_url) {
                    const { data: urlData } = supabase.storage
                        .from("avatars")
                        .getPublicUrl(childData.avatar_url);
                    if (urlData?.publicUrl) {
                        childAvatarUrl = urlData.publicUrl;
                    }
                }

                // Add child name and avatar to invite data
                const inviteWithChild = {
                    ...data,
                    child_name: childData?.name || null,
                    child_avatar_url: childAvatarUrl
                };
                console.log("Invite with child:", inviteWithChild);
                setInvite(inviteWithChild);
            }
            setLoading(false);
        };
        if (token) fetchInvite();
    }, [token]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite) return;

        setError("");
        setSubmitting(true);

        // Validate password confirmation for signup
        if (view === "signup" && password !== confirmPassword) {
            setError("Passwords don't match. Please try again.");
            setSubmitting(false);
            return;
        }

        try {
            let userId;

            if (view === "signup") {
                // Sign up
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (authError) throw authError;

                // Check that authData.user exists after signup
                if (!authData.user) {
                    setError("Please check your email for a confirmation link before continuing.");
                    setSubmitting(false);
                    return;
                }

                userId = authData.user.id;

                // Create Profile
                if (userId) {
                    const { error: profileError } = await supabase.from("profiles").insert({
                        id: userId,
                        email,
                        name: invite.invitee_name || email.split("@")[0],
                        label: invite.invitee_label,
                        relationship: invite.invitee_role || null,
                        avatar_initials: invite.invitee_name?.[0]?.toUpperCase() || email[0].toUpperCase(),
                        onboarding_completed: true,
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
                // Add to family_members with the role from the invite
                const { error: memberError } = await supabase.from("family_members").insert({
                    family_id: invite.family_id,
                    user_id: userId,
                    role: invite.invitee_role || "parent",
                });

                if (memberError) {
                    console.error("Family member creation error:", memberError);
                    throw new Error("Failed to join family");
                }

                // Add home_access entries for the homes selected during invite
                if (invite.home_ids && invite.home_ids.length > 0) {
                    const accessEntries = invite.home_ids.map((homeId: string) => ({
                        home_id: homeId,
                        caregiver_id: userId,
                    }));

                    const { error: accessError } = await supabase
                        .from("home_access")
                        .insert(accessEntries);

                    if (accessError) {
                        console.error("Home access creation error:", accessError);
                        // Don't throw - home access can be set up later
                    }

                    // Also update legacy accessible_caregiver_ids array on homes
                    for (const homeId of invite.home_ids) {
                        const { data: home } = await supabase
                            .from("homes")
                            .select("accessible_caregiver_ids")
                            .eq("id", homeId)
                            .single();

                        if (home) {
                            const currentIds = home.accessible_caregiver_ids || [];
                            if (!currentIds.includes(userId)) {
                                await supabase
                                    .from("homes")
                                    .update({ accessible_caregiver_ids: [...currentIds, userId] })
                                    .eq("id", homeId);
                            }
                        }
                    }
                }

                // Migrate items assigned to this invite to the new user
                const { error: updateItemsError } = await supabase
                    .from("items")
                    .update({
                        location_caregiver_id: userId,
                        location_invite_id: null
                    })
                    .eq("location_invite_id", invite.id);

                if (updateItemsError) {
                    console.error("Failed to migrate items:", updateItemsError);
                }

                // Update invite status
                await supabase
                    .from("invites")
                    .update({ status: "accepted" })
                    .eq("id", invite.id);

                setOnboardingCompleted(true);

                // Force refresh app state to ensure fresh data is available
                await refreshData();

                // Check if this is a parent/step-parent role and if there are unclaimed homes
                const isParentRole = invite.invitee_role === "parent" || invite.invitee_role === "step_parent";

                if (isParentRole && invite.home_ids && invite.home_ids.length > 0) {
                    // Check if any of the homes they have access to are unclaimed
                    const { data: accessibleHomes } = await supabase
                        .from("homes")
                        .select("id, owner_caregiver_id")
                        .in("id", invite.home_ids);

                    const hasUnclaimedHomes = accessibleHomes?.some(h => !h.owner_caregiver_id);

                    if (hasUnclaimedHomes) {
                        // Redirect to confirm home flow
                        router.push("/confirm-home");
                        return;
                    }
                }

                router.push("/");
            }

        } catch (err: any) {
            console.error("Join failed:", err);
            setError(err.message);
            setSubmitting(false);
        }
    };

    // Get the family display name using child's name (e.g., "June's Family")
    const getFamilyDisplayName = () => {
        if (invite?.child_name) {
            return `${invite.child_name}'s Family`;
        }
        return invite?.families?.name || "the family";
    };

    // Get content for the left panel based on current view
    const getLeftPanelContent = () => {
        if (view === "landing") {
            return {
                description: `You've been invited to join ${getFamilyDisplayName()} on homes.kids.`,
                bullets: [
                    "One shared place for everything your child needs between homes.",
                    "Plan what moves in the bag between homes.",
                    "Important contacts and home details, all in one hub.",
                ],
            };
        }
        if (view === "login") {
            return {
                description: "Welcome back! Log in to join the family.",
                bullets: [
                    "Access shared items and schedules.",
                    "Stay in sync with your family.",
                    "Keep track of what's where.",
                ],
            };
        }
        return {
            description: "Create your account to get started.",
            bullets: [
                "Set up your profile in seconds.",
                "Start tracking items right away.",
                "Both parents see the same information.",
            ],
        };
    };

    const leftContent = getLeftPanelContent();

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    if (!invite) {
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
                        <h2 className="font-dmSerif text-2xl text-forest mb-2">Invalid Invite</h2>
                        <p className="text-textSub mb-6">This invite link is invalid or has expired.</p>
                        <Link
                            href="/"
                            className="inline-block py-3 px-6 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Landing view
    if (view === "landing") {
        return (
            <div className="min-h-screen flex">
                {/* Brand Side - Gradient */}
                <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                    <Logo size="lg" variant="light" />

                    <p className="text-lg opacity-90 mt-4 mb-8">{leftContent.description}</p>

                    <ul className="max-w-sm space-y-4">
                        {leftContent.bullets.map((bullet, index) => (
                            <li
                                key={index}
                                className={`flex items-start gap-3 text-white/85 text-sm ${index < leftContent.bullets.length - 1 ? "border-b border-white/10 pb-4" : "pb-4"}`}
                            >
                                <span className="opacity-60 mt-0.5">→</span>
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Form Side */}
                <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-sm">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <Logo size="md" variant="dark" />
                            <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                        </div>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                                {invite?.child_avatar_url ? (
                                    <img
                                        src={invite.child_avatar_url}
                                        alt={invite.child_name || "Child"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon size={32} className="text-teal" />
                                )}
                            </div>
                            <h2 className="font-dmSerif text-2xl text-forest mb-2">
                                You're invited!
                            </h2>
                            <p className="text-textSub text-sm">
                                Join {getFamilyDisplayName()} on homes.kids
                            </p>
                        </div>

                        {invite.invitee_name && (
                            <div className="bg-white border border-border rounded-xl p-4 mb-6 text-center">
                                <p className="text-sm text-textSub">You'll be joining as</p>
                                <p className="font-semibold text-forest">{invite.invitee_name}</p>
                                {invite.invitee_label && (
                                    <p className="text-xs text-textSub">({invite.invitee_label})</p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setView("signup")}
                            className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors mb-3"
                        >
                            Accept invite
                        </button>

                        <Link
                            href="/"
                            className="block text-center text-sm text-textSub hover:text-forest transition-colors"
                        >
                            Decline
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Login view
    if (view === "login") {
        return (
            <div className="min-h-screen flex">
                {/* Brand Side - Gradient */}
                <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                    <Logo size="lg" variant="light" />

                    <p className="text-lg opacity-90 mt-4 mb-8">{leftContent.description}</p>

                    <ul className="max-w-sm space-y-4">
                        {leftContent.bullets.map((bullet, index) => (
                            <li
                                key={index}
                                className={`flex items-start gap-3 text-white/85 text-sm ${index < leftContent.bullets.length - 1 ? "border-b border-white/10 pb-4" : "pb-4"}`}
                            >
                                <span className="opacity-60 mt-0.5">→</span>
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Form Side */}
                <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-sm">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <Logo size="md" variant="dark" />
                            <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                        </div>

                        <h2 className="font-dmSerif text-2xl text-forest mb-2">
                            Welcome back
                        </h2>
                        <p className="text-textSub text-sm mb-6">
                            Log in to join {getFamilyDisplayName()}
                        </p>

                        <form onSubmit={handleJoin} className="space-y-4">
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

                            <div>
                                <label className="block text-sm font-medium text-forest mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                                disabled={submitting}
                                className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                            >
                                {submitting ? "Logging in..." : "Log in and join"}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setView("signup")}
                                className="text-sm font-medium text-forest hover:text-teal transition-colors"
                            >
                                Need an account? Create one →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Signup view
    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />

                <p className="text-lg opacity-90 mt-4 mb-8">{leftContent.description}</p>

                <ul className="max-w-sm space-y-4">
                    {leftContent.bullets.map((bullet, index) => (
                        <li
                            key={index}
                            className={`flex items-start gap-3 text-white/85 text-sm ${index < leftContent.bullets.length - 1 ? "border-b border-white/10 pb-4" : "pb-4"}`}
                        >
                            <span className="opacity-60 mt-0.5">→</span>
                            <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-sm">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                    </div>

                    <h2 className="font-dmSerif text-2xl text-forest mb-2">
                        Create account
                    </h2>
                    <p className="text-textSub text-sm mb-6">
                        Create an account to join {getFamilyDisplayName()}
                    </p>

                    <form onSubmit={handleJoin} className="space-y-4">
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

                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">
                                Password
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
                            disabled={submitting}
                            className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                        >
                            {submitting ? "Creating account..." : "Create account and join"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setView("login")}
                            className="text-sm font-medium text-forest hover:text-teal transition-colors"
                        >
                            Already have an account? Log in →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
