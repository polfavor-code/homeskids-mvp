"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Item } from "@/lib/mockData";
import { ChildProfile, CaregiverProfile } from "@/lib/AppStateContext";
import { HealthStatus } from "@/lib/HealthContext";
import { Contact } from "@/lib/ContactsContext";
import { Document } from "@/lib/DocumentsContext";

type RoadmapItemStatus = "completed" | "pending" | "in_progress";

interface RoadmapSection {
    id: string;
    label: string;
    status: RoadmapItemStatus;
    href: string;
    createHref?: string; // Optional different href for pending state
}

interface SetupRoadmapProps {
    childName: string;
    child: ChildProfile | null;
    items: Item[];
    contacts: Contact[];
    healthStatus: HealthStatus;
    isHealthReviewed: boolean;
    documents: Document[];
}

// Check icon for completed state
function CheckIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Dot icon for pending state
function PendingDot({ className }: { className?: string }) {
    return (
        <div className={`w-2 h-2 rounded-full border-2 border-current ${className}`} />
    );
}

export default function SetupRoadmap({
    childName,
    child,
    items,
    contacts,
    healthStatus,
    isHealthReviewed,
    documents,
}: SetupRoadmapProps) {
    const router = useRouter();

    // Calculate completion status for each section
    const getItemsStatus = (): RoadmapItemStatus => {
        return items.length > 0 ? "completed" : "pending";
    };

    const getContactsStatus = (): RoadmapItemStatus => {
        return contacts.length > 0 ? "completed" : "pending";
    };

    const getHealthStatus = (): RoadmapItemStatus => {
        // Health is completed if any category has been reviewed (not skipped)
        // Check if any health info exists
        const hasAllergies = healthStatus.allergiesStatus === "has";
        const hasMedication = healthStatus.medicationStatus === "has";
        const hasDietary = healthStatus.dietaryStatus === "has";
        const confirmedNone =
            healthStatus.allergiesStatus === "none" ||
            healthStatus.medicationStatus === "none" ||
            healthStatus.dietaryStatus === "none";

        if (hasAllergies || hasMedication || hasDietary || confirmedNone) {
            return "completed";
        }
        return "pending";
    };

    const getDocumentsStatus = (): RoadmapItemStatus => {
        return documents.length > 0 ? "completed" : "pending";
    };

    const getProfileStatus = (): RoadmapItemStatus => {
        // Profile is complete if child has name and avatar
        if (child && child.name && (child.avatarUrl || child.avatarInitials)) {
            return "completed";
        }
        return "pending";
    };

    // Build sections array with status
    const sections: RoadmapSection[] = [
        {
            id: "items",
            label: "Items",
            status: getItemsStatus(),
            href: "/items",
            createHref: "/items/new",
        },
        {
            id: "contacts",
            label: "Contacts",
            status: getContactsStatus(),
            href: "/contacts",
            createHref: "/contacts/new",
        },
        {
            id: "health",
            label: "Health",
            status: getHealthStatus(),
            href: "/health",
        },
        {
            id: "documents",
            label: "Documents",
            status: getDocumentsStatus(),
            href: "/documents",
        },
        {
            id: "profile",
            label: "Profile",
            status: getProfileStatus(),
            href: "/settings/profile",
        },
    ];

    // Handle capsule click
    const handleCapsuleClick = (section: RoadmapSection) => {
        if (section.status === "pending" && section.createHref) {
            router.push(section.createHref);
        } else {
            router.push(section.href);
        }
    };

    // Check if all sections are complete
    const allComplete = sections.every(s => s.status === "completed");

    // Don't render if everything is complete
    if (allComplete) {
        return null;
    }

    return (
        <div className="setup-roadmap mb-8 md:mb-10">
            {/* Section Title */}
            <h3 className="text-center font-dmSerif text-lg md:text-xl text-forest mb-4">
                Setup for {childName}
            </h3>

            {/* Roadmap Capsules Container */}
            <div className="roadmap-container">
                <div className="roadmap-scroll">
                    <div className="roadmap-capsules">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => handleCapsuleClick(section)}
                                className={`roadmap-capsule ${
                                    section.status === "completed"
                                        ? "capsule-completed"
                                        : "capsule-pending"
                                }`}
                            >
                                {section.status === "completed" ? (
                                    <CheckIcon className="capsule-icon" />
                                ) : (
                                    <PendingDot className="capsule-icon-dot" />
                                )}
                                <span className="capsule-label">{section.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Component Styles */}
            <style jsx>{`
                .setup-roadmap {
                    width: 100%;
                }

                .roadmap-container {
                    width: 100%;
                }

                /* Desktop: centered flex row */
                .roadmap-scroll {
                    display: flex;
                    justify-content: center;
                }

                .roadmap-capsules {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 10px;
                }

                .roadmap-capsule {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 18px;
                    border-radius: 9999px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    border: 1px solid transparent;
                }

                .roadmap-capsule:hover {
                    transform: translateY(-1px);
                }

                /* Completed state */
                .capsule-completed {
                    background-color: #E7F3E8;
                    color: #2C3E2D;
                    border-color: #E7F3E8;
                }

                .capsule-completed:hover {
                    background-color: #D9EDDA;
                    border-color: #D9EDDA;
                }

                .capsule-completed .capsule-icon {
                    color: #2C3E2D;
                }

                /* Pending state */
                .capsule-pending {
                    background-color: transparent;
                    color: #8B8680;
                    border-color: #D4CFC5;
                }

                .capsule-pending:hover {
                    background-color: #F9F7F4;
                    border-color: #B8B3AA;
                    color: #5A5652;
                }

                .capsule-pending .capsule-icon-dot {
                    border-color: #B8B3AA;
                }

                .capsule-label {
                    line-height: 1;
                }

                /* Tablet: wrap into two rows */
                @media (max-width: 768px) {
                    .roadmap-capsules {
                        max-width: 360px;
                    }
                }

                /* Mobile: horizontal scroll */
                @media (max-width: 480px) {
                    .roadmap-scroll {
                        overflow-x: auto;
                        justify-content: flex-start;
                        padding-bottom: 8px;
                        margin: 0 -16px;
                        padding-left: 16px;
                        padding-right: 16px;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }

                    .roadmap-scroll::-webkit-scrollbar {
                        display: none;
                    }

                    .roadmap-capsules {
                        flex-wrap: nowrap;
                        max-width: none;
                        gap: 8px;
                    }

                    .roadmap-capsule {
                        padding: 8px 14px;
                        font-size: 13px;
                    }
                }
            `}</style>
        </div>
    );
}
