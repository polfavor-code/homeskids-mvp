"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState, type ChildProfile, type CaregiverProfile } from "@/lib/AppStateContext";

export default function OnboardingPage() {
    const router = useRouter();
    const {
        child,
        caregivers,
        setChild,
        setCaregivers,
        setOnboardingCompleted,
    } = useAppState();

    // Wizard step management
    const [step, setStep] = useState(0);
    const [showInviteCard, setShowInviteCard] = useState(false);

    // Step 1: Child name
    const [childName, setChildName] = useState(child.name);
    const [childNameError, setChildNameError] = useState("");

    // Step 2: Caregivers
    const [caregiver1Name, setCaregiver1Name] = useState(caregivers[0]?.name || "");
    const [caregiver1Label, setCaregiver1Label] = useState(caregivers[0]?.label || "");
    const [caregiver2Name, setCaregiver2Name] = useState(caregivers[1]?.name || "");
    const [caregiver2Label, setCaregiver2Label] = useState(caregivers[1]?.label || "");
    const [caregiversError, setCaregiversError] = useState("");

    const handleNextStep1 = () => {
        if (!childName.trim()) {
            setChildNameError("Please enter a name.");
            return;
        }
        setChildNameError("");

        // Derive initials (first letter of first word)
        const initials = childName.trim().charAt(0).toUpperCase();

        // Update AppState
        setChild({
            id: child.id || "child-1",
            name: childName.trim(),
            avatarInitials: initials,
        });

        setStep(1);
    };

    const handleFinishSetup = () => {
        if (
            !caregiver1Name.trim() ||
            !caregiver1Label.trim() ||
            !caregiver2Name.trim() ||
            !caregiver2Label.trim()
        ) {
            setCaregiversError("Please fill in both name and label for each caregiver.");
            return;
        }
        setCaregiversError("");

        // Create caregivers array
        const newCaregivers: CaregiverProfile[] = [
            {
                id: caregivers[0]?.id || "cg-1",
                name: caregiver1Name.trim(),
                label: caregiver1Label.trim(),
                avatarInitials: caregiver1Name.trim().charAt(0).toUpperCase(),
                avatarColor: caregivers[0]?.avatarColor || "bg-blue-500",
            },
            {
                id: caregivers[1]?.id || "cg-2",
                name: caregiver2Name.trim(),
                label: caregiver2Label.trim(),
                avatarInitials: caregiver2Name.trim().charAt(0).toUpperCase(),
                avatarColor: caregivers[1]?.avatarColor || "bg-pink-500",
            },
        ];

        // Update AppState
        setCaregivers(newCaregivers);
        setOnboardingCompleted(true);

        // Show invite card
        setShowInviteCard(true);
    };

    const handleCopyInviteLink = () => {
        // Generate a mock invite link
        const inviteLink = `${window.location.origin}/invite/${caregivers[1]?.id || 'cg-2'}`;
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
                                {caregiver2Name} can use this link to create a password and join.
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
                        {step === 0
                            ? "Let's enter your child's details and the homes they live between."
                            : "We'll configure your child and the homes they move between."
                        }
                    </p>
                </div>

                {/* Step indicator */}
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Step {step + 1} of 2</p>
                </div>

                {/* Step 1: Child */}
                {step === 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
                        <h2 className="font-bold text-gray-900 mb-4">Your child</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Child's name
                                </label>
                                <input
                                    type="text"
                                    value={childName}
                                    onChange={(e) => setChildName(e.target.value)}
                                    placeholder="June"
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

                {/* Step 2: Caregivers */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
                        <h2 className="font-bold text-gray-900 mb-1">Caregivers</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Enter details for both caregivers.
                        </p>
                        <div className="space-y-6">
                            {/* Caregiver 1 (you) */}
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
                                            value={caregiver1Name}
                                            onChange={(e) => setCaregiver1Name(e.target.value)}
                                            placeholder="Paul"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Label (what the child calls you)
                                        </label>
                                        <input
                                            type="text"
                                            value={caregiver1Label}
                                            onChange={(e) => setCaregiver1Label(e.target.value)}
                                            placeholder="Daddy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Caregiver 2 */}
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
                                            value={caregiver2Name}
                                            onChange={(e) => setCaregiver2Name(e.target.value)}
                                            placeholder="Alice"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Label (what the child calls them)
                                        </label>
                                        <input
                                            type="text"
                                            value={caregiver2Label}
                                            onChange={(e) => setCaregiver2Label(e.target.value)}
                                            placeholder="Mommy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {caregiversError && (
                                <p className="text-xs text-red-600">{caregiversError}</p>
                            )}
                        </div>
                    </div>
                )}

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
            </div>
        </div>
    );
}
