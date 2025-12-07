"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, FEATURES } from "@/lib/supabase";

export type ContactCategory = "medical" | "school" | "family" | "friends" | "activities" | "other";

export interface Contact {
    id: string;
    name: string;
    role: string; // e.g., "Pediatrician", "Teacher", "Grandma"
    category: ContactCategory;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    isFavorite: boolean;
    connectedWith?: string; // caregiverId, "both", or "all"
    createdAt: string;
}

interface ContactsContextType {
    contacts: Contact[];
    isLoaded: boolean;
    addContact: (contact: Omit<Contact, "id" | "createdAt">) => Promise<{ success: boolean; error?: string }>;
    updateContact: (id: string, updates: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
    deleteContact: (id: string) => Promise<{ success: boolean; error?: string }>;
    toggleFavorite: (id: string) => Promise<void>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export function ContactsProvider({ children }: { children: ReactNode }) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchContacts = async () => {
            // Skip if contacts feature is disabled
            if (!FEATURES.CONTACTS) {
                if (isMounted) {
                    setContacts([]);
                    setIsLoaded(true);
                }
                return;
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;

                if (!user) {
                    if (isMounted) {
                        setContacts([]);
                        setIsLoaded(true);
                    }
                    return;
                }

                // Get user's family
                const { data: familyMember, error: familyError } = await supabase
                    .from("family_members")
                    .select("family_id")
                    .eq("user_id", user.id)
                    .maybeSingle();

                // Silently ignore family fetch errors (RLS or table issues)
                if (familyError || !familyMember) {
                    if (isMounted) {
                        setContacts([]);
                    }
                    return;
                }

                const familyId = familyMember.family_id;

                // Fetch contacts for this family
                const { data: contactsData, error } = await supabase
                    .from("contacts")
                    .select("*")
                    .eq("family_id", familyId)
                    .order("is_favorite", { ascending: false })
                    .order("name", { ascending: true });

                // Silently handle errors - table might not exist yet
                if (error) {
                    if (isMounted) {
                        setContacts([]);
                    }
                } else if (contactsData && isMounted) {
                    const mappedContacts: Contact[] = contactsData.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        role: c.role || "",
                        category: c.category || "other",
                        phone: c.phone,
                        email: c.email,
                        address: c.address,
                        notes: c.notes,
                        isFavorite: c.is_favorite || false,
                        connectedWith: c.connected_with,
                        createdAt: c.created_at,
                    }));
                    setContacts(mappedContacts);
                }
            } catch (error) {
                // Silently handle errors
            } finally {
                if (isMounted) {
                    setIsLoaded(true);
                }
            }
        };

        fetchContacts();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            if (isMounted) {
                setIsLoaded(false);
                fetchContacts();
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const addContact = async (contact: Omit<Contact, "id" | "createdAt">): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: "Not authenticated" };

            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .single();

            if (!familyMember) return { success: false, error: "No family found" };

            const { data, error } = await supabase
                .from("contacts")
                .insert({
                    family_id: familyMember.family_id,
                    name: contact.name,
                    role: contact.role,
                    category: contact.category,
                    phone: contact.phone || null,
                    email: contact.email || null,
                    address: contact.address || null,
                    notes: contact.notes || null,
                    is_favorite: contact.isFavorite,
                    connected_with: contact.connectedWith || null,
                })
                .select()
                .single();

            if (error) {
                console.error("Error adding contact:", error);
                return { success: false, error: error.message };
            }

            // Optimistically update local state
            const newContact: Contact = {
                id: data.id,
                name: data.name,
                role: data.role || "",
                category: data.category || "other",
                phone: data.phone,
                email: data.email,
                address: data.address,
                notes: data.notes,
                isFavorite: data.is_favorite || false,
                connectedWith: data.connected_with,
                createdAt: data.created_at,
            };
            setContacts((prev) => [...prev, newContact]);

            return { success: true };
        } catch (error) {
            console.error("Failed to add contact:", error);
            return { success: false, error: "Failed to add contact" };
        }
    };

    const updateContact = async (id: string, updates: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
        // Optimistically update local state
        setContacts((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );

        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.role !== undefined) dbUpdates.role = updates.role;
            if (updates.category !== undefined) dbUpdates.category = updates.category;
            if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
            if (updates.email !== undefined) dbUpdates.email = updates.email || null;
            if (updates.address !== undefined) dbUpdates.address = updates.address || null;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
            if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
            if (updates.connectedWith !== undefined) dbUpdates.connected_with = updates.connectedWith || null;

            const { error } = await supabase
                .from("contacts")
                .update(dbUpdates)
                .eq("id", id);

            if (error) {
                console.error("Error updating contact:", error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error("Failed to update contact:", error);
            return { success: false, error: "Failed to update contact" };
        }
    };

    const deleteContact = async (id: string): Promise<{ success: boolean; error?: string }> => {
        const previousContacts = contacts;
        // Optimistically remove from local state
        setContacts((prev) => prev.filter((c) => c.id !== id));

        try {
            const { error } = await supabase
                .from("contacts")
                .delete()
                .eq("id", id);

            if (error) {
                // Rollback
                setContacts(previousContacts);
                console.error("Error deleting contact:", error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            setContacts(previousContacts);
            console.error("Failed to delete contact:", error);
            return { success: false, error: "Failed to delete contact" };
        }
    };

    const toggleFavorite = async (id: string) => {
        const contact = contacts.find((c) => c.id === id);
        if (contact) {
            await updateContact(id, { isFavorite: !contact.isFavorite });
        }
    };

    return (
        <ContactsContext.Provider
            value={{
                contacts,
                isLoaded,
                addContact,
                updateContact,
                deleteContact,
                toggleFavorite,
            }}
        >
            {children}
        </ContactsContext.Provider>
    );
}

export function useContacts() {
    const context = useContext(ContactsContext);
    if (context === undefined) {
        throw new Error("useContacts must be used within a ContactsProvider");
    }
    return context;
}
