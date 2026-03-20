"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useDayHub, ScheduleType, FrequencyType } from "@/lib/DayHubContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import FrequencyPicker from "@/components/day-hub/FrequencyPicker";
import TimesPicker from "@/components/day-hub/TimesPicker";
import DurationPicker, { DurationType } from "@/components/day-hub/DurationPicker";
import PhaseEditor, { PhaseEntry, PhaseTaskEntry } from "@/components/day-hub/PhaseEditor";

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

// Create default first phase
const createDefaultPhase = (scheduleType: ScheduleType | null): PhaseEntry => ({
    id: generateId(),
    name: "",
    durationType: "days",
    durationDays: undefined,
    endDate: undefined,
    tasks: [
        {
            id: generateId(),
            name: "",
            description: "",
            taskType: scheduleType || "routine",
            frequencyType: "daily",
            frequencyValue: 1,
            scheduledTimes: ["08:00"],
        },
    ],
});

export default function AddTaskPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const { children, pets, currentHomeId } = useAppState();
    const { createRegimen, uploadTaskImage } = useDayHub();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step state
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Who & What
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);

    // Step 2: Always use phases array (single phase = simple mode, 2+ phases = multi-phase mode)
    const [phases, setPhases] = useState<PhaseEntry[]>([createDefaultPhase(null)]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

    // Helper to check if we're in multi-phase mode (2+ phases)
    const isMultiPhase = phases.length > 1;

    // Shortcut refs to first phase data for single-phase UI
    const firstPhase = phases[0];
    const firstTask = firstPhase?.tasks[0];

    // Build family members list
    const familyMembers: FamilyMember[] = [
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
            avatarEmoji: p.species === "cat" ? "🐱" : p.species === "dog" ? "🐕" : "🐾",
            species: p.species,
        })),
    ];

    // Auto-generate name
    const generateName = (member: FamilyMember, type: ScheduleType): string => {
        const typeLabel = SCHEDULE_TYPES.find((t) => t.value === type)?.label || "Task";
        return `${member.name}'s ${typeLabel}`;
    };

    // Update first phase's first task (for single-phase UI)
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

    // Update first phase's duration settings
    const updateFirstPhaseDuration = (updates: Partial<Pick<PhaseEntry, "durationType" | "durationDays" | "endDate">>) => {
        setPhases((prev) => {
            const newPhases = [...prev];
            newPhases[0] = { ...newPhases[0], ...updates };
            return newPhases;
        });
    };

    // Add new phase (converts to multi-phase mode)
    const addPhase = () => {
        // If this is the first time adding a phase, name the first phase "Phase 1"
        const updatedPhases = phases.map((p, i) => ({
            ...p,
            name: `Phase ${i + 1}`,
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

    // Update phase
    const updatePhase = (phaseId: string, updatedPhase: PhaseEntry) => {
        setPhases(phases.map((p) => (p.id === phaseId ? updatedPhase : p)));
    };

    // Remove phase
    const removePhase = (phaseId: string) => {
        const newPhases = phases.filter((p) => p.id !== phaseId);
        if (newPhases.length === 1) {
            // Back to single phase - remove the "Phase 1" name
            newPhases[0] = { ...newPhases[0], name: "" };
        }
        if (newPhases.length === 0) {
            // Should not happen, but reset to default
            setPhases([createDefaultPhase(scheduleType)]);
        } else {
            setPhases(newPhases);
        }
    };

    // Image handlers (for single-phase mode)
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

        if (currentPreviews[index]) URL.revokeObjectURL(currentPreviews[index]);

        updateFirstTask({
            imageFiles: currentFiles.filter((_, i) => i !== index),
            imagePreviews: currentPreviews.filter((_, i) => i !== index),
        });
    };

    // Validation
    const canProceed = (): boolean => {
        if (step === 1) {
            return !!selectedMember && !!scheduleType;
        }
        if (step === 2) {
            // All phases must have valid duration and at least one task with a name
            // For medications, description (dose) is also required
            return phases.every((phase) =>
                (phase.durationType === "forever" ||
                 (phase.durationType === "days" && phase.durationDays && phase.durationDays > 0) ||
                 (phase.durationType === "end_date" && phase.endDate)) &&
                phase.tasks.length > 0 && phase.tasks.every((task) =>
                    task.name.trim().length > 0 &&
                    (scheduleType !== "medication" || (task.description && task.description.trim().length > 0))
                )
            );
        }
        return true;
    };

    // Calculate phase start dates
    const getPhaseStartDate = (phaseIndex: number): string => {
        if (phaseIndex === 0) return startDate;

        // Calculate cumulatively based on previous phases
        let currentDate = new Date(startDate);

        for (let i = 0; i < phaseIndex; i++) {
            const phase = phases[i];
            if (phase.durationType === "days" && phase.durationDays) {
                // Add duration days to current date
                currentDate.setDate(currentDate.getDate() + phase.durationDays);
            } else if (phase.durationType === "end_date" && phase.endDate) {
                // Use end date + 1 day as the next phase start
                currentDate = new Date(phase.endDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // If durationType is "forever", subsequent phases won't have a valid start date
            // but we still return something reasonable
        }

        return currentDate.toISOString().split("T")[0];
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!selectedMember || !scheduleType) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const regimenName = generateName(selectedMember, scheduleType);

            // Build phases with uploaded images
            const phasesWithImages = await Promise.all(
                phases.map(async (phase) => {
                    const tasksWithImages = await Promise.all(
                        phase.tasks.map(async (task, taskIndex) => {
                            // Upload all images
                            const imageUrls: string[] = [];
                            if (task.imageFiles && task.imageFiles.length > 0) {
                                for (const file of task.imageFiles) {
                                    const result = await uploadTaskImage(file);
                                    if (result.success && result.url) {
                                        imageUrls.push(result.url);
                                    }
                                }
                            }
                            return {
                                name: task.name,
                                description: task.description || undefined,
                                taskType: task.taskType,
                                frequencyType: task.frequencyType,
                                frequencyValue: task.frequencyValue,
                                scheduledTimes: task.scheduledTimes,
                                daysOfWeek: task.daysOfWeek,
                                sortOrder: taskIndex,
                                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                            };
                        })
                    );

                    // Calculate duration_days from end_date if needed
                    let finalDurationDays: number | undefined = undefined;
                    if (phase.durationType === "days") {
                        finalDurationDays = phase.durationDays;
                    } else if (phase.durationType === "end_date" && phase.endDate) {
                        const phaseStart = new Date(getPhaseStartDate(phases.indexOf(phase)));
                        const end = new Date(phase.endDate);
                        finalDurationDays = Math.ceil((end.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    }
                    // durationType === "forever" -> finalDurationDays stays undefined

                    return {
                        name: isMultiPhase ? phase.name : undefined, // Only include name for multi-phase
                        durationDays: finalDurationDays,
                        tasks: tasksWithImages,
                    };
                })
            );

            await createRegimen(
                {
                    childId: selectedMember.type === "child" ? selectedMember.id : undefined,
                    petId: selectedMember.type === "pet" ? selectedMember.id : undefined,
                    name: regimenName,
                    regimenType: scheduleType,
                    startDate,
                    status: "active",
                    homeId: currentHomeId,
                },
                phasesWithImages
            );

            router.push("/day-hub");
        } catch (err) {
            console.error("Error creating task:", err);
            setError("Failed to create task. Please try again.");
            setIsSubmitting(false);
        }
    };

    // Step count depends on mode
    const totalSteps = isMultiPhase ? 3 : 2;

    return (
        <AppShell>
            <div className="max-w-[520px] mx-auto">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (step === 1) {
                                    router.back();
                                } else {
                                    setStep(step - 1);
                                }
                            }}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="font-dmSerif text-2xl text-forest">Add Task</h1>
                            <p className="text-sm text-textSub">Step {step} of {totalSteps}</p>
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex gap-2">
                        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-1 rounded-full ${step >= s ? "bg-forest" : "bg-gray-200"}`}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <div>
                        {/* Step 1: Who & What */}
                        {step === 1 && (
                            <div className="space-y-6">
                                {/* Select family member */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-forest">Who is this for?</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {familyMembers.map((member) => (
                                            <button
                                                key={member.id}
                                                type="button"
                                                onClick={() => setSelectedMember(member)}
                                                className={`
                                                    flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                                                    ${selectedMember?.id === member.id
                                                        ? "border-forest bg-forest/5"
                                                        : "border-gray-200 hover:border-gray-300"
                                                    }
                                                `}
                                            >
                                                {member.avatarUrl ? (
                                                    <img
                                                        src={member.avatarUrl}
                                                        alt={member.name}
                                                        className="w-12 h-12 rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-sage/30 flex items-center justify-center text-2xl">
                                                        {member.avatarEmoji || "👤"}
                                                    </div>
                                                )}
                                                <div className="text-left">
                                                    <div className="font-semibold text-forest">{member.name}</div>
                                                    <div className="text-xs text-textSub capitalize">{member.type}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Schedule type - only show when member is selected */}
                                {selectedMember && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-forest">What type?</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SCHEDULE_TYPES.map((type) => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => setScheduleType(type.value)}
                                                    className={`
                                                        flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all
                                                        ${scheduleType === type.value
                                                            ? "border-forest bg-forest/5"
                                                            : "border-gray-200 hover:border-gray-300"
                                                        }
                                                    `}
                                                >
                                                    <span className="text-xl">{type.emoji}</span>
                                                    <span className="font-medium text-forest">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!canProceed()}
                                    className="w-full py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* Step 2: Task Details (Single Phase Mode) */}
                        {step === 2 && !isMultiPhase && firstTask && (
                            <div className="space-y-5">
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
                                        placeholder={
                                            scheduleType === "medication" ? "e.g., Prednisone 10mg" :
                                            scheduleType === "supplement" ? "e.g., Vitamin D" :
                                            "e.g., Morning walk"
                                        }
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-forest">
                                        {scheduleType === "medication"
                                            ? "Dose / instructions *"
                                            : scheduleType === "supplement"
                                                ? "Dose / instructions (optional)"
                                                : "Description (optional)"}
                                    </label>
                                    <textarea
                                        value={firstTask.description || ""}
                                        onChange={(e) => updateFirstTask({ description: e.target.value })}
                                        placeholder={
                                            scheduleType === "medication" ? "e.g., 10mg, take with food" :
                                            scheduleType === "supplement" ? "e.g., 500mg, 2 capsules" :
                                            "Any additional notes..."
                                        }
                                        rows={2}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest resize-none"
                                    />
                                </div>

                                {/* Photos */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-forest">Photos (optional)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Uploaded images */}
                                        {firstTask.imagePreviews?.map((preview, index) => (
                                            <div key={index} className="relative w-20 h-20">
                                                <img
                                                    src={preview}
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

                                {/* Date - for one-time tasks */}
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

                                {/* Time - for one-time tasks (single time) */}
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

                                {/* Times - for repeating tasks */}
                                {firstTask.frequencyType !== "one_time" && (
                                    <TimesPicker
                                        times={firstTask.scheduledTimes}
                                        frequencyType={firstTask.frequencyType}
                                        frequencyValue={firstTask.frequencyValue || 1}
                                        onChange={(times) => updateFirstTask({ scheduledTimes: times })}
                                    />
                                )}

                                {/* Start date - for repeating tasks */}
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

                                {/* Duration - only for repeating tasks */}
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

                                {/* Add phase button (for medications/supplements, only for repeating) */}
                                {firstTask.frequencyType !== "one_time" && (scheduleType === "medication" || scheduleType === "supplement") && (
                                    <button
                                        type="button"
                                        onClick={addPhase}
                                        className="w-full py-3 border-2 border-dashed border-forest/30 rounded-xl text-forest font-medium hover:border-forest hover:bg-forest/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Add another phase (for tapers, changing doses)
                                    </button>
                                )}

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={!canProceed() || isSubmitting}
                                    className="w-full py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {isSubmitting ? "Creating..." : "Create Task"}
                                </button>
                            </div>
                        )}

                        {/* Step 2: Multi-phase mode */}
                        {step === 2 && isMultiPhase && (
                            <div className="space-y-4">
                                <p className="text-sm text-textSub">
                                    Each phase starts when the previous one ends. Use this for medication tapers or changing doses.
                                </p>

                                {/* Start date (only editable for first phase) */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-forest">Starts on</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest"
                                    />
                                </div>

                                {phases.map((phase, index) => (
                                    <PhaseEditor
                                        key={phase.id}
                                        phase={phase}
                                        phaseIndex={index}
                                        isLast={index === phases.length - 1}
                                        defaultTaskType={scheduleType!}
                                        startDate={getPhaseStartDate(index)}
                                        hideStartDate={index === 0}
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

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setStep(3)}
                                        disabled={!canProceed()}
                                        className="w-full py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                    >
                                        Continue to Review
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review (multi-phase only) */}
                        {step === 3 && isMultiPhase && (
                            <div className="space-y-6">
                                {/* Summary card */}
                                <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        {selectedMember?.avatarUrl ? (
                                            <img
                                                src={selectedMember.avatarUrl}
                                                alt={selectedMember.name}
                                                className="w-14 h-14 rounded-xl object-cover"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-sage/30 flex items-center justify-center text-3xl">
                                                {selectedMember?.avatarEmoji || "👤"}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-forest text-lg">
                                                {selectedMember && scheduleType && generateName(selectedMember, scheduleType)}
                                            </h3>
                                            <p className="text-sm text-textSub">
                                                Starts {new Date(startDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-textSub">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-sage/20 rounded-lg">
                                            {SCHEDULE_TYPES.find((t) => t.value === scheduleType)?.emoji}
                                            {SCHEDULE_TYPES.find((t) => t.value === scheduleType)?.label}
                                        </span>
                                        <span className="ml-2">{phases.length} phases</span>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-forest">Timeline</h4>
                                    {phases.map((phase, index) => {
                                        const phaseStart = new Date(getPhaseStartDate(index));
                                        return (
                                            <div key={phase.id} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-3 h-3 rounded-full bg-forest" />
                                                    {index < phases.length - 1 && (
                                                        <div className="w-0.5 flex-1 bg-forest/30" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <div className="font-medium text-forest">
                                                        {phase.name || `Phase ${index + 1}`}
                                                    </div>
                                                    <div className="text-xs text-textSub">
                                                        {phaseStart.toLocaleDateString()} •{" "}
                                                        {phase.durationType === "forever"
                                                            ? "Ongoing"
                                                            : `${phase.durationDays} days`}
                                                    </div>
                                                    <div className="mt-2 space-y-1">
                                                        {phase.tasks.map((task) => (
                                                            <div
                                                                key={task.id}
                                                                className="text-sm bg-gray-50 rounded-lg px-3 py-2"
                                                            >
                                                                <div className="font-medium">{task.name}</div>
                                                                {task.description && (
                                                                    <div className="text-textSub text-xs mt-0.5">{task.description}</div>
                                                                )}
                                                                <div className="text-textSub mt-1">
                                                                    {task.frequencyType === "daily" && "Daily"}
                                                                    {task.frequencyType === "x_times_daily" && `${task.frequencyValue}x daily`}
                                                                    {task.frequencyType === "every_x_hours" && `Every ${task.frequencyValue}h`}
                                                                    {task.frequencyType === "every_x_days" && `Every ${task.frequencyValue} days`}
                                                                    {task.frequencyType === "specific_days" && "Specific days"}
                                                                    {" @ "}
                                                                    {task.scheduledTimes.slice(0, 2).join(", ")}
                                                                    {task.scheduledTimes.length > 2 && "..."}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl font-medium disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Creating..." : "Create Task"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
