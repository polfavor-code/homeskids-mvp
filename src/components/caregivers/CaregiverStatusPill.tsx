"use client";

import React from "react";
import { CaregiverStatus } from "@/lib/AppStateContextV2";

interface CaregiverStatusPillProps {
    status: CaregiverStatus;
    className?: string;
}

/**
 * Displays a status pill for caregivers with appropriate styling:
 * - Active: green/positive styling (connected to >= 1 home)
 * - Inactive: neutral gray styling (connected to 0 homes)
 * - Pending: amber/warning styling (invite not yet accepted)
 */
export default function CaregiverStatusPill({ status, className = "" }: CaregiverStatusPillProps) {
    const getStatusStyles = () => {
        switch (status) {
            case "active":
                return "bg-softGreen text-forest";
            case "inactive":
                return "bg-gray-100 text-gray-500";
            case "pending":
                return "bg-amber-100 text-amber-700";
            default:
                return "bg-gray-100 text-gray-500";
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case "active":
                return "Active";
            case "inactive":
                return "Inactive";
            case "pending":
                return "Pending";
            default:
                return status;
        }
    };

    return (
        <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyles()} ${className}`}
        >
            {getStatusLabel()}
        </span>
    );
}
