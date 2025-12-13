"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import MobileSelect from "@/components/MobileSelect";
import { useContacts, ContactCategory } from "@/lib/ContactsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

const CATEGORIES: { value: ContactCategory; label: string; description: string }[] = [
    { value: "medical", label: "Medical", description: "Doctors, dentists, therapists" },
    { value: "school", label: "School", description: "Teachers, staff, tutors" },
    { value: "family", label: "Family", description: "Relatives, family members" },
    { value: "friends", label: "Friends", description: "Playmates, parents of friends" },
    { value: "activities", label: "Activities", description: "Coaches, instructors" },
    { value: "other", label: "Other", description: "Babysitters, neighbors" },
];

export default function NewContactPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const { addContact } = useContacts();
    const { caregivers } = useAppState();

    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [category, setCategory] = useState<ContactCategory>("other");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const [connectedWith, setConnectedWith] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Determine the multi-side option label
    const multiSideLabel = caregivers.length > 2 ? "All caregivers" : "Both sides";
    const multiSideValue = caregivers.length > 2 ? "all" : "both";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        setIsSaving(true);
        setError(null);

        const result = await addContact({
            name: name.trim(),
            role: role.trim(),
            category,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            notes: notes.trim() || undefined,
            isFavorite,
            connectedWith: connectedWith || undefined,
        });

        if (result.success) {
            router.push("/contacts");
        } else {
            setError(result.error || "Failed to add contact");
            setIsSaving(false);
        }
    };

    return (
        <AppShell>
            {/* Back Link */}
            <div className="mb-4">
                <Link
                    href="/contacts"
                    className="text-sm text-textSub hover:text-forest flex items-center gap-1 transition-colors"
                >
                    ← Back to contacts
                </Link>
            </div>

            {/* Header */}
            <div className="mb-6">
                <h1 className="font-dmSerif text-xl text-forest">Add Contact</h1>
                <p className="text-sm text-textSub">
                    Add an important person to your shared contact list.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
                    <label className="block text-sm font-medium text-forest mb-2">
                        Name *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Dr. Ellis Johnson"
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                        required
                    />
                </div>

                {/* Role */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
                    <label className="block text-sm font-medium text-forest mb-2">
                        Role / Title
                    </label>
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g., Pediatrician, Teacher, Grandma"
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                    />
                </div>

                {/* Category */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
                    <label className="block text-sm font-medium text-forest mb-3">
                        Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                type="button"
                                onClick={() => setCategory(cat.value)}
                                className={`p-3 rounded-lg text-left transition-colors ${category === cat.value
                                        ? "bg-forest text-white"
                                        : "bg-cream hover:bg-cream/70 text-forest"
                                    }`}
                            >
                                <div className="font-medium text-sm">{cat.label}</div>
                                <div className={`text-xs ${category === cat.value ? "text-white/80" : "text-textSub"}`}>
                                    {cat.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Connected With */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
                    <label className="block text-sm font-medium text-forest mb-2">
                        Connected with
                    </label>
                    <MobileSelect
                        value={connectedWith}
                        onChange={setConnectedWith}
                        options={[
                            ...caregivers.map((caregiver) => ({
                                value: caregiver.id,
                                label: caregiver.label || caregiver.name
                            })),
                            { value: multiSideValue, label: multiSideLabel }
                        ]}
                        placeholder="Select caregiver..."
                        title="Connected with"
                    />
                    <p className="text-xs text-textSub mt-1.5">
                        Which caregiver is this contact primarily connected with?
                    </p>
                </div>

                {/* Phone & Email */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-forest mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g., +1 555-123-4567"
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-forest mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g., doctor@clinic.com"
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
                    <label className="block text-sm font-medium text-forest mb-2">
                        Address
                    </label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g., 123 Main St, City, State 12345"
                        rows={2}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest resize-none"
                    />
                </div>

                {/* Notes */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
                    <label className="block text-sm font-medium text-forest mb-2">
                        Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional information..."
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest resize-none"
                    />
                </div>

                {/* Favorite Toggle */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isFavorite}
                            onChange={(e) => setIsFavorite(e.target.checked)}
                            className="w-5 h-5 rounded border-border text-forest focus:ring-forest cursor-pointer"
                        />
                        <div>
                            <div className="font-medium text-forest text-sm flex items-center gap-2">
                                Mark as favorite
                                <span className="text-yellow-500">★</span>
                            </div>
                            <div className="text-xs text-textSub">
                                Favorites appear at the top for quick access
                            </div>
                        </div>
                    </label>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 bg-forest text-white rounded-xl font-medium hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? "Saving..." : "Add Contact"}
                </button>
            </form>
        </AppShell>
    );
}
