"use client";

import React from "react";
import { FrequencyType, ScheduleType } from "@/lib/DayHubContext";
import FrequencyPicker from "./FrequencyPicker";
import TimesPicker from "./TimesPicker";

export interface PhaseTaskEntry {
    id: string;
    name: string;
    description: string;
    taskType: ScheduleType;
    frequencyType: FrequencyType;
    frequencyValue?: number;
    scheduledTimes: string[];
    daysOfWeek?: number[];
    imageFile?: File;
    imagePreview?: string;
    imageUrl?: string; // For existing images from database
}

export interface PhaseEntry {
    id: string;
    name: string;
    durationDays?: number;
    endDate?: string;
    durationType: "days" | "end_date" | "forever";
    tasks: PhaseTaskEntry[]; // Always exactly 1 task
}

interface PhaseEditorProps {
    phase: PhaseEntry;
    phaseIndex: number;
    isLast: boolean;
    defaultTaskType: ScheduleType;
    startDate: string;
    onStartDateChange?: (date: string) => void;
    hideStartDate?: boolean;
    onUpdate: (phase: PhaseEntry) => void;
    onRemove: () => void;
}

// Format date for display
function formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PhaseEditor({
    phase,
    phaseIndex,
    isLast,
    defaultTaskType,
    startDate,
    onStartDateChange,
    hideStartDate,
    onUpdate,
    onRemove,
}: PhaseEditorProps) {
    // Single task per phase
    const task = phase.tasks[0];

    const updatePhase = (updates: Partial<PhaseEntry>) => {
        onUpdate({ ...phase, ...updates });
    };

    const updateTask = (updates: Partial<PhaseTaskEntry>) => {
        onUpdate({
            ...phase,
            tasks: [{ ...task, ...updates }],
        });
    };

    const handleImageSelect = (file: File) => {
        const preview = URL.createObjectURL(file);
        updateTask({ imageFile: file, imagePreview: preview });
    };

    const removeImage = () => {
        if (task.imagePreview) URL.revokeObjectURL(task.imagePreview);
        updateTask({ imageFile: undefined, imagePreview: undefined });
    };

    return (
        <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
            {/* Phase header */}
            <div className="bg-sage/20 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center font-bold text-sm">
                        {phaseIndex + 1}
                    </div>
                    <span className="font-semibold text-forest">
                        Phase {phaseIndex + 1}
                    </span>
                </div>
                {phaseIndex > 0 && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-red-500 text-sm font-medium hover:text-red-600"
                    >
                        Remove
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Start date - hide for phase 0 if hideStartDate is true */}
                {!(phaseIndex === 0 && hideStartDate) && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-forest">
                            {phaseIndex === 0 ? "Starts on" : "Starts on (auto)"}
                        </label>
                        {phaseIndex === 0 ? (
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => onStartDateChange?.(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                            />
                        ) : (
                            <div className="px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-forest">
                                {formatDateDisplay(startDate)}
                                <span className="text-xs text-textSub ml-2">(after Phase {phaseIndex} ends)</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Task name */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        {defaultTaskType === "medication" ? "Medication name" :
                         defaultTaskType === "supplement" ? "Supplement name" :
                         "Task name"} *
                    </label>
                    <input
                        type="text"
                        value={task.name}
                        onChange={(e) => updateTask({ name: e.target.value })}
                        placeholder={
                            defaultTaskType === "medication" ? "e.g., Prednisone 20mg" :
                            defaultTaskType === "supplement" ? "e.g., Vitamin D 1000IU" :
                            "e.g., Task name"
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                    />
                </div>

                {/* Description / Dose */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">
                        {defaultTaskType === "medication" || defaultTaskType === "supplement"
                            ? "Dose / instructions"
                            : "Description"} (optional)
                    </label>
                    <textarea
                        value={task.description}
                        onChange={(e) => updateTask({ description: e.target.value })}
                        placeholder={
                            defaultTaskType === "medication"
                                ? "e.g., Take with food"
                                : defaultTaskType === "supplement"
                                    ? "e.g., Take with breakfast"
                                    : "Any additional notes..."
                        }
                        rows={2}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest resize-none"
                    />
                </div>

                {/* Photo */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">Photo (optional)</label>
                    {task.imagePreview ? (
                        <div className="relative w-24 h-24">
                            <img
                                src={task.imagePreview}
                                alt="Task"
                                className="w-full h-full object-cover rounded-xl"
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <label className="block w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-forest transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageSelect(file);
                                }}
                                className="hidden"
                            />
                            <div className="w-full h-full flex flex-col items-center justify-center text-textSub">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                <span className="text-xs mt-1">Add</span>
                            </div>
                        </label>
                    )}
                </div>

                {/* Frequency */}
                <FrequencyPicker
                    frequencyType={task.frequencyType}
                    frequencyValue={task.frequencyValue}
                    daysOfWeek={task.daysOfWeek}
                    onChange={(update) => updateTask(update)}
                />

                {/* Times */}
                <TimesPicker
                    times={task.scheduledTimes}
                    frequencyType={task.frequencyType}
                    frequencyValue={task.frequencyValue}
                    onChange={(times) => updateTask({ scheduledTimes: times })}
                />

                {/* Duration */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">Duration</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => updatePhase({ durationType: "days", durationDays: phase.durationDays, endDate: undefined })}
                            className={`
                                flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                                ${phase.durationType === "days"
                                    ? "border-forest bg-forest text-white"
                                    : "border-gray-200 text-forest hover:border-gray-300"
                                }
                            `}
                        >
                            {phase.durationType === "days" && phase.durationDays
                                ? `For ${phase.durationDays} days`
                                : "For X days"}
                        </button>
                        <button
                            type="button"
                            onClick={() => updatePhase({ durationType: "end_date", durationDays: undefined, endDate: phase.endDate })}
                            className={`
                                flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                                ${phase.durationType === "end_date"
                                    ? "border-forest bg-forest text-white"
                                    : "border-gray-200 text-forest hover:border-gray-300"
                                }
                            `}
                        >
                            Until date
                        </button>
                        <button
                            type="button"
                            onClick={() => updatePhase({ durationType: "forever", durationDays: undefined, endDate: undefined })}
                            className={`
                                flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                                ${phase.durationType === "forever"
                                    ? "border-forest bg-forest text-white"
                                    : "border-gray-200 text-forest hover:border-gray-300"
                                }
                            `}
                        >
                            Forever
                        </button>
                    </div>

                    {phase.durationType === "days" && (
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="number"
                                value={phase.durationDays || ""}
                                onChange={(e) => updatePhase({ durationDays: parseInt(e.target.value) || undefined })}
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
                                        onClick={() => updatePhase({ durationDays: d })}
                                        className={`
                                            px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                                            ${phase.durationDays === d
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

                    {phase.durationType === "end_date" && (
                        <input
                            type="date"
                            value={phase.endDate || ""}
                            onChange={(e) => updatePhase({ endDate: e.target.value })}
                            min={startDate}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest mt-2"
                        />
                    )}

                    {phase.durationType === "forever" && isLast && (
                        <p className="text-xs text-textSub mt-1">
                            This phase will continue indefinitely until you stop it manually.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
