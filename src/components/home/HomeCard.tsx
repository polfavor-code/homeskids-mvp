import React from "react";
import Link from "next/link";
import { Item } from "@/lib/mockData";
import { CaregiverProfile, ChildProfile } from "@/lib/AppStateContext";

interface HomeCardProps {
    caregiver: CaregiverProfile;
    child: ChildProfile | null;
    items: Item[];
    isChildHere: boolean;
}

export default function HomeCard({ caregiver, child, items, isChildHere, caregivers }: HomeCardProps & { caregivers: CaregiverProfile[] }) {
    // Count missing items at this location
    const missingItems = items.filter(item => item.isMissing);

    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-border" style={{ boxShadow: '0 4px 20px rgba(44, 62, 45, 0.05)' }}>
            {/* Top Accent Bar */}
            <div className="h-1.5 bg-gradient-to-r from-forest to-teal" />

            <div className="p-5">
                {/* Header Section */}
                <div className="pb-4 border-b border-border">
                    <h3 className="font-dmSerif text-xl text-forest">{caregiver.label}'s Home</h3>
                    <p className="text-xs text-textSub mt-0.5">Local time</p>

                    {/* Status Pill - June's home right now */}
                    {isChildHere && (
                        <div className="inline-flex items-center gap-1.5 bg-softGreen text-forest px-3 py-1.5 rounded-full text-xs font-semibold mt-3">
                            <span>🏠</span>
                            <span>{child?.name || "June"}'s home right now</span>
                        </div>
                    )}
                </div>

                {/* Location & People Section */}
                <div className="py-4 border-b border-border">
                    <span className="text-[10px] font-bold text-textSub uppercase tracking-wide">Location & People</span>
                    <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-forest">
                            <span>📍</span>
                            <span>Location · <a href="#" className="text-primary hover:underline">View map</a></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-forest">
                            <span>👥</span>
                            <span>1 person in this home</span>
                        </div>
                    </div>
                </div>

                {/* Inventory Section */}
                <div className="py-4 border-b border-border">
                    <span className="text-[10px] font-bold text-textSub uppercase tracking-wide">Inventory</span>
                    <div className="mt-2">
                        <div className="flex items-center gap-2 text-sm text-forest">
                            <span>🎒</span>
                            <span>
                                {items.length} items here
                                {missingItems.length > 0 && (
                                    <span className="text-terracotta font-semibold"> · {missingItems.length} missing</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Travel Section */}
                <div className="pt-4">
                    <span className="text-[10px] font-bold text-textSub uppercase tracking-wide">Travel</span>
                    <div className="mt-2">
                        <div className="flex items-center gap-2 text-sm text-textSub">
                            <span>🚗</span>
                            <span>Driving time: coming soon</span>
                        </div>
                    </div>
                </div>

                {/* View Items Link */}
                {items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <Link
                            href={`/items?filter=${caregiver.id}`}
                            className="text-sm font-semibold text-forest hover:text-terracotta transition-colors flex items-center gap-1"
                        >
                            View all items →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

