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

    // Step 1: Child details
    const [childName, setChildName] = useState(child.name);
    const [childBirthday, setChildBirthday] = useState("");
    const [childPhoto, setChildPhoto] = useState<File | null>(null);
    const [childNameError, setChildNameError] = useState("");

    // Step 2: Caretakers
    const [caretaker1Name, setCaretaker1Name] = useState(caregivers[0]?.name || "");
    const [caretaker1Label, setCaretaker1Label] = useState(caregivers[0]?.label || "");
    const [caretaker2Name, setCaretaker2Name] = useState(caregivers[1]?.name || "");
    const [caretaker2Label, setCaretaker2Label] = useState(caregivers[1]?.label || "");
    const [caretakersError, setCaretakersError] = useState("");

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
            !caretaker1Name.trim() ||
            !caretaker1Label.trim() ||
            !caretaker2Name.trim() ||
            !caretaker2Label.trim()
        ) {
            setCaretakersError("Please fill in both name and label for each caretaker.");
            return;
        }
        setCaretakersError("");

        // Create caretakers array
        const newCaretakers: CaregiverProfile[] = [
            {
                id: caregivers[0]?.id || "cg-1",
                name: caretaker1Name.trim(),
                label: caretaker1Label.trim(),
                avatarInitials: caretaker1Name.trim().charAt(0).toUpperCase(),
                avatarColor: caregivers[0]?.avatarColor || "bg-blue-500",
            },
            {
                id: caregivers[1]?.id || "cg-2",
                name: caretaker2Name.trim(),
                label: caretaker2Label.trim(),
                avatarInitials: caretaker2Name.trim().charAt(0).toUpperCase(),
                avatarColor: caregivers[1]?.avatarColor || "bg-pink-500",
            },
        ];

        // Update AppState
        setCaregivers(newCaretakers);
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

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setChildPhoto(e.target.files[0]);
            // TODO: Implement photo preview/upload logic
        }
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Birthday
                                </label>
                                <input
                                    type="date"
                                    value={childBirthday}
                                    onChange={(e) => setChildBirthday(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Optional child photo
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                                />
                                {childPhoto && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Selected: {childPhoto.name}
                                    </p>
                                )}
                            </div>
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
                                            value={caretaker1Label}
                                            onChange={(e) => setCaretaker1Label(e.target.value)}
                                            placeholder="Daddy"
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
                                            value={caretaker2Label}
                                            onChange={(e) => setCaretaker2Label(e.target.value)}
                                            placeholder="Mommy"
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
