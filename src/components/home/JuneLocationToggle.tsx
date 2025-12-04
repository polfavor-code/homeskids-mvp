import React from "react";
import { CaregiverProfile, ChildProfile } from "@/lib/AppStateContext";

interface JuneLocationToggleProps {
    child: ChildProfile | null;
    caregivers: CaregiverProfile[];
    selectedCaregiverId: string;
    onToggle: (caregiverId: string) => void;
}

/**
 * Renders a horizontal toggle of caregivers so the user can select who the child is with.
 *
 * Renders one button per caregiver, highlights the button whose id matches `selectedCaregiverId`,
 * and calls `onToggle` with the caregiver's id when a button is clicked. If `child` is null or
 * has no name, displays "your child" in the heading.
 *
 * @param child - The child profile to reference in the heading; may be `null`.
 * @param caregivers - List of caregivers to render as selectable options.
 * @param selectedCaregiverId - The id of the currently selected caregiver.
 * @param onToggle - Callback invoked with the selected caregiver's id when a caregiver is chosen.
 * @returns The JSX element for the caregiver selection toggle.
 */
export default function JuneLocationToggle({
    child,
    caregivers,
    selectedCaregiverId,
    onToggle,
}: JuneLocationToggleProps) {
    return (
        <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Where is {child?.name || "your child"} right now?</h2>
            <div className="flex p-1 bg-gray-100 rounded-xl">
                {caregivers.map((caregiver) => {
                    const isSelected = selectedCaregiverId === caregiver.id;
                    return (
                        <button
                            key={caregiver.id}
                            onClick={() => onToggle(caregiver.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isSelected
                                ? "bg-primary text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                            aria-pressed={isSelected}
                        >
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isSelected ? "bg-white/20 text-white" : `${caregiver.avatarColor} text-white`
                                    }`}
                            >
                                {caregiver.avatarInitials}
                            </div>
                            {caregiver.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}