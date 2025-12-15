"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/AppStateContext";
import Avatar from "@/components/Avatar";
import { ChevronDownIcon } from "@/components/icons/DuotoneIcons";

export default function ChildContextBar() {
    const {
        children: childrenList,
        currentChild,
        currentHome,
        setCurrentChildId,
        homes,
    } = useAppState();

    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Don't render if no children or only one child (no need to switch)
    if (!currentChild || childrenList.length <= 1) {
        return null;
    }

    // Get home status text for a child
    const getHomeStatus = (childId: string) => {
        // For now, use the current home context
        // In the future, this could be child-specific
        if (childId === currentChild?.id && currentHome) {
            return `At ${currentHome.name}`;
        }
        return "Awaiting location";
    };

    const handleChildSelect = (childId: string) => {
        setCurrentChildId(childId);
        setIsSheetOpen(false);
    };

    const hasMultipleChildren = childrenList.length > 1;

    return (
        <>
            {/* Child Context Bar - Mobile Only */}
            <div className="lg:hidden sticky top-0 z-30 bg-cream safe-area-top">
                <div className="px-5 py-3">
                    <button
                        onClick={() => hasMultipleChildren && setIsSheetOpen(true)}
                        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-border/60 shadow-sm transition-all ${
                            hasMultipleChildren ? "active:scale-[0.98] active:bg-cream" : ""
                        }`}
                        disabled={!hasMultipleChildren}
                    >
                        {/* Child avatar */}
                        <Avatar
                            src={currentChild.avatarUrl}
                            initial={currentChild.avatarInitials}
                            size={40}
                            bgColor="#4A7C59"
                        />
                        
                        {/* Name + label */}
                        <div className="text-left">
                            <p className="text-[10px] text-textSub font-medium uppercase tracking-wide">
                                Viewing
                            </p>
                            <p className="text-[15px] font-semibold text-forest -mt-0.5">
                                {currentChild.name}
                            </p>
                        </div>
                        
                        {/* Chevron */}
                        {hasMultipleChildren && (
                            <ChevronDownIcon size={18} className="text-textSub ml-1" />
                        )}
                    </button>
                </div>
            </div>

            {/* Bottom Sheet for Child Switching */}
            {isSheetOpen && hasMultipleChildren && (
                <div className="lg:hidden fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsSheetOpen(false)}
                    />

                    {/* Sheet */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up safe-area-bottom">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-3 border-b border-border">
                            <h2 className="text-lg font-dmSerif text-forest">Viewing</h2>
                            <p className="text-xs text-textSub mt-0.5">
                                Switch between your children
                            </p>
                        </div>

                        {/* Children List */}
                        <div className="p-3 max-h-[50vh] overflow-y-auto">
                            {childrenList.map((child) => {
                                const isActive = child.id === currentChild?.id;
                                const homeStatus = getHomeStatus(child.id);

                                return (
                                    <button
                                        key={child.id}
                                        onClick={() => handleChildSelect(child.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1 ${
                                            isActive
                                                ? "bg-softGreen"
                                                : "bg-white hover:bg-cream active:bg-cream"
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <Avatar
                                            src={child.avatarUrl}
                                            initial={child.avatarInitials}
                                            size={44}
                                            bgColor={isActive ? "#4A7C59" : "#9CA3AF"}
                                        />

                                        {/* Name + Status */}
                                        <div className="flex-1 text-left">
                                            <p className={`text-sm font-semibold ${
                                                isActive ? "text-forest" : "text-gray-800"
                                            }`}>
                                                {child.name}
                                            </p>
                                            <p className="text-xs text-textSub mt-0.5">
                                                {homeStatus}
                                            </p>
                                        </div>

                                        {/* Checkmark for active */}
                                        {isActive && (
                                            <div className="w-6 h-6 rounded-full bg-forest flex items-center justify-center">
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="white"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Cancel button */}
                        <div className="p-3 pt-0">
                            <button
                                onClick={() => setIsSheetOpen(false)}
                                className="w-full py-3 text-center text-sm font-medium text-textSub hover:text-forest transition-colors rounded-xl hover:bg-cream"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Styles */}
            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                .safe-area-top {
                    padding-top: env(safe-area-inset-top, 0);
                }
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0);
                }
            `}</style>
        </>
    );
}
