"use client";

import React from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import {
    HomesIcon,
    ChildrenIcon,
    CaregiversIcon,
} from "@/components/icons/DuotoneIcons";

// Pets icon (paw print)
function PetsIcon({ size = 24 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="4" r="2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="18" cy="8" r="2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="4" cy="8" r="2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="8" cy="8" r="2" fill="currentColor" fillOpacity="0.2" />
            <path d="M12 14c-2.5 0-4.5 2-4.5 4.5 0 1.5 1 2.5 2.5 2.5h4c1.5 0 2.5-1 2.5-2.5 0-2.5-2-4.5-4.5-4.5z" fill="currentColor" fillOpacity="0.2" />
        </svg>
    );
}

interface ManageCard {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    count?: number;
}

export default function ManagePage() {
    const { children, caregivers, homes, pets } = useAppState();

    // Count active items
    const homesCount = homes?.length || 0;
    const childrenCount = children?.length || 0;
    const caregiversCount = caregivers?.length || 0;
    const petsCount = pets?.length || 0;

    const manageCards: ManageCard[] = [
        {
            title: "Children",
            description: "Manage children profiles and information",
            href: "/settings/children",
            icon: <ChildrenIcon size={28} />,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
            borderColor: "border-orange-100 hover:border-orange-200",
            count: childrenCount,
        },
        {
            title: "Pets",
            description: "Manage your pets and their care routines",
            href: "/settings/pets",
            icon: <PetsIcon size={28} />,
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-100 hover:border-green-200",
            count: petsCount,
        },
        {
            title: "Homes",
            description: "Manage the places where your family stays",
            href: "/settings/homes",
            icon: <HomesIcon size={28} />,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-100 hover:border-blue-200",
            count: homesCount,
        },
        {
            title: "Caregivers",
            description: "Manage who has access to your family's information",
            href: "/settings/caregivers",
            icon: <CaregiversIcon size={28} />,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            borderColor: "border-purple-100 hover:border-purple-200",
            count: caregiversCount,
        },
    ];

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Manage household</h1>
                    <p className="text-sm text-textSub">
                        Organize your homes, family members, and caregivers
                    </p>
                </div>

                {/* Management Cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {manageCards.map((card) => (
                        <Link
                            key={card.title}
                            href={card.href}
                            className={`group flex items-start gap-4 p-5 rounded-2xl border-2 transition-all ${card.borderColor} ${card.bgColor}/50`}
                        >
                            <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center ${card.color} group-hover:scale-105 transition-transform`}>
                                {card.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-forest text-lg">{card.title}</h3>
                                    {card.count !== undefined && card.count > 0 && (
                                        <span className={`text-sm font-medium ${card.color} ${card.bgColor} px-2.5 py-0.5 rounded-full`}>
                                            {card.count}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-textSub mt-1">
                                    {card.description}
                                </p>
                            </div>
                            <svg
                                className="w-5 h-5 text-textSub/40 group-hover:text-forest group-hover:translate-x-1 transition-all mt-1"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </Link>
                    ))}
                </div>

            </div>
        </AppShell>
    );
}
