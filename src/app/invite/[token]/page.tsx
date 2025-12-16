"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import { UserIcon } from "@/components/icons/DuotoneIcons";

// localStorage keys for persisting selection (same as AppStateContext)
const STORAGE_KEY_CHILD = "homeskids_active_child_id";
const STORAGE_KEY_HOME = "homeskids_active_home_id";

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

            // First try invites (new V2 model)
            const { data: v2Data, error: v2Error } = await supabase
                .from("invites")
                .select(`
                    *,
                    child:children!child_id (
                        id,
                        name,
                        avatar_url
                    )
                `)
                .eq("token", token)
                .eq("status", "pending")
                .single();

            console.log("V2 invite fetch result:", { v2Data, v2Error });

            if (v2Data) {
                console.log("📸 V2 invite child data:", v2Data.child);
                
                // Get child avatar URL if exists (use signed URL for private bucket)
                let childAvatarUrl = null;
                if (v2Data.child?.avatar_url) {
                    console.log("📸 Child has avatar_url:", v2Data.child.avatar_url);
                    const { data: urlData, error: urlError } = await supabase.storage
                        .from("avatars")
                        .createSignedUrl(v2Data.child.avatar_url, 3600); // 1 hour expiry
                    console.log("📸 Signed URL result:", { urlData, urlError });
                    if (!urlError && urlData?.signedUrl) {
                        childAvatarUrl = urlData.signedUrl;
                    }
                } else {
                    console.log("📸 No avatar_url on child - RLS may be blocking child data");
                    // If child join failed due to RLS, try fetching child directly
                    if (v2Data.child_id) {
                        const { data: directChild, error: directError } = await supabase
                            .from("children")
                            .select("name, avatar_url")
                            .eq("id", v2Data.child_id)
                            .single();
                        console.log("📸 Direct child fetch:", { directChild, directError });
                        if (directChild?.avatar_url) {
                            const { data: urlData } = await supabase.storage
                                .from("avatars")
                                .createSignedUrl(directChild.avatar_url, 3600);
                            if (urlData?.signedUrl) {
                                childAvatarUrl = urlData.signedUrl;
                            }
                        }
                    }
                }

                setInvite({
                    ...v2Data,
                    child_name: v2Data.child?.name,
                    child_avatar_url: childAvatarUrl,
                    isV2: true,
                });
                setLoading(false);
                return;
            }

            // Fallback to old invites table (V1 model)
            const { data: v1Data, error: v1Error } = await supabase
                .from("invites")
                .select("*, families(name)")
                .eq("token", token)
                .single();

            console.log("V1 invite fetch result:", { v1Data, v1Error });

            if (v1Data) {
                // Fetch child name for V1
                const { data: childData } = await supabase
                    .from("children")
                    .select("name, avatar_url")
                    .eq("family_id", v1Data.family_id)
                    .limit(1)
                    .single();

                let childAvatarUrl = null;
                if (childData?.avatar_url) {
                    const { data: urlData, error: urlError } = await supabase.storage
                        .from("avatars")
                        .createSignedUrl(childData.avatar_url, 3600); // 1 hour expiry
                    if (!urlError && urlData?.signedUrl) {
                        childAvatarUrl = urlData.signedUrl;
                    }
                }

                setInvite({
                    ...v1Data,
                    child_name: childData?.name || null,
                    child_avatar_url: childAvatarUrl,
                    isV2: false,
                });
            }

            setLoading(false);
        };

        if (token) fetchInvite();
    }, [token]);

    const handleJoinV2 = async (userId: string) => {
        if (!invite) return;

        // 1. Create/update profile
        const { error: profileError } = await supabase.from("profiles").upsert({
            id: userId,
            email,
            name: invite.invitee_name || email.split("@")[0],
            label: invite.invitee_label,
            relationship: invite.invitee_role || null,
            avatar_initials: invite.invitee_name?.[0]?.toUpperCase() || email[0].toUpperCase(),
            onboarding_completed: !invite.has_own_home, // If they need to create a home, don't mark complete yet
        });

        if (profileError) {
            console.error("Profile creation error:", profileError);
            throw new Error("Failed to create profile");
        }

        // 2. Use database function to accept invite (bypasses RLS)
        // This creates child_guardians, child_access, and permission overrides
        const { data: acceptResult, error: acceptError } = await supabase
            .rpc("accept_invite", {
                p_invite_id: invite.id,
                p_user_id: userId,
            });

        if (acceptError) {
            console.error("Accept invite RPC error:", acceptError);
            // Fall back to direct inserts (may fail due to RLS but worth trying)
            const isGuardian = invite.invitee_role === "parent" || invite.invitee_role === "step_parent";

            // Map invitee_role to valid helper_type values
            // DB constraint only allows: 'family_member', 'friend', 'nanny'
            const mapRoleToHelperType = (role: string): string => {
                switch (role) {
                    case "nanny": return "nanny";
                    case "babysitter": return "nanny";
                    case "family_member": return "family_member";
                    case "family_friend": return "friend";
                    case "friend": return "friend";
                    default: return "friend";
                }
            };

            if (isGuardian) {
                const { error: guardianError } = await supabase.from("child_guardians").insert({
                    child_id: invite.child_id,
                    user_id: userId,
                    guardian_role: invite.invitee_role,
                });
                if (guardianError) {
                    console.error("Guardian fallback error:", guardianError);
                }
            }

            const { error: accessError } = await supabase.from("child_access").upsert({
                child_id: invite.child_id,
                user_id: userId,
                role_type: isGuardian ? "guardian" : "helper",
                helper_type: !isGuardian ? mapRoleToHelperType(invite.invitee_role) : null,
                access_level: isGuardian ? "manage" : "view",
            }, { onConflict: "child_id,user_id" });
            if (accessError) {
                console.error("Child access fallback error:", accessError);
            }
        } else {
            console.log("Accept invite result:", acceptResult);
        }

        // 4. If there's an existing home to join, add to that home
        // (This can happen even if has_own_home is true - user gets access to existing homes AND creates their own)
        if (invite.home_id) {
            // Add to home_memberships
            await supabase.from("home_memberships").upsert({
                home_id: invite.home_id,
                user_id: userId,
                is_home_admin: false,
            }, {
                onConflict: "home_id,user_id",
            });

            // Get the child_space for this home and child
            const { data: childSpace } = await supabase
                .from("child_spaces")
                .select("id")
                .eq("home_id", invite.home_id)
                .eq("child_id", invite.child_id)
                .single();

            if (childSpace) {
                // Grant child_space_access
                await supabase.from("child_space_access").upsert({
                    child_space_id: childSpace.id,
                    user_id: userId,
                    can_view_address: true,
                }, {
                    onConflict: "child_space_id,user_id",
                });
            }
        }

        // 5. Auto-select the invited child
        if (invite.child_id) {
            // Store in localStorage so AppStateContext picks it up
            if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEY_CHILD, invite.child_id);
                // Also store home if they were added to one
                if (invite.home_id) {
                    localStorage.setItem(STORAGE_KEY_HOME, invite.home_id);
                }
            }
        }

        // 6. Redirect based on whether they need to create a home
        if (invite.has_own_home) {
            // Need to create their own home - go to a home setup flow
            // Don't mark invite as accepted yet - that happens after setup-home is complete
            // Pass home_id and has_own_home in URL so setup-home doesn't need to re-query
            const setupParams = new URLSearchParams({
                child_id: invite.child_id,
                invite_id: invite.id,
                has_own_home: "true",
            });
            if (invite.home_id) {
                setupParams.set("home_id", invite.home_id);
            }
            router.push("/setup-home?" + setupParams.toString());
        } else {
            // Already added to existing home - mark invite as accepted and go to dashboard
            await supabase
                .from("invites")
                .update({
                    status: "accepted",
                    accepted_at: new Date().toISOString(),
                    accepted_by: userId,
                })
                .eq("id", invite.id);
            
            setOnboardingCompleted(true);
            await refreshData();
            // Full page reload to ensure all data contexts refresh
            window.location.href = "/";
        }
    };

    const handleJoinV1 = async (userId: string) => {
        if (!invite) return;

        // V1 flow - family-based
        const { error: profileError } = await supabase.from("profiles").upsert({
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

        // Add to family_members
        await supabase.from("family_members").insert({
            family_id: invite.family_id,
            user_id: userId,
            role: invite.invitee_role || "parent",
        });

        // Add home_access entries
        if (invite.home_ids && invite.home_ids.length > 0) {
            const accessEntries = invite.home_ids.map((homeId: string) => ({
                home_id: homeId,
                caregiver_id: userId,
            }));
            await supabase.from("home_access").insert(accessEntries);

            // Update legacy accessible_caregiver_ids
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

        // Update invite status
        await supabase
            .from("invites")
            .update({ status: "accepted" })
            .eq("id", invite.id);

        setOnboardingCompleted(true);
        await refreshData();
        router.replace("/");
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite) return;

        setError("");
        setSubmitting(true);

        if (view === "signup" && password !== confirmPassword) {
            setError("Passwords don't match. Please try again.");
            setSubmitting(false);
            return;
        }

        try {
            let userId: string;

            if (view === "signup") {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (authError) throw authError;

                if (!authData.user) {
                    setError("Please check your email for a confirmation link before continuing.");
                    setSubmitting(false);
                    return;
                }

                userId = authData.user.id;
            } else {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (authError) throw authError;
                userId = authData.user.id;
            }

            // Use appropriate join flow based on invite type
            if (invite.isV2) {
                await handleJoinV2(userId);
            } else {
                await handleJoinV1(userId);
            }

        } catch (err: any) {
            console.error("Join failed:", err);
            setError(err.message);
            setSubmitting(false);
        }
    };

    // Get display name for child
    const getChildName = () => {
        return invite?.child_name || "your child";
    };

    // Get first name from invitee name
    const getFirstName = () => {
        const name = invite?.invitee_name || "";
        return name.split(" ")[0] || "there";
    };

    // Get display label for role (e.g., "Parent of June")
    const getRoleLabel = () => {
        const roleMap: Record<string, string> = {
            parent: "Parent",
            step_parent: "Step-parent",
            family_member: "Family member",
            nanny: "Nanny",
            babysitter: "Babysitter",
            family_friend: "Family friend",
            other: "Caregiver",
        };
        const role = roleMap[invite?.invitee_role] || "Caregiver";
        const childName = getChildName();
        return `${role} of ${childName}`;
    };

    // Get content for left panel
    const getLeftPanelContent = () => {
        if (view === "landing") {
            return {
                description: `You've been invited to join ${getChildName()}'s homes on Homes.kids.`,
                bullets: [
                    "One shared place for everything your child needs between homes.",
                    "Plan what moves in the bag between homes.",
                    "Important contacts and home details, all in one hub.",
                ],
            };
        }
        if (view === "login") {
            return {
                description: "Welcome back! Log in to join.",
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
                <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                    <Logo size="lg" variant="light" />
                    <p className="text-lg opacity-90 mt-4">Co-parenting central hub.</p>
                </div>
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

                <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-sm">
                        <div className="lg:hidden text-center mb-8">
                            <Logo size="md" variant="dark" />
                        </div>

                        {/* Progress indicator - step 1 of 2 */}
                        <div className="flex justify-center gap-2 mb-6">
                            <div className="w-2 h-2 rounded-full bg-forest" />
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>

                        {/* Title & Subtitle */}
                        <div className="text-center mb-8">
                            <h1 className="font-dmSerif text-3xl text-forest mb-2">
                                You're invited, {getFirstName()}
                            </h1>
                            <p className="text-textSub">
                                Join {getChildName()}'s homes on Homes.kids
                            </p>
                        </div>

                        {/* Context */}
                        <div className="text-center mb-8">
                            <p className="text-sm text-textSub mb-3">You'll be joining as</p>
                            <div className="inline-flex items-center gap-3 bg-white border border-border rounded-full px-4 py-2">
                                <Avatar
                                    src={invite?.child_avatar_url}
                                    initial={getChildName()?.[0]?.toUpperCase() || "?"}
                                    size={36}
                                    bgColor="#4A7C59"
                                />
                                <span className="font-semibold text-forest">
                                    {getRoleLabel()}
                                </span>
                            </div>
                            <p className="text-xs text-textSub mt-2">
                                (You can change this later)
                            </p>
                        </div>

                        {/* Primary Action */}
                        <button
                            onClick={() => setView("signup")}
                            className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors mb-3"
                        >
                            Accept invite
                        </button>

                        {/* Secondary Action */}
                        <Link
                            href="/"
                            className="block w-full py-3.5 text-center text-forest font-medium border border-border rounded-xl hover:bg-white transition-colors"
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

                <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-sm">
                        <div className="lg:hidden text-center mb-8">
                            <Logo size="md" variant="dark" />
                            <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                        </div>

                        {/* Progress indicator - step 1 of 2 */}
                        <div className="flex justify-center gap-2 mb-6">
                            <div className="w-2 h-2 rounded-full bg-forest" />
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>

                        <h2 className="font-dmSerif text-2xl text-forest mb-2 text-center">Welcome back</h2>
                        <p className="text-textSub text-sm mb-6 text-center">Log in to join {getChildName()}'s homes</p>

                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-forest mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-forest mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
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

            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                    </div>

                    {/* Progress indicator - step 1 of 2 */}
                    <div className="flex justify-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-forest" />
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                    </div>

                    <h2 className="font-dmSerif text-2xl text-forest mb-2 text-center">Create account</h2>
                    <p className="text-textSub text-sm mb-6 text-center">Create an account to join {getChildName()}'s homes</p>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
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
