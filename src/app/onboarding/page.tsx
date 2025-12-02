"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAppState, type ChildProfile, type CaregiverProfile } from "@/lib/AppStateContext";

export default function OnboardingPage() {
    const router = useRouter();
    const {
        child,
        caregivers,
        currentJuneCaregiverId,
        setChild,
        setCaregivers,
        setCurrentJuneCaregiverId,
        setOnboardingCompleted,
    } = useAppState();

    // Wizard step management
    const [step, setStep] = useState(0);

    // Step 1: Child name
    const [childName, setChildName] = useState(child.name);
    const [childNameError, setChildNameError] = useState("");

    // Step 2: Caregivers
    const [caregiver1Name, setCaregiver1Name] = useState(caregivers[0]?.name || "");
    const [caregiver1Label, setCaregiver1Label] = useState(caregivers[0]?.label || "");
    const [caregiver2Name, setCaregiver2Name] = useState(caregivers[1]?.name || "");
    const [caregiver2Label, setCaregiver2Label] = useState(caregivers[1]?.label || "");
    const [caregiversError, setCaregiversError] = useState("");

    // Step 3: Current location (using global state directly)

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

    const handleNextStep2 = () => {
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

        // Ensure currentJuneCaregiverId is valid
        if (
            !newCaregivers.find((c) => c.id === currentJuneCaregiverId)
        ) {
            setCurrentJuneCaregiverId(newCaregivers[0].id);
        }

        setStep(2);
    };

    const handleFinish = () => {
        setOnboardingCompleted(true);
        router.push("/");
    };

    return (
        <AppShell>
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Set up homes.kids
                    </h1>
                    <p className="text-sm text-gray-600">
                        We&apos;ll configure your child and the homes they move between.
                    </p>
                </div>

                {/* Step indicator */}
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Step {step + 1} of 3</p>
                </div>

                {/* Step 1: Child */}
                {step === 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
                        <h2 className="font-bold text-gray-900 mb-4">Your child</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Child&apos;s name
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
                            We&apos;ll start with two caregivers. You can add more later.
                        </p>
                        <div className="space-y-6">
                            {/* Caregiver 1 */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    Caregiver 1
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
                                            Label (how the child calls them)
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
                                    Caregiver 2
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
                                            Label (how the child calls them)
                                        </label>
                                        <input
                                            type="text"
                                            value={caregiver2Label}
                                            onChange={(e) => setCaregiver2Label(e.target.value)}
                                            placeholder="Mum"
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

                {/* Step 3: Where is child now? */}
                {step === 2 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
                        <h2 className="font-bold text-gray-900 mb-4">
                            Where is {child.name} right now?
                        </h2>
                        <div className="flex gap-2">
                            {caregivers.map((caregiver) => (
                                <button
                                    key={caregiver.id}
                                    onClick={() => setCurrentJuneCaregiverId(caregiver.id)}
                                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${currentJuneCaregiverId === caregiver.id
                                        ? "border-primary bg-primary/5 font-medium"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="text-sm">{caregiver.label}</div>
                                </button>
                            ))}
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
                    {step < 2 && (
                        <button
                            onClick={step === 0 ? handleNextStep1 : handleNextStep2}
                            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Next
                        </button>
                    )}
                    {step === 2 && (
                        <button
                            onClick={handleFinish}
                            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Finish setup
                        </button>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
