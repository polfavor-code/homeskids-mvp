"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useContacts } from "@/lib/ContactsContextV2";
import { useAppState } from "@/lib/AppStateContextV2";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { MedicalIcon } from "@/components/icons/DuotoneIcons";

export default function MedicalContactsPage() {
    useEnsureOnboarding();

    const { contacts, isLoaded, toggleFavorite } = useContacts();
    const { child } = useAppState();

    // Filter to medical contacts only
    const medicalContacts = contacts.filter((c) => c.category === "medical");

    // Sort: favorites first, then alphabetically
    const sortedContacts = [...medicalContacts].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
    });

    if (!isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-textSub">Loading...</div>
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
                    ← All contacts
                </Link>
            </div>

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                            <MedicalIcon size={20} className="text-red-600" />
                        </div>
                        <div>
                            <h1 className="font-dmSerif text-xl text-forest">
                                Medical Contacts
                            </h1>
                            <p className="text-sm text-textSub">
                                Doctors, dentists, and healthcare providers
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/contacts/new"
                        className="flex items-center gap-1.5 px-3 py-2 bg-forest text-white rounded-xl text-sm font-medium hover:bg-teal transition-colors"
                    >
                        + Add
                    </Link>
                </div>
            </div>

            {/* Contact List */}
            <div className="space-y-2">
                {sortedContacts.map((contact) => (
                    <Link
                        key={contact.id}
                        href={`/contacts/${contact.id}`}
                        className="block bg-white rounded-xl p-4 shadow-sm border border-border hover:border-red-200 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {/* Avatar / Initial */}
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-700 font-bold flex-shrink-0">
                                {contact.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-forest">
                                        {contact.name}
                                    </h3>
                                    {contact.isFavorite && (
                                        <span className="text-yellow-500 text-sm">★</span>
                                    )}
                                </div>
                                {contact.role && (
                                    <p className="text-sm text-textSub">{contact.role}</p>
                                )}
                                {contact.notes && (
                                    <p className="text-xs text-textSub/70 mt-1 truncate">
                                        {contact.notes}
                                    </p>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-1 flex-shrink-0">
                                {contact.phone && (
                                    <a
                                        href={`tel:${contact.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                        title="Call"
                                    >
                                        <PhoneIcon />
                                    </a>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}

                {sortedContacts.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-border">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MedicalIcon size={32} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-forest mb-2">No medical contacts</h3>
                        <p className="text-sm text-textSub max-w-xs mx-auto mb-4">
                            Add {child?.name || "your child"}&apos;s doctors, dentists, and other healthcare providers.
                        </p>
                        <Link
                            href="/contacts/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl font-medium hover:bg-teal transition-colors"
                        >
                            + Add medical contact
                        </Link>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

function PhoneIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}
