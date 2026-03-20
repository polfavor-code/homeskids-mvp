"use client";

import React from "react";
import { FrequencyType } from "@/lib/DayHubContext";

interface TimesPickerProps {
    times: string[];
    frequencyType: FrequencyType;
    frequencyValue?: number;
    onChange: (times: string[]) => void;
}

// Preset times for quick selection
const PRESET_TIMES = [
    { value: "06:00", label: "6:00 AM" },
    { value: "08:00", label: "8:00 AM" },
    { value: "10:00", label: "10:00 AM" },
    { value: "12:00", label: "12:00 PM" },
    { value: "14:00", label: "2:00 PM" },
    { value: "16:00", label: "4:00 PM" },
    { value: "18:00", label: "6:00 PM" },
    { value: "20:00", label: "8:00 PM" },
    { value: "22:00", label: "10:00 PM" },
];

// Format time for display (24h to 12h)
function formatTime(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export default function TimesPicker({
    times,
    frequencyType,
    frequencyValue,
    onChange,
}: TimesPickerProps) {
    // Determine how many times we need based on frequency
    const getRequiredTimesCount = (): number => {
        switch (frequencyType) {
            case "daily":
            case "every_x_days":
            case "specific_days":
                return 1;
            case "x_times_daily":
                return frequencyValue || 2;
            case "every_x_hours":
                return 1; // Just need start time
            default:
                return 1;
        }
    };

    const requiredTimes = getRequiredTimesCount();
    const currentTimes = times.slice(0, requiredTimes);

    // Ensure we have enough time slots
    while (currentTimes.length < requiredTimes) {
        // Add default times based on position
        if (currentTimes.length === 0) currentTimes.push("08:00");
        else if (currentTimes.length === 1) currentTimes.push("20:00");
        else if (currentTimes.length === 2) currentTimes.push("14:00");
        else currentTimes.push("12:00");
    }

    const handleTimeChange = (index: number, newTime: string) => {
        const updated = [...currentTimes];
        updated[index] = newTime;
        // Sort times chronologically
        updated.sort((a, b) => a.localeCompare(b));
        onChange(updated);
    };

    const getTimeLabel = (index: number): string => {
        if (frequencyType === "every_x_hours") {
            return "Starting at";
        }
        if (requiredTimes === 1) {
            return "Time";
        }
        const labels = ["First dose", "Second dose", "Third dose", "Fourth dose"];
        return labels[index] || `Time ${index + 1}`;
    };

    return (
        <div className="space-y-4">
            {frequencyType === "every_x_hours" && (
                <p className="text-sm text-textSub">
                    First dose time - subsequent doses will be scheduled every {frequencyValue || 6} hours
                </p>
            )}

            {currentTimes.map((time, index) => (
                <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        {getTimeLabel(index)}
                    </label>

                    {/* Time input */}
                    <div className="flex gap-2">
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => handleTimeChange(index, e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest text-forest font-medium"
                        />
                    </div>

                    {/* Quick select presets */}
                    <div className="flex flex-wrap gap-1.5">
                        {PRESET_TIMES.filter((_, i) => i % 2 === 0).map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => handleTimeChange(index, preset.value)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${time === preset.value
                                        ? "bg-forest text-white"
                                        : "bg-gray-100 text-textSub hover:bg-gray-200"
                                    }
                                `}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Preview for every_x_hours */}
            {frequencyType === "every_x_hours" && (
                <div className="mt-4 p-3 bg-sage/20 rounded-xl">
                    <p className="text-sm font-medium text-forest mb-2">Scheduled times today:</p>
                    <div className="flex flex-wrap gap-2">
                        {(() => {
                            const startTime = currentTimes[0] || "08:00";
                            const [startHour] = startTime.split(":").map(Number);
                            const interval = frequencyValue || 6;
                            const scheduledTimes: string[] = [];
                            let currentHour = startHour;

                            while (currentHour < 24) {
                                scheduledTimes.push(`${String(currentHour).padStart(2, "0")}:00`);
                                currentHour += interval;
                            }

                            return scheduledTimes.map((t) => (
                                <span
                                    key={t}
                                    className="px-2.5 py-1 bg-white rounded-lg text-xs font-medium text-forest"
                                >
                                    {formatTime(t)}
                                </span>
                            ));
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
