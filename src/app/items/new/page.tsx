"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";

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
    const { caregivers, homes } = useAppState();

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>("");
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !category || !location) {
            setError("Please fill in all required fields.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            let photoUrl = "";

            // Upload photo if selected
            if (photoFile) {
                const { supabase } = await import("@/lib/supabase");
                const fileExt = photoFile.name.split(".").pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("item-photos")
                    .upload(fileName, photoFile, {
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    setError("Failed to upload photo. Please try again.");
                    setUploading(false);
                    return;
                }

                // Store the file path (not the full URL, we'll generate signed URLs when displaying)
                photoUrl = fileName;
            }

            const isMissing = location === "To be found";
            // Use home-based location - find the selected home
            const selectedHome = homes.find((h) => h.id === location);
            const locationHomeId = isMissing ? null : (selectedHome?.id || null);
            // Keep legacy caregiver ID for backwards compatibility
            const locationCaregiverId = isMissing
                ? (caregivers[0]?.id || "")
                : (selectedHome?.ownerCaregiverId || caregivers[0]?.id || "");

            const newItem = {
                id: `item-${Date.now()}`,
                name,
                category,
                locationCaregiverId,
                locationHomeId,
                isRequestedForNextVisit: false,
                isPacked: false,
                isMissing,
                photoUrl: photoUrl || undefined,
                notes: notes || undefined,
            };

            const result = await addItem(newItem);

            if (!result.success) {
                setError(result.error || "Failed to create item. Please try again.");
                setUploading(false);
                return;
            }

            router.push("/items");
        } catch (err) {
            console.error("Error creating item:", err);
            setError("Failed to create item. Please try again.");
        } finally {
            setUploading(false);
        }
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
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <input
                            type="file"
                            accept="image/*"
                            id="photo-upload"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setPhotoFile(file);
                                    // Create preview URL
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setPhotoPreview(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        {photoPreview ? (
                            <div className="relative w-full">
                                <img
                                    src={photoPreview}
                                    alt="Preview"
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPhotoFile(null);
                                        setPhotoPreview("");
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="w-10 h-10 text-gray-400 mb-2">📷</div>
                                <label
                                    htmlFor="photo-upload"
                                    className="text-sm font-medium text-primary hover:underline cursor-pointer"
                                >
                                    Add photo (recommended)
                                </label>
                            </>
                        )}
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
                            {homes.map((home) => (
                                <label
                                    key={home.id}
                                    className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${location === home.id
                                        ? "border-primary bg-blue-50"
                                        : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="location"
                                        value={home.id}
                                        checked={location === home.id}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="sr-only"
                                    />
                                    <span
                                        className={`font-medium ${location === home.id
                                            ? "text-primary"
                                            : "text-gray-700"
                                            }`}
                                    >
                                        {home.name}
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
                    disabled={uploading || !name || !category || !location}
                >
                    {uploading ? "Saving..." : "Save item"}
                </button>
            </form>
        </AppShell>
    );
}
