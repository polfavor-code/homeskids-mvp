"use client";

import React, { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useContacts, ContactCategory, Contact } from "@/lib/ContactsContext";
import { useAppState, CaregiverProfile } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { MedicalIcon, SchoolIcon, ContactsIcon, FamilyIcon, FriendsIcon, ActivitiesIcon, OtherIcon, GridIcon } from "@/components/icons/DuotoneIcons";

const CATEGORIES: { value: ContactCategory | "all"; label: string; icon?: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <GridIcon size={14} /> },
    { value: "medical", label: "Medical", icon: <MedicalIcon size={14} /> },
    { value: "school", label: "School", icon: <SchoolIcon size={14} /> },
    { value: "family", label: "Family", icon: <FamilyIcon size={14} /> },
    { value: "friends", label: "Friends", icon: <FriendsIcon size={14} /> },
    { value: "activities", label: "Activities", icon: <ActivitiesIcon size={14} /> },
    { value: "other", label: "Other", icon: <OtherIcon size={14} /> },
];

function ContactsPageContent() {
    useEnsureOnboarding();

    const { contacts, isLoaded, toggleFavorite } = useContacts();
    const { child, caregivers } = useAppState();
    const searchParams = useSearchParams();
    const [filter, setFilter] = useState<ContactCategory | "all">("all");

    console.log("[ContactsPage] contacts:", contacts.length, "isLoaded:", isLoaded);

    // Helper to get the connected with display text
    const getConnectedWithLabel = (contact: Contact): string | null => {
        if (!contact.connectedWith) return null;

        if (contact.connectedWith === "both") {
            return "Both sides";
        }
        if (contact.connectedWith === "all") {
            return "All caregivers";
        }

        // Find the caregiver by ID
        const caregiver = caregivers.find(c => c.id === contact.connectedWith);
        return caregiver ? (caregiver.label || caregiver.name) : null;
    };

    // Filter contacts
    const filteredContacts = contacts.filter((contact) => {
        if (filter === "all") return true;
        return contact.category === filter;
    });

    // Sort: favorites first, then alphabetically
    const sortedContacts = [...filteredContacts].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
    });

    const getCategoryColor = (category: ContactCategory) => {
        switch (category) {
            case "medical":
                return "bg-red-50 text-red-700";
            case "school":
                return "bg-blue-50 text-blue-700";
            case "family":
                return "bg-purple-50 text-purple-700";
            case "friends":
                return "bg-amber-50 text-amber-700";
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
                    <div className="animate-pulse text-textSub">Loading contacts...</div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-dmSerif text-2xl text-forest mt-2">
                            {child?.name || "Child"}&apos;s Contacts
                        </h1>
                        <p className="text-sm text-textSub mt-1">
                            Important people shared between both homes.
                        </p>
                    </div>
                    <Link
                        href="/contacts/new"
                        className="flex items-center gap-1.5 px-3 py-2 bg-forest text-white rounded-xl text-sm font-medium hover:bg-teal transition-colors"
                    >
                        + Add contact
                    </Link>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 flex-wrap mb-4">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.value}
                        onClick={() => setFilter(cat.value)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            filter === cat.value
                                ? "bg-forest text-white"
                                : "bg-white border border-border text-textSub hover:border-forest/30"
                        }`}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Contact List */}
            <div className="space-y-2">
                {sortedContacts.map((contact) => (
                    <div
                        key={contact.id}
                        className="bg-white rounded-xl p-3 shadow-sm border border-border hover:border-forest/20 transition-colors overflow-hidden"
                    >
                        <div className="flex items-center gap-3">
                            {/* Avatar / Initial - Clickable */}
                            <Link href={`/contacts/${contact.id}`} className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-forest font-bold text-sm flex-shrink-0 hover:bg-forest hover:text-white transition-colors">
                                {contact.name.charAt(0).toUpperCase()}
                            </Link>

                            {/* Info - Clickable */}
                            <Link href={`/contacts/${contact.id}`} className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="font-medium text-forest truncate hover:text-teal transition-colors min-w-0">
                                        {contact.name}
                                    </h3>
                                    {contact.isFavorite && (
                                        <span className="text-yellow-500 text-sm flex-shrink-0">★</span>
                                    )}
                                </div>
                                <p className="text-xs text-textSub truncate">
                                    {contact.role}
                                    {getConnectedWithLabel(contact) && (
                                        <span className="text-textSub/60"> • {getConnectedWithLabel(contact)}</span>
                                    )}
                                </p>
                            </Link>

                            {/* Category Badge */}
                            <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize flex-shrink-0 ${getCategoryColor(
                                    contact.category
                                )}`}
                            >
                                {contact.category}
                            </span>

                            {/* Quick Actions */}
                            <div className="flex gap-1 flex-shrink-0">
                                {contact.phone && (
                                    <a
                                        href={`tel:${contact.phoneCountryCode || ''}${contact.phone}`}
                                        className="w-8 h-8 rounded-full bg-softGreen flex items-center justify-center text-forest hover:bg-forest hover:text-white transition-colors"
                                        title="Call"
                                    >
                                        <PhoneIcon />
                                    </a>
                                )}
                                {contact.email && (
                                    <a
                                        href={`mailto:${contact.email}`}
                                        className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-forest hover:bg-forest hover:text-white transition-colors"
                                        title="Email"
                                    >
                                        <EmailIcon />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {sortedContacts.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-border">
                        <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-4">
                            <ContactsIcon size={32} className="text-forest" />
                        </div>
                        <h3 className="font-bold text-forest mb-2">
                            {filter === "all"
                                ? "No contacts yet"
                                : `No ${filter} contacts`}
                        </h3>
                        <p className="text-sm text-textSub max-w-xs mx-auto mb-4">
                            Add teachers, doctors, family members and other important contacts for {child?.name || "your child"}.
                        </p>
                        <Link
                            href="/contacts/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl font-medium hover:bg-teal transition-colors"
                        >
                            + Add a contact
                        </Link>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

// Simple inline icons
function PhoneIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

function EmailIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    );
}

export default function ContactsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ContactsPageContent />
        </Suspense>
    );
}
