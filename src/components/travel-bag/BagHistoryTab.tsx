"use client";

import React from "react";
import { BagTransfer } from "@/lib/useBagTransfers";

interface BagHistoryTabProps {
    transfers: BagTransfer[];
    isLoading: boolean;
    onSelectTransfer: (transfer: BagTransfer) => void;
}

export default function BagHistoryTab({ transfers, isLoading, onSelectTransfer }: BagHistoryTabProps) {
    if (isLoading) {
        return (
            <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest mx-auto" />
                <p className="text-sm text-textSub mt-3">Loading history...</p>
            </div>
        );
    }

    if (transfers.length === 0) {
        return (
            <div className="py-8 text-center">
                <div className="w-14 h-14 bg-cream rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                    📋
                </div>
                <h3 className="font-bold text-forest mb-2">No bag history yet</h3>
                <p className="text-sm text-textSub max-w-xs mx-auto">
                    Bag history will appear here after your first transfer.
                </p>
            </div>
        );
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "Unknown";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-2">
            {transfers.map((transfer) => (
                <button
                    key={transfer.id}
                    onClick={() => onSelectTransfer(transfer)}
                    className="w-full flex items-center gap-3 p-3 bg-cream/50 rounded-xl hover:bg-cream transition-colors text-left group"
                >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-full bg-softGreen/30 flex items-center justify-center text-forest flex-shrink-0">
                        ✓
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-forest text-sm truncate">
                                {transfer.fromHomeName}
                            </span>
                            <span className="text-textSub/50 text-xs">→</span>
                            <span className="font-medium text-forest text-sm truncate">
                                {transfer.toHomeName}
                            </span>
                        </div>
                        <p className="text-xs text-textSub mt-0.5">
                            {transfer.itemCount} item{transfer.itemCount !== 1 ? "s" : ""} • {formatDate(transfer.deliveredAt)} at {formatTime(transfer.deliveredAt)}
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="text-textSub/30 group-hover:text-forest transition-colors">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </button>
            ))}

            {transfers.length >= 10 && (
                <p className="text-xs text-textSub text-center pt-2">
                    Showing last 10 transfers
                </p>
            )}
        </div>
    );
}
