"use client";

import React from "react";

export type DurationType = "days" | "end_date" | "forever";

interface DurationPickerProps {
    durationType: DurationType;
    durationDays?: number;
    endDate?: string;
    startDate?: string; // Used to calculate minimum end date
    onChange: (update: {
        durationType: DurationType;
        durationDays?: number;
        endDate?: string;
    }) => void;
}

export default function DurationPicker({
    durationType,
    durationDays,
    endDate,
    startDate,
    onChange,
}: DurationPickerProps) {
    // Calculate minimum end date (must be after start date)
    const minEndDate = startDate || new Date().toISOString().split("T")[0];

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-forest">Duration</label>

            {/* Duration type buttons */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onChange({ durationType: "days", durationDays, endDate: undefined })}
                    className={`
                        flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                        ${durationType === "days"
                            ? "border-forest bg-forest text-white"
                            : "border-gray-200 text-forest hover:border-gray-300"
                        }
                    `}
                >
                    {durationType === "days" && durationDays ? `For ${durationDays} days` : "For X days"}
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ durationType: "end_date", durationDays: undefined, endDate })}
                    className={`
                        flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                        ${durationType === "end_date"
                            ? "border-forest bg-forest text-white"
                            : "border-gray-200 text-forest hover:border-gray-300"
                        }
                    `}
                >
                    Until date
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ durationType: "forever", durationDays: undefined, endDate: undefined })}
                    className={`
                        flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                        ${durationType === "forever"
                            ? "border-forest bg-forest text-white"
                            : "border-gray-200 text-forest hover:border-gray-300"
                        }
                    `}
                >
                    Forever
                </button>
            </div>

            {/* Days input */}
            {durationType === "days" && (
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={durationDays || ""}
                        onChange={(e) => onChange({
                            durationType: "days",
                            durationDays: parseInt(e.target.value) || undefined,
                            endDate: undefined
                        })}
                        min="1"
                        max="365"
                        placeholder="7"
                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-center focus:outline-none focus:border-forest"
                    />
                    <span className="text-sm text-textSub">days</span>
                    <div className="flex gap-1.5 ml-2">
                        {[7, 14, 21, 30].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => onChange({ durationType: "days", durationDays: d, endDate: undefined })}
                                className={`
                                    px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${durationDays === d
                                        ? "bg-forest text-white"
                                        : "bg-gray-100 text-textSub hover:bg-gray-200"
                                    }
                                `}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* End date input */}
            {durationType === "end_date" && (
                <input
                    type="date"
                    value={endDate || ""}
                    onChange={(e) => onChange({
                        durationType: "end_date",
                        durationDays: undefined,
                        endDate: e.target.value
                    })}
                    min={minEndDate}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                />
            )}

            {/* Forever description */}
            {durationType === "forever" && (
                <p className="text-xs text-textSub">
                    This will continue indefinitely until you stop it manually.
                </p>
            )}
        </div>
    );
}
