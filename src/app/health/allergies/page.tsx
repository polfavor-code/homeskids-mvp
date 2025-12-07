"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useHealth, Allergy } from "@/lib/HealthContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { AllergyIcon } from "@/components/icons/DuotoneIcons";

// Emoji map for allergy categories
const categoryEmoji: Record<string, string> = {
    food: "🍽️",
    medication: "💊",
    environmental: "🌿",
    other: "⚠️",
};

const categoryLabels: Record<string, string> = {
    food: "Food",
    medication: "Medication",
    environmental: "Environmental",
    other: "Other",
};

export default function AllergiesPage() {
    useEnsureOnboarding();
    const { child } = useAppState();
    const { allergies, isLoaded, addAllergy, deleteAllergy } = useHealth();
    const childName = child?.name || "your child";

    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Form state
    const [newAllergy, setNewAllergy] = useState({
        name: "",
        category: "food" as Allergy["category"],
        severity: "mild" as Allergy["severity"],
        reaction: "",
        action: "",
    });

    // Group allergies by category
    const groupedAllergies = allergies.reduce((acc, allergy) => {
        if (!acc[allergy.category]) {
            acc[allergy.category] = [];
        }
        acc[allergy.category].push(allergy);
        return acc;
    }, {} as Record<string, Allergy[]>);

    const getSeverityStyle = (severity: string) => {
        switch (severity) {
            case "severe":
                return { badge: "bg-red-200 text-red-800", bg: "bg-red-50 border-red-200", text: "text-red-700" };
            case "moderate":
                return { badge: "bg-amber-200 text-amber-800", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" };
            default:
                return { badge: "bg-green-200 text-green-800", bg: "bg-green-50 border-green-200", text: "text-green-700" };
        }
    };

    const handleAddAllergy = async () => {
        if (!newAllergy.name.trim()) {
            setError("Please enter an allergy name");
            return;
        }

        setSaving(true);
        setError("");

        const result = await addAllergy({
            name: newAllergy.name.trim(),
            category: newAllergy.category,
            severity: newAllergy.severity,
            reaction: newAllergy.reaction.trim() || undefined,
            action: newAllergy.action.trim() || undefined,
        });

        setSaving(false);

        if (result.success) {
            setNewAllergy({
                name: "",
                category: "food",
                severity: "mild",
                reaction: "",
                action: "",
            });
            setShowAddForm(false);
        } else {
            setError(result.error || "Failed to add allergy");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this allergy?")) return;
        await deleteAllergy(id);
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
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Allergies</h1>
                    <p className="text-sm text-textSub mt-1">
                        Things {childName} reacts to and what to do if it happens.
                    </p>
                </div>

                {/* Info Card */}
                <div className="card-organic p-5 bg-red-50/50">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 mt-0.5">
                            <AllergyIcon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-forest leading-relaxed">
                                Keep this list updated so every caregiver knows exactly what to watch out for
                                and how to respond. Clear instructions save precious time in emergencies.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Add Allergy Form */}
                {showAddForm && (
                    <div className="card-organic p-5 space-y-4">
                        <h2 className="font-bold text-forest text-lg">Add Allergy</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Allergy Name *
                                </label>
                                <input
                                    type="text"
                                    value={newAllergy.name}
                                    onChange={(e) => setNewAllergy({ ...newAllergy, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    placeholder="e.g., Peanuts, Penicillin, Pollen"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-1.5">
                                        Category
                                    </label>
                                    <select
                                        value={newAllergy.category}
                                        onChange={(e) => setNewAllergy({ ...newAllergy, category: e.target.value as Allergy["category"] })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    >
                                        <option value="food">Food</option>
                                        <option value="medication">Medication</option>
                                        <option value="environmental">Environmental</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-1.5">
                                        Severity
                                    </label>
                                    <select
                                        value={newAllergy.severity}
                                        onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as Allergy["severity"] })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    >
                                        <option value="mild">Mild</option>
                                        <option value="moderate">Moderate</option>
                                        <option value="severe">Severe</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Reaction (what happens)
                                </label>
                                <input
                                    type="text"
                                    value={newAllergy.reaction}
                                    onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    placeholder="e.g., Throat swelling, rash, difficulty breathing"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Action (what to do)
                                </label>
                                <textarea
                                    value={newAllergy.action}
                                    onChange={(e) => setNewAllergy({ ...newAllergy, action: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                                    placeholder="e.g., Use EpiPen immediately, call 911"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddAllergy}
                                disabled={saving}
                                className="btn-primary flex-1 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Add Allergy"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Allergy List by Category */}
                {allergies.length > 0 ? (
                    Object.entries(groupedAllergies).map(([category, categoryAllergies]) => (
                        <div key={category} className="card-organic p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">{categoryEmoji[category] || "⚠️"}</span>
                                <h2 className="font-bold text-forest text-lg">{categoryLabels[category] || category}</h2>
                            </div>

                            <div className="space-y-3">
                                {categoryAllergies.map((allergy) => {
                                    const styles = getSeverityStyle(allergy.severity);
                                    return (
                                        <div key={allergy.id} className={`p-4 rounded-xl border ${styles.bg}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 ${allergy.severity === "severe" ? "bg-red-100" : allergy.severity === "moderate" ? "bg-amber-100" : "bg-green-100"}`}>
                                                    {categoryEmoji[allergy.category] || "⚠️"}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-bold text-forest">{allergy.name}</h3>
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${styles.badge}`}>
                                                            {allergy.severity.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    {allergy.reaction && (
                                                        <p className="text-sm text-textSub mt-2 leading-relaxed">
                                                            <strong className="text-forest">Reaction:</strong> {allergy.reaction}
                                                        </p>
                                                    )}
                                                    {allergy.action && (
                                                        <p className={`text-sm mt-1 leading-relaxed font-medium ${styles.text}`}>
                                                            <strong>Action:</strong> {allergy.action}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(allergy.id)}
                                                    className="text-textSub/50 hover:text-red-500 transition-colors p-1"
                                                    title="Delete allergy"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
                            <AllergyIcon size={32} />
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No allergies recorded</h3>
                        <p className="text-sm text-textSub mb-4">
                            Add any allergies {childName} has so all caregivers know what to watch out for.
                        </p>
                    </div>
                )}

                {/* Emergency Reminder */}
                {allergies.some((a) => a.severity === "severe") && (
                    <div className="card-organic p-4 bg-red-50 border-red-200">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold text-red-700 text-sm">Emergency Reminder</p>
                                <p className="text-sm text-red-600 mt-1 leading-relaxed">
                                    Always call emergency services (911) if breathing is affected, throat is swelling,
                                    or {childName} becomes unconscious. Use EpiPen first, then call.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Allergy Button */}
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-forest/30 text-forest text-sm font-semibold hover:border-forest hover:bg-softGreen/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add allergy
                    </button>
                )}

                {/* Future Features Note */}
                <div className="text-center py-4">
                    <p className="text-xs text-textSub">
                        Soon you'll be able to print allergy cards and share with schools.
                    </p>
                </div>
            </div>
        </AppShell>
    );
}
