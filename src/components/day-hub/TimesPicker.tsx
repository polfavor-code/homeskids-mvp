"use client";

import React, { useMemo } from "react";
import { FrequencyType } from "@/lib/DayHubContext";

interface TimesPickerProps {
    times: string[];
    frequencyType: FrequencyType;
    frequencyValue?: number;
    onChange: (times: string[]) => void;
}

// Preset times for quick selection (3-6-9 pattern, starting at 6 AM)
const PRESET_TIMES = [
    { value: "06:00", label: "6 AM" },
    { value: "09:00", label: "9 AM" },
    { value: "12:00", label: "Noon" },
    { value: "15:00", label: "3 PM" },
    { value: "18:00", label: "6 PM" },
    { value: "21:00", label: "9 PM" },
    { value: "00:00", label: "Midnight" },
    { value: "03:00", label: "3 AM" },
];

// Format time for display (24h to 12h)
function formatTime(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Helper to get default times for filling in missing slots
// Exported so it can be used when saving tasks
export function getDefaultTime(index: number): string {
    const defaults = ["09:00", "12:00", "15:00", "18:00"];
    return defaults[index] || "18:00";
}

// Helper to expand times array to required count
// Exported so it can be used when saving tasks
export function expandScheduledTimes(times: string[], requiredCount: number): string[] {
    const result = [...times.slice(0, requiredCount)];
    while (result.length < requiredCount) {
        result.push(getDefaultTime(result.length));
    }
    result.sort((a, b) => a.localeCompare(b));
    return result;
}

export default function TimesPicker({
    times,
    frequencyType,
    frequencyValue,
    onChange,
}: TimesPickerProps) {
    // Determine how many times we need based on frequency
    const requiredTimes = useMemo((): number => {
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
    }, [frequencyType, frequencyValue]);

    // Build the current times array, filling in defaults if needed (for display)
    const currentTimes = useMemo(() => {
        const result = times.slice(0, requiredTimes);
        while (result.length < requiredTimes) {
            result.push(getDefaultTime(result.length));
        }
        return result;
    }, [times, requiredTimes]);

    const handleTimeChange = (index: number, newTime: string) => {
        const updated = [...currentTimes];
        updated[index] = newTime;
        // Sort times chronologically
        updated.sort((a, b) => a.localeCompare(b));
        onChange(updated);
    };

    const getTimeLabel = (index: number, totalTimes: number): string => {
        if (frequencyType === "every_x_hours") {
            return "Starting at";
        }
        if (totalTimes === 1) {
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
                        {getTimeLabel(index, requiredTimes)}
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
                        {PRESET_TIMES.map((preset) => (
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
