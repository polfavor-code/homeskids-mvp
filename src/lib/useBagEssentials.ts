"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, FEATURES } from "@/lib/supabase";

export interface BagEssential {
    id: string;
    childId: string;
    label: string;
    position: number;
    createdAt: string;
    createdBy: string | null;
}

// Default suggestions shown when user has no essentials yet
export const DEFAULT_ESSENTIALS = [
    "Underwear",
    "Socks",
    "Pajamas",
    "Everyday clothes",
    "Toiletries",
    "School items",
];

export function useBagEssentials(childId: string | null | undefined) {
    const [essentials, setEssentials] = useState<BagEssential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch essentials for this child
    const fetchEssentials = useCallback(async () => {
        if (!childId || !FEATURES.BAG_ESSENTIALS) {
            setEssentials([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from("bag_essentials")
                .select("*")
                .eq("child_id", childId)
                .order("position", { ascending: true });

            if (fetchError) {
                // Silently handle - table may not exist yet
                setEssentials([]);
            } else {
                setEssentials(
                    (data || []).map((row: { id: string; child_id: string; label: string; position: number; created_at: string; created_by: string | null }) => ({
                        id: row.id,
                        childId: row.child_id,
                        label: row.label,
                        position: row.position,
                        createdAt: row.created_at,
                        createdBy: row.created_by,
                    }))
                );
            }
        } catch (err) {
            // Silently handle - table may not exist yet
            setEssentials([]);
        } finally {
            setIsLoading(false);
        }
    }, [childId]);

    // Initial fetch
    useEffect(() => {
        fetchEssentials();
    }, [fetchEssentials]);

    // Add a new essential
    const addEssential = useCallback(
        async (label: string): Promise<BagEssential | null> => {
            if (!childId || !label.trim() || !FEATURES.BAG_ESSENTIALS) return null;

            const nextPosition = essentials.length > 0
                ? Math.max(...essentials.map(e => e.position)) + 1
                : 0;

            try {
                const { data, error: insertError } = await supabase
                    .from("bag_essentials")
                    .insert({
                        child_id: childId,
                        label: label.trim(),
                        position: nextPosition,
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error("Error adding bag essential:", insertError);
                    setError(insertError.message);
                    return null;
                }

                const newEssential: BagEssential = {
                    id: data.id,
                    childId: data.child_id,
                    label: data.label,
                    position: data.position,
                    createdAt: data.created_at,
                    createdBy: data.created_by,
                };

                setEssentials((prev) => [...prev, newEssential]);
                return newEssential;
            } catch (err) {
                console.error("Error adding bag essential:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
                return null;
            }
        },
        [childId, essentials]
    );

    // Update an essential's label
    const updateEssential = useCallback(
        async (id: string, newLabel: string): Promise<boolean> => {
            if (!newLabel.trim() || !FEATURES.BAG_ESSENTIALS) return false;

            try {
                const { error: updateError } = await supabase
                    .from("bag_essentials")
                    .update({ label: newLabel.trim() })
                    .eq("id", id);

                if (updateError) {
                    console.error("Error updating bag essential:", updateError);
                    setError(updateError.message);
                    return false;
                }

                setEssentials((prev) =>
                    prev.map((e) =>
                        e.id === id ? { ...e, label: newLabel.trim() } : e
                    )
                );
                return true;
            } catch (err) {
                console.error("Error updating bag essential:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
                return false;
            }
        },
        []
    );

    // Delete an essential
    const deleteEssential = useCallback(async (id: string): Promise<boolean> => {
        if (!FEATURES.BAG_ESSENTIALS) return false;
        try {
            const { error: deleteError } = await supabase
                .from("bag_essentials")
                .delete()
                .eq("id", id);

            if (deleteError) {
                console.error("Error deleting bag essential:", deleteError);
                setError(deleteError.message);
                return false;
            }

            setEssentials((prev) => prev.filter((e) => e.id !== id));
            return true;
        } catch (err) {
            console.error("Error deleting bag essential:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
            return false;
        }
    }, []);

    // Add multiple essentials at once (for seeding defaults)
    const addMultipleEssentials = useCallback(
        async (labels: string[]): Promise<boolean> => {
            if (!childId || labels.length === 0 || !FEATURES.BAG_ESSENTIALS) return false;

            const startPosition = essentials.length > 0
                ? Math.max(...essentials.map(e => e.position)) + 1
                : 0;

            const rows = labels.map((label, index) => ({
                child_id: childId,
                label: label.trim(),
                position: startPosition + index,
            }));

            try {
                const { data, error: insertError } = await supabase
                    .from("bag_essentials")
                    .insert(rows)
                    .select();

                if (insertError) {
                    console.error("Error adding bag essentials:", insertError);
                    setError(insertError.message);
                    return false;
                }

                const newEssentials: BagEssential[] = (data || []).map((row: { id: string; child_id: string; label: string; position: number; created_at: string; created_by: string | null }) => ({
                    id: row.id,
                    childId: row.child_id,
                    label: row.label,
                    position: row.position,
                    createdAt: row.created_at,
                    createdBy: row.created_by,
                }));

                setEssentials((prev) => [...prev, ...newEssentials]);
                return true;
            } catch (err) {
                console.error("Error adding bag essentials:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
                return false;
            }
        },
        [childId, essentials]
    );

    return {
        essentials,
        isLoading,
        error,
        addEssential,
        updateEssential,
        deleteEssential,
        addMultipleEssentials,
        refetch: fetchEssentials,
        hasEssentials: essentials.length > 0,
    };
}
