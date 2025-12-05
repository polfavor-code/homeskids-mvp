"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

// Types
export interface Allergy {
    id: string;
    name: string;
    category: "food" | "medication" | "environmental" | "other";
    severity: "mild" | "moderate" | "severe";
    reaction?: string;
    action?: string;
    notes?: string;
}

export interface Medication {
    id: string;
    name: string;
    dose?: string;
    frequency?: string;
    schedule?: string;
    notes?: string;
    isAsNeeded: boolean;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    // File attachment (prescription/photo)
    filePath?: string;
    fileType?: string;
    fileSize?: number;
}

export type DietType = "vegetarian" | "vegan" | "pescatarian" | "dairy-free" | "gluten-free" | "halal" | "kosher" | "other" | "";

export interface DietaryNeeds {
    dietType: DietType;
    customDescription?: string;
    instructions?: string;
    likes?: string;
    dislikes?: string;
}

interface HealthContextType {
    allergies: Allergy[];
    medications: Medication[];
    dietaryNeeds: DietaryNeeds;
    isLoaded: boolean;
    // Allergy operations
    addAllergy: (allergy: Omit<Allergy, "id">) => Promise<{ success: boolean; error?: string }>;
    updateAllergy: (id: string, updates: Partial<Omit<Allergy, "id">>) => Promise<{ success: boolean; error?: string }>;
    deleteAllergy: (id: string) => Promise<{ success: boolean; error?: string }>;
    // Medication operations
    addMedication: (medication: Omit<Medication, "id">) => Promise<{ success: boolean; error?: string }>;
    updateMedication: (id: string, updates: Partial<Omit<Medication, "id">>) => Promise<{ success: boolean; error?: string }>;
    deleteMedication: (id: string) => Promise<{ success: boolean; error?: string }>;
    // Dietary needs operations
    updateDietaryNeeds: (needs: DietaryNeeds) => Promise<{ success: boolean; error?: string }>;
    // File operations (for medication prescriptions/photos)
    uploadFile: (file: File) => Promise<{ success: boolean; path?: string; error?: string }>;
    getFileUrl: (path: string) => Promise<string | null>;
    refreshData: () => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

const defaultDietaryNeeds: DietaryNeeds = {
    dietType: "",
    customDescription: "",
    instructions: "",
    likes: "",
    dislikes: "",
};

export function HealthProvider({ children }: { children: ReactNode }) {
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [dietaryNeeds, setDietaryNeeds] = useState<DietaryNeeds>(defaultDietaryNeeds);
    const [isLoaded, setIsLoaded] = useState(false);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [childId, setChildId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                setAllergies([]);
                setMedications([]);
                setIsLoaded(true);
                return;
            }

            // Get user's family and child
            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .single();

            if (!familyMember) {
                setIsLoaded(true);
                return;
            }

            setFamilyId(familyMember.family_id);

            // Get child for this family
            const { data: childData } = await supabase
                .from("children")
                .select("id")
                .eq("family_id", familyMember.family_id)
                .single();

            if (childData) {
                setChildId(childData.id);
            }

            // Fetch allergies (wrapped in try-catch for RLS errors)
            try {
                const { data: allergiesData, error: allergiesError } = await supabase
                    .from("allergies")
                    .select("*")
                    .eq("family_id", familyMember.family_id)
                    .order("severity", { ascending: false });

                if (allergiesError) {
                    console.warn("Could not fetch allergies:", allergiesError.message);
                } else if (allergiesData) {
                    const mappedAllergies: Allergy[] = allergiesData.map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        category: a.category,
                        severity: a.severity,
                        reaction: a.reaction,
                        action: a.action,
                        notes: a.notes,
                    }));
                    setAllergies(mappedAllergies);
                }
            } catch (allergiesErr) {
                console.warn("Allergies fetch failed:", allergiesErr);
                setAllergies([]);
            }

            // Fetch medications (wrapped in try-catch for RLS errors)
            try {
                const { data: medicationsData, error: medicationsError } = await supabase
                    .from("medications")
                    .select("*")
                    .eq("family_id", familyMember.family_id)
                    .order("is_as_needed", { ascending: true });

                if (medicationsError) {
                    console.warn("Could not fetch medications:", medicationsError.message);
                } else if (medicationsData) {
                    const mappedMedications: Medication[] = medicationsData.map((m: any) => ({
                        id: m.id,
                        name: m.name,
                        dose: m.dose,
                        frequency: m.frequency,
                        schedule: m.schedule,
                        notes: m.notes,
                        isAsNeeded: m.is_as_needed,
                        isActive: m.is_active,
                        startDate: m.start_date,
                        endDate: m.end_date,
                        filePath: m.file_path,
                        fileType: m.file_type,
                        fileSize: m.file_size,
                    }));
                    setMedications(mappedMedications);
                }
            } catch (medsErr) {
                console.warn("Medications fetch failed:", medsErr);
                setMedications([]);
            }

            // Fetch dietary needs (wrapped in try-catch for RLS errors)
            try {
                const { data: dietData, error: dietError } = await supabase
                    .from("dietary_needs")
                    .select("*")
                    .eq("family_id", familyMember.family_id)
                    .single();

                if (dietError && dietError.code !== "PGRST116") {
                    // PGRST116 = no rows found, which is fine
                    console.warn("Could not fetch dietary needs:", dietError.message);
                }

                if (dietData) {
                    setDietaryNeeds({
                        dietType: dietData.diet_type || "",
                        customDescription: dietData.custom_description || "",
                        instructions: dietData.instructions || "",
                        likes: dietData.likes || "",
                        dislikes: dietData.dislikes || "",
                    });
                } else {
                    setDietaryNeeds(defaultDietaryNeeds);
                }
            } catch (dietErr) {
                console.warn("Dietary needs fetch failed:", dietErr);
                setDietaryNeeds(defaultDietaryNeeds);
            }
        } catch (error) {
            console.error("Failed to load health data:", error);
        } finally {
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        fetchData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            setIsLoaded(false);
            fetchData();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const addAllergy = async (allergy: Omit<Allergy, "id">): Promise<{ success: boolean; error?: string }> => {
        if (!familyId || !childId) {
            return { success: false, error: "No family or child found" };
        }

        try {
            const { data, error } = await supabase
                .from("allergies")
                .insert({
                    family_id: familyId,
                    child_id: childId,
                    name: allergy.name,
                    category: allergy.category,
                    severity: allergy.severity,
                    reaction: allergy.reaction,
                    action: allergy.action,
                    notes: allergy.notes,
                })
                .select()
                .single();

            if (error) throw error;

            const newAllergy: Allergy = {
                id: data.id,
                name: data.name,
                category: data.category,
                severity: data.severity,
                reaction: data.reaction,
                action: data.action,
                notes: data.notes,
            };

            setAllergies((prev) => [...prev, newAllergy]);
            return { success: true };
        } catch (error: any) {
            console.error("Failed to add allergy:", error);
            return { success: false, error: error.message };
        }
    };

    const updateAllergy = async (id: string, updates: Partial<Omit<Allergy, "id">>): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase
                .from("allergies")
                .update(updates)
                .eq("id", id);

            if (error) throw error;

            setAllergies((prev) =>
                prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
            );
            return { success: true };
        } catch (error: any) {
            console.error("Failed to update allergy:", error);
            return { success: false, error: error.message };
        }
    };

    const deleteAllergy = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase
                .from("allergies")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setAllergies((prev) => prev.filter((a) => a.id !== id));
            return { success: true };
        } catch (error: any) {
            console.error("Failed to delete allergy:", error);
            return { success: false, error: error.message };
        }
    };

    const uploadFile = async (file: File): Promise<{ success: boolean; path?: string; error?: string }> => {
        if (!familyId) {
            return { success: false, error: "No family found" };
        }

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${familyId}/health/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error } = await supabase.storage
                .from("documents")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (error) throw error;

            return { success: true, path: fileName };
        } catch (error: any) {
            console.error("Failed to upload file:", error);
            return { success: false, error: error.message };
        }
    };

    const getFileUrl = async (path: string): Promise<string | null> => {
        try {
            const { data } = await supabase.storage
                .from("documents")
                .createSignedUrl(path, 3600); // 1 hour expiry

            return data?.signedUrl || null;
        } catch (error) {
            console.error("Failed to get file URL:", error);
            return null;
        }
    };

    const addMedication = async (medication: Omit<Medication, "id">): Promise<{ success: boolean; error?: string }> => {
        if (!familyId || !childId) {
            return { success: false, error: "No family or child found" };
        }

        try {
            const { data, error } = await supabase
                .from("medications")
                .insert({
                    family_id: familyId,
                    child_id: childId,
                    name: medication.name,
                    dose: medication.dose,
                    frequency: medication.frequency,
                    schedule: medication.schedule,
                    notes: medication.notes,
                    is_as_needed: medication.isAsNeeded,
                    is_active: medication.isActive,
                    start_date: medication.startDate,
                    end_date: medication.endDate,
                    file_path: medication.filePath,
                    file_type: medication.fileType,
                    file_size: medication.fileSize,
                })
                .select()
                .single();

            if (error) throw error;

            const newMedication: Medication = {
                id: data.id,
                name: data.name,
                dose: data.dose,
                frequency: data.frequency,
                schedule: data.schedule,
                notes: data.notes,
                isAsNeeded: data.is_as_needed,
                isActive: data.is_active,
                startDate: data.start_date,
                endDate: data.end_date,
                filePath: data.file_path,
                fileType: data.file_type,
                fileSize: data.file_size,
            };

            setMedications((prev) => [...prev, newMedication]);
            return { success: true };
        } catch (error: any) {
            console.error("Failed to add medication:", error);
            return { success: false, error: error.message };
        }
    };

    const updateMedication = async (id: string, updates: Partial<Omit<Medication, "id">>): Promise<{ success: boolean; error?: string }> => {
        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.dose !== undefined) dbUpdates.dose = updates.dose;
            if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
            if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            if (updates.isAsNeeded !== undefined) dbUpdates.is_as_needed = updates.isAsNeeded;
            if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
            if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
            if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

            const { error } = await supabase
                .from("medications")
                .update(dbUpdates)
                .eq("id", id);

            if (error) throw error;

            setMedications((prev) =>
                prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
            );
            return { success: true };
        } catch (error: any) {
            console.error("Failed to update medication:", error);
            return { success: false, error: error.message };
        }
    };

    const deleteMedication = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase
                .from("medications")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setMedications((prev) => prev.filter((m) => m.id !== id));
            return { success: true };
        } catch (error: any) {
            console.error("Failed to delete medication:", error);
            return { success: false, error: error.message };
        }
    };

    const updateDietaryNeeds = async (needs: DietaryNeeds): Promise<{ success: boolean; error?: string }> => {
        if (!familyId || !childId) {
            return { success: false, error: "No family or child found" };
        }

        try {
            // Try to update existing record first
            const { data: existing } = await supabase
                .from("dietary_needs")
                .select("id")
                .eq("family_id", familyId)
                .single();

            if (existing) {
                // Update existing record
                const { error } = await supabase
                    .from("dietary_needs")
                    .update({
                        diet_type: needs.dietType || null,
                        custom_description: needs.customDescription || null,
                        instructions: needs.instructions || null,
                        likes: needs.likes || null,
                        dislikes: needs.dislikes || null,
                    })
                    .eq("id", existing.id);

                if (error) throw error;
            } else {
                // Insert new record
                const { error } = await supabase
                    .from("dietary_needs")
                    .insert({
                        family_id: familyId,
                        child_id: childId,
                        diet_type: needs.dietType || null,
                        custom_description: needs.customDescription || null,
                        instructions: needs.instructions || null,
                        likes: needs.likes || null,
                        dislikes: needs.dislikes || null,
                    });

                if (error) throw error;
            }

            setDietaryNeeds(needs);
            return { success: true };
        } catch (error: any) {
            console.error("Failed to update dietary needs:", error);
            return { success: false, error: error.message };
        }
    };

    const refreshData = async () => {
        setIsLoaded(false);
        await fetchData();
    };

    return (
        <HealthContext.Provider
            value={{
                allergies,
                medications,
                dietaryNeeds,
                isLoaded,
                addAllergy,
                updateAllergy,
                deleteAllergy,
                addMedication,
                updateMedication,
                deleteMedication,
                updateDietaryNeeds,
                uploadFile,
                getFileUrl,
                refreshData,
            }}
        >
            {children}
        </HealthContext.Provider>
    );
}

export function useHealth() {
    const context = useContext(HealthContext);
    if (context === undefined) {
        throw new Error("useHealth must be used within a HealthProvider");
    }
    return context;
}
