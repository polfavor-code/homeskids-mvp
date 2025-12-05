"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState, type CaregiverProfile } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/Logo";
import { QRCodeSVG } from "qrcode.react";

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const {
        child,
        caregivers,
        setChild,
        setCaregivers,
        setOnboardingCompleted,
        refreshData,
    } = useAppState();

    // Wizard step management
    const [step, setStep] = useState(0);
    const [showInviteCard, setShowInviteCard] = useState(false);
    const [inviteLink, setInviteLink] = useState("");

    // Step 1: Child details
    const [childName, setChildName] = useState(child?.name || "");
    const [childNameError, setChildNameError] = useState("");

    // Step 2: Caretakers
    const [caretaker1Name, setCaretaker1Name] = useState(caregivers[0]?.name || "");
    const [caretaker1Label, setCaretaker1Label] = useState(caregivers[0]?.label || "");
    const [caretaker2Name, setCaretaker2Name] = useState(caregivers[1]?.name || "");
    const [caretaker2Label, setCaretaker2Label] = useState(caregivers[1]?.label || "");
    const [caretakersError, setCaretakersError] = useState("");

    // Generate invite link when showing invite card
    useEffect(() => {
        if (showInviteCard) {
            const inviteToken = localStorage.getItem("pending_invite_token");
            if (inviteToken) {
                setInviteLink(`${window.location.origin}/invite/${inviteToken}`);
            }
        }
    }, [showInviteCard]);

    const handleNextStep1 = async () => {
        if (!childName.trim()) {
            setChildNameError("Please enter a name.");
            return;
        }
        setChildNameError("");

        try {
            const { supabase } = await import("@/lib/supabase");

            if (!user) {
                setChildNameError("Authentication error. Please log in again.");
                return;
            }

            // Get user's family
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .single();

            if (!familyMember) {
                setChildNameError("No family found. Please contact support.");
                return;
            }

            // Derive initials
            const initials = childName.trim().charAt(0).toUpperCase();

            // Save or update child in database
            const { data: existingChild } = await supabase
                .from("children")
                .select("*")
                .eq("family_id", familyMember.family_id)
                .single();

            if (existingChild) {
                // Update existing child
                const { data, error } = await supabase
                    .from("children")
                    .update({
                        name: childName.trim(),
                        avatar_initials: initials,
                    })
                    .eq("id", existingChild.id);

                if (error) {
                    console.error("Failed to update child:", error);
                    setChildNameError("Failed to update child data. Please try again.");
                    return;
                }

                // Only update local state when database update succeeds
                setChild({
                    id: existingChild.id,
                    name: childName.trim(),
                    avatarInitials: initials,
                });
            } else {
                // Create new child
                const { data: newChild, error: childError } = await supabase
                    .from("children")
                    .insert({
                        family_id: familyMember.family_id,
                        name: childName.trim(),
                        avatar_initials: initials,
                    })
                    .select()
                    .single();

                if (childError) {
                    setChildNameError("Failed to save child data.");
                    console.error(childError);
                    return;
                }

                setChild({
                    id: newChild.id,
                    name: newChild.name,
                    avatarInitials: newChild.avatar_initials,
                });
            }

            setStep(1);
        } catch (error) {
            console.error("Error saving child:", error);
            setChildNameError("Failed to save. Please try again.");
        }
    };

    const handleFinishSetup = async () => {
        if (
            !caretaker1Name.trim() ||
            !caretaker1Label.trim() ||
            !caretaker2Name.trim() ||
            !caretaker2Label.trim()
        ) {
            setCaretakersError("Please fill in both name and label for each caretaker.");
            return;
        }
        setCaretakersError("");

        try {
            const { supabase } = await import("@/lib/supabase");

            if (!user) {
                setCaretakersError("Authentication error.");
                return;
            }

            // Update current user's profile with their name and initials
            await supabase
                .from("profiles")
                .update({
                    name: caretaker1Name.trim(),
                    avatar_initials: caretaker1Name.trim().charAt(0).toUpperCase(),
                })
                .eq("id", user.id);

            // Get user's family for the invite
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .single();

            // Create caretakers array with real user ID
            const newCaretakers: CaregiverProfile[] = [
                {
                    id: user.id, // Real user ID
                    name: caretaker1Name.trim(),
                    label: caretaker1Label.trim(),
                    avatarInitials: caretaker1Name.trim().charAt(0).toUpperCase(),
                    avatarColor: "bg-blue-500",
                    isCurrentUser: true,
                    accessibleHomeIds: [], // Will be populated after home is created
                    status: "active",
                },
            ];

            // Update AppState
            setCaregivers(newCaretakers);

            // Save onboarding completion to Supabase
            await supabase
                .from("profiles")
                .update({
                    onboarding_completed: true,
                    label: caretaker1Label.trim()
                })
                .eq("id", user.id);

            setOnboardingCompleted(true);

            // Create real invite in Supabase
            if (familyMember) {
                // Generate cryptographically secure unique token
                const inviteToken = crypto.randomUUID();

                // Create invite in database with invitee details
                const { error: inviteError } = await supabase.from("invites").insert({
                    family_id: familyMember.family_id,
                    token: inviteToken,
                    status: "pending",
                    invitee_name: caretaker2Name.trim(),
                    invitee_label: caretaker2Label.trim(),
                    created_at: new Date().toISOString(),
                });

                if (inviteError) {
                    console.error("Failed to create invite:", inviteError);
                } else {
                    // Store invite token for display
                    localStorage.setItem("pending_invite_token", inviteToken);
                }
            }

            // Show invite card
            setShowInviteCard(true);

            // Refresh app state to load the new invite as a pending caregiver
            await refreshData();
        } catch (error) {
            console.error("Failed to complete onboarding:", error);
            setCaretakersError("Failed to save. Please try again.");
        }
    };

    const handleCopyInviteLink = () => {
        if (!inviteLink) {
            alert("No invite link available");
            return;
        }
        navigator.clipboard.writeText(inviteLink);
        alert("Invite link copied to clipboard!");
    };

    const handleGoToHome = () => {
        router.push("/");
    };

    // Left panel content based on step
    const getStepInfo = () => {
        if (showInviteCard) {
            return {
                title: "Almost there!",
                description: "Share the invite with your co-parent to complete the setup.",
                bullets: [
                    "They'll create their own account using the link or QR code.",
                    "Once joined, you'll both have access to the shared hub.",
                    "You can always resend the invite from settings.",
                ],
            };
        }
        if (step === 0) {
            return {
                title: "Let's get started",
                description: "First, tell us about your child.",
                bullets: [
                    "We'll create a shared space centered around your child.",
                    "Both parents will see the same information.",
                    "Easy to update as things change.",
                ],
            };
        }
        return {
            title: "Who's involved?",
            description: "Add details for both caretakers.",
            bullets: [
                "Labels help your child identify each home.",
                "We'll send an invite to the other caretaker.",
                "They can set up their own password when they join.",
            ],
        };
    };

    const stepInfo = getStepInfo();

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
                            className={`flex items-start gap-3 text-white/85 text-sm ${index < stepInfo.bullets.length - 1 ? "border-b border-white/10 pb-4" : "pb-4"
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
                        <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                    </div>

                    {/* Invite Card (Step 3) */}
                    {showInviteCard ? (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg
                                        className="w-8 h-8 text-teal"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <h2 className="font-dmSerif text-2xl text-forest mb-2">
                                    Setup complete!
                                </h2>
                                <p className="text-textSub text-sm">
                                    Now invite {caretaker2Name} to join.
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-xl p-6 mb-4">
                                <h3 className="font-semibold text-forest mb-2">
                                    Invite {caretaker2Name}
                                </h3>
                                <p className="text-sm text-textSub mb-4">
                                    Share this link or scan the QR code to join.
                                </p>

                                {/* QR Code */}
                                {inviteLink && (
                                    <div className="flex justify-center mb-4">
                                        <div className="bg-white p-3 rounded-lg border border-border">
                                            <QRCodeSVG
                                                value={inviteLink}
                                                size={160}
                                                level="M"
                                                includeMargin={false}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleCopyInviteLink}
                                    className="w-full py-3 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors"
                                >
                                    Copy invite link
                                </button>
                            </div>

                            <button
                                onClick={handleGoToHome}
                                className="w-full py-3 bg-white border border-border text-forest rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Go to home
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Header */}
                            <h2 className="font-dmSerif text-2xl text-forest mb-2">
                                {step === 0 ? "Child details" : "Caretaker details"}
                            </h2>
                            <p className="text-textSub text-sm mb-1">
                                {step === 0
                                    ? "Enter your child's name to get started."
                                    : "Enter details for both caretakers."}
                            </p>
                            <p className="text-textSub/60 text-xs mb-6">
                                Step {step + 1} of 2
                            </p>

                            {/* Step 1: Child details */}
                            {step === 0 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-forest mb-1.5">
                                            Child's name
                                        </label>
                                        <input
                                            type="text"
                                            value={childName}
                                            onChange={(e) => setChildName(e.target.value)}
                                            placeholder="e.g. June"
                                            className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                        />
                                        {childNameError && (
                                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-2">
                                                {childNameError}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleNextStep1}
                                        className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Caretakers */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    {/* Caretaker 1 (you) */}
                                    <div className="bg-white border border-border rounded-xl p-4">
                                        <h3 className="text-sm font-semibold text-forest mb-3">
                                            Caretaker 1 (you)
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-forest mb-1.5">
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={caretaker1Name}
                                                    onChange={(e) => setCaretaker1Name(e.target.value)}
                                                    placeholder="e.g. Paul"
                                                    className="w-full px-4 py-3 bg-cream border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-forest mb-1.5">
                                                    Label (what the child calls you)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={caretaker1Label}
                                                    onChange={(e) => setCaretaker1Label(e.target.value)}
                                                    placeholder="e.g. Daddy"
                                                    className="w-full px-4 py-3 bg-cream border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Caretaker 2 */}
                                    <div className="bg-white border border-border rounded-xl p-4">
                                        <h3 className="text-sm font-semibold text-forest mb-3">
                                            Caretaker 2
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-forest mb-1.5">
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={caretaker2Name}
                                                    onChange={(e) => setCaretaker2Name(e.target.value)}
                                                    placeholder="e.g. Ellis"
                                                    className="w-full px-4 py-3 bg-cream border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-forest mb-1.5">
                                                    Label (what the child calls them)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={caretaker2Label}
                                                    onChange={(e) => setCaretaker2Label(e.target.value)}
                                                    placeholder="e.g. Mommy"
                                                    className="w-full px-4 py-3 bg-cream border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {caretakersError && (
                                        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                            {caretakersError}
                                        </p>
                                    )}

                                    {/* Navigation buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep(0)}
                                            className="px-6 py-3 border border-border rounded-xl font-medium text-forest hover:bg-white transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleFinishSetup}
                                            className="flex-1 py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors"
                                        >
                                            Finish setup
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
