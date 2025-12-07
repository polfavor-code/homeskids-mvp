"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, FEATURES } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export interface BagTransferItem {
    id: string;
    name: string;
    photoUrl?: string;
}

export interface BagTransfer {
    id: string;
    fromHomeId: string;
    fromHomeName: string;
    toHomeId: string;
    toHomeName: string;
    status: "draft" | "packed" | "delivered" | "canceled";
    packedAt: string | null;
    deliveredAt: string | null;
    notesUntrackedItems: string | null;
    itemCount: number;
    items: BagTransferItem[];
}

export function useBagTransfers(familyId?: string) {
    const { user } = useAuth();
    const [transfers, setTransfers] = useState<BagTransfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransfers = useCallback(async () => {
        if (!user || !FEATURES.BAG_TRANSFERS) {
            setTransfers([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // First get the family ID if not provided
            let fid = familyId;
            if (!fid) {
                const { data: memberData } = await supabase
                    .from("family_members")
                    .select("family_id")
                    .eq("user_id", user.id)
                    .single();

                if (!memberData) {
                    setTransfers([]);
                    setIsLoading(false);
                    return;
                }
                fid = memberData.family_id;
            }

            // Fetch delivered transfers with items and home names
            const { data: transfersData, error: transfersError } = await supabase
                .from("bag_transfers")
                .select(`
                    id,
                    from_home_id,
                    to_home_id,
                    status,
                    packed_at,
                    delivered_at,
                    notes_untracked_items,
                    from_home:homes!bag_transfers_from_home_id_fkey(name),
                    to_home:homes!bag_transfers_to_home_id_fkey(name),
                    bag_transfer_items(
                        item_id,
                        items(id, name, photo_url)
                    )
                `)
                .eq("family_id", fid)
                .eq("status", "delivered")
                .order("delivered_at", { ascending: false })
                .limit(20);

            if (transfersError) {
                // Silently handle - table may not exist yet
                setTransfers([]);
                setIsLoading(false);
                return;
            }

            const mappedTransfers: BagTransfer[] = (transfersData || []).map((t: any) => ({
                id: t.id,
                fromHomeId: t.from_home_id,
                fromHomeName: t.from_home?.name || "Unknown",
                toHomeId: t.to_home_id,
                toHomeName: t.to_home?.name || "Unknown",
                status: t.status,
                packedAt: t.packed_at,
                deliveredAt: t.delivered_at,
                notesUntrackedItems: t.notes_untracked_items,
                itemCount: t.bag_transfer_items?.length || 0,
                items: (t.bag_transfer_items || []).map((ti: any) => ({
                    id: ti.items?.id || ti.item_id,
                    name: ti.items?.name || "Unknown item",
                    photoUrl: ti.items?.photo_url,
                })),
            }));

            setTransfers(mappedTransfers);
        } catch (err) {
            // Silently handle - table may not exist yet
        } finally {
            setIsLoading(false);
        }
    }, [user, familyId]);

    useEffect(() => {
        fetchTransfers();
    }, [fetchTransfers]);

    return {
        transfers,
        isLoading,
        error,
        refresh: fetchTransfers,
        // Convenience getters
        lastTransfer: transfers.length > 0 ? transfers[0] : null,
        hasHistory: transfers.length > 0,
    };
}
