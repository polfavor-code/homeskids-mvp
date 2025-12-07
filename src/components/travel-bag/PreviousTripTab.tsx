"use client";

import React from "react";
import { BagTransfer } from "@/lib/useBagTransfers";

interface PreviousTripTabProps {
    lastTransfer: BagTransfer | null;
    isLoading: boolean;
    onViewItems: (transfer: BagTransfer) => void;
}

export default function PreviousTripTab({ lastTransfer, isLoading, onViewItems }: PreviousTripTabProps) {
    if (isLoading) {
        return (
            <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest mx-auto" />
                <p className="text-sm text-textSub mt-3">Loading...</p>
            </div>
        );
    }

    if (!lastTransfer) {
        return (
            <div className="py-8 text-center">
                <div className="w-14 h-14 bg-cream rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                    📭
                </div>
                <h3 className="font-bold text-forest mb-2">No previous bag transfers yet</h3>
                <p className="text-sm text-textSub max-w-xs mx-auto">
                    You will see the last trip here after your first move.
                </p>
            </div>
        );
    }

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return "Unknown";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-4">
            {/* Route header */}
            <div className="flex items-center gap-2">
                <span className="font-bold text-forest">{lastTransfer.fromHomeName}</span>
                <span className="text-textSub">→</span>
                <span className="font-bold text-forest">{lastTransfer.toHomeName}</span>
            </div>

            {/* Delivered info */}
            <p className="text-sm text-textSub">
                Delivered on {formatDateTime(lastTransfer.deliveredAt)}
            </p>

            {/* Items badge */}
            <div className="inline-flex items-center gap-2 bg-softGreen/30 px-3 py-1.5 rounded-full">
                <span className="text-forest font-medium text-sm">
                    {lastTransfer.itemCount} item{lastTransfer.itemCount !== 1 ? "s" : ""} moved
                </span>
            </div>

            {/* Untracked note */}
            {lastTransfer.notesUntrackedItems && (
                <div className="p-3 bg-cream/50 rounded-xl">
                    <p className="text-xs text-textSub font-medium mb-1">Untracked items note:</p>
                    <p className="text-sm text-forest">{lastTransfer.notesUntrackedItems}</p>
                </div>
            )}

            {/* View items button */}
            <button
                onClick={() => onViewItems(lastTransfer)}
                className="w-full py-3 bg-white border-2 border-forest/20 text-forest rounded-xl font-medium hover:border-forest transition-colors mt-2"
            >
                View items moved
            </button>
        </div>
    );
}
