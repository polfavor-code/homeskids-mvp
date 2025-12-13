"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import MobileSelect from "@/components/MobileSelect";
import { useAppState } from "@/lib/AppStateContext";
import { useHealth, DietType, DietaryNeeds } from "@/lib/HealthContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

const DIET_OPTIONS: { value: DietType; label: string }[] = [
    { value: "", label: "Select diet type..." },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "vegan", label: "Vegan" },
    { value: "pescatarian", label: "Pescatarian" },
    { value: "dairy-free", label: "Dairy-free" },
    { value: "gluten-free", label: "Gluten-free" },
    { value: "halal", label: "Halal" },
    { value: "kosher", label: "Kosher" },
    { value: "other", label: "Other" },
];

export default function DietaryNeedsPage() {
    useEnsureOnboarding();
    const { child } = useAppState();
    const { dietaryNeeds, isLoaded, updateDietaryNeeds } = useHealth();
    const childName = child?.name || "your child";

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Form state
    const [formData, setFormData] = useState<DietaryNeeds>({
        dietType: "",
        customDescription: "",
        instructions: "",
        likes: "",
        dislikes: "",
    });

    // Load existing data when available
    useEffect(() => {
        if (isLoaded && dietaryNeeds) {
            setFormData({
                dietType: dietaryNeeds.dietType || "",
                customDescription: dietaryNeeds.customDescription || "",
                instructions: dietaryNeeds.instructions || "",
                likes: dietaryNeeds.likes || "",
                dislikes: dietaryNeeds.dislikes || "",
            });
        }
    }, [isLoaded, dietaryNeeds]);

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        const result = await updateDietaryNeeds(formData);

        setSaving(false);

        if (result.success) {
            setSuccess("Dietary needs saved successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } else {
            setError(result.error || "Failed to save dietary needs");
        }
    };

    if (!isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/health"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Health
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Dietary Needs</h1>
                    <p className="text-sm text-textSub mt-1">
                        How to prepare meals and snacks for {childName}.
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="bg-softGreen border border-forest/20 rounded-xl px-4 py-3 text-sm text-forest font-medium">
                        {success}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Card 1: Diet Type */}
                <div className="card-organic p-5 space-y-4">
                    <h2 className="font-bold text-forest text-lg">Diet type</h2>

                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Main diet
                        </label>
                        <MobileSelect
                            value={formData.dietType}
                            onChange={(value) => setFormData({ ...formData, dietType: value as DietType })}
                            options={DIET_OPTIONS}
                            placeholder="Select diet type..."
                            title="Select diet type"
                        />
                        <p className="text-xs text-textSub mt-1.5">
                            Choose the option that best matches {childName}'s diet. You can add details below.
                        </p>
                    </div>

                    {/* Show custom description field if "Other" is selected */}
                    {formData.dietType === "other" && (
                        <div>
                            <label className="block text-sm font-semibold text-forest mb-1.5">
                                Describe {childName}'s diet
                            </label>
                            <input
                                type="text"
                                value={formData.customDescription}
                                onChange={(e) => setFormData({ ...formData, customDescription: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                placeholder="e.g., no red meat, avoids sugar, etc."
                            />
                        </div>
                    )}
                </div>

                {/* Card 2: Care Instructions */}
                <div className="card-organic p-5 space-y-4">
                    <h2 className="font-bold text-forest text-lg">Care instructions</h2>

                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            How to handle meals and snacks
                        </label>
                        <textarea
                            value={formData.instructions}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                            placeholder={`No meat or fish. Eggs and dairy OK.\nCheck gummy snacks for gelatin.\nBring a vegetarian option for school lunches.`}
                        />
                        <p className="text-xs text-textSub mt-1.5">
                            These notes help every caregiver prepare food that fits {childName}'s diet.
                        </p>
                    </div>
                </div>

                {/* Card 3: Food Preferences */}
                <div className="card-organic p-5 space-y-4">
                    <h2 className="font-bold text-forest text-lg">{childName}'s food preferences</h2>

                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Foods {childName} likes
                        </label>
                        <input
                            type="text"
                            value={formData.likes}
                            onChange={(e) => setFormData({ ...formData, likes: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                            placeholder="pasta, tofu, strawberries…"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Foods to avoid
                        </label>
                        <input
                            type="text"
                            value={formData.dislikes}
                            onChange={(e) => setFormData({ ...formData, dislikes: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                            placeholder="mushrooms, spicy foods…"
                        />
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? "Saving..." : "Save dietary needs"}
                </button>

                {/* Future Features Note */}
                <div className="text-center py-4">
                    <p className="text-xs text-textSub">
                        Soon you'll be able to share dietary info with schools and babysitters.
                    </p>
                </div>
            </div>
        </AppShell>
    );
}
