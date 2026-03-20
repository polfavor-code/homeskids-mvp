"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { useAppState, HomeProfile, PetSpecies } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { processImageForUpload } from "@/lib/imageUtils";
import ImageCropper from "@/components/ImageCropper";
import Avatar from "@/components/Avatar";

const PET_SPECIES_OPTIONS: { value: PetSpecies; label: string; emoji: string }[] = [
    { value: "dog", label: "Dog", emoji: "🐕" },
    { value: "cat", label: "Cat", emoji: "🐱" },
    { value: "bird", label: "Bird", emoji: "🐦" },
    { value: "fish", label: "Fish", emoji: "🐟" },
    { value: "reptile", label: "Reptile", emoji: "🦎" },
    { value: "small_mammal", label: "Small mammal", emoji: "🐹" },
    { value: "other", label: "Other", emoji: "🐾" },
];

function getSpeciesEmoji(species: PetSpecies): string {
    const found = PET_SPECIES_OPTIONS.find(s => s.value === species);
    return found?.emoji || "🐾";
}

type PetHomeWithStatus = {
    homeId: string;
    homeName: string;
    status: 'active' | 'inactive';
};

export default function PetEditPage() {
    useEnsureOnboarding();

    const router = useRouter();
    const params = useParams();
    const petId = params.petId as string;

    const { user, loading: authLoading } = useAuth();
    const { pets, refreshData, isLoaded, homes } = useAppState();

    // Find the pet from context
    const contextPet = pets.find(p => p.id === petId);

    const [name, setName] = useState("");
    const [species, setSpecies] = useState<PetSpecies | "">("");
    const [breed, setBreed] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [notes, setNotes] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Connected Homes state
    const [connectedHomes, setConnectedHomes] = useState<PetHomeWithStatus[]>([]);
    const [homesLoading, setHomesLoading] = useState(false);
    const [showInactiveHomes, setShowInactiveHomes] = useState(false);
    const [togglingHomeId, setTogglingHomeId] = useState<string | null>(null);
    const [showLinkHomeModal, setShowLinkHomeModal] = useState(false);

    useEffect(() => {
        if (contextPet) {
            setName(contextPet.name || "");
            setSpecies(contextPet.species || "");
            setBreed(contextPet.breed || "");
            setNotes(contextPet.notes || "");
            loadPetData();
        }
    }, [contextPet]);

    // Load connected homes when petId changes
    useEffect(() => {
        const loadConnectedHomes = async () => {
            if (!petId) return;
            setHomesLoading(true);
            try {
                // Query pet_spaces for this pet (simple query without join)
                const { data: petSpaces, error } = await supabase
                    .from("pet_spaces")
                    .select("id, home_id, status")
                    .eq("pet_id", petId);

                if (error) {
                    console.error("Error fetching pet_spaces:", error);
                    throw error;
                }

                console.log("[PetEdit] pet_spaces for pet", petId, ":", petSpaces);

                // Map to PetHomeWithStatus using homes from context
                const homesData: PetHomeWithStatus[] = (petSpaces || []).map((ps: any) => {
                    const homeInfo = homes.find(h => h.id === ps.home_id);
                    return {
                        homeId: ps.home_id,
                        homeName: homeInfo?.name || "Unknown Home",
                        status: ps.status || 'active',
                    };
                });

                setConnectedHomes(homesData);
            } catch (err) {
                console.error("Error loading connected homes:", err);
            } finally {
                setHomesLoading(false);
            }
        };
        loadConnectedHomes();
    }, [petId, homes]);

    // Handle toggling a home's active status
    const handleToggleHomeStatus = async (homeId: string, currentStatus: 'active' | 'inactive') => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setTogglingHomeId(homeId);
        setError("");

        try {
            const { error } = await supabase
                .from("pet_spaces")
                .update({ status: newStatus })
                .eq("pet_id", petId)
                .eq("home_id", homeId);

            if (error) throw error;

            // Refresh the connected homes list
            setConnectedHomes(prev =>
                prev.map(h => h.homeId === homeId ? { ...h, status: newStatus } : h)
            );
            setSuccessMessage(newStatus === 'active' ? "Home connected!" : "Home disconnected");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Error toggling home status:", err);
            setError("Failed to update home connection");
        } finally {
            setTogglingHomeId(null);
        }
    };

    // Handle linking a new home
    const handleLinkNewHome = async (homeId: string) => {
        setShowLinkHomeModal(false);
        setTogglingHomeId(homeId);
        setError("");

        try {
            console.log("[PetEdit] Linking pet", petId, "to home", homeId);

            const { data, error } = await supabase
                .from("pet_spaces")
                .insert({
                    pet_id: petId,
                    home_id: homeId,
                    status: "active",
                })
                .select()
                .single();

            if (error) {
                console.error("[PetEdit] Error linking home:", error.message, error);
                throw error;
            }

            console.log("[PetEdit] pet_space created:", data);

            // Find home name
            const home = homes.find(h => h.id === homeId);
            setConnectedHomes(prev => [...prev, {
                homeId,
                homeName: home?.name || "Unknown Home",
                status: 'active',
            }]);
            setSuccessMessage("Home connected!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Error linking home:", err);
            setError("Failed to link home");
        } finally {
            setTogglingHomeId(null);
        }
    };

    // Get homes that can be linked (not already connected)
    const availableHomesToLink = homes.filter(
        home => !connectedHomes.some(ch => ch.homeId === home.id)
    );

    // Separate active and inactive homes
    const activeConnectedHomes = connectedHomes.filter(h => h.status === 'active');
    const inactiveConnectedHomes = connectedHomes.filter(h => h.status === 'inactive');

    const loadPetData = async () => {
        if (!contextPet || !user) return;

        try {
            // Use pet data from context
            if (contextPet.avatarUrl) {
                setAvatarUrl(contextPet.avatarUrl);
            }
            if (contextPet.dob) {
                setBirthdate(contextPet.dob);
            }

            // Try direct query to pets table for additional data
            const { data: petData, error: petError } = await supabase
                .from("pets")
                .select("id, name, species, breed, dob, avatar_url, notes")
                .eq("id", petId)
                .single();

            if (petData) {
                if (petData.dob) {
                    setBirthdate(petData.dob);
                }
                if (petData.breed) {
                    setBreed(petData.breed);
                }
                if (petData.notes) {
                    setNotes(petData.notes);
                }
                if (petData.avatar_url) {
                    const { data: urlData } = await supabase.storage
                        .from("avatars")
                        .createSignedUrl(petData.avatar_url, 3600);
                    if (urlData?.signedUrl) {
                        setAvatarUrl(urlData.signedUrl);
                    }
                }
            }
        } catch (err) {
            console.error("Error loading pet data:", err);
        }
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];

        try {
            const imageUrl = URL.createObjectURL(file);
            setCropperImage(imageUrl);
        } catch (err) {
            console.error("Error creating object URL:", err);
            setError("Failed to load image. Please try again.");
        }

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!petId) return;

        try {
            setError("");
            setCropperImage(null);
            setUploading(true);

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Process cropped image
            const croppedFile = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
            const processed = await processImageForUpload(croppedFile);

            const originalPath = `pet-${petId}-${timestamp}-${random}_original.jpg`;
            const displayPath = `pet-${petId}-${timestamp}-${random}_display.jpg`;

            // Upload original (full resolution)
            const { error: originalError } = await supabase.storage
                .from("avatars")
                .upload(originalPath, processed.original, {
                    cacheControl: "31536000",
                    upsert: true,
                });

            if (originalError) throw originalError;

            let finalPath = originalPath;

            // Upload display version (max 1024px) - only if resize was needed
            if (processed.needsResize) {
                const { error: displayError } = await supabase.storage
                    .from("avatars")
                    .upload(displayPath, processed.display, {
                        cacheControl: "3600",
                        upsert: true,
                    });

                if (!displayError) {
                    finalPath = displayPath;
                }
            }

            // Update pet with path for UI usage
            const { error: updateError } = await supabase
                .from("pets")
                .update({ avatar_url: finalPath })
                .eq("id", petId);

            if (updateError) throw updateError;

            // Load the new avatar URL
            const { data: urlData } = await supabase.storage
                .from("avatars")
                .createSignedUrl(finalPath, 3600);

            if (urlData) {
                setAvatarUrl(urlData.signedUrl);
            }

            await refreshData();
            setSuccessMessage("Photo updated!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error uploading avatar:", err);
            setError(err.message || "Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    const handleCropCancel = () => {
        if (cropperImage) {
            URL.revokeObjectURL(cropperImage);
        }
        setCropperImage(null);
    };

    const handleSave = async () => {
        if (!petId || !name.trim()) {
            setError("Name is required");
            return;
        }
        if (!species) {
            setError("Pet type is required");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const { error: updateError } = await supabase
                .from("pets")
                .update({
                    name: name.trim(),
                    species: species,
                    breed: breed.trim() || null,
                    dob: birthdate || null,
                    notes: notes.trim() || null,
                })
                .eq("id", petId);

            if (updateError) throw updateError;

            await refreshData();
            await loadPetData();
            setSuccessMessage("Changes saved!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Error saving pet:", err);
            setError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== contextPet?.name) {
            setError(`Please type "${contextPet?.name}" to confirm deletion`);
            return;
        }

        try {
            setSaving(true);
            setError("");

            // Delete pet (this should cascade to pet_access and pet_spaces)
            const { error: deleteError } = await supabase
                .from("pets")
                .delete()
                .eq("id", petId);

            if (deleteError) throw deleteError;

            await refreshData();

            // Redirect to pets list
            router.push("/settings/pets");
        } catch (err: any) {
            console.error("Error deleting pet:", err);
            setError(err.message || "Failed to delete");
            setSaving(false);
        }
    };

    // Loading state
    if (authLoading || !isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    if (!user) {
        return null;
    }

    // Pet not found
    if (!contextPet) {
        return (
            <AppShell>
                <Link
                    href="/settings/pets"
                    className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
                >
                    ← Back to Pets
                </Link>
                <div className="card-organic p-8 text-center">
                    <h2 className="text-xl font-dmSerif text-forest mb-2">Pet not found</h2>
                    <p className="text-sm text-textSub mb-4">
                        This pet profile doesn't exist or you don't have access to it.
                    </p>
                    <Link href="/settings/pets" className="btn-primary">
                        Go to Pets
                    </Link>
                </div>
            </AppShell>
        );
    }

    const selectedSpeciesEmoji = species ? getSpeciesEmoji(species) : "🐾";

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/settings/pets"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Pets
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Edit Profile</h1>
                    <p className="text-sm text-textSub">Manage {contextPet.name}'s profile</p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-softGreen border border-forest/20 rounded-xl px-4 py-3 text-sm text-forest font-medium">
                        {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Image Cropper Modal */}
                {cropperImage && (
                    <ImageCropper
                        imageSrc={cropperImage}
                        onCropComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                        aspectRatio={1}
                        cropShape="round"
                    />
                )}

                {/* Profile Photo */}
                <div className="card-organic p-6">
                    <h2 className="font-bold text-forest text-lg mb-4">Profile Photo</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="pet-avatar-upload"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleAvatarChange}
                                disabled={uploading}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className={`block w-28 h-28 rounded-full overflow-hidden cursor-pointer border-4 border-border hover:border-forest transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={contextPet.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-green-100 flex items-center justify-center text-4xl">
                                        {selectedSpeciesEmoji}
                                    </div>
                                )}
                            </button>
                            <div className="absolute bottom-0 right-0 bg-white rounded-full p-2 border-2 border-forest shadow-md">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-textSub">{uploading ? "Uploading..." : "Click to change photo"}</p>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="card-organic p-6 space-y-4">
                    <h2 className="font-bold text-forest text-lg">Basic Info</h2>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="pet-name" className="block text-sm font-semibold text-forest mb-1.5">
                                Name
                            </label>
                            <input
                                id="pet-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                placeholder="Pet's name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-forest mb-1.5">
                                Pet type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PET_SPECIES_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSpecies(option.value)}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                                            species === option.value
                                                ? "bg-green-50 border-green-300 text-green-700"
                                                : "border-border bg-white text-textSub hover:border-forest/30"
                                        }`}
                                    >
                                        <span>{option.emoji}</span>
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="pet-breed" className="block text-sm font-semibold text-forest mb-1.5">
                                Breed <span className="text-textSub font-normal">(optional)</span>
                            </label>
                            <input
                                id="pet-breed"
                                type="text"
                                value={breed}
                                onChange={(e) => setBreed(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                placeholder="e.g., Golden Retriever, Siamese"
                            />
                        </div>

                        <div>
                            <label htmlFor="pet-birthdate" className="block text-sm font-semibold text-forest mb-1.5">
                                Birthdate <span className="text-textSub font-normal">(optional)</span>
                            </label>
                            <input
                                id="pet-birthdate"
                                type="date"
                                value={birthdate}
                                onChange={(e) => setBirthdate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                            />
                            <p className="text-xs text-textSub mt-1.5">
                                Used to track your pet's age
                            </p>
                        </div>

                        <div>
                            <label htmlFor="pet-notes" className="block text-sm font-semibold text-forest mb-1.5">
                                Notes <span className="text-textSub font-normal">(optional)</span>
                            </label>
                            <textarea
                                id="pet-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest resize-none"
                                placeholder="Any special needs, preferences, or important information"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim() || !species}
                        className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* Connected Homes */}
                <div className="card-organic p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-forest text-lg">Connected Homes</h2>
                        {availableHomesToLink.length > 0 && (
                            <button
                                onClick={() => setShowLinkHomeModal(true)}
                                className="text-sm text-teal hover:text-forest font-medium flex items-center gap-1"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Link home
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-textSub mb-4">
                        Homes where {contextPet.name} stays. Toggle to connect or disconnect homes.
                    </p>

                    {homesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Active Homes */}
                            {activeConnectedHomes.length === 0 ? (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <p className="text-sm text-amber-700">
                                        No homes connected. Link a home to get started.
                                    </p>
                                </div>
                            ) : (
                                activeConnectedHomes.map((home) => (
                                    <div
                                        key={home.homeId}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-softGreen/30 border border-forest/20"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center flex-shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-forest truncate">{home.homeName}</p>
                                            <p className="text-xs text-textSub">Active</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleHomeStatus(home.homeId, 'active')}
                                            disabled={togglingHomeId === home.homeId || activeConnectedHomes.length === 1}
                                            className="p-2 text-textSub hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title={activeConnectedHomes.length === 1 ? "Cannot disconnect the only home" : "Disconnect from home"}
                                        >
                                            {togglingHomeId === home.homeId ? (
                                                <div className="w-5 h-5 border-2 border-gray-300 border-t-forest rounded-full animate-spin" />
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}

                            {/* Previously Connected (Inactive) Homes */}
                            {inactiveConnectedHomes.length > 0 && (
                                <div className="pt-3">
                                    <button
                                        onClick={() => setShowInactiveHomes(!showInactiveHomes)}
                                        className="flex items-center gap-2 text-sm text-textSub hover:text-forest transition-colors"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className={`transition-transform ${showInactiveHomes ? "rotate-90" : ""}`}
                                        >
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                        Previously connected ({inactiveConnectedHomes.length})
                                    </button>

                                    {showInactiveHomes && (
                                        <div className="mt-2 space-y-2">
                                            {inactiveConnectedHomes.map((home) => (
                                                <div
                                                    key={home.homeId}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 opacity-70"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                            <polyline points="9 22 9 12 15 12 15 22" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-600 truncate">{home.homeName}</p>
                                                        <p className="text-xs text-gray-400">Inactive</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleHomeStatus(home.homeId, 'inactive')}
                                                        disabled={togglingHomeId === home.homeId}
                                                        className="px-3 py-1.5 text-sm font-medium text-teal hover:text-forest disabled:opacity-50 transition-colors"
                                                    >
                                                        {togglingHomeId === home.homeId ? (
                                                            <div className="w-4 h-4 border-2 border-gray-300 border-t-teal rounded-full animate-spin" />
                                                        ) : (
                                                            "Reconnect"
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Link Home Modal */}
                {showLinkHomeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
                            <div className="p-4 border-b border-border/30">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-forest text-lg">Link Home</h3>
                                    <button
                                        onClick={() => setShowLinkHomeModal(false)}
                                        className="p-2 text-textSub hover:text-forest rounded-lg"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm text-textSub mt-1">
                                    Select a home to connect to {contextPet.name}
                                </p>
                            </div>
                            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                                {availableHomesToLink.map((home) => (
                                    <button
                                        key={home.id}
                                        onClick={() => handleLinkNewHome(home.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-forest/30 hover:bg-softGreen/10 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center flex-shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                        <span className="font-medium text-forest text-left flex-1 truncate">
                                            {home.name}
                                        </span>
                                    </button>
                                ))}
                                {availableHomesToLink.length === 0 && (
                                    <p className="text-sm text-textSub text-center py-4">
                                        All homes are already connected
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Remove Profile */}
                <div className="card-organic p-6">
                    <h2 className="font-medium text-forest text-base mb-1">Remove {contextPet.name}'s profile</h2>
                    <p className="text-sm text-textSub mb-4">
                        This will permanently delete {contextPet.name}'s profile and all associated data.
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-200 hover:border-red-300 hover:text-red-500 transition-colors"
                        >
                            Remove profile
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-textSub">
                                Type <span className="font-medium text-forest">"{contextPet.name}"</span> to confirm:
                            </p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                placeholder={contextPet.name}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteConfirmText("");
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={saving || deleteConfirmText !== contextPet.name}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm text-red-500 border border-red-200 hover:border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {saving ? "Removing..." : "Remove"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
