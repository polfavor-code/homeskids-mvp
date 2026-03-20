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
    imageFiles?: File[];
    imagePreviews?: string[];
    imageUrls?: string[]; // For existing images from database
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
        const currentFiles = task.imageFiles || [];
        const currentPreviews = task.imagePreviews || [];
        updateTask({
            imageFiles: [...currentFiles, file],
            imagePreviews: [...currentPreviews, preview]
        });
    };

    const removeImage = (index: number) => {
        const currentFiles = task.imageFiles || [];
        const currentPreviews = task.imagePreviews || [];
        const currentUrls = task.imageUrls || [];
        const urlsLength = currentUrls.length;

        if (index < urlsLength) {
            // Removing a persisted image from imageUrls
            updateTask({
                imageUrls: currentUrls.filter((_, i) => i !== index),
            });
        } else {
            // Removing a pending image from imageFiles/imagePreviews
            const pendingIndex = index - urlsLength;
            if (currentPreviews[pendingIndex]) {
                URL.revokeObjectURL(currentPreviews[pendingIndex]);
            }
            updateTask({
                imageFiles: currentFiles.filter((_, i) => i !== pendingIndex),
                imagePreviews: currentPreviews.filter((_, i) => i !== pendingIndex),
            });
        }
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

                {/* Photos */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-forest">Photos (optional)</label>
                    <div className="flex flex-wrap gap-2">
                        {/* Existing images from database */}
                        {task.imageUrls?.map((url, index) => (
                            <div key={`url-${index}`} className="relative w-20 h-20">
                                <img
                                    src={url}
                                    alt={`Task ${index + 1}`}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {/* New images being uploaded */}
                        {task.imagePreviews?.map((preview, index) => (
                            <div key={`preview-${index}`} className="relative w-20 h-20">
                                <img
                                    src={preview}
                                    alt={`Task ${index + 1}`}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage((task.imageUrls?.length || 0) + index)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {/* Add button */}
                        <label className="block w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-forest transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageSelect(file);
                                    e.target.value = "";
                                }}
                                className="hidden"
                            />
                            <div className="w-full h-full flex flex-col items-center justify-center text-textSub">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </div>
                        </label>
                    </div>
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
