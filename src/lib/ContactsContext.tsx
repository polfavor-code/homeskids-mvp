"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, FEATURES } from "@/lib/supabase";
import { useAppState } from "@/lib/AppStateContext";

// ==============================================
// V2 CONTACTS CONTEXT
// ==============================================
// In V2, there are two types of contacts:
// 1. child_space_contacts: "People you can contact here" per home (linked to profiles)
//    - NOT about legal responsibility, just reachability
//    - Someone can be contactable even if they are not a caregiver
//    - Being contactable does not grant any permissions
// 2. contacts: General contacts like doctors, schools (legacy, per child)
//
// This context supports both for backward compatibility.

export type ContactCategory = "medical" | "school" | "family" | "friends" | "activities" | "other";

// Contact preference methods - how this contact prefers to be reached
export type ContactMethod = "whatsapp" | "phone" | "sms" | "email" | "telegram" | "instagram" | "signal";

// Phone number type for multiple phone support
export type PhoneType = "mobile" | "home" | "work" | "other";

export interface PhoneNumber {
    id: string;
    number: string;
    countryCode: string;
    type: PhoneType;
}

// Legacy contact type (general contacts like doctors, schools)
export interface Contact {
    id: string;
    childId?: string; // Which child this contact belongs to
    name: string;
    role: string;
    category: ContactCategory;
    // Legacy single phone - kept for backward compatibility
    phone?: string;
    phoneCountryCode?: string;
    // New: Multiple phone numbers
    phoneNumbers?: PhoneNumber[];
    email?: string;
    telegram?: string;
    instagram?: string;
    contactPreferences?: ContactMethod[]; // Preferred contact methods
    address?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
    addressCountry?: string;
    addressLat?: number;
    addressLng?: number;
    notes?: string;
    isFavorite: boolean;
    connectedWith?: string;
    avatarUrl?: string;
    createdAt: string;
    // Who added this contact
    createdByUserId?: string;
    createdByName?: string;
}

// V2: Home contact - "People you can contact here" (linked to a profile)
// Renamed from "ResponsibleAdult" to clarify this is about reachability, not responsibility
export interface HomeContact {
    id: string;
    childSpaceId: string;
    userId: string;
    // Profile data
    name: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    avatarUrl?: string;
    avatarInitials?: string;
    avatarColor?: string;
    // Privacy controls
    sharePhone: boolean;
    shareEmail: boolean;
    shareWhatsapp: boolean;
    shareNote: boolean;
    note?: string;
    isActive: boolean;
}

// Backward compatibility alias
export type ResponsibleAdult = HomeContact;

interface ContactsContextType {
    // Legacy contacts (doctors, schools, etc.)
    contacts: Contact[];
    // V2: Home contacts - "People you can contact here" per home
    homeContacts: HomeContact[];
    // @deprecated - use homeContacts instead
    responsibleAdults: HomeContact[];
    isLoaded: boolean;
    // Legacy operations
    // Optional targetChildId parameter allows creating contact for a specific child
    addContact: (contact: Omit<Contact, "id" | "createdAt">, targetChildId?: string) => Promise<{ success: boolean; error?: string }>;
    updateContact: (id: string, updates: Partial<Contact>) => Promise<{ success: boolean; error?: string }>;
    deleteContact: (id: string) => Promise<{ success: boolean; error?: string }>;
    toggleFavorite: (id: string) => Promise<void>;
    // V2 operations - new naming
    getHomeContactsForChildSpace: (childSpaceId: string) => HomeContact[];
    addHomeContact: (childSpaceId: string, userId: string, options?: { sharePhone?: boolean; shareEmail?: boolean; shareWhatsapp?: boolean; note?: string }) => Promise<{ success: boolean; error?: string }>;
    updateHomeContact: (id: string, updates: Partial<Pick<HomeContact, "sharePhone" | "shareEmail" | "shareWhatsapp" | "shareNote" | "note" | "isActive">>) => Promise<{ success: boolean; error?: string }>;
    removeHomeContact: (id: string) => Promise<{ success: boolean; error?: string }>;
    // @deprecated - use new naming above
    getResponsibleAdultsForChildSpace: (childSpaceId: string) => HomeContact[];
    addResponsibleAdult: (childSpaceId: string, userId: string, options?: { sharePhone?: boolean; shareEmail?: boolean; shareWhatsapp?: boolean; note?: string }) => Promise<{ success: boolean; error?: string }>;
    updateResponsibleAdult: (id: string, updates: Partial<Pick<HomeContact, "sharePhone" | "shareEmail" | "shareWhatsapp" | "shareNote" | "note" | "isActive">>) => Promise<{ success: boolean; error?: string }>;
    removeResponsibleAdult: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export function ContactsProvider({ children }: { children: ReactNode }) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [homeContacts, setHomeContacts] = useState<HomeContact[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [childId, setChildId] = useState<string | null>(null);
    const [childSpaceIds, setChildSpaceIds] = useState<string[]>([]);
    
    // Get current child from AppState - contacts should sync with selected child
    const { currentChildId } = useAppState();

    useEffect(() => {
        let isMounted = true;

        const fetchContacts = async () => {
            if (!FEATURES.CONTACTS) {
                if (isMounted) {
                    setContacts([]);
                    setHomeContacts([]);
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
                        setHomeContacts([]);
                        setIsLoaded(true);
                    }
                    return;
                }

                // V2: Get children this user has access to
                const { data: childAccess } = await supabase
                    .from("child_access")
                    .select("child_id")
                    .eq("user_id", user.id);

                if (!childAccess || childAccess.length === 0) {
                    if (isMounted) {
                        setContacts([]);
                        setHomeContacts([]);
                        setIsLoaded(true);
                    }
                    return;
                }

                const childIds = childAccess.map(ca => ca.child_id);
                // Use currentChildId from AppState if available, otherwise fall back to first child
                const activeChildId = currentChildId && childIds.includes(currentChildId) 
                    ? currentChildId 
                    : childIds[0];
                setChildId(activeChildId);

                // Get child_spaces for these children
                const { data: childSpaces } = await supabase
                    .from("child_spaces")
                    .select("id")
                    .in("child_id", childIds);

                if (childSpaces) {
                    const csIds = childSpaces.map(cs => cs.id);
                    setChildSpaceIds(csIds);

                    // Fetch home contacts (child_space_contacts) - "People you can contact here"
                    const { data: homeContactsData, error: hcError } = await supabase
                        .from("child_space_contacts")
                        .select(`
                            id,
                            child_space_id,
                            user_id,
                            is_active,
                            share_phone,
                            share_email,
                            share_whatsapp,
                            share_note,
                            note,
                            profiles (
                                id,
                                name,
                                phone,
                                email,
                                whatsapp,
                                avatar_url,
                                avatar_initials,
                                avatar_color
                            )
                        `)
                        .in("child_space_id", csIds);

                    if (!hcError && homeContactsData && isMounted) {
                        const mappedHC: HomeContact[] = homeContactsData.map((hc: any) => ({
                            id: hc.id,
                            childSpaceId: hc.child_space_id,
                            userId: hc.user_id,
                            name: hc.profiles?.name || "Unknown",
                            phone: hc.profiles?.phone,
                            email: hc.profiles?.email,
                            whatsapp: hc.profiles?.whatsapp,
                            avatarUrl: hc.profiles?.avatar_url,
                            avatarInitials: hc.profiles?.avatar_initials,
                            avatarColor: hc.profiles?.avatar_color,
                            sharePhone: hc.share_phone || false,
                            shareEmail: hc.share_email || false,
                            shareWhatsapp: hc.share_whatsapp || false,
                            shareNote: hc.share_note || false,
                            note: hc.note,
                            isActive: hc.is_active !== false,
                        }));
                        setHomeContacts(mappedHC);
                    }
                }

                // Fetch legacy contacts (doctors, schools, etc.) for this child
                const { data: contactsData, error } = await supabase
                    .from("contacts")
                    .select("*")
                    .eq("child_id", activeChildId)
                    .order("is_favorite", { ascending: false })
                    .order("name", { ascending: true });
                
                // Fetch creator names for contacts that have created_by_user_id
                let creatorNames: Record<string, string> = {};
                if (contactsData) {
                    const creatorIds = Array.from(new Set(contactsData.filter(c => c.created_by_user_id).map(c => c.created_by_user_id)));
                    if (creatorIds.length > 0) {
                        const { data: profiles } = await supabase
                            .from("profiles")
                            .select("id, name")
                            .in("id", creatorIds);
                        if (profiles) {
                            creatorNames = Object.fromEntries(profiles.map(p => [p.id, p.name]));
                        }
                    }
                }

                if (error) {
                    if (isMounted) {
                        setContacts([]);
                    }
                } else if (contactsData && isMounted) {
                    const mappedContacts: Contact[] = contactsData.map((c: any) => {
                        // Handle phoneNumbers - either from new column or migrate from legacy
                        let phoneNumbers: PhoneNumber[] = [];
                        if (c.phone_numbers && Array.isArray(c.phone_numbers)) {
                            phoneNumbers = c.phone_numbers;
                        } else if (c.phone) {
                            // Migrate legacy single phone to phoneNumbers array
                            phoneNumbers = [{
                                id: "legacy-1",
                                number: c.phone,
                                countryCode: c.phone_country_code || "+1",
                                type: "mobile" as PhoneType,
                            }];
                        }

                        return {
                            id: c.id,
                            childId: c.child_id,
                            name: c.name,
                            role: c.role || "",
                            category: c.category || "other",
                            phone: c.phone,
                            phoneCountryCode: c.phone_country_code,
                            phoneNumbers,
                            email: c.email,
                            telegram: c.telegram,
                            instagram: c.instagram,
                            contactPreferences: c.contact_preferences || [],
                            address: c.address,
                            addressStreet: c.address_street,
                            addressCity: c.address_city,
                            addressState: c.address_state,
                            addressZip: c.address_zip,
                            addressCountry: c.address_country,
                            addressLat: c.address_lat,
                            addressLng: c.address_lng,
                            notes: c.notes,
                            isFavorite: c.is_favorite || false,
                            connectedWith: c.connected_with,
                            avatarUrl: c.avatar_url,
                            createdAt: c.created_at,
                            createdByUserId: c.created_by_user_id,
                            createdByName: c.created_by_user_id ? creatorNames[c.created_by_user_id] : undefined,
                        };
                    });
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
    }, [currentChildId]); // Refetch when child changes

    // Legacy: Add contact (doctors, schools, etc.)
    const addContact = async (contact: Omit<Contact, "id" | "createdAt">, targetChildId?: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: "Not authenticated" };

            // Use targetChildId if provided, otherwise fall back to context's childId
            const effectiveChildId = targetChildId || childId;
            if (!effectiveChildId) return { success: false, error: "No child found" };

            // Build insert object - only include new fields if they have values
            // This ensures backwards compatibility before migration is run
            
            // Get first phone for legacy field (backward compatibility)
            const firstPhone = contact.phoneNumbers?.find(p => p.number);
            const legacyPhone = firstPhone?.number || contact.phone || null;
            const legacyCountryCode = firstPhone?.countryCode || contact.phoneCountryCode || null;
            
            const insertData: any = {
                child_id: effectiveChildId,
                created_by_user_id: user.id,
                name: contact.name,
                role: contact.role,
                category: contact.category,
                phone: legacyPhone,
                phone_country_code: legacyCountryCode,
                email: contact.email || null,
                address: contact.address || null,
                address_street: contact.addressStreet || null,
                address_city: contact.addressCity || null,
                address_state: contact.addressState || null,
                address_zip: contact.addressZip || null,
                address_country: contact.addressCountry || null,
                address_lat: contact.addressLat || null,
                address_lng: contact.addressLng || null,
                notes: contact.notes || null,
                is_favorite: contact.isFavorite,
                connected_with: contact.connectedWith || null,
                avatar_url: contact.avatarUrl || null,
            };

            // Add phoneNumbers as JSON array
            if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                // Filter out empty phone numbers
                const validPhones = contact.phoneNumbers.filter(p => p.number.trim());
                if (validPhones.length > 0) {
                    insertData.phone_numbers = validPhones;
                }
            }

            // Add new preference fields only if they have values
            // These columns may not exist if migration hasn't been run
            if (contact.telegram) insertData.telegram = contact.telegram;
            if (contact.instagram) insertData.instagram = contact.instagram;
            if (contact.contactPreferences && contact.contactPreferences.length > 0) {
                insertData.contact_preferences = contact.contactPreferences;
            }

            const { data, error } = await supabase
                .from("contacts")
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error("Error adding contact:", error);
                return { success: false, error: error.message };
            }

            // Map phoneNumbers from response
            let phoneNumbers: PhoneNumber[] = [];
            if (data.phone_numbers && Array.isArray(data.phone_numbers)) {
                phoneNumbers = data.phone_numbers;
            } else if (data.phone) {
                phoneNumbers = [{
                    id: "legacy-1",
                    number: data.phone,
                    countryCode: data.phone_country_code || "+1",
                    type: "mobile" as PhoneType,
                }];
            }

            // Fetch creator's name
            let creatorName: string | undefined;
            if (data.created_by_user_id) {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("name")
                    .eq("id", data.created_by_user_id)
                    .single();
                creatorName = profileData?.name;
            }

            const newContact: Contact = {
                id: data.id,
                name: data.name,
                role: data.role || "",
                category: data.category || "other",
                phone: data.phone,
                phoneCountryCode: data.phone_country_code,
                phoneNumbers,
                email: data.email,
                telegram: data.telegram,
                instagram: data.instagram,
                contactPreferences: data.contact_preferences || [],
                address: data.address,
                addressStreet: data.address_street,
                addressCity: data.address_city,
                addressState: data.address_state,
                addressZip: data.address_zip,
                addressCountry: data.address_country,
                addressLat: data.address_lat,
                addressLng: data.address_lng,
                notes: data.notes,
                isFavorite: data.is_favorite || false,
                connectedWith: data.connected_with,
                avatarUrl: data.avatar_url,
                createdAt: data.created_at,
                createdByUserId: data.created_by_user_id,
                createdByName: creatorName,
            };
            setContacts((prev) => [...prev, newContact]);

            return { success: true };
        } catch (error) {
            console.error("Failed to add contact:", error);
            return { success: false, error: "Failed to add contact" };
        }
    };

    const updateContact = async (id: string, updates: Partial<Contact>): Promise<{ success: boolean; error?: string }> => {
        setContacts((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );

        try {
            const dbUpdates: any = {};
            if (updates.childId !== undefined) dbUpdates.child_id = updates.childId;
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.role !== undefined) dbUpdates.role = updates.role;
            if (updates.category !== undefined) dbUpdates.category = updates.category;
            
            // Handle phoneNumbers - also update legacy fields for backward compatibility
            if (updates.phoneNumbers !== undefined) {
                const validPhones = updates.phoneNumbers.filter(p => p.number.trim());
                dbUpdates.phone_numbers = validPhones.length > 0 ? validPhones : null;
                // Update legacy fields with first phone
                const firstPhone = validPhones[0];
                dbUpdates.phone = firstPhone?.number || null;
                dbUpdates.phone_country_code = firstPhone?.countryCode || null;
            } else {
                if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
                if (updates.phoneCountryCode !== undefined) dbUpdates.phone_country_code = updates.phoneCountryCode || null;
            }
            
            if (updates.email !== undefined) dbUpdates.email = updates.email || null;
            if (updates.address !== undefined) dbUpdates.address = updates.address || null;
            if (updates.addressStreet !== undefined) dbUpdates.address_street = updates.addressStreet || null;
            if (updates.addressCity !== undefined) dbUpdates.address_city = updates.addressCity || null;
            if (updates.addressState !== undefined) dbUpdates.address_state = updates.addressState || null;
            if (updates.addressZip !== undefined) dbUpdates.address_zip = updates.addressZip || null;
            if (updates.addressCountry !== undefined) dbUpdates.address_country = updates.addressCountry || null;
            if (updates.addressLat !== undefined) dbUpdates.address_lat = updates.addressLat || null;
            if (updates.addressLng !== undefined) dbUpdates.address_lng = updates.addressLng || null;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
            if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
            if (updates.connectedWith !== undefined) dbUpdates.connected_with = updates.connectedWith || null;
            if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl || null;
            // New preference fields - only include if explicitly set with values
            // These columns may not exist if migration hasn't been run
            if (updates.telegram) dbUpdates.telegram = updates.telegram;
            if (updates.instagram) dbUpdates.instagram = updates.instagram;
            if (updates.contactPreferences && updates.contactPreferences.length > 0) {
                dbUpdates.contact_preferences = updates.contactPreferences;
            }

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
        setContacts((prev) => prev.filter((c) => c.id !== id));

        try {
            const { error } = await supabase
                .from("contacts")
                .delete()
                .eq("id", id);

            if (error) {
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

    // V2: Get home contacts for a specific child_space - "People you can contact here"
    const getHomeContactsForChildSpace = (childSpaceId: string): HomeContact[] => {
        return homeContacts.filter(hc => hc.childSpaceId === childSpaceId && hc.isActive);
    };
    // @deprecated alias
    const getResponsibleAdultsForChildSpace = getHomeContactsForChildSpace;

    // V2: Add a home contact to a child_space
    const addHomeContact = async (
        childSpaceId: string,
        userId: string,
        options?: { sharePhone?: boolean; shareEmail?: boolean; shareWhatsapp?: boolean; note?: string }
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase
                .from("child_space_contacts")
                .insert({
                    child_space_id: childSpaceId,
                    user_id: userId,
                    is_active: true,
                    share_phone: options?.sharePhone || false,
                    share_email: options?.shareEmail || false,
                    share_whatsapp: options?.shareWhatsapp || false,
                    share_note: !!options?.note,
                    note: options?.note || null,
                })
                .select(`
                    id,
                    child_space_id,
                    user_id,
                    is_active,
                    share_phone,
                    share_email,
                    share_whatsapp,
                    share_note,
                    note,
                    profiles (
                        id,
                        name,
                        phone,
                        email,
                        whatsapp,
                        avatar_url,
                        avatar_initials,
                        avatar_color
                    )
                `)
                .single();

            if (error) {
                console.error("Error adding home contact:", error);
                return { success: false, error: error.message };
            }

            const newHC: HomeContact = {
                id: data.id,
                childSpaceId: data.child_space_id,
                userId: data.user_id,
                name: (data as any).profiles?.name || "Unknown",
                phone: (data as any).profiles?.phone,
                email: (data as any).profiles?.email,
                whatsapp: (data as any).profiles?.whatsapp,
                avatarUrl: (data as any).profiles?.avatar_url,
                avatarInitials: (data as any).profiles?.avatar_initials,
                avatarColor: (data as any).profiles?.avatar_color,
                sharePhone: data.share_phone || false,
                shareEmail: data.share_email || false,
                shareWhatsapp: data.share_whatsapp || false,
                shareNote: data.share_note || false,
                note: data.note,
                isActive: data.is_active !== false,
            };

            setHomeContacts(prev => [...prev, newHC]);
            return { success: true };
        } catch (error) {
            console.error("Failed to add home contact:", error);
            return { success: false, error: "Failed to add home contact" };
        }
    };
    // @deprecated alias
    const addResponsibleAdult = addHomeContact;

    // V2: Update a home contact's sharing settings
    const updateHomeContact = async (
        id: string,
        updates: Partial<Pick<HomeContact, "sharePhone" | "shareEmail" | "shareWhatsapp" | "shareNote" | "note" | "isActive">>
    ): Promise<{ success: boolean; error?: string }> => {
        setHomeContacts(prev =>
            prev.map(hc => hc.id === id ? { ...hc, ...updates } : hc)
        );

        try {
            const dbUpdates: any = {};
            if (updates.sharePhone !== undefined) dbUpdates.share_phone = updates.sharePhone;
            if (updates.shareEmail !== undefined) dbUpdates.share_email = updates.shareEmail;
            if (updates.shareWhatsapp !== undefined) dbUpdates.share_whatsapp = updates.shareWhatsapp;
            if (updates.shareNote !== undefined) dbUpdates.share_note = updates.shareNote;
            if (updates.note !== undefined) dbUpdates.note = updates.note || null;
            if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

            const { error } = await supabase
                .from("child_space_contacts")
                .update(dbUpdates)
                .eq("id", id);

            if (error) {
                console.error("Error updating home contact:", error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error("Failed to update home contact:", error);
            return { success: false, error: "Failed to update home contact" };
        }
    };
    // @deprecated alias
    const updateResponsibleAdult = updateHomeContact;

    // V2: Remove a home contact
    const removeHomeContact = async (id: string): Promise<{ success: boolean; error?: string }> => {
        const previousHC = homeContacts;
        setHomeContacts(prev => prev.filter(hc => hc.id !== id));

        try {
            const { error } = await supabase
                .from("child_space_contacts")
                .delete()
                .eq("id", id);

            if (error) {
                setHomeContacts(previousHC);
                console.error("Error removing home contact:", error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            setHomeContacts(previousHC);
            console.error("Failed to remove home contact:", error);
            return { success: false, error: "Failed to remove home contact" };
        }
    };
    // @deprecated alias
    const removeResponsibleAdult = removeHomeContact;

    return (
        <ContactsContext.Provider
            value={{
                contacts,
                homeContacts,
                responsibleAdults: homeContacts, // @deprecated alias
                isLoaded,
                addContact,
                updateContact,
                deleteContact,
                toggleFavorite,
                // New naming
                getHomeContactsForChildSpace,
                addHomeContact,
                updateHomeContact,
                removeHomeContact,
                // @deprecated aliases
                getResponsibleAdultsForChildSpace,
                addResponsibleAdult,
                updateResponsibleAdult,
                removeResponsibleAdult,
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
