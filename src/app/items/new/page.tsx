"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { MOCK_CAREGIVERS } from "@/lib/mockData";
import { useItems } from "@/lib/ItemsContext";

const CATEGORIES = [
    "Clothing",
    "Toys",
    "School stuff",
    "Sports",
    "Musical instruments",
    "Medicine",
    "Electronics",
    "Other",
];

export default function AddItemPage() {
    const router = useRouter();
    const { addItem } = useItems();

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !category || !location) {
            setError("Please fill in all required fields.");
            return;
        }

        const isMissing = location === "To be found";
        const locationCaregiverId = isMissing ? MOCK_CAREGIVERS[0].id : location; // Default to first caregiver if missing for now, or handle better logic

        const newItem = {
            id: `item-${Date.now()}`,
            name,
            category,
            locationCaregiverId,
            isRequestedForNextVisit: false,
            isPacked: false,
            isMissing,
        };

        addItem(newItem);
        router.push("/items");
    };

    return (
        <AppShell>
            <div className="mb-4">
                <Link
                    href="/items"
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    ← Back to list
                </Link>
            </div>

            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Add a new item</h1>
                <p className="text-sm text-gray-500">
                    Add one of June’s things and choose where it is now.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-4">
                    {/* Photo Placeholder */}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <div className="w-10 h-10 text-gray-400 mb-2">📷</div>
                        <button
                            type="button"
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Add photo (recommended)
                        </button>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Red dress, iPad, soccer shoes..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                        >
                            <option value="">Select a category</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Where is this item now? <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                            {MOCK_CAREGIVERS.map((caregiver) => (
                                <label
                                    key={caregiver.id}
                                    className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${location === caregiver.id
                                        ? "border-primary bg-blue-50"
                                        : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="location"
                                        value={caregiver.id}
                                        checked={location === caregiver.id}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="sr-only"
                                    />
                                    <span
                                        className={`font-medium ${location === caregiver.id
                                            ? "text-primary"
                                            : "text-gray-700"
                                            }`}
                                    >
                                        {caregiver.label}’s Home
                                    </span>
                                </label>
                            ))}
                            <label
                                className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${location === "To be found"
                                    ? "border-yellow-400 bg-yellow-50"
                                    : "border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="location"
                                    value="To be found"
                                    checked={location === "To be found"}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="sr-only"
                                />
                                <span
                                    className={`font-medium ${location === "To be found"
                                        ? "text-yellow-700"
                                        : "text-gray-700"
                                        }`}
                                >
                                    To be found
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-500 px-1">{error}</p>}

                <button
                    type="submit"
                    className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!name || !category || !location}
                >
                    Save item
                </button>
            </form>
        </AppShell>
    );
}
