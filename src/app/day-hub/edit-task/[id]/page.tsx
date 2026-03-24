"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAppState, PetSpecies } from "@/lib/AppStateContext";
import { useDayHub, ScheduleType, FrequencyType } from "@/lib/DayHubContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import FrequencyPicker from "@/components/day-hub/FrequencyPicker";
import TimesPicker, { expandScheduledTimes } from "@/components/day-hub/TimesPicker";
import DurationPicker, { DurationType } from "@/components/day-hub/DurationPicker";
import PhaseEditor, { PhaseEntry, PhaseTaskEntry } from "@/components/day-hub/PhaseEditor";
import {
    DogIcon,
    CatIcon,
    BirdIcon,
    FishIcon,
    ReptileIcon,
    HamsterIcon,
    PawIcon,
    LucideIconComponent
} from "@/components/icons/DuotoneIcons";

// Helper to get pet species icon
function getSpeciesIcon(species: PetSpecies | string | undefined): LucideIconComponent {
    switch (species) {
        case "dog": return DogIcon;
        case "cat": return CatIcon;
        case "bird": return BirdIcon;
        case "fish": return FishIcon;
        case "reptile": return ReptileIcon;
        case "small_mammal": return HamsterIcon;
        default: return PawIcon;
    }
}

// Helper to get required times count based on frequency
function getRequiredTimesCount(frequencyType: FrequencyType, frequencyValue?: number): number {
    switch (frequencyType) {
        case "daily":
        case "every_x_days":
        case "specific_days":
        case "one_time":
            return 1;
        case "x_times_daily":
            return frequencyValue || 2;
        case "every_x_hours":
            return 1;
        default:
            return 1;
    }
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Schedule type options
const SCHEDULE_TYPES: { value: ScheduleType; label: string; emoji: string }[] = [
    { value: "medication", label: "Medication", emoji: "💊" },
    { value: "supplement", label: "Supplement", emoji: "🌿" },
    { value: "routine", label: "Routine", emoji: "📋" },
    { value: "therapy", label: "Therapy", emoji: "🧠" },
    { value: "activity", label: "Activity", emoji: "🎯" },
];

interface FamilyMember {
    id: string;
    name: string;
    type: "child" | "pet";
    avatarUrl?: string;
    avatarEmoji?: string;
    species?: string;
}

export default function EditTaskPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const params = useParams();
    const regimenId = params.id as string;

    const { children, pets, currentHomeId } = useAppState();
    const { regimens, updateRegimenFull, uploadTaskImage, refreshData, isLoaded } = useDayHub();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state (loaded from regimen)
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);
    const [phases, setPhases] = useState<PhaseEntry[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [regimenName, setRegimenName] = useState("");

    // Build family members list (memoized to avoid dependency issues)
    const familyMembers = useMemo<FamilyMember[]>(() => [
        ...children.map((c) => ({
            id: c.id,
            name: c.name,
            type: "child" as const,
            avatarUrl: c.avatarUrl,
        })),
        ...pets.map((p) => ({
            id: p.id,
            name: p.name,
            type: "pet" as const,
            avatarUrl: p.avatarUrl,
            species: p.species, // Store species for icon mapping
        })),
    ], [children, pets]);

    // Load regimen data
    useEffect(() => {
        // Wait for data to be loaded
        if (!isLoaded) return;

        if (!regimenId) {
            setError("No task ID provided");
            setIsLoading(false);
            return;
        }

        console.log("Looking for regimen:", regimenId);
        console.log("Available regimens:", regimens.map(r => ({ id: r.id, name: r.name })));

        const regimen = regimens.find((r) => r.id === regimenId);
        if (!regimen) {
            console.log("Regimen not found with ID:", regimenId);
            setError("Task not found. This may be a simple task that doesn't support editing yet.");
            setIsLoading(false);
            return;
        }

        console.log("Found regimen:", regimen.name);

        // Set basic info
        setRegimenName(regimen.name);
        setScheduleType(regimen.regimenType);
        setStartDate(regimen.startDate);

        // Find the family member
        if (regimen.childId) {
            const child = familyMembers.find((m) => m.id === regimen.childId && m.type === "child");
            if (child) setSelectedMember(child);
        } else if (regimen.petId) {
            const pet = familyMembers.find((m) => m.id === regimen.petId && m.type === "pet");
            if (pet) setSelectedMember(pet);
        }

        // Convert phases to form state
        const loadedPhases: PhaseEntry[] = (regimen.phases || []).map((phase) => ({
            id: phase.id,
            name: phase.name || "",
            durationType: phase.endDate
                ? "end_date"
                : phase.durationDays !== null && phase.durationDays !== undefined
                    ? "days"
                    : "forever",
            durationDays: phase.durationDays,
            endDate: phase.endDate,
            tasks: (phase.tasks || []).map((task) => ({
                id: task.id,
                name: task.name,
                description: task.description || "",
                taskType: task.taskType,
                frequencyType: task.frequencyType,
                frequencyValue: task.frequencyValue,
                scheduledTimes: task.scheduledTimes || ["08:00"],
                daysOfWeek: task.daysOfWeek,
                imageUrls: task.imageUrls,
            })),
        }));

        if (loadedPhases.length > 0) {
            setPhases(loadedPhases);
        }

        setIsLoading(false);
    }, [regimenId, regimens, familyMembers, isLoaded]);

    // Helper to check if we're in multi-phase mode
    const isMultiPhase = phases.length > 1;
    const firstPhase = phases[0];
    const firstTask = firstPhase?.tasks[0];

    // Update first task
    const updateFirstTask = (updates: Partial<PhaseTaskEntry>) => {
        setPhases((prev) => {
            const newPhases = [...prev];
            newPhases[0] = {
                ...newPhases[0],
                tasks: [{ ...newPhases[0].tasks[0], ...updates }],
            };
            return newPhases;
        });
    };

    // Update first phase duration
    const updateFirstPhaseDuration = (updates: Partial<Pick<PhaseEntry, "durationType" | "durationDays" | "endDate">>) => {
        setPhases((prev) => {
            const newPhases = [...prev];
            newPhases[0] = { ...newPhases[0], ...updates };
            return newPhases;
        });
    };

    // Update phase
    const updatePhase = (phaseId: string, updatedPhase: PhaseEntry) => {
        setPhases(phases.map((p) => (p.id === phaseId ? updatedPhase : p)));
    };

    // Add phase
    const addPhase = () => {
        const updatedPhases = phases.map((p, i) => ({
            ...p,
            name: p.name || `Phase ${i + 1}`,
        }));

        const newPhase: PhaseEntry = {
            id: generateId(),
            name: `Phase ${updatedPhases.length + 1}`,
            durationType: "days",
            durationDays: undefined,
            tasks: [
                {
                    id: generateId(),
                    name: "",
                    description: "",
                    taskType: scheduleType!,
                    frequencyType: "daily",
                    frequencyValue: 1,
                    scheduledTimes: ["08:00"],
                },
            ],
        };
        setPhases([...updatedPhases, newPhase]);
    };

    // Remove phase
    const removePhase = (phaseId: string) => {
        const newPhases = phases.filter((p) => p.id !== phaseId);
        if (newPhases.length === 1) {
            newPhases[0] = { ...newPhases[0], name: "" };
        }
        setPhases(newPhases);
    };

    // Image handlers
    const handleImageSelect = (file: File) => {
        const preview = URL.createObjectURL(file);
        const currentFiles = firstTask?.imageFiles || [];
        const currentPreviews = firstTask?.imagePreviews || [];
        updateFirstTask({
            imageFiles: [...currentFiles, file],
            imagePreviews: [...currentPreviews, preview]
        });
    };

    const removeImage = (index: number) => {
        const currentFiles = firstTask?.imageFiles || [];
        const currentPreviews = firstTask?.imagePreviews || [];
        const currentUrls = firstTask?.imageUrls || [];
        const urlsLength = currentUrls.length;

        if (index < urlsLength) {
            // Removing a persisted image from imageUrls
            updateFirstTask({
                imageUrls: currentUrls.filter((_, i) => i !== index),
            });
        } else {
            // Removing a pending image from imageFiles/imagePreviews
            const pendingIndex = index - urlsLength;
            if (currentPreviews[pendingIndex]) {
                URL.revokeObjectURL(currentPreviews[pendingIndex]);
            }
            updateFirstTask({
                imageFiles: currentFiles.filter((_, i) => i !== pendingIndex),
                imagePreviews: currentPreviews.filter((_, i) => i !== pendingIndex),
            });
        }
    };

    // Calculate phase start dates
    const getPhaseStartDate = (phaseIndex: number): string => {
        if (phaseIndex === 0) return startDate;

        let currentDate = new Date(startDate);
        for (let i = 0; i < phaseIndex; i++) {
            const phase = phases[i];
            if (phase.durationType === "days" && phase.durationDays) {
                currentDate.setDate(currentDate.getDate() + phase.durationDays);
            } else if (phase.durationType === "end_date" && phase.endDate) {
                currentDate = new Date(phase.endDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        return currentDate.toISOString().split("T")[0];
    };

    // Validation
    const canSave = (): boolean => {
        return phases.every((phase) =>
            (phase.durationType === "forever" ||
             (phase.durationType === "days" && phase.durationDays && phase.durationDays > 0) ||
             (phase.durationType === "end_date" && phase.endDate)) &&
            phase.tasks.length > 0 && phase.tasks.every((task) => task.name.trim().length > 0)
        );
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!canSave()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Upload any new images first
            const phasesWithImages = await Promise.all(
                phases.map(async (phase) => {
                    const tasksWithImages = await Promise.all(
                        phase.tasks.map(async (task) => {
                            // Upload all new files
                            const newUrls: string[] = [];
                            if (task.imageFiles && task.imageFiles.length > 0) {
                                for (const file of task.imageFiles) {
                                    const uploadResult = await uploadTaskImage(file);
                                    if (!uploadResult.success) {
                                        throw new Error(`Failed to upload image: ${uploadResult.error}`);
                                    }
                                    if (uploadResult.url) {
                                        newUrls.push(uploadResult.url);
                                    }
                                }
                            }
                            // Combine existing URLs with newly uploaded ones
                            const existingUrls = task.imageUrls || [];
                            return {
                                ...task,
                                imageUrls: [...existingUrls, ...newUrls],
                            };
                        })
                    );
                    return {
                        ...phase,
                        tasks: tasksWithImages,
                    };
                })
            );

            // 2. Build the full payload and call updateRegimenFull
            const result = await updateRegimenFull(
                regimenId,
                {
                    name: regimenName,
                    startDate: startDate,
                },
                phasesWithImages.map((phase) => ({
                    id: phase.id,
                    name: phase.name,
                    durationDays: phase.durationType === "days" ? phase.durationDays : undefined,
                    endDate: phase.durationType === "end_date" ? phase.endDate : undefined,
                    tasks: phase.tasks.map((task) => {
                        // Expand scheduledTimes to required count (ensures 2x/3x/4x daily have all times)
                        const requiredCount = getRequiredTimesCount(task.frequencyType, task.frequencyValue);
                        const expandedTimes = expandScheduledTimes(task.scheduledTimes, requiredCount);

                        return {
                            id: task.id,
                            name: task.name,
                            description: task.description,
                            taskType: task.taskType,
                            frequencyType: task.frequencyType,
                            frequencyValue: task.frequencyValue,
                            scheduledTimes: expandedTimes,
                            daysOfWeek: task.daysOfWeek,
                            imageUrls: task.imageUrls,
                        };
                    }),
                }))
            );

            // 3. Check the result for success/failure
            if (!result.success) {
                setError(result.error || "Failed to update task. Please try again.");
                setIsSubmitting(false);
                return;
            }

            // 4. Refresh data and navigate on success
            await refreshData();
            router.push("/day-hub");
        } catch (err) {
            console.error("Error updating task:", err);
            setError(err instanceof Error ? err.message : "Failed to update task. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    if (error && !firstTask) {
        return (
            <AppShell>
                <div className="max-w-[520px] mx-auto">
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl mx-auto mb-4">
                            :(
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">{error}</h3>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-6 py-2 bg-forest text-white rounded-xl"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="max-w-[520px] mx-auto">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="font-dmSerif text-2xl text-forest">Edit Task</h1>
                            <p className="text-sm text-textSub">{regimenName}</p>
                        </div>
                    </div>

                    {/* Form */}
                    {firstTask && (
                        <div className="space-y-5">
                            {/* Family member display */}
                            {selectedMember && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    {selectedMember.avatarUrl ? (
                                        <img
                                            src={selectedMember.avatarUrl}
                                            alt={selectedMember.name}
                                            className="w-10 h-10 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-sage/30 flex items-center justify-center text-xl">
                                            {selectedMember.type === "pet" ? (
                                                React.createElement(getSpeciesIcon(selectedMember.species), { size: 22 })
                                            ) : (
                                                selectedMember.name[0] || "👤"
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium text-forest">{selectedMember.name}</div>
                                        <div className="text-xs text-textSub capitalize">{selectedMember.type}</div>
                                    </div>
                                    <span className="ml-auto text-sm bg-white px-2 py-1 rounded-lg">
                                        {SCHEDULE_TYPES.find((t) => t.value === scheduleType)?.emoji}
                                        {SCHEDULE_TYPES.find((t) => t.value === scheduleType)?.label}
                                    </span>
                                </div>
                            )}

                            {/* Task name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-forest">
                                    {scheduleType === "medication" ? "Medication name" :
                                     scheduleType === "supplement" ? "Supplement name" :
                                     "Task name"} *
                                </label>
                                <input
                                    type="text"
                                    value={firstTask.name}
                                    onChange={(e) => updateFirstTask({ name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-forest">
                                    {scheduleType === "medication" || scheduleType === "supplement"
                                        ? "Dose / instructions"
                                        : "Description"} (optional)
                                </label>
                                <textarea
                                    value={firstTask.description || ""}
                                    onChange={(e) => updateFirstTask({ description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest resize-none"
                                />
                            </div>

                            {/* Photos */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-forest">Photos (optional)</label>
                                <div className="flex flex-wrap gap-2">
                                    {/* Existing images from database */}
                                    {firstTask.imageUrls?.map((url, index) => (
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
                                    {firstTask.imagePreviews?.map((preview, index) => (
                                        <div key={`preview-${index}`} className="relative w-20 h-20">
                                            <img
                                                src={preview}
                                                alt={`Task ${index + 1}`}
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage((firstTask.imageUrls?.length || 0) + index)}
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
                                            ref={fileInputRef}
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
                                frequencyType={firstTask.frequencyType}
                                frequencyValue={firstTask.frequencyValue || 1}
                                daysOfWeek={firstTask.daysOfWeek || []}
                                onChange={(update) => {
                                    updateFirstTask({
                                        ...(update.frequencyType !== undefined && { frequencyType: update.frequencyType }),
                                        ...(update.frequencyValue !== undefined && { frequencyValue: update.frequencyValue }),
                                        ...(update.daysOfWeek !== undefined && { daysOfWeek: update.daysOfWeek }),
                                    });
                                }}
                            />

                            {/* Date for one-time */}
                            {firstTask.frequencyType === "one_time" && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-forest">Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                                    />
                                </div>
                            )}

                            {/* Time for one-time */}
                            {firstTask.frequencyType === "one_time" && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-forest">Time</label>
                                    <input
                                        type="time"
                                        value={firstTask.scheduledTimes[0] || "08:00"}
                                        onChange={(e) => updateFirstTask({ scheduledTimes: [e.target.value] })}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                                    />
                                </div>
                            )}

                            {/* Times for repeating */}
                            {firstTask.frequencyType !== "one_time" && (
                                <TimesPicker
                                    times={firstTask.scheduledTimes}
                                    frequencyType={firstTask.frequencyType}
                                    frequencyValue={firstTask.frequencyValue || 1}
                                    onChange={(times) => updateFirstTask({ scheduledTimes: times })}
                                />
                            )}

                            {/* Start date for repeating */}
                            {firstTask.frequencyType !== "one_time" && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-forest">Starts on</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                                    />
                                </div>
                            )}

                            {/* Duration for repeating */}
                            {firstTask.frequencyType !== "one_time" && (
                                <DurationPicker
                                    durationType={firstPhase.durationType}
                                    durationDays={firstPhase.durationDays}
                                    endDate={firstPhase.endDate}
                                    startDate={startDate}
                                    onChange={(update) => {
                                        updateFirstPhaseDuration({
                                            durationType: update.durationType,
                                            durationDays: update.durationDays,
                                            endDate: update.endDate,
                                        });
                                    }}
                                />
                            )}

                            {/* Multi-phase phases */}
                            {isMultiPhase && (
                                <div className="space-y-4 pt-4">
                                    <h3 className="font-semibold text-forest">Phases</h3>
                                    {phases.slice(1).map((phase, index) => (
                                        <PhaseEditor
                                            key={phase.id}
                                            phase={phase}
                                            phaseIndex={index + 1}
                                            isLast={index === phases.length - 2}
                                            defaultTaskType={scheduleType!}
                                            startDate={getPhaseStartDate(index + 1)}
                                            onUpdate={(updated) => updatePhase(phase.id, updated)}
                                            onRemove={() => removePhase(phase.id)}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addPhase}
                                        className="w-full py-3 border-2 border-dashed border-forest/30 rounded-xl text-forest font-medium hover:border-forest hover:bg-forest/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Add another phase
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => router.back()}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!canSave() || isSubmitting}
                                    className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
