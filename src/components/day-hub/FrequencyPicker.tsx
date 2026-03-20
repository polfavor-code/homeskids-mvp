"use client";

import React from "react";
import { FrequencyType } from "@/lib/DayHubContext";

interface FrequencyPickerProps {
    frequencyType: FrequencyType;
    frequencyValue?: number;
    daysOfWeek?: number[];
    onChange: (update: {
        frequencyType: FrequencyType;
        frequencyValue?: number;
        daysOfWeek?: number[];
    }) => void;
}

const REPEAT_OPTIONS: { value: FrequencyType; label: string; description: string }[] = [
    { value: "daily", label: "Once daily", description: "Every day at one time" },
    { value: "x_times_daily", label: "Multiple times daily", description: "2-4 times per day" },
    { value: "every_x_hours", label: "Every X hours", description: "E.g., every 6 hours" },
    { value: "every_x_days", label: "Every X days", description: "E.g., every other day" },
    { value: "specific_days", label: "Specific days", description: "Mon/Wed/Fri, etc." },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function FrequencyPicker({
    frequencyType,
    frequencyValue,
    daysOfWeek,
    onChange,
}: FrequencyPickerProps) {
    const isOneTime = frequencyType === "one_time";
    const isRepeat = !isOneTime;

    const handleModeChange = (mode: "one_time" | "repeat") => {
        if (mode === "one_time") {
            onChange({ frequencyType: "one_time", frequencyValue: undefined, daysOfWeek: undefined });
        } else {
            // Default to daily when switching to repeat
            onChange({ frequencyType: "daily", frequencyValue: undefined, daysOfWeek: undefined });
        }
    };

    const handleTypeChange = (type: FrequencyType) => {
        const update: { frequencyType: FrequencyType; frequencyValue?: number; daysOfWeek?: number[] } = {
            frequencyType: type,
        };

        // Set default values based on type
        switch (type) {
            case "x_times_daily":
                update.frequencyValue = 2;
                break;
            case "every_x_hours":
                update.frequencyValue = 6;
                break;
            case "every_x_days":
                update.frequencyValue = 2;
                break;
            case "specific_days":
                update.daysOfWeek = [1, 3, 5]; // Mon/Wed/Fri
                break;
        }

        onChange(update);
    };

    const handleValueChange = (value: number) => {
        onChange({ frequencyType, frequencyValue: value, daysOfWeek });
    };

    const toggleDayOfWeek = (day: number) => {
        const current = daysOfWeek || [];
        const updated = current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day].sort((a, b) => a - b);
        onChange({ frequencyType, frequencyValue, daysOfWeek: updated });
    };

    return (
        <div className="space-y-4">
            {/* One time vs Repeat toggle */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-forest">
                    How often?
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleModeChange("one_time")}
                        className={`
                            flex-1 py-3 rounded-xl border-2 font-medium transition-all
                            ${isOneTime
                                ? "border-forest bg-forest text-white"
                                : "border-gray-200 text-forest hover:border-gray-300"
                            }
                        `}
                    >
                        One time
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange("repeat")}
                        className={`
                            flex-1 py-3 rounded-xl border-2 font-medium transition-all
                            ${isRepeat
                                ? "border-forest bg-forest text-white"
                                : "border-gray-200 text-forest hover:border-gray-300"
                            }
                        `}
                    >
                        Repeat
                    </button>
                </div>
            </div>

            {/* Repeat frequency options */}
            {isRepeat && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        Repeat schedule
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                        {REPEAT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleTypeChange(option.value)}
                                className={`
                                    text-left px-4 py-3 rounded-xl border-2 transition-all
                                    ${frequencyType === option.value
                                        ? "border-forest bg-forest/5"
                                        : "border-gray-200 hover:border-gray-300"
                                    }
                                `}
                            >
                                <div className="font-medium text-forest">{option.label}</div>
                                <div className="text-xs text-textSub mt-0.5">{option.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Additional options based on type */}
            {frequencyType === "x_times_daily" && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        Times per day
                    </label>
                    <div className="flex gap-2">
                        {[2, 3, 4].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => handleValueChange(n)}
                                className={`
                                    flex-1 py-3 rounded-xl border-2 font-medium transition-all
                                    ${frequencyValue === n
                                        ? "border-forest bg-forest text-white"
                                        : "border-gray-200 text-forest hover:border-gray-300"
                                    }
                                `}
                            >
                                {n}x
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {frequencyType === "every_x_hours" && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        Every how many hours?
                    </label>
                    <div className="flex gap-2">
                        {[4, 6, 8, 12].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => handleValueChange(n)}
                                className={`
                                    flex-1 py-3 rounded-xl border-2 font-medium transition-all
                                    ${frequencyValue === n
                                        ? "border-forest bg-forest text-white"
                                        : "border-gray-200 text-forest hover:border-gray-300"
                                    }
                                `}
                            >
                                {n}h
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {frequencyType === "every_x_days" && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        Every how many days?
                    </label>
                    <div className="flex gap-2">
                        {[2, 3, 4, 7].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => handleValueChange(n)}
                                className={`
                                    flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all
                                    ${frequencyValue === n
                                        ? "border-forest bg-forest text-white"
                                        : "border-gray-200 text-forest hover:border-gray-300"
                                    }
                                `}
                            >
                                {n === 2 ? "Every other" : n === 7 ? "Weekly" : `Every ${n}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {frequencyType === "specific_days" && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        Which days?
                    </label>
                    <div className="flex gap-1.5">
                        {DAY_LABELS.map((label, index) => {
                            const dayNum = index + 1; // 1=Mon, 7=Sun
                            const isSelected = daysOfWeek?.includes(dayNum);
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => toggleDayOfWeek(dayNum)}
                                    className={`
                                        flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                                        ${isSelected
                                            ? "border-forest bg-forest text-white"
                                            : "border-gray-200 text-forest hover:border-gray-300"
                                        }
                                    `}
                                >
                                    {label.charAt(0)}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-textSub">
                        Selected: {daysOfWeek?.map(d => DAY_LABELS[d - 1]).join(", ") || "None"}
                    </p>
                </div>
            )}
        </div>
    );
}
