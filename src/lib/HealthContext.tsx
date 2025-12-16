"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAppState } from "@/lib/AppStateContext";

// ==============================================
// V2 HEALTH CONTEXT - Health data per child_v2
// ==============================================

// 3-state health status enum
export type HealthStatusValue = "skipped" | "none" | "has";

// Health status for each category
export interface HealthStatus {
    allergiesStatus: HealthStatusValue;
    allergiesDetails: string | null;
    medicationStatus: HealthStatusValue;
    medicationDetails: string | null;
    dietaryStatus: HealthStatusValue;
    dietaryDetails: string | null;
}

// Types for detailed health data
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

// Legacy health flags (for backwards compatibility)
export interface HealthFlags {
    noKnownAllergies: boolean;
    noDietaryRestrictions: boolean;
    noRegularMedication: boolean;
}

// Default health status
const defaultHealthStatus: HealthStatus = {
    allergiesStatus: "skipped",
    allergiesDetails: null,
    medicationStatus: "skipped",
    medicationDetails: null,
    dietaryStatus: "skipped",
    dietaryDetails: null,
};

interface HealthContextType {
    // New 3-state model
    healthStatus: HealthStatus;
    updateHealthStatus: (category: "allergies" | "medication" | "dietary", status: HealthStatusValue, details?: string | null) => Promise<{ success: boolean; error?: string }>;
    skipAllHealthForNow: (overrideChildId?: string) => Promise<{ success: boolean; error?: string }>;

    // Computed values for the new model
    isHealthReviewed: boolean;
    isAllSkipped: boolean;

    // Detailed health data
    allergies: Allergy[];
    medications: Medication[];
    dietaryNeeds: DietaryNeeds;
    healthFlags: HealthFlags;
    isLoaded: boolean;

    // Legacy computed values
    isHealthComplete: boolean;
    hasAnyHealthData: boolean;

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

    // Legacy health flags operations
    updateHealthFlags: (flags: Partial<HealthFlags>, overrideChildId?: string) => Promise<{ success: boolean; error?: string }>;
    confirmNoHealthNeeds: (overrideChildId?: string) => Promise<{ success: boolean; error?: string }>;

    // File operations
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

const defaultHealthFlags: HealthFlags = {
    noKnownAllergies: false,
    noDietaryRestrictions: false,
    noRegularMedication: false,
};

export function HealthProvider({ children }: { children: ReactNode }) {
    const { currentChildId } = useAppState();
    const [healthStatus, setHealthStatus] = useState<HealthStatus>(defaultHealthStatus);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [dietaryNeeds, setDietaryNeeds] = useState<DietaryNeeds>(defaultDietaryNeeds);
    const [healthFlags, setHealthFlags] = useState<HealthFlags>(defaultHealthFlags);
    const [isLoaded, setIsLoaded] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const sessionUser = session?.user;

            if (!sessionUser || !currentChildId) {
                setAllergies([]);
                setMedications([]);
                setDietaryNeeds(defaultDietaryNeeds);
                setHealthStatus(defaultHealthStatus);
                setHealthFlags(defaultHealthFlags);
                setIsLoaded(true);
                return;
            }

            // Fetch health status from child_health_status table for the selected child
            const { data: healthStatusData, error: healthStatusError } = await supabase
                .from("child_health_status")
                .select("*")
                .eq("child_id", currentChildId)
                .single();

            if (healthStatusData && !healthStatusError) {
                setHealthStatus({
                    allergiesStatus: healthStatusData.allergies_status || "skipped",
                    allergiesDetails: healthStatusData.allergies_details || null,
                    medicationStatus: healthStatusData.medication_status || "skipped",
                    medicationDetails: healthStatusData.medication_details || null,
                    dietaryStatus: healthStatusData.dietary_status || "skipped",
                    dietaryDetails: healthStatusData.dietary_details || null,
                });

                setHealthFlags({
                    noKnownAllergies: healthStatusData.allergies_status === "none",
                    noRegularMedication: healthStatusData.medication_status === "none",
                    noDietaryRestrictions: healthStatusData.dietary_status === "none",
                });
            } else {
                // No health status record yet
                setHealthStatus(defaultHealthStatus);
                setHealthFlags(defaultHealthFlags);
            }

            // Fetch allergies for this child
            try {
                const { data: allergiesData, error: allergiesError } = await supabase
                    .from("allergies")
                    .select("*")
                    .eq("child_id", currentChildId)
                    .order("severity", { ascending: false });

                if (allergiesError) {
                    console.warn("Could not fetch allergies:", allergiesError.message);
                    setAllergies([]);
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
                } else {
                    setAllergies([]);
                }
            } catch (allergiesErr) {
                console.warn("Allergies fetch failed:", allergiesErr);
                setAllergies([]);
            }

            // Fetch medications for this child
            try {
                const { data: medicationsData, error: medicationsError } = await supabase
                    .from("medications")
                    .select("*")
                    .eq("child_id", currentChildId)
                    .order("is_as_needed", { ascending: true });

                if (medicationsError) {
                    console.warn("Could not fetch medications:", medicationsError.message);
                    setMedications([]);
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
                } else {
                    setMedications([]);
                }
            } catch (medsErr) {
                console.warn("Medications fetch failed:", medsErr);
                setMedications([]);
            }

            // Fetch dietary needs for this child
            try {
                const { data: dietData, error: dietError } = await supabase
                    .from("dietary_needs")
                    .select("*")
                    .eq("child_id", currentChildId)
                    .single();

                if (dietError && dietError.code !== "PGRST116") {
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
    }, [currentChildId]);

    // Fetch health data when child changes or on mount
    useEffect(() => {
        setIsLoaded(false);
        fetchData();
    }, [fetchData]);

    // Also listen to auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            setIsLoaded(false);
            fetchData();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchData]);

    // Update health status for a specific category
    const updateHealthStatus = async (
        category: "allergies" | "medication" | "dietary",
        status: HealthStatusValue,
        details?: string | null
    ): Promise<{ success: boolean; error?: string }> => {
        if (!currentChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const statusColumn = `${category}_status`;
            const detailsColumn = `${category}_details`;

            const updateData: any = {
                [statusColumn]: status,
                [detailsColumn]: status === "has" ? (details?.trim() || null) : null,
            };

            // Check if record exists
            const { data: existing } = await supabase
                .from("child_health_status")
                .select("id")
                .eq("child_id", currentChildId)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from("child_health_status")
                    .update(updateData)
                    .eq("child_id", currentChildId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("child_health_status")
                    .insert({
                        child_id: currentChildId,
                        ...updateData,
                    });

                if (error) throw error;
            }

            // Update local state
            setHealthStatus(prev => ({
                ...prev,
                [`${category}Status`]: status,
                [`${category}Details`]: status === "has" ? (details?.trim() || null) : null,
            } as HealthStatus));

            // Update legacy flags
            if (category === "allergies") {
                setHealthFlags(prev => ({ ...prev, noKnownAllergies: status === "none" }));
            } else if (category === "medication") {
                setHealthFlags(prev => ({ ...prev, noRegularMedication: status === "none" }));
            } else if (category === "dietary") {
                setHealthFlags(prev => ({ ...prev, noDietaryRestrictions: status === "none" }));
            }

            return { success: true };
        } catch (error: any) {
            console.error("Failed to update health status:", error);
            return { success: false, error: error.message };
        }
    };

    // Skip all health categories for now
    const skipAllHealthForNow = async (overrideChildId?: string): Promise<{ success: boolean; error?: string }> => {
        const targetChildId = overrideChildId || currentChildId;

        if (!targetChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const updateData = {
                allergies_status: "skipped" as const,
                allergies_details: null,
                medication_status: "skipped" as const,
                medication_details: null,
                dietary_status: "skipped" as const,
                dietary_details: null,
            };

            const { data: existing } = await supabase
                .from("child_health_status")
                .select("id")
                .eq("child_id", targetChildId)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from("child_health_status")
                    .update(updateData)
                    .eq("child_id", targetChildId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("child_health_status")
                    .insert({
                        child_id: targetChildId,
                        ...updateData,
                    });

                if (error) throw error;
            }

            setHealthStatus({
                allergiesStatus: "skipped",
                allergiesDetails: null,
                medicationStatus: "skipped",
                medicationDetails: null,
                dietaryStatus: "skipped",
                dietaryDetails: null,
            });

            setHealthFlags(defaultHealthFlags);

            return { success: true };
        } catch (error: any) {
            console.error("Failed to skip health:", error);
            return { success: false, error: error.message };
        }
    };

    const addAllergy = async (allergy: Omit<Allergy, "id">): Promise<{ success: boolean; error?: string }> => {
        if (!currentChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const { data, error } = await supabase
                .from("allergies")
                .insert({
                    child_id: currentChildId,
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
            await updateHealthStatus("allergies", "has", allergy.name);

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

            const newAllergies = allergies.filter((a) => a.id !== id);
            setAllergies(newAllergies);

            if (newAllergies.length === 0) {
                await updateHealthStatus("allergies", "skipped");
            }

            return { success: true };
        } catch (error: any) {
            console.error("Failed to delete allergy:", error);
            return { success: false, error: error.message };
        }
    };

    const uploadFile = async (file: File): Promise<{ success: boolean; path?: string; error?: string }> => {
        if (!currentChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${currentChildId}/health/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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
                .createSignedUrl(path, 3600);

            return data?.signedUrl || null;
        } catch (error) {
            console.error("Failed to get file URL:", error);
            return null;
        }
    };

    const addMedication = async (medication: Omit<Medication, "id">): Promise<{ success: boolean; error?: string }> => {
        if (!currentChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const { data, error } = await supabase
                .from("medications")
                .insert({
                    child_id: currentChildId,
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
            await updateHealthStatus("medication", "has", medication.name);

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

            const newMedications = medications.filter((m) => m.id !== id);
            setMedications(newMedications);

            const activeMeds = newMedications.filter(m => m.isActive);
            if (activeMeds.length === 0) {
                await updateHealthStatus("medication", "skipped");
            }

            return { success: true };
        } catch (error: any) {
            console.error("Failed to delete medication:", error);
            return { success: false, error: error.message };
        }
    };

    const updateDietaryNeeds = async (needs: DietaryNeeds): Promise<{ success: boolean; error?: string }> => {
        if (!currentChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const { data: existing } = await supabase
                .from("dietary_needs")
                .select("id")
                .eq("child_id", currentChildId)
                .single();

            if (existing) {
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
                const { error } = await supabase
                    .from("dietary_needs")
                    .insert({
                        child_id: currentChildId,
                        diet_type: needs.dietType || null,
                        custom_description: needs.customDescription || null,
                        instructions: needs.instructions || null,
                        likes: needs.likes || null,
                        dislikes: needs.dislikes || null,
                    });

                if (error) throw error;
            }

            setDietaryNeeds(needs);

            const hasDietaryData = Boolean(needs.dietType || needs.instructions || needs.likes || needs.dislikes);
            if (hasDietaryData) {
                await updateHealthStatus("dietary", "has", needs.dietType || needs.instructions || "Dietary preferences set");
            }

            return { success: true };
        } catch (error: any) {
            console.error("Failed to update dietary needs:", error);
            return { success: false, error: error.message };
        }
    };

    // Legacy method - updates health flags
    const updateHealthFlags = async (flags: Partial<HealthFlags>, overrideChildId?: string): Promise<{ success: boolean; error?: string }> => {
        const targetChildId = overrideChildId || currentChildId;

        if (!targetChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            setHealthFlags((prev) => ({ ...prev, ...flags }));

            // Also update new health status model
            if (flags.noKnownAllergies !== undefined) {
                await updateHealthStatus("allergies", flags.noKnownAllergies ? "none" : "skipped");
            }
            if (flags.noRegularMedication !== undefined) {
                await updateHealthStatus("medication", flags.noRegularMedication ? "none" : "skipped");
            }
            if (flags.noDietaryRestrictions !== undefined) {
                await updateHealthStatus("dietary", flags.noDietaryRestrictions ? "none" : "skipped");
            }

            return { success: true };
        } catch (error: any) {
            console.error("Failed to update health flags:", error);
            return { success: false, error: error.message };
        }
    };

    // Legacy convenience method - marks all as "none"
    const confirmNoHealthNeeds = async (overrideChildId?: string): Promise<{ success: boolean; error?: string }> => {
        const targetChildId = overrideChildId || currentChildId;

        if (!targetChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const updateData = {
                allergies_status: "none" as const,
                allergies_details: null,
                medication_status: "none" as const,
                medication_details: null,
                dietary_status: "none" as const,
                dietary_details: null,
            };

            const { data: existing } = await supabase
                .from("child_health_status")
                .select("id")
                .eq("child_id", targetChildId)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from("child_health_status")
                    .update(updateData)
                    .eq("child_id", targetChildId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("child_health_status")
                    .insert({
                        child_id: targetChildId,
                        ...updateData,
                    });
                if (error) throw error;
            }

            setHealthStatus({
                allergiesStatus: "none",
                allergiesDetails: null,
                medicationStatus: "none",
                medicationDetails: null,
                dietaryStatus: "none",
                dietaryDetails: null,
            });

            setHealthFlags({
                noKnownAllergies: true,
                noDietaryRestrictions: true,
                noRegularMedication: true,
            });

            return { success: true };
        } catch (error: any) {
            console.error("Failed to confirm no health needs:", error);
            return { success: false, error: error.message };
        }
    };

    const refreshData = async () => {
        setIsLoaded(false);
        await fetchData();
    };

    // Computed values
    const activeMedications = medications.filter((m) => m.isActive);
    const hasDietaryData = Boolean(dietaryNeeds.dietType || dietaryNeeds.instructions || dietaryNeeds.likes || dietaryNeeds.dislikes);
    const hasAnyHealthData = allergies.length > 0 || activeMedications.length > 0 || hasDietaryData;

    const isHealthComplete = hasAnyHealthData ||
        healthFlags.noKnownAllergies ||
        healthFlags.noDietaryRestrictions ||
        healthFlags.noRegularMedication;

    const isHealthReviewed =
        healthStatus.allergiesStatus !== "skipped" ||
        healthStatus.medicationStatus !== "skipped" ||
        healthStatus.dietaryStatus !== "skipped";

    const isAllSkipped =
        healthStatus.allergiesStatus === "skipped" &&
        healthStatus.medicationStatus === "skipped" &&
        healthStatus.dietaryStatus === "skipped";

    return (
        <HealthContext.Provider
            value={{
                healthStatus,
                updateHealthStatus,
                skipAllHealthForNow,
                isHealthReviewed,
                isAllSkipped,
                allergies,
                medications,
                dietaryNeeds,
                healthFlags,
                isLoaded,
                isHealthComplete,
                hasAnyHealthData,
                addAllergy,
                updateAllergy,
                deleteAllergy,
                addMedication,
                updateMedication,
                deleteMedication,
                updateDietaryNeeds,
                updateHealthFlags,
                confirmNoHealthNeeds,
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
