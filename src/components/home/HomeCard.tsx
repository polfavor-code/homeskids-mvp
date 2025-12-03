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

export default function HomeCard({ caregiver, child, items, isChildHere }: HomeCardProps) {
    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${caregiver.avatarColor}`}
                    >
                        {caregiver.avatarInitials}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{caregiver.label}’s Home</h3>
                        <p className="text-xs text-gray-400">Last updated 2 hours ago</p>
                    </div>
                </div>
                {isChildHere && (
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[10px]">
                            {child?.avatarInitials || "C"}
                        </div>
                        {child?.name || "Child"} is here
                    </div>
                )}
            </div>

            {/* Content */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Items here
                    </span>
                    {items.length > 0 && (
                        <Link href="/items" className="text-xs text-primary font-medium hover:underline">
                            View all items
                        </Link>
                    )}
                </div>

                {items.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        {items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex flex-col gap-1 min-w-[72px]">
                                <div className="w-[72px] h-[72px] rounded-xl bg-gray-100 flex items-center justify-center text-xl">
                                    {/* Placeholder for item thumbnail */}
                                    <span className="opacity-20">📦</span>
                                </div>
                                <span className="text-xs text-gray-600 truncate w-full text-center">
                                    {item.name}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-4 text-center">
                        <p className="text-sm text-gray-400">No items here yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
