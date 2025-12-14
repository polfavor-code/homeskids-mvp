"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContextV2";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import MobileSelect from "@/components/MobileSelect";
import { QRCodeSVG } from "qrcode.react";

// ==============================================
// V2 ONBOARDING - Base Setup Only
// ==============================================

const ROLE_OPTIONS = [
    { value: "parent", label: "Parent" },
    { value: "step_parent", label: "Step-parent" },
];

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface GuardianEntry {
    id: string;
    name: string;
    label: string;
    role: "parent" | "step_parent";
    hasOwnHome: boolean;
    inviteToken?: string;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { setOnboardingCompleted, refreshData } = useAppState();

    const [step, setStep] = useState<OnboardingStep>(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Step 1: About You
    const [realName, setRealName] = useState("");
    const [childCallsYou, setChildCallsYou] = useState("");
    const [selectedRole, setSelectedRole] = useState<"parent" | "step_parent">("parent");

    // Step 2: Your Child
    const [childName, setChildName] = useState("");
    const [childBirthdate, setChildBirthdate] = useState("");

    // Step 3: Your Home
    const [homeName, setHomeName] = useState("");

    // Step 4: Other Guardians
    const [hasOtherGuardians, setHasOtherGuardians] = useState<boolean | null>(null);
    const [guardians, setGuardians] = useState<GuardianEntry[]>([]);

    // Created IDs
    const [childId, setChildId] = useState<string | null>(null);
    const [homeId, setHomeId] = useState<string | null>(null);

    // Clipboard state for invite links
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Debug: log user info
    useEffect(() => {
        console.log("[Onboarding] User:", user?.id, user?.email);
    }, [user]);

    // Check if already onboarded
    useEffect(() => {
        const checkStatus = async () => {
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("onboarding_completed")
                .eq("id", user.id)
                .single();

            if (profile?.onboarding_completed) {
                router.push("/");
            }
        };
        checkStatus();
    }, [user, router]);

    // Set default home name when childCallsYou changes
    useEffect(() => {
        if (childCallsYou && !homeName) {
            setHomeName(`${childCallsYou}'s home`);
        }
    }, [childCallsYou, homeName]);

    // STEP 1: About You
    const handleStep1Submit = async () => {
        if (!childCallsYou.trim()) {
            setError("Please enter what your child calls you.");
            return;
        }
        if (!user) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    name: realName.trim() || null,
                    label: childCallsYou.trim(),
                    relationship: selectedRole,
                    avatar_initials: (realName.trim() || childCallsYou.trim()).charAt(0).toUpperCase(),
                });

            if (profileError) throw profileError;

            setStep(2);
        } catch (err: any) {
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // STEP 2: Your Child
    const handleStep2Submit = async () => {
        if (!childName.trim()) {
            setError("Please enter your child's name.");
            return;
        }
        if (!user) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // Create child
            const { data: newChild, error: childError } = await supabase
                .from("children_v2")
                .insert({
                    name: childName.trim(),
                    dob: childBirthdate || null,
                    created_by: user.id,
                })
                .select()
                .single();

            if (childError) throw childError;
            setChildId(newChild.id);

            // Add current user as guardian
            const { error: guardianError } = await supabase
                .from("child_guardians")
                .insert({
                    child_id: newChild.id,
                    user_id: user.id,
                    guardian_role: selectedRole,
                });

            if (guardianError) throw guardianError;

            // Set default home name if not set
            if (!homeName) {
                setHomeName(`${childCallsYou}'s home`);
            }

            setStep(3);
        } catch (err: any) {
            console.error("Error creating child:", err);
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // STEP 3: Your Home
    const handleStep3Submit = async () => {
        if (!homeName.trim()) {
            setError("Please enter a name for your home.");
            return;
        }
        if (!user || !childId) {
            setError("Session error. Please refresh and try again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // Create home
            const { data: newHome, error: homeError } = await supabase
                .from("homes_v2")
                .insert({
                    name: homeName.trim(),
                    created_by: user.id,
                })
                .select()
                .single();

            if (homeError) throw homeError;
            setHomeId(newHome.id);

            // Create home_membership for current user
            await supabase
                .from("home_memberships")
                .insert({
                    home_id: newHome.id,
                    user_id: user.id,
                    is_home_admin: true,
                });

            // Link child to home (child_space)
            const { data: newChildSpace, error: csError } = await supabase
                .from("child_spaces")
                .insert({
                    home_id: newHome.id,
                    child_id: childId,
                })
                .select()
                .single();

            if (csError) throw csError;

            // Grant current user child_space_access
            await supabase
                .from("child_space_access")
                .insert({
                    child_space_id: newChildSpace.id,
                    user_id: user.id,
                    can_view_address: true,
                });

            setStep(4);
        } catch (err: any) {
            console.error("Error creating home:", err);
            setError(err.message || "Failed to create home. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // STEP 4: Other Guardians - Add a new guardian entry
    const addGuardianEntry = () => {
        setGuardians([
            ...guardians,
            {
                id: crypto.randomUUID(),
                name: "",
                label: "",
                role: "parent",
                hasOwnHome: true,
            },
        ]);
    };

    const updateGuardian = (id: string, field: keyof GuardianEntry, value: any) => {
        setGuardians(guardians.map(g =>
            g.id === id ? { ...g, [field]: value } : g
        ));
    };

    const removeGuardian = (id: string) => {
        setGuardians(guardians.filter(g => g.id !== id));
    };

    // STEP 4: Submit
    const handleStep4Submit = async () => {
        if (hasOtherGuardians === null) {
            setError("Please select an option.");
            return;
        }

        if (hasOtherGuardians && guardians.length === 0) {
            setError("Please add at least one guardian or select 'No'.");
            return;
        }

        // Validate guardian entries
        for (const g of guardians) {
            if (!g.label.trim()) {
                setError("Please fill in what the child calls each guardian.");
                return;
            }
        }

        if (!user || !childId) {
            setError("Session error. Please refresh and try again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            if (hasOtherGuardians && guardians.length > 0) {
                // Create invites for each guardian
                const updatedGuardians = [...guardians];
                let hasInviteError = false;

                for (let i = 0; i < updatedGuardians.length; i++) {
                    const g = updatedGuardians[i];
                    const token = crypto.randomUUID();

                    // Always set the token so QR shows
                    updatedGuardians[i] = { ...g, inviteToken: token };

                    const { error: inviteError } = await supabase
                        .from("invites_v2")
                        .insert({
                            token: token,
                            status: "pending",
                            invitee_name: g.name.trim() || null,
                            invitee_label: g.label.trim(),
                            invitee_role: g.role,
                            child_id: childId,
                            home_id: g.hasOwnHome ? null : homeId,
                            invited_by: user.id,
                            has_own_home: g.hasOwnHome,
                        });

                    if (inviteError) {
                        console.error("Failed to create invite:", inviteError);
                        hasInviteError = true;
                    }
                }

                setGuardians(updatedGuardians);

                if (hasInviteError) {
                    console.warn("Some invites failed to save to database. Run the invites_v2 migration.");
                }

                setStep(5);
            } else {
                // No other guardians - complete onboarding
                await supabase
                    .from("profiles")
                    .update({ onboarding_completed: true })
                    .eq("id", user.id);

                setOnboardingCompleted(true);
                await refreshData();
                setStep(6);
            }
        } catch (err: any) {
            console.error("Error in step 4:", err);
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // STEP 5: Complete (after viewing invites)
    const handleStep5Complete = async () => {
        if (!user) return;

        setSaving(true);
        try {
            await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            setOnboardingCompleted(true);
            await refreshData();
            setStep(6);
        } catch (err: any) {
            setError(err.message || "Failed to complete setup.");
        } finally {
            setSaving(false);
        }
    };

    // Copy invite link
    const handleCopyLink = (token: string, guardianId: string) => {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedId(guardianId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Get step info for left panel
    const getStepInfo = () => {
        switch (step) {
            case 1:
                return {
                    title: "Welcome to homes.kids",
                    description: "Let's set up your account.",
                    bullets: [
                        "Tell us about yourself.",
                        "This helps personalize the experience.",
                        "Only parents and step-parents can set up a family.",
                    ],
                };
            case 2:
                return {
                    title: "Add your child",
                    description: "Create a profile for your child.",
                    bullets: [
                        "Your child is the center of everything.",
                        "All homes and caregivers connect through them.",
                        "You can add more children later.",
                    ],
                };
            case 3:
                return {
                    title: "Your home",
                    description: "Set up your home.",
                    bullets: [
                        "This is the home you manage.",
                        "Other parents can add their own homes later.",
                        "Track items as they move between homes.",
                    ],
                };
            case 4:
                return {
                    title: "Other guardians",
                    description: "Add parents and step-parents.",
                    bullets: [
                        "Add anyone who is a parent or step-parent.",
                        "They can set up their own homes.",
                        "Helpers like nannies can be added later.",
                    ],
                };
            case 5:
                return {
                    title: "Invite guardians",
                    description: "Share invite links.",
                    bullets: [
                        "Each guardian gets their own link.",
                        "They'll set up their account when they join.",
                        "You can send invites later too.",
                    ],
                };
            case 6:
                return {
                    title: "You're all set!",
                    description: "Your family hub is ready.",
                    bullets: [
                        "Start adding items to track.",
                        "Add helpers from settings.",
                        "Manage homes and access anytime.",
                    ],
                };
            default:
                return { title: "", description: "", bullets: [] };
        }
    };

    const stepInfo = getStepInfo();
    const totalSteps = hasOtherGuardians === false ? 5 : 6;

    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />
                <p className="text-lg opacity-90 mt-4 mb-8">{stepInfo.description}</p>
                <ul className="max-w-sm space-y-4">
                    {stepInfo.bullets.map((bullet, index) => (
                        <li
                            key={index}
                            className={`flex items-start gap-3 text-white/85 text-sm ${
                                index < stepInfo.bullets.length - 1 ? "border-b border-white/10 pb-4" : "pb-4"
                            }`}
                        >
                            <span className="opacity-60 mt-0.5">→</span>
                            <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Co-parenting made simple.</p>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex justify-center gap-2 mb-8">
                        {[1, 2, 3, 4, 5, 6].slice(0, totalSteps).map(s => (
                            <div
                                key={s}
                                className={`w-2 h-2 rounded-full ${
                                    s <= step ? "bg-forest" : "bg-gray-300"
                                }`}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* STEP 1: About You */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">About you</h1>
                                <p className="text-gray-600">Tell us a bit about yourself</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your name
                                </label>
                                <input
                                    type="text"
                                    value={realName}
                                    onChange={e => setRealName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                    placeholder="John Smith"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    What does your child call you?
                                </label>
                                <input
                                    type="text"
                                    value={childCallsYou}
                                    onChange={e => setChildCallsYou(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                    placeholder="Daddy, Mommy, Papa..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your role
                                </label>
                                <MobileSelect
                                    value={selectedRole}
                                    onChange={val => setSelectedRole(val as "parent" | "step_parent")}
                                    options={ROLE_OPTIONS}
                                />
                            </div>

                            <button
                                onClick={handleStep1Submit}
                                disabled={saving}
                                className="w-full py-3 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Continue"}
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Your Child */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">Your child</h1>
                                <p className="text-gray-600">Who is this family hub for?</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Child's first name
                                </label>
                                <input
                                    type="text"
                                    value={childName}
                                    onChange={e => setChildName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                    placeholder="Emma"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Birthdate (optional)
                                </label>
                                <input
                                    type="date"
                                    value={childBirthdate}
                                    onChange={e => setChildBirthdate(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleStep2Submit}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Continue"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Your Home */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">Your home</h1>
                                <p className="text-gray-600">Where does {childName} stay with you?</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Home name
                                </label>
                                <input
                                    type="text"
                                    value={homeName}
                                    onChange={e => setHomeName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                    placeholder={`${childCallsYou}'s home`}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    You manage this home. Other parents or step-parents can add their own homes later.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleStep3Submit}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {saving ? "Creating..." : "Continue"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Other Guardians */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">Other guardians</h1>
                                <p className="text-gray-600">Is there another parent or step-parent for {childName}?</p>
                            </div>

                            {/* Yes/No Selection */}
                            {hasOtherGuardians === null && (
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setHasOtherGuardians(false);
                                        }}
                                        className="flex-1 py-4 rounded-xl border-2 border-gray-300 font-medium text-gray-700 hover:border-forest hover:bg-forest/5"
                                    >
                                        No
                                    </button>
                                    <button
                                        onClick={() => {
                                            setHasOtherGuardians(true);
                                            if (guardians.length === 0) {
                                                addGuardianEntry();
                                            }
                                        }}
                                        className="flex-1 py-4 rounded-xl border-2 border-gray-300 font-medium text-gray-700 hover:border-forest hover:bg-forest/5"
                                    >
                                        Yes
                                    </button>
                                </div>
                            )}

                            {/* Guardian Entries */}
                            {hasOtherGuardians === true && (
                                <div className="space-y-4">
                                    {guardians.map((guardian, index) => (
                                        <div key={guardian.id} className="p-4 bg-white rounded-xl border border-gray-200 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-forest">
                                                    Guardian {index + 1}
                                                </span>
                                                {guardians.length > 1 && (
                                                    <button
                                                        onClick={() => removeGuardian(guardian.id)}
                                                        className="text-xs text-red-500 hover:text-red-600"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">
                                                    Their name (optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={guardian.name}
                                                    onChange={e => updateGuardian(guardian.id, "name", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    placeholder="Jane Smith"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">
                                                    What does {childName} call them?
                                                </label>
                                                <input
                                                    type="text"
                                                    value={guardian.label}
                                                    onChange={e => updateGuardian(guardian.id, "label", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    placeholder="Mommy, Daddy, Papa..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">
                                                    Role
                                                </label>
                                                <MobileSelect
                                                    value={guardian.role}
                                                    onChange={val => updateGuardian(guardian.id, "role", val)}
                                                    options={ROLE_OPTIONS}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">
                                                    Does {childName} stay with them at another home?
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateGuardian(guardian.id, "hasOwnHome", false)}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                                                            !guardian.hasOwnHome
                                                                ? "border-forest bg-forest/5 text-forest"
                                                                : "border-gray-300 text-gray-600"
                                                        }`}
                                                    >
                                                        No, same home
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateGuardian(guardian.id, "hasOwnHome", true)}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                                                            guardian.hasOwnHome
                                                                ? "border-forest bg-forest/5 text-forest"
                                                                : "border-gray-300 text-gray-600"
                                                        }`}
                                                    >
                                                        Yes, another home
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={addGuardianEntry}
                                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-forest hover:text-forest"
                                    >
                                        + Add another guardian
                                    </button>
                                </div>
                            )}

                            {/* No other guardians selected */}
                            {hasOtherGuardians === false && (
                                <div className="p-4 bg-white rounded-xl border border-gray-200">
                                    <p className="text-sm text-gray-600 text-center">
                                        No problem! You can add other parents or step-parents later from settings.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        if (hasOtherGuardians !== null) {
                                            setHasOtherGuardians(null);
                                        } else {
                                            setStep(3);
                                        }
                                    }}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    Back
                                </button>
                                {hasOtherGuardians !== null && (
                                    <button
                                        onClick={handleStep4Submit}
                                        disabled={saving}
                                        className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Continue"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Invite Guardians */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">Invite guardians</h1>
                                <p className="text-gray-600">Share these links so they can join {childName}'s care team</p>
                            </div>

                            {/* Guardian Cards */}
                            <div className="space-y-4">
                                {guardians.map(guardian => (
                                    <div key={guardian.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        {/* Card Header */}
                                        <div className="p-4 border-b border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-forest">
                                                        {guardian.label || guardian.name || "Guardian"}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {guardian.role === "parent" ? "Parent" : "Step-parent"}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {guardian.hasOwnHome
                                                    ? `Will join ${childName} and set up their own home`
                                                    : `Will join ${childName} in your home`}
                                            </p>
                                        </div>

                                        {/* QR Code and Link */}
                                        {guardian.inviteToken && (
                                            <div className="p-4 space-y-4">
                                                <div className="flex justify-center">
                                                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                        <QRCodeSVG
                                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${guardian.inviteToken}`}
                                                            size={140}
                                                            level="M"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${guardian.inviteToken}`}
                                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 truncate"
                                                    />
                                                    <button
                                                        onClick={() => handleCopyLink(guardian.inviteToken!, guardian.id)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                            copiedId === guardian.id
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                        }`}
                                                    >
                                                        {copiedId === guardian.id ? "Copied!" : "Copy"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-gray-500 text-center">
                                You can send these invites later from Settings → Caregivers
                            </p>

                            <button
                                onClick={handleStep5Complete}
                                disabled={saving}
                                className="w-full py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                            >
                                {saving ? "Finishing..." : "Continue to dashboard"}
                            </button>
                        </div>
                    )}

                    {/* STEP 6: Success */}
                    {step === 6 && (
                        <div className="space-y-6 text-center">
                            <div className="text-6xl">🎉</div>
                            <h1 className="text-2xl font-bold text-forest">You're all set!</h1>
                            <p className="text-gray-600">
                                {childName}'s family hub is ready.
                            </p>
                            <p className="text-sm text-gray-500">
                                You can add helpers, contacts, and items anytime.
                            </p>

                            <button
                                onClick={() => router.push("/")}
                                className="w-full py-3 bg-forest text-white rounded-xl font-medium"
                            >
                                Go to dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
