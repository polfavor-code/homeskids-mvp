"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { HomeIcon } from "@/components/icons/DuotoneIcons";

interface FirstHomeAssignmentPromptProps {
    homeId: string;
    homeName: string;
    unassignedItemIds: string[];
    onClose: () => void;
}

export default function FirstHomeAssignmentPrompt({
    homeId,
    homeName,
    unassignedItemIds,
    onClose,
}: FirstHomeAssignmentPromptProps) {
    const [isAssigning, setIsAssigning] = useState(false);

    const handleAssignAll = async () => {
        setIsAssigning(true);
        try {
            // Get the child_space_id for this home
            const { data: childSpace } = await supabase
                .from("child_spaces")
                .select("id")
                .eq("home_id", homeId)
                .single();

            if (!childSpace) {
                throw new Error("Could not find child space for this home");
            }

            // Update all unassigned items to use this child_space
            const { error } = await supabase
                .from("items")
                .update({ child_space_id: childSpace.id })
                .in("id", unassignedItemIds);

            if (error) throw error;

            // Mark as completed and close
            localStorage.setItem('firstHomeAssignmentDone', 'true');
            window.location.reload(); // Refresh to show updated items
        } catch (err) {
            console.error("Error assigning items:", err);
            alert("Failed to assign items. Please try again.");
        } finally {
            setIsAssigning(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('firstHomeAssignmentDone', 'true');
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50" onClick={handleDismiss} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4">
                        <HomeIcon size={32} className="text-forest" />
                    </div>

                    {/* Content */}
                    <h2 className="text-xl font-dmSerif text-forest text-center mb-2">
                        Assign existing items to {homeName}?
                    </h2>
                    <p className="text-sm text-textSub text-center mb-6">
                        You have {unassignedItemIds.length} item{unassignedItemIds.length > 1 ? 's' : ''} that {unassignedItemIds.length > 1 ? "aren't" : "isn't"} assigned to a home yet. Would you like to assign {unassignedItemIds.length > 1 ? "them" : "it"} to {homeName}?
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleAssignAll}
                            disabled={isAssigning}
                            className="w-full px-6 py-3 bg-forest text-white font-semibold rounded-xl hover:bg-forest/90 transition-colors disabled:opacity-50"
                        >
                            {isAssigning ? "Assigning..." : "Assign all"}
                        </button>
                        <button
                            onClick={handleDismiss}
                            disabled={isAssigning}
                            className="w-full px-6 py-3 text-forest font-medium hover:bg-softGreen rounded-xl transition-colors"
                        >
                            Review later
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
