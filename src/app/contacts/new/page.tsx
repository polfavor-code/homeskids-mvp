"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import PhoneNumbersInput from "@/components/PhoneNumbersInput";
import MobileMultiSelect from "@/components/MobileMultiSelect";
import GooglePlacesAutocomplete, { AddressComponents } from "@/components/GooglePlacesAutocomplete";
import ImageCropper from "@/components/ImageCropper";
import ContactPreferencesSelector from "@/components/ContactPreferencesSelector";
import { useContacts, ContactCategory, ContactMethod, PhoneNumber } from "@/lib/ContactsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { processImageForUpload } from "@/lib/imageUtils";

const CATEGORIES: { value: ContactCategory; label: string; emoji: string }[] = [
    { value: "medical", label: "Medical", emoji: "🏥" },
    { value: "school", label: "School", emoji: "🏫" },
    { value: "family", label: "Family", emoji: "👨‍👩‍👧" },
    { value: "activities", label: "Activities", emoji: "⚽" },
    { value: "friends", label: "Friends", emoji: "👋" },
    { value: "other", label: "Other", emoji: "📋" },
];

export default function NewContactPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const { addContact } = useContacts();
    const { caregivers } = useAppState();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [category, setCategory] = useState<ContactCategory>("other");
    const [connectedWith, setConnectedWith] = useState<string[]>([]);
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [email, setEmail] = useState("");
    const [telegram, setTelegram] = useState("");
    const [instagram, setInstagram] = useState("");
    const [contactPreferences, setContactPreferences] = useState<ContactMethod[]>([]);
    const [addressStreet, setAddressStreet] = useState("");
    const [addressCity, setAddressCity] = useState("");
    const [addressState, setAddressState] = useState("");
    const [addressZip, setAddressZip] = useState("");
    const [addressCountry, setAddressCountry] = useState("");
    const [addressLat, setAddressLat] = useState<number | undefined>();
    const [addressLng, setAddressLng] = useState<number | undefined>();
    const [notes, setNotes] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);

    // Photo state
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // Final uploaded URL path
    const [isUploading, setIsUploading] = useState(false);
    const [familyId, setFamilyId] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user's family ID on mount
    useEffect(() => {
        const fetchFamilyId = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return;

                const { data: familyMember } = await supabase
                    .from("family_members")
                    .select("family_id")
                    .eq("user_id", session.user.id)
                    .single();

                if (familyMember) {
                    setFamilyId(familyMember.family_id);
                }
            } catch (err) {
                console.error("Failed to fetch family ID:", err);
            }
        };

        fetchFamilyId();
    }, []);

    // Caregiver options for MobileMultiSelect
    const caregiverOptions = caregivers.map((caregiver) => ({
        value: caregiver.id,
        label: caregiver.label || caregiver.name,
    }));

    // "All caregivers" option for the multi-select
    const allOption = {
        value: "all",
        label: caregivers.length > 2 ? "All caregivers" : "Both sides",
    };

    // Handle photo upload
    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                setError("Please select an image file");
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError("Image must be less than 5MB");
                return;
            }

            // Create object URL for cropper
            const imageUrl = URL.createObjectURL(file);
            setCropperImage(imageUrl);
            setError(null);
        }

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        try {
            setError(null);
            setCropperImage(null);
            setIsUploading(true);

            if (!familyId) {
                setError("No family found. Please complete onboarding.");
                setIsUploading(false);
                return;
            }

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Process cropped image: create original and display versions
            const croppedFile = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
            const processed = await processImageForUpload(croppedFile);

            const originalPath = `${familyId}/contacts/${timestamp}-${random}_original.jpg`;
            const displayPath = `${familyId}/contacts/${timestamp}-${random}_display.jpg`;

            // Upload original (full resolution)
            const { error: originalError } = await supabase.storage
                .from("avatars")
                .upload(originalPath, processed.original, {
                    cacheControl: "31536000", // 1 year cache
                    upsert: true,
                });

            if (originalError) {
                throw originalError;
            }

            let finalPath = originalPath;

            // Upload display version (max 300px) - only if resize was needed
            if (processed.needsResize) {
                const { error: displayError } = await supabase.storage
                    .from("avatars")
                    .upload(displayPath, processed.display, {
                        cacheControl: "3600",
                        upsert: true,
                    });

                if (displayError) {
                    console.error("Display upload error:", displayError);
                    // Continue anyway - we have the original
                } else {
                    finalPath = displayPath;
                }
            }

            // Store the path for saving with contact
            setAvatarUrl(finalPath);

            // Get signed URL for preview
            const { data } = await supabase.storage
                .from("avatars")
                .createSignedUrl(finalPath, 3600);

            if (data?.signedUrl) {
                setPhotoPreview(data.signedUrl);
            }
        } catch (err: any) {
            console.error("Error uploading photo:", err);
            setError(err.message || "Failed to upload photo");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCropCancel = () => {
        if (cropperImage) {
            URL.revokeObjectURL(cropperImage);
        }
        setCropperImage(null);
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setAvatarUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Handle address selection from Google Places
    const handleAddressSelect = useCallback((address: AddressComponents) => {
        setAddressStreet(address.street);
        setAddressCity(address.city);
        setAddressState(address.state);
        setAddressZip(address.zip);
        setAddressCountry(address.country);
        setAddressLat(address.lat || undefined);
        setAddressLng(address.lng || undefined);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        setIsSaving(true);
        setError(null);

        // Build full address string for legacy field
        const fullAddress = [addressStreet, addressCity, addressState, addressZip, addressCountry]
            .filter(Boolean)
            .join(", ");

        // Filter out empty phone numbers
        const validPhoneNumbers = phoneNumbers.filter(p => p.number.trim());
        
        // Get first phone for legacy fields (backward compatibility)
        const firstPhone = validPhoneNumbers[0];

        const result = await addContact({
            name: name.trim(),
            role: role.trim(),
            category,
            phone: firstPhone?.number || undefined,
            phoneCountryCode: firstPhone?.countryCode || undefined,
            phoneNumbers: validPhoneNumbers.length > 0 ? validPhoneNumbers : undefined,
            email: email.trim() || undefined,
            telegram: telegram.trim() || undefined,
            instagram: instagram.trim() || undefined,
            contactPreferences: contactPreferences.length > 0 ? contactPreferences : undefined,
            address: fullAddress || undefined,
            addressStreet: addressStreet.trim() || undefined,
            addressCity: addressCity.trim() || undefined,
            addressState: addressState.trim() || undefined,
            addressZip: addressZip.trim() || undefined,
            addressCountry: addressCountry.trim() || undefined,
            addressLat: addressLat,
            addressLng: addressLng,
            notes: notes.trim() || undefined,
            isFavorite,
            connectedWith: connectedWith.length > 0 ? connectedWith.join(",") : undefined,
            avatarUrl: avatarUrl || undefined,
        });

        if (result.success) {
            router.push("/contacts");
        } else {
            setError(result.error || "Failed to add contact");
            setIsSaving(false);
        }
    };

    return (
        <>
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

            <AppShell>
                {/* Back Link */}
                <Link
                href="/contacts"
                className="inline-flex items-center gap-1 text-sm text-textSub hover:text-forest transition-colors mb-4"
            >
                ← Contacts
            </Link>

            <h1 className="font-dmSerif text-2xl text-forest mb-6">Add New Contact</h1>

            <form onSubmit={handleSubmit}>
                {/* Two-column layout on desktop */}
                <div className="lg:flex lg:gap-6">
                    {/* LEFT COLUMN */}
                    <div className="lg:w-1/2 space-y-4">
                        {/* Identity Card */}
                        <div className="bg-white rounded-2xl p-5 border border-border">
                            <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-4">
                                Contact Identity
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Avatar Upload */}
                                <div className="flex flex-col items-center sm:items-start gap-1">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={handlePhotoClick}
                                            disabled={isUploading}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center border-2 border-dashed flex-shrink-0 cursor-pointer transition-colors overflow-hidden ${
                                                photoPreview
                                                    ? "border-transparent"
                                                    : "border-border bg-softGreen hover:border-teal"
                                            } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            {isUploading ? (
                                                <div className="animate-spin w-6 h-6 border-2 border-forest border-t-transparent rounded-full" />
                                            ) : photoPreview ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={photoPreview}
                                                    alt="Contact photo"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <svg
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    className="text-textSub"
                                                >
                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                    <circle cx="12" cy="13" r="4" />
                                                </svg>
                                            )}
                                        </button>
                                        {photoPreview && !isUploading && (
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                            >
                                                ×
                                            </button>
                                        )}
                                        {/* Camera icon badge */}
                                        {!isUploading && (
                                            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 border-2 border-forest shadow-md">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                    <circle cx="12" cy="13" r="4" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    {isUploading && (
                                        <span className="text-xs text-textSub">Uploading...</span>
                                    )}
                                </div>

                                {/* Name and Role inputs */}
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-forest mb-1">
                                            Name <span className="text-terracotta">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Contact name"
                                            className="w-full h-11 px-4 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-forest mb-1">
                                            Role
                                        </label>
                                        <input
                                            type="text"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            placeholder="e.g., Pediatrician"
                                            className="w-full h-11 px-4 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Category Card */}
                        <div className="bg-white rounded-2xl p-5 border border-border">
                            <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-4">
                                Category
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                            category === cat.value
                                                ? "bg-forest text-white"
                                                : "bg-white border border-border text-forest hover:border-forest"
                                        }`}
                                    >
                                        {cat.emoji} {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Connected With Card */}
                        <div className="bg-white rounded-2xl p-5 border border-border">
                            <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-4">
                                Connected With
                            </h3>
                            <MobileMultiSelect
                                values={connectedWith}
                                onChange={setConnectedWith}
                                options={caregiverOptions}
                                allOption={allOption}
                                placeholder="Select caregivers..."
                                title="Connected with"
                            />
                            <p className="text-xs text-textSub mt-2">
                                Who usually communicates with this contact?
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:w-1/2 space-y-4 mt-4 lg:mt-0">
                        {/* Contact Info Card */}
                        <div className="bg-white rounded-2xl p-5 border border-border">
                            <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-4">
                                Contact Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-2">
                                        Phone numbers
                                    </label>
                                    <PhoneNumbersInput
                                        phoneNumbers={phoneNumbers}
                                        onChange={setPhoneNumbers}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full h-11 px-4 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact Preferences Card */}
                        <div className="bg-white rounded-2xl p-5 border border-border">
                            <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-4">
                                Preferred ways to contact
                            </h3>
                            <ContactPreferencesSelector
                                selectedMethods={contactPreferences}
                                onMethodsChange={setContactPreferences}
                                phone={phoneNumbers[0]?.number || ""}
                                email={email}
                                telegram={telegram}
                                instagram={instagram}
                                onTelegramChange={setTelegram}
                                onInstagramChange={setInstagram}
                            />
                        </div>

                        {/* Address Card */}
                        <div className="bg-white rounded-2xl p-5 border border-border">
                            <h3 className="text-xs font-semibold text-textSub uppercase tracking-wider mb-4">
                                Address
                            </h3>
                            <GooglePlacesAutocomplete
                                onAddressSelect={handleAddressSelect}
                                initialAddress={{
                                    street: addressStreet,
                                    city: addressCity,
                                    state: addressState,
                                    zip: addressZip,
                                    country: addressCountry,
                                    lat: addressLat,
                                    lng: addressLng,
                                }}
                                placeholder="Search address..."
                            />
                        </div>
                    </div>
                </div>

                {/* FULL-WIDTH BOTTOM SECTION */}
                <div className="space-y-4 mt-4">
                    {/* Notes Card */}
                    <div className="bg-white rounded-2xl p-5 border border-border">
                        <label className="block text-sm font-semibold text-forest mb-2">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional information..."
                            rows={2}
                            className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest resize-none"
                        />
                    </div>

                    {/* Favorite Toggle */}
                    <div className="flex items-center justify-between px-4 py-3 bg-amber-50 rounded-xl">
                        <span className="text-sm font-semibold text-forest flex items-center gap-2">
                            <span className="text-amber-500">⭐</span> Mark as favorite
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsFavorite(!isFavorite)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                isFavorite ? "bg-terracotta" : "bg-gray-300"
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    isFavorite ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                        </button>
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
                        className="w-full py-4 bg-forest text-white rounded-xl font-bold text-sm hover:bg-forest/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "Saving..." : "Add Contact"}
                    </button>
                </div>
            </form>
            </AppShell>
        </>
    );
}
