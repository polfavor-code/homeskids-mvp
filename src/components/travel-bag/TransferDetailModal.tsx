"use client";

import React from "react";
import { BagTransfer } from "@/lib/useBagTransfers";
import ItemPhoto from "@/components/ItemPhoto";

interface TransferDetailModalProps {
    transfer: BagTransfer | null;
    childName: string;
    onClose: () => void;
}

export default function TransferDetailModal({ transfer, childName, onClose }: TransferDetailModalProps) {
    if (!transfer) return null;

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return "Unknown";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="p-5 border-b border-border/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-dmSerif text-xl text-forest">
                                Bag transfer details
                            </h2>
                            <p className="text-sm text-textSub mt-1">
                                {transfer.fromHomeName} → {transfer.toHomeName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-textSub/50 hover:text-forest p-1 -mr-1 -mt-1"
                        >
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 4L4 12M4 4L12 12" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[60vh]">
                    {/* Meta info */}
                    <div className="flex gap-4 mb-5">
                        <div className="flex items-center gap-2 bg-softGreen/30 px-3 py-1.5 rounded-full">
                            <span className="text-forest text-sm">✓</span>
                            <span className="text-sm font-medium text-forest">Delivered</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-textSub">
                            <span>{transfer.itemCount} item{transfer.itemCount !== 1 ? "s" : ""}</span>
                        </div>
                    </div>

                    <p className="text-xs text-textSub mb-4">
                        {formatDateTime(transfer.deliveredAt)}
                    </p>

                    {/* Items list */}
                    <div className="mb-5">
                        <h3 className="font-bold text-forest text-sm mb-3">Moved items</h3>
                        {transfer.items.length > 0 ? (
                            <div className="space-y-2">
                                {transfer.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 p-2 bg-cream/50 rounded-xl"
                                    >
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-border flex-shrink-0 flex items-center justify-center">
                                            {item.photoUrl ? (
                                                <ItemPhoto
                                                    photoPath={item.photoUrl}
                                                    itemName={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xl">📦</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-forest truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-textSub">No items recorded</p>
                        )}
                    </div>

                    {/* Untracked note */}
                    {transfer.notesUntrackedItems && (
                        <div className="mb-5 p-3 bg-cream/50 rounded-xl">
                            <h4 className="font-medium text-forest text-xs mb-1">Untracked items note</h4>
                            <p className="text-sm text-textSub">{transfer.notesUntrackedItems}</p>
                        </div>
                    )}

                    {/* Footer note */}
                    <p className="text-xs text-textSub/70 text-center">
                        This transfer was delivered automatically when {childName} switched homes.
                    </p>
                </div>

                {/* Close button */}
                <div className="p-5 border-t border-border/30">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-forest text-white rounded-xl font-medium hover:bg-teal transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
