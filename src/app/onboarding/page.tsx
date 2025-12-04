"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAppState, type CaregiverProfile } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";

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

    // Step 1: Child details
    const [childName, setChildName] = useState(child?.name || "");
    const [childNameError, setChildNameError] = useState("");

    // Step 2: Caretakers
    const [caretaker1Name, setCaretaker1Name] = useState(caregivers[0]?.name || "");
    const [caretaker1Label, setCaretaker1Label] = useState(caregivers[0]?.label || "");
    const [caretaker2Name, setCaretaker2Name] = useState(caregivers[1]?.name || "");
    const [caretaker2Label, setCaretaker2Label] = useState(caregivers[1]?.label || "");
    const [caretakersError, setCaretakersError] = useState("");

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
        const inviteToken = localStorage.getItem("pending_invite_token");
        if (!inviteToken) {
            alert("No invite link available");
            return;
        }
        const inviteLink = `${window.location.origin}/invite/${inviteToken}`;
        navigator.clipboard.writeText(inviteLink);
        alert("Invite link copied to clipboard!");
    };

    const handleGoToHome = () => {
        router.push("/");
    };



    if (showInviteCard) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                                ✓
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Setup complete!
                            </h1>
                            <p className="text-sm text-gray-600">
                                You're all set. Now invite the other caretaker.
                            </p>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
                            <h3 className="font-bold text-gray-900 mb-2">
                                Invite the other caretaker
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                {caretaker2Name} can use this link to create a password and join.
                            </p>
                            <button
                                onClick={handleCopyInviteLink}
                                className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
                            >
                                Copy invite link
                            </button>
                        </div>

                        <button
                            onClick={handleGoToHome}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Go to home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Set up homes.kids
                    </h1>
                    <p className="text-sm text-gray-600">
                        Let's set up your child and the homes they switch between.
                    </p>
                </div>

                {/* Step indicator */}
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Step {step + 1} of 2</p>
                </div>

                {/* Step 1: Child details */}
                {step === 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
                        <h2 className="font-bold text-gray-900 mb-4">Child details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Child's name
                                </label>
                                <input
                                    type="text"
                                    value={childName}
                                    onChange={(e) => setChildName(e.target.value)}
                                    placeholder="e.g. June"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                {childNameError && (
                                    <p className="text-xs text-red-600 mt-1">{childNameError}</p>
                                )}
                            </div>
                            {childName && (
                                <p className="text-xs text-gray-500">
                                    Initials: {childName.trim().charAt(0).toUpperCase()}
                                </p>
                            )}



                        </div>
                    </div>
                )}

                {/* Step 2: Caretakers */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
                        <h2 className="font-bold text-gray-900 mb-1">Caretakers</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Enter details for both caretakers.
                        </p>
                        <div className="space-y-6">
                            {/* Caretaker 1 (you) */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    Caretaker 1 (you)
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={caretaker1Name}
                                            onChange={(e) => setCaretaker1Name(e.target.value)}
                                            placeholder="e.g. Paul"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Label (what the child calls you)
                                        </label>
                                        <input
                                            type="text"
                                            value={caretaker1Label}
                                            onChange={(e) => setCaretaker1Label(e.target.value)}
                                            placeholder="e.g. Daddy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Caretaker 2 */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    Caretaker 2
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={caretaker2Name}
                                            onChange={(e) => setCaretaker2Name(e.target.value)}
                                            placeholder="e.g. Ellis"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Label (what the child calls them)
                                        </label>
                                        <input
                                            type="text"
                                            value={caretaker2Label}
                                            onChange={(e) => setCaretaker2Label(e.target.value)}
                                            placeholder="e.g. Mommy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {caretakersError && (
                                <p className="text-xs text-red-600">{caretakersError}</p>
                            )}
                        </div>
                    </div>
                )
                }

                {/* Navigation buttons */}
                <div className="flex gap-3">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Back
                        </button>
                    )}
                    {step < 1 && (
                        <button
                            onClick={handleNextStep1}
                            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Next
                        </button>
                    )}
                    {step === 1 && (
                        <button
                            onClick={handleFinishSetup}
                            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Finish setup
                        </button>
                    )}
                </div>
            </div >
        </div >
    );
}
