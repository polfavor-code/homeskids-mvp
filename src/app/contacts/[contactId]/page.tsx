"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/Avatar";
import MobileMultiSelect from "@/components/MobileMultiSelect";
import PhoneNumbersInput from "@/components/PhoneNumbersInput";
import ContactPreferencesSelector from "@/components/ContactPreferencesSelector";
import { ContactActions } from "@/components/ContactPreferenceIcons";
import { useContacts, Contact, ContactCategory, ContactMethod, PhoneNumber } from "@/lib/ContactsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";

const CATEGORIES: { value: ContactCategory; label: string }[] = [
    { value: "medical", label: "Medical" },
    { value: "school", label: "School" },
    { value: "family", label: "Family" },
    { value: "friends", label: "Friends" },
    { value: "activities", label: "Activities" },
    { value: "other", label: "Other" },
];

export default function ContactDetailPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const params = useParams();
    const contactId = params.contactId as string;
    const { contacts, isLoaded, updateContact, deleteContact, toggleFavorite } = useContacts();
    const { caregivers } = useAppState();

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [category, setCategory] = useState<ContactCategory>("other");
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [email, setEmail] = useState("");
    const [telegram, setTelegram] = useState("");
    const [instagram, setInstagram] = useState("");
    const [contactPreferences, setContactPreferences] = useState<ContactMethod[]>([]);
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [connectedWith, setConnectedWith] = useState<string[]>([]);

    // Caregiver options for MobileMultiSelect
    const caregiverOptions = caregivers.map((caregiver) => ({
        value: caregiver.id,
        label: caregiver.label || caregiver.name,
    }));

    // "All caregivers" option
    const allOption = {
        value: "all",
        label: caregivers.length > 2 ? "All caregivers" : "Both sides",
    };

    // Helper to parse stored connectedWith string to array
    const parseConnectedWith = (value?: string): string[] => {
        if (!value) return [];
        // Handle legacy "both" and "all" values by converting to all caregiver IDs
        if (value === "both" || value === "all") {
            return caregivers.map(c => c.id);
        }
        // Handle comma-separated IDs
        return value.split(",").filter(Boolean);
    };

    // Helper to get the connected with display text for view mode
    const getConnectedWithLabel = (value?: string): string | null => {
        if (!value) return null;
        // Handle legacy values
        if (value === "both") return "Both sides";
        if (value === "all") return "All caregivers";
        // Handle comma-separated IDs
        const ids = value.split(",").filter(Boolean);
        if (ids.length === 0) return null;
        // Check if all caregivers are selected
        const allIds = caregivers.map(c => c.id);
        if (allIds.every(id => ids.includes(id))) {
            return caregivers.length > 2 ? "All caregivers" : "Both sides";
        }
        // Get names for selected caregivers
        const names = ids
            .map(id => {
                const caregiver = caregivers.find(c => c.id === id);
                return caregiver ? (caregiver.label || caregiver.name) : null;
            })
            .filter(Boolean);
        if (names.length === 0) return null;
        if (names.length <= 2) return names.join(", ");
        return `${names.length} caregivers`;
    };

    const contact = contacts.find((c) => c.id === contactId);

    // Initialize form when contact loads
    useEffect(() => {
        if (contact) {
            setName(contact.name);
            setRole(contact.role || "");
            setCategory(contact.category);
            // Initialize phoneNumbers from contact
            if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                setPhoneNumbers(contact.phoneNumbers);
            } else if (contact.phone) {
                // Migrate legacy single phone
                setPhoneNumbers([{
                    id: "legacy-1",
                    number: contact.phone,
                    countryCode: contact.phoneCountryCode || "+1",
                    type: "mobile",
                }]);
            } else {
                setPhoneNumbers([]);
            }
            setEmail(contact.email || "");
            setTelegram(contact.telegram || "");
            setInstagram(contact.instagram || "");
            setContactPreferences(contact.contactPreferences || []);
            setAddress(contact.address || "");
            setNotes(contact.notes || "");
            setConnectedWith(parseConnectedWith(contact.connectedWith));
        }
    }, [contact, caregivers]);

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        setIsSaving(true);
        setError(null);

        // Filter out empty phone numbers
        const validPhoneNumbers = phoneNumbers.filter(p => p.number.trim());

        const result = await updateContact(contactId, {
            name: name.trim(),
            role: role.trim(),
            category,
            phoneNumbers: validPhoneNumbers,
            email: email.trim() || undefined,
            telegram: telegram.trim() || undefined,
            instagram: instagram.trim() || undefined,
            contactPreferences: contactPreferences.length > 0 ? contactPreferences : undefined,
            address: address.trim() || undefined,
            notes: notes.trim() || undefined,
            connectedWith: connectedWith.length > 0 ? connectedWith.join(",") : undefined,
        });

        if (result.success) {
            setIsEditing(false);
        } else {
            setError(result.error || "Failed to update contact");
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteContact(contactId);
        if (result.success) {
            router.push("/contacts");
        } else {
            setError(result.error || "Failed to delete contact");
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleToggleFavorite = async () => {
        await toggleFavorite(contactId);
    };

    const getCategoryColor = (cat: ContactCategory) => {
        switch (cat) {
            case "medical":
                return "bg-red-50 text-red-700";
            case "school":
                return "bg-blue-50 text-blue-700";
            case "family":
                return "bg-purple-50 text-purple-700";
            case "activities":
                return "bg-green-50 text-green-700";
            default:
                return "bg-gray-50 text-gray-700";
        }
    };

    if (!isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-textSub">Loading...</div>
                </div>
            </AppShell>
        );
    }

    if (!contact) {
        return (
            <AppShell>
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-border">
                    <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                        ?
                    </div>
                    <h3 className="font-bold text-forest mb-2">Contact not found</h3>
                    <p className="text-sm text-textSub mb-4">
                        This contact may have been deleted.
                    </p>
                    <Link
                        href="/contacts"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl font-medium hover:bg-teal transition-colors"
                    >
                        ← Back to contacts
                    </Link>
                </div>
            </AppShell>
        );
    }

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

            {/* Header with Avatar */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-border mb-4">
                <div className="flex items-start gap-4">
                    {/* Large Avatar */}
                    <Avatar
                        storagePath={contact.avatarUrl}
                        initial={contact.name.charAt(0).toUpperCase()}
                        size={64}
                        bgColor="#F5F5DC"
                    />

                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full font-dmSerif text-xl text-forest border-b border-border focus:outline-none focus:border-forest pb-1"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="font-dmSerif text-xl text-forest truncate">
                                    {contact.name}
                                </h1>
                                <button
                                    onClick={handleToggleFavorite}
                                    className="text-xl hover:scale-110 transition-transform"
                                    title={contact.isFavorite ? "Remove from favorites" : "Add to favorites"}
                                >
                                    {contact.isFavorite ? "★" : "☆"}
                                </button>
                            </div>
                        )}

                        {isEditing ? (
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="Role / Title"
                                className="w-full text-sm text-textSub border-b border-border focus:outline-none focus:border-forest pb-1 mt-2"
                            />
                        ) : (
                            contact.role && (
                                <p className="text-sm text-textSub">{contact.role}</p>
                            )
                        )}

                        {isEditing ? (
                            <div className="flex gap-2 mt-3 flex-wrap">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            category === cat.value
                                                ? "bg-forest text-white"
                                                : "bg-cream text-forest hover:bg-cream/70"
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <span
                                className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getCategoryColor(
                                    contact.category
                                )}`}
                            >
                                {contact.category}
                            </span>
                        )}
                    </div>

                    {/* Edit/Save Button */}
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 text-sm font-medium text-forest hover:bg-cream rounded-lg transition-colors"
                        >
                            Edit
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    // Reset form
                                    setName(contact.name);
                                    setRole(contact.role || "");
                                    setCategory(contact.category);
                                    // Reset phoneNumbers
                                    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                                        setPhoneNumbers(contact.phoneNumbers);
                                    } else if (contact.phone) {
                                        setPhoneNumbers([{
                                            id: "legacy-1",
                                            number: contact.phone,
                                            countryCode: contact.phoneCountryCode || "+1",
                                            type: "mobile",
                                        }]);
                                    } else {
                                        setPhoneNumbers([]);
                                    }
                                    setEmail(contact.email || "");
                                    setTelegram(contact.telegram || "");
                                    setInstagram(contact.instagram || "");
                                    setContactPreferences(contact.contactPreferences || []);
                                    setAddress(contact.address || "");
                                    setNotes(contact.notes || "");
                                    setConnectedWith(parseConnectedWith(contact.connectedWith));
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-textSub hover:bg-cream rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-3 py-1.5 text-sm font-medium bg-forest text-white rounded-lg hover:bg-teal transition-colors disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions - Show preference-based actions or fallback to phone/email */}
            {!isEditing && (
                <div className="mb-4">
                    {contact.contactPreferences && contact.contactPreferences.length > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                            <ContactActions
                                preferences={contact.contactPreferences}
                                phone={contact.phone}
                                phoneCountryCode={contact.phoneCountryCode}
                                email={contact.email}
                                telegram={contact.telegram}
                                instagram={contact.instagram}
                                size="lg"
                            />
                        </div>
                    ) : (contact.phone || contact.email) ? (
                        <div className="flex gap-2">
                            {contact.phone && (
                                <a
                                    href={`tel:${contact.phoneCountryCode || ''}${contact.phone}`}
                                    className="flex-1 py-3 bg-softGreen text-forest rounded-xl font-medium text-center hover:bg-forest hover:text-white transition-colors"
                                >
                                    Call
                                </a>
                            )}
                            {contact.email && (
                                <a
                                    href={`mailto:${contact.email}`}
                                    className="flex-1 py-3 bg-cream text-forest rounded-xl font-medium text-center hover:bg-forest hover:text-white transition-colors"
                                >
                                    Email
                                </a>
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            {/* Contact Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                {/* Phone Numbers */}
                <div className="p-4 border-b border-border/50">
                    <label className="block text-xs text-textSub mb-2">Phone</label>
                    {isEditing ? (
                        <PhoneNumbersInput
                            phoneNumbers={phoneNumbers}
                            onChange={setPhoneNumbers}
                        />
                    ) : (
                        <div className="space-y-1">
                            {contact.phoneNumbers && contact.phoneNumbers.length > 0 ? (
                                contact.phoneNumbers.map((phone, idx) => (
                                    <div key={phone.id || idx} className="flex items-center gap-2">
                                        <span className="text-xs text-textSub capitalize">{phone.type}:</span>
                                        <a 
                                            href={`tel:${phone.countryCode}${phone.number}`}
                                            className="text-sm text-forest hover:text-teal"
                                        >
                                            {phone.countryCode} {phone.number}
                                        </a>
                                    </div>
                                ))
                            ) : contact.phone ? (
                                <a 
                                    href={`tel:${contact.phoneCountryCode || ''}${contact.phone}`}
                                    className="text-sm text-forest hover:text-teal"
                                >
                                    {contact.phoneCountryCode || ''} {contact.phone}
                                </a>
                            ) : (
                                <span className="text-sm text-textSub/50">Not provided</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Email */}
                <div className="p-4 border-b border-border/50">
                    <label className="block text-xs text-textSub mb-1">Email</label>
                    {isEditing ? (
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Add email address"
                            className="w-full text-sm text-forest focus:outline-none"
                        />
                    ) : (
                        <p className="text-sm text-forest">
                            {contact.email || <span className="text-textSub/50">Not provided</span>}
                        </p>
                    )}
                </div>

                {/* Contact Preferences */}
                <div className="p-4 border-b border-border/50">
                    <label className="block text-xs text-textSub mb-2">Preferred ways to contact</label>
                    {isEditing ? (
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
                    ) : (
                        <div>
                            {contact.contactPreferences && contact.contactPreferences.length > 0 ? (
                                <ContactActions
                                    preferences={contact.contactPreferences}
                                    phone={contact.phone}
                                    phoneCountryCode={contact.phoneCountryCode}
                                    email={contact.email}
                                    telegram={contact.telegram}
                                    instagram={contact.instagram}
                                    size="md"
                                />
                            ) : (
                                <span className="text-sm text-textSub/50">No preference</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Address */}
                <div className="p-4 border-b border-border/50">
                    <label className="block text-xs text-textSub mb-1">Address</label>
                    {isEditing ? (
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Add address"
                            rows={2}
                            className="w-full text-sm text-forest focus:outline-none resize-none"
                        />
                    ) : (
                        <p className="text-sm text-forest whitespace-pre-line">
                            {contact.address || <span className="text-textSub/50">Not provided</span>}
                        </p>
                    )}
                </div>

                {/* Notes */}
                <div className="p-4 border-b border-border/50">
                    <label className="block text-xs text-textSub mb-1">Notes</label>
                    {isEditing ? (
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes"
                            rows={3}
                            className="w-full text-sm text-forest focus:outline-none resize-none"
                        />
                    ) : (
                        <p className="text-sm text-forest whitespace-pre-line">
                            {contact.notes || <span className="text-textSub/50">No notes</span>}
                        </p>
                    )}
                </div>

                {/* Connected With */}
                <div className="p-4">
                    <label className="block text-xs text-textSub mb-1">Connected with</label>
                    {isEditing ? (
                        <MobileMultiSelect
                            values={connectedWith}
                            onChange={setConnectedWith}
                            options={caregiverOptions}
                            allOption={allOption}
                            placeholder="Select caregivers..."
                            title="Connected with"
                        />
                    ) : (
                        <p className="text-sm text-forest">
                            {getConnectedWithLabel(contact.connectedWith) || <span className="text-textSub/50">Not specified</span>}
                        </p>
                    )}
                </div>
            </div>

            {/* Added by - subtle footer */}
            {!isEditing && contact.createdByName && (
                <p className="text-xs text-textSub/50 text-center mt-4">
                    Added by {contact.createdByName}
                </p>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mt-4">
                    {error}
                </div>
            )}

            {/* Delete Button */}
            {!isEditing && (
                <div className="mt-6">
                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
                        >
                            Delete Contact
                        </button>
                    ) : (
                        <div className="bg-red-50 rounded-xl p-4">
                            <p className="text-sm text-red-700 mb-3">
                                Are you sure you want to delete this contact? This cannot be undone.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 bg-white text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AppShell>
    );
}
