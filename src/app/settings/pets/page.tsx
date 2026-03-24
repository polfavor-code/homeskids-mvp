"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import ImageCropper from "@/components/ImageCropper";
import { useAuth } from "@/lib/AuthContext";
import { useAppState, HomeProfile, PetSpecies } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { processImageForUpload } from "@/lib/imageUtils";
import { ToastContainer, ToastData } from "@/components/Toast";
import {
    DogIcon,
    CatIcon,
    BirdIcon,
    FishIcon,
    ReptileIcon,
    HamsterIcon,
    PawIcon,
    IconProps
} from "@/components/icons/DuotoneIcons";

const PET_SPECIES_OPTIONS: { value: PetSpecies; label: string; Icon: React.ComponentType<IconProps> }[] = [
    { value: "dog", label: "Dog", Icon: DogIcon },
    { value: "cat", label: "Cat", Icon: CatIcon },
    { value: "bird", label: "Bird", Icon: BirdIcon },
    { value: "fish", label: "Fish", Icon: FishIcon },
    { value: "reptile", label: "Reptile", Icon: ReptileIcon },
    { value: "small_mammal", label: "Small mammal", Icon: HamsterIcon },
    { value: "other", label: "Other", Icon: PawIcon },
];

function getSpeciesIcon(species: PetSpecies): React.ComponentType<IconProps> {
    const found = PET_SPECIES_OPTIONS.find(s => s.value === species);
    return found?.Icon || PawIcon;
}

function getSpeciesLabel(species: PetSpecies): string {
    const found = PET_SPECIES_OPTIONS.find(s => s.value === species);
    return found?.label || "Pet";
}

export default function PetsPage() {
    useEnsureOnboarding();

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { pets, refreshData, isLoaded, homes, currentHomeId } = useAppState();

    const [showAddModal, setShowAddModal] = useState(false);
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const addToast = (title: string, message: string, type: "success" | "info" | "error" = "success") => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, title, message, type }]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handlePetAdded = async (petName: string) => {
        setShowAddModal(false);
        await refreshData();
        addToast("Pet added", `${petName} has been added to your family.`, "success");
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

    if (!user) return null;

    return (
        <AppShell>
            {/* Back Link */}
            <Link
                href="/manage"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Manage household
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-dmSerif text-forest">Pets</h1>
                        <p className="text-sm text-textSub">Manage your pets and their care</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add pet
                    </button>
                </div>

                {/* Pets List */}
                <div className="space-y-3">
                    {pets.length === 0 ? (
                        <div className="card-organic p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-forest">
                                <PawIcon size={32} />
                            </div>
                            <h3 className="font-bold text-forest text-lg mb-2">No pets yet</h3>
                            <p className="text-sm text-textSub mb-4">
                                Add a pet to start tracking their care routines and information.
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary"
                            >
                                Add your first pet
                            </button>
                        </div>
                    ) : (
                        pets.map((pet) => (
                            <Link
                                key={pet.id}
                                href={`/settings/pets/${pet.id}`}
                                className="card-organic p-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
                            >
                                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                                    {pet.avatarUrl ? (
                                        <Avatar
                                            src={pet.avatarUrl}
                                            initial={pet.avatarInitials || pet.name?.charAt(0)}
                                            size={56}
                                            bgColor={pet.avatarColor || "#22C55E"}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-green-100 flex items-center justify-center text-forest">
                                            {React.createElement(getSpeciesIcon(pet.species), { size: 28 })}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-forest text-lg">{pet.name}</h3>
                                    <p className="text-sm text-textSub mt-0.5 flex items-center gap-1">
                                        <span className="inline-flex">{React.createElement(getSpeciesIcon(pet.species), { size: 14 })}</span>
                                        <span>{getSpeciesLabel(pet.species)}{pet.breed && ` • ${pet.breed}`}</span>
                                    </p>
                                </div>
                                <svg
                                    className="w-5 h-5 text-textSub/50 group-hover:text-forest transition-colors flex-shrink-0"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </Link>
                        ))
                    )}
                </div>

                {/* Add another pet button (when pets exist) */}
                {pets.length > 0 && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full py-4 border-2 border-dashed border-border rounded-xl text-sm font-medium text-textSub hover:border-forest hover:text-forest transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add another pet
                    </button>
                )}

                {/* Info card */}
                <div className="card-organic p-4 bg-softGreen/30">
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-forest flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-forest text-xs font-bold">i</span>
                        </div>
                        <div>
                            <p className="text-sm text-forest font-medium mb-1">About Pets</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Each pet has their own profile and can be associated with different homes.
                                You can track medications, feeding schedules, and care routines in the Day Hub.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Pet Modal */}
            {showAddModal && (
                <AddPetModal
                    onClose={() => setShowAddModal(false)}
                    onPetAdded={handlePetAdded}
                    homes={homes}
                    currentHomeId={currentHomeId}
                />
            )}

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </AppShell>
    );
}

// Add Pet Modal Component
interface AddPetModalProps {
    onClose: () => void;
    onPetAdded: (petName: string) => void;
    homes: HomeProfile[];
    currentHomeId?: string;
}

function AddPetModal({ onClose, onPetAdded, homes, currentHomeId }: AddPetModalProps) {
    const { user } = useAuth();
    const { refreshData } = useAppState();

    const [name, setName] = useState("");
    const [species, setSpecies] = useState<PetSpecies | "">("");
    const [breed, setBreed] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [notes, setNotes] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [avatarPath, setAvatarPath] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Connected homes - preselect current home if available, otherwise select all if only one
    const [selectedHomeIds, setSelectedHomeIds] = useState<string[]>(() => {
        if (currentHomeId && homes.some(h => h.id === currentHomeId)) {
            return [currentHomeId];
        }
        if (homes.length === 1) {
            return [homes[0].id];
        }
        return [];
    });

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
        if (!user) {
            setError("Please log in to upload a photo");
            return;
        }

        try {
            setError("");
            setCropperImage(null);
            setUploading(true);

            // Verify session is valid
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error("Session expired. Please refresh the page.");
            }

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Process cropped image
            const croppedFile = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
            const processed = await processImageForUpload(croppedFile);

            const tempPath = `temp-pet-${user.id}-${timestamp}-${random}_display.jpg`;

            console.log("[AddPet] Uploading avatar to:", tempPath);

            // Upload to temp location (will be updated with pet ID after creation)
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(tempPath, processed.display, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                console.error("[AddPet] Avatar upload error:", uploadError);
                throw uploadError;
            }

            console.log("[AddPet] Avatar uploaded successfully");

            // Store the path for later
            setAvatarPath(tempPath);

            // Get signed URL for preview
            const { data: urlData } = await supabase.storage
                .from("avatars")
                .createSignedUrl(tempPath, 3600);

            if (urlData) {
                setAvatarUrl(urlData.signedUrl);
            }
        } catch (err: any) {
            console.error("[AddPet] Error uploading avatar:", err);
            setError(err.message || "Failed to upload photo. Please try again.");
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

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError("Please enter a name");
            return;
        }
        if (!species) {
            setError("Please select a pet type");
            return;
        }
        if (selectedHomeIds.length === 0) {
            setError("Please select at least one home for the pet");
            return;
        }
        if (!user) {
            setError("Authentication error. Please try again.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            // Verify auth session is valid before proceeding
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error("Session expired. Please refresh the page and try again.");
            }

            console.log("[AddPet] Creating pet for user:", user.id);

            // Create pet
            const { data: newPet, error: petError } = await supabase
                .from("pets")
                .insert({
                    name: name.trim(),
                    species: species,
                    breed: breed.trim() || null,
                    dob: birthdate || null,
                    notes: notes.trim() || null,
                    avatar_url: avatarPath || null,
                    avatar_initials: name.trim().charAt(0).toUpperCase(),
                    created_by: user.id,
                })
                .select()
                .single();

            if (petError) {
                console.error("[AddPet] Error creating pet:", petError);
                throw petError;
            }

            console.log("[AddPet] Pet created:", newPet.id);

            // CRITICAL: Add current user as owner with pet_access FIRST
            // This must succeed before we can create pet_spaces (RLS requirement)
            const { error: accessError } = await supabase
                .from("pet_access")
                .insert({
                    pet_id: newPet.id,
                    user_id: user.id,
                    role_type: "owner",
                    access_level: "manage",
                });

            if (accessError) {
                console.error("[AddPet] CRITICAL: Error creating pet_access:", accessError);
                // Don't throw - pet was created, try to continue but log warning
                console.warn("[AddPet] pet_access failed, pet_spaces may also fail");
            } else {
                console.log("[AddPet] pet_access created successfully");
            }

            // If we uploaded an avatar to temp path, rename it to include pet ID
            if (avatarPath && newPet) {
                const newAvatarPath = avatarPath.replace(`temp-pet-${user.id}`, `pet-${newPet.id}`);

                console.log("[AddPet] Renaming avatar from", avatarPath, "to", newAvatarPath);

                // Copy to new path
                const { error: copyError } = await supabase.storage
                    .from("avatars")
                    .copy(avatarPath, newAvatarPath);

                if (copyError) {
                    console.error("[AddPet] Error copying avatar:", copyError);
                } else {
                    // Update pet with new path
                    const { error: updateError } = await supabase
                        .from("pets")
                        .update({ avatar_url: newAvatarPath })
                        .eq("id", newPet.id);

                    if (updateError) {
                        console.error("[AddPet] Error updating avatar path:", updateError);
                    } else {
                        console.log("[AddPet] Avatar path updated successfully");
                        // Delete temp file (best effort)
                        await supabase.storage
                            .from("avatars")
                            .remove([avatarPath]);
                    }
                }
            }

            // Link pet to selected homes
            const selectedHomes = homes.filter(h => selectedHomeIds.includes(h.id));
            let linkedHomesCount = 0;
            for (const home of selectedHomes) {
                console.log("[AddPet] Creating pet_space for pet", newPet.id, "and home", home.id);
                const { data: psData, error: psError } = await supabase
                    .from("pet_spaces")
                    .insert({
                        home_id: home.id,
                        pet_id: newPet.id,
                        status: "active",
                    })
                    .select()
                    .single();

                if (psError) {
                    console.error("[AddPet] Error creating pet_space for home", home.id, ":", psError.message, psError);
                } else {
                    console.log("[AddPet] pet_space created:", psData);
                    linkedHomesCount++;
                }
            }

            console.log("[AddPet] Linked pet to", linkedHomesCount, "of", selectedHomes.length, "homes");

            // Warn if home linking failed
            if (linkedHomesCount < selectedHomes.length) {
                console.warn("[AddPet] Some homes failed to link. This may be a permissions issue.");
            }

            // Update user's profile to indicate they manage pets
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ manages_pets: true })
                .eq("id", user.id);

            if (profileError) {
                console.error("[AddPet] Error updating profile:", profileError);
            }

            // Wait a moment for database to propagate, then refresh
            await new Promise(resolve => setTimeout(resolve, 500));

            // Refresh app data
            await refreshData();

            console.log("[AddPet] Pet creation complete:", newPet.id);

            // Notify parent
            onPetAdded(name.trim());
        } catch (err: any) {
            console.error("[AddPet] Error creating pet:", err);
            setError(err.message || "Failed to create pet. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const initials = name ? name[0].toUpperCase() : "?";
    const SelectedSpeciesIcon = species ? getSpeciesIcon(species) : PawIcon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-border/30 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-dmSerif text-forest">Add Pet</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-textSub hover:text-forest rounded-lg hover:bg-cream transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
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
                    <div className="flex flex-col items-center gap-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleAvatarChange}
                            disabled={uploading}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className={`relative w-24 h-24 rounded-full overflow-hidden cursor-pointer border-4 border-border hover:border-forest transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Pet photo"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-green-100 flex items-center justify-center text-forest">
                                    <SelectedSpeciesIcon size={40} />
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 border-2 border-forest shadow-md">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                        </button>
                        <p className="text-xs text-textSub">
                            {uploading ? "Uploading..." : "Tap to add photo (optional)"}
                        </p>
                    </div>

                    {/* Name */}
                    <div>
                        <label htmlFor="pet-name" className="block text-sm font-semibold text-forest mb-1.5">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="pet-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                            placeholder="Pet's name"
                            autoFocus
                        />
                    </div>

                    {/* Pet Type / Species */}
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Pet type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PET_SPECIES_OPTIONS.map((option) => {
                                const OptionIcon = option.Icon;
                                return (
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
                                        <OptionIcon size={18} />
                                        <span>{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Breed */}
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

                    {/* Birthdate */}
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

                    {/* Notes */}
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

                    {/* Connected Homes - Required */}
                    <div>
                        <label className="block text-sm font-semibold text-forest mb-1.5">
                            Connected Homes <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-textSub mb-3">
                            Select which homes this pet stays in.
                        </p>
                        {homes.length === 0 ? (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <p className="text-sm text-amber-700">
                                    You need to create at least one home before adding a pet.
                                </p>
                            </div>
                        ) : homes.length === 1 ? (
                            // Single home - show as pre-selected with info
                            <div className="p-4 bg-softGreen/30 rounded-xl border border-forest/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-forest">{homes[0].name}</p>
                                        <p className="text-xs text-textSub">This pet will be added to your home.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Multiple homes - show multi-select
                            <div className="space-y-2">
                                {homes.map((home) => {
                                    const isSelected = selectedHomeIds.includes(home.id);
                                    return (
                                        <button
                                            key={home.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedHomeIds(prev =>
                                                    prev.includes(home.id)
                                                        ? prev.filter(id => id !== home.id)
                                                        : [...prev, home.id]
                                                );
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                                isSelected
                                                    ? "bg-softGreen/30 border-forest/20"
                                                    : "bg-white border-border hover:border-forest/30"
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                isSelected
                                                    ? "border-forest bg-forest"
                                                    : "border-gray-300"
                                            }`}>
                                                {isSelected && (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isSelected ? "text-forest" : "text-textSub"}>
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                    <polyline points="9 22 9 12 15 12 15 22" />
                                                </svg>
                                                <span className={`text-sm font-medium truncate ${isSelected ? "text-forest" : "text-textSub"}`}>
                                                    {home.name}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                                {selectedHomeIds.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Select at least one home
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-border/30 px-6 py-4 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="btn-secondary flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !name.trim() || !species}
                        className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Adding..." : "Add pet"}
                    </button>
                </div>
            </div>
        </div>
    );
}
