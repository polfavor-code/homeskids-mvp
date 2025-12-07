"use client";

import React, { useState } from "react";
import { useBagEssentials, DEFAULT_ESSENTIALS, BagEssential } from "@/lib/useBagEssentials";

interface BagEssentialsSectionProps {
    childId: string | null | undefined;
}

// Helper to format preview text for collapsed state - first 4 items max
function getPreviewText(essentials: BagEssential[]): string {
    if (essentials.length === 0) return "";
    const firstFour = essentials.slice(0, 4);
    return firstFour.map(e => e.label).join(", ");
}

export default function BagEssentialsSection({ childId }: BagEssentialsSectionProps) {
    const {
        essentials,
        isLoading,
        addEssential,
        updateEssential,
        deleteEssential,
        addMultipleEssentials,
        hasEssentials,
    } = useBagEssentials(childId);

    const [isExpanded, setIsExpanded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingLabel, setEditingLabel] = useState("");
    const [isSeeding, setIsSeeding] = useState(false);

    // Handle adding a new essential
    const handleAdd = async () => {
        if (!newLabel.trim()) return;
        await addEssential(newLabel);
        setNewLabel("");
        setIsAdding(false);
    };

    // Handle editing an essential
    const startEditing = (essential: BagEssential) => {
        setEditingId(essential.id);
        setEditingLabel(essential.label);
    };

    const handleEdit = async () => {
        if (!editingId || !editingLabel.trim()) return;
        await updateEssential(editingId, editingLabel);
        setEditingId(null);
        setEditingLabel("");
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingLabel("");
    };

    // Handle deleting an essential
    const handleDelete = async (id: string) => {
        await deleteEssential(id);
    };

    // Seed default essentials
    const handleSeedDefaults = async () => {
        setIsSeeding(true);
        await addMultipleEssentials(DEFAULT_ESSENTIALS);
        setIsSeeding(false);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-4 bg-cream/50 rounded w-48 mb-2"></div>
                <div className="h-3 bg-cream/30 rounded w-32"></div>
            </div>
        );
    }

    const previewText = getPreviewText(essentials);
    const hasMoreThanFour = essentials.length > 4;

    return (
        <div>
            {/* Title row */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <span className="text-sm font-medium text-forest">
                    Essentials that always go in the bag
                </span>
                <svg
                    className={`w-4 h-4 text-textSub/50 transition-transform duration-200 flex-shrink-0 ml-2 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Collapsed state: preview with fade mask on 4th item when 5+ items */}
            {!isExpanded && (
                <div className="mt-1.5">
                    {hasEssentials ? (
                        <p
                            className="text-xs text-forest/60 whitespace-nowrap overflow-hidden"
                            style={hasMoreThanFour ? {
                                maskImage: "linear-gradient(to right, black 0%, black 70%, transparent 100%)",
                                WebkitMaskImage: "linear-gradient(to right, black 0%, black 70%, transparent 100%)",
                            } : undefined}
                        >
                            {previewText}
                        </p>
                    ) : (
                        <p className="text-xs text-textSub/50">No essentials added yet</p>
                    )}
                </div>
            )}

            {/* Expanded state */}
            <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                    isExpanded ? "max-h-[500px] opacity-100 mt-3" : "max-h-0 opacity-0"
                }`}
            >
                {/* Pills container */}
                <div className="flex flex-wrap gap-2">
                    {/* Essential pills */}
                    {essentials.map((essential) => (
                        <div key={essential.id}>
                            {editingId === essential.id ? (
                                // Editing mode
                                <div className="flex items-center gap-1 bg-white border-2 border-forest/30 rounded-full px-3 py-1">
                                    <input
                                        type="text"
                                        value={editingLabel}
                                        onChange={(e) => setEditingLabel(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleEdit();
                                            if (e.key === "Escape") cancelEditing();
                                        }}
                                        className="w-24 text-xs bg-transparent border-none focus:outline-none text-forest"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleEdit}
                                        className="text-forest hover:text-teal p-0.5"
                                        title="Save"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M13.5 4.5L6 12L2.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="text-textSub/50 hover:text-red-500 p-0.5"
                                        title="Cancel"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 4L4 12M4 4L12 12" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                // Display mode - pill style
                                <div className="group flex items-center gap-1 bg-cream/70 hover:bg-cream rounded-full px-3 py-1 transition-colors">
                                    <button
                                        onClick={() => startEditing(essential)}
                                        className="text-xs text-forest/80 hover:text-forest transition-colors"
                                        title="Click to edit"
                                    >
                                        {essential.label}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(essential.id)}
                                        className="text-textSub/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-0.5"
                                        title="Remove"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 4L4 12M4 4L12 12" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* "+ Add item" pill button */}
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-1 bg-cream/40 hover:bg-cream/60 border border-dashed border-border/40 rounded-full px-3 py-1 transition-colors text-xs text-forest/50 hover:text-forest/70"
                        >
                            <span>+</span>
                            <span>Add item</span>
                        </button>
                    )}
                </div>

                {/* Add item input - inline when active */}
                {isAdding && (
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAdd();
                                if (e.key === "Escape") {
                                    setIsAdding(false);
                                    setNewLabel("");
                                }
                            }}
                            placeholder="e.g. toothbrush"
                            className="flex-1 px-3 py-1.5 text-xs border border-border/50 rounded-full focus:outline-none focus:ring-2 focus:ring-forest/30 bg-white"
                            autoFocus
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newLabel.trim()}
                            className="px-3 py-1.5 text-xs bg-forest text-white rounded-full hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => {
                                setIsAdding(false);
                                setNewLabel("");
                            }}
                            className="text-textSub/50 hover:text-textSub p-1"
                        >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 4L4 12M4 4L12 12" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Empty state with seed defaults option */}
                {!hasEssentials && !isAdding && (
                    <div className="mt-2">
                        <button
                            onClick={handleSeedDefaults}
                            disabled={isSeeding}
                            className="text-xs text-forest/70 hover:text-forest underline underline-offset-2 disabled:opacity-50"
                        >
                            {isSeeding ? "Adding..." : "Add suggested essentials"}
                        </button>
                    </div>
                )}

                {/* Explanatory text - only in expanded state */}
                <p className="mt-3 text-xs text-textSub/60 leading-relaxed">
                    Essentials are the simple things you always pack and don't need to tick off. You and other caregivers can add, edit, or remove items in this shared list.
                </p>
            </div>
        </div>
    );
}
