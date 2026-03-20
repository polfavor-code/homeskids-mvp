"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useDayHub, TimeSlot, DayTask, PostponeOption, TimelineTask, RegimenDayTask } from "@/lib/DayHubContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { useAuth } from "@/lib/AuthContext";

// Time slot display info
const TIME_SLOT_INFO: Record<TimeSlot, { label: string; abbrev: string; time: string }> = {
    morning: { label: "Morning", abbrev: "AM", time: "08:00" },
    afternoon: { label: "Afternoon", abbrev: "PM", time: "14:00" },
    evening: { label: "Evening", abbrev: "EV", time: "20:00" },
    night: { label: "Night", abbrev: "NT", time: "22:00" },
};

// Type tag colors
const TYPE_TAG_COLORS: Record<string, { bg: string; text: string }> = {
    medication: { bg: "#fee2e2", text: "#991b1b" },
    supplement: { bg: "#dcfce7", text: "#166534" },
    activity: { bg: "#dcfce7", text: "#166534" },
    pickup: { bg: "#e0f2fe", text: "#075985" },
    routine: { bg: "#fef9c3", text: "#854d0e" },
    custom: { bg: "#f3f4f6", text: "#374151" },
};

// Postpone options
const POSTPONE_OPTIONS: { value: PostponeOption; label: string; icon: string }[] = [
    { value: "1_hour", label: "1 hour", icon: "🕐" },
    { value: "2_hours", label: "2 hours", icon: "🕑" },
    { value: "move_to_next_slot", label: "Move to next slot", icon: "🌙" },
    { value: "skip_today", label: "Skip for today", icon: "❌" },
];

// Progress Ring Component (compact version)
function ProgressRing({ completed, total }: { completed: number; total: number }) {
    const size = 56;
    const strokeWidth = 4;
    const radius = 22;
    const circumference = radius * 2 * Math.PI;
    const percentage = total > 0 ? completed / total : 0;
    const offset = circumference - percentage * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="white"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white">
                {completed}/{total}
            </span>
        </div>
    );
}

// Delete options for recurring tasks
type DeleteOption = "this_occurrence" | "this_and_future" | "all";

// Task Card Component
function TaskCard({
    task,
    onDone,
    onPostpone,
    onUndo,
    onDelete,
    isProcessing,
    getCompleterName,
}: {
    task: TimelineTask;
    onDone: () => void;
    onPostpone: (option: PostponeOption) => void;
    onUndo: () => void;
    onDelete: (option: DeleteOption) => void;
    isProcessing: boolean;
    getCompleterName: (userId: string) => string;
}) {
    const [showPostponeSheet, setShowPostponeSheet] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showMenuSheet, setShowMenuSheet] = useState(false);
    const [showDeleteSheet, setShowDeleteSheet] = useState(false);

    // Determine if task is recurring (for showing delete options)
    const isRecurring = task.isRegimenTask
        ? true // Regimen tasks are typically recurring
        : false; // Simple tasks - would need to check isRepeating flag

    const isCompleted = task.status === "completed";
    const isPostponed = task.status === "postponed";
    const isSkipped = task.status === "skipped";

    const typeColors = TYPE_TAG_COLORS[task.taskType] || TYPE_TAG_COLORS.custom;

    return (
        <>
            <div
                className={`bg-white rounded-3xl p-5 shadow-sm transition-all ${
                    isCompleted
                        ? "opacity-65"
                        : isPostponed
                            ? "border-l-4 border-l-[#F4A261]"
                            : ""
                } ${isSkipped ? "opacity-45" : ""}`}
                style={{
                    boxShadow: "0 4px 20px rgba(44, 62, 45, 0.04)",
                    border: isPostponed ? undefined : "1px solid rgba(44, 62, 45, 0.05)",
                }}
            >
                {/* Task top section */}
                <div className="flex gap-3.5 items-start">
                    {/* Avatar - rounded square */}
                    <div
                        className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-[22px] overflow-hidden"
                        style={{
                            backgroundColor: task.familyMemberBadgeColor,
                        }}
                    >
                        {task.familyMemberAvatarUrl ? (
                            <img
                                src={task.familyMemberAvatarUrl}
                                alt={task.familyMemberName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            task.familyMemberAvatarEmoji || task.familyMemberName[0]
                        )}
                    </div>

                    {/* Task body */}
                    <div className="flex-1 min-w-0">
                        <h3
                            className={`font-bold text-base mb-0.5 text-forest transition-all ${
                                isCompleted || isSkipped ? "line-through text-[#8BA18D]" : ""
                            }`}
                        >
                            {task.name}
                        </h3>
                        {task.description && (
                            <p className="text-[13px] text-[#8BA18D] mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Name badge */}
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                                style={{
                                    backgroundColor: task.familyMemberBadgeColor,
                                    color: task.familyMemberBadgeTextColor,
                                }}
                            >
                                {task.familyMemberName}
                            </span>
                            {/* Type tag */}
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                                style={{
                                    backgroundColor: typeColors.bg,
                                    color: typeColors.text,
                                }}
                            >
                                {task.taskType}
                            </span>
                            {/* Regimen phase tag */}
                            {task.isRegimenTask && (task as RegimenDayTask).phaseName && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide bg-purple-100 text-purple-700">
                                    {(task as RegimenDayTask).phaseName}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Image thumbnail */}
                    {task.imageUrl && (
                        <button
                            onClick={() => setShowImageModal(true)}
                            className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-black/5"
                        >
                            <img
                                src={task.imageUrl}
                                alt={task.name}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    )}

                    {/* Three-dot menu button */}
                    <button
                        onClick={() => setShowMenuSheet(true)}
                        className="w-8 h-8 flex items-center justify-center text-textSub hover:text-forest transition-colors rounded-lg hover:bg-gray-100 flex-shrink-0"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="8" cy="3" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="8" cy="13" r="1.5" />
                        </svg>
                    </button>
                </div>

                {/* Postponed label */}
                {isPostponed && task.postponeReason && (
                    <p className="text-[11px] font-semibold text-[#F4A261] mt-1.5">
                        {task.postponeReason === "1_hour" && "Postponed 1h"}
                        {task.postponeReason === "2_hours" && "Postponed 2h"}
                        {task.postponeReason === "move_to_next_slot" && "Moved to next slot"}
                        {task.postponeReason === "skip_today" && "Skipped for today"}
                    </p>
                )}

                {/* Action buttons (when not completed/skipped) */}
                {!isCompleted && !isSkipped && !isPostponed && (
                    <div className="flex gap-2.5 mt-4 pt-4 border-t border-forest/5">
                        <button
                            onClick={onDone}
                            disabled={isProcessing}
                            className="flex-[2] py-2.5 px-4 rounded-xl bg-forest text-white font-semibold text-sm transition-transform active:scale-95 disabled:opacity-50"
                        >
                            Done
                        </button>
                        <button
                            onClick={() => setShowPostponeSheet(true)}
                            disabled={isProcessing}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm transition-transform active:scale-95 disabled:opacity-50"
                        >
                            Later
                        </button>
                    </div>
                )}

                {/* Postponed actions */}
                {isPostponed && (
                    <div className="flex gap-2.5 mt-3.5 pt-3.5 border-t border-forest/5">
                        <button
                            onClick={onDone}
                            disabled={isProcessing}
                            className="flex-1 py-2.5 px-3.5 rounded-xl bg-forest text-white font-semibold text-[13px] transition-transform active:scale-95 disabled:opacity-50"
                        >
                            Do it now
                        </button>
                        <button
                            onClick={onUndo}
                            disabled={isProcessing}
                            className="flex-1 py-2.5 px-3.5 rounded-xl bg-gray-100 text-gray-500 font-semibold text-[13px] transition-transform active:scale-95 disabled:opacity-50"
                        >
                            Undo
                        </button>
                    </div>
                )}

                {/* Completed stamp with undo */}
                {isCompleted && (
                    <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-forest/5">
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#4A7C59]">
                            <span className="w-5 h-5 bg-[#4A7C59] rounded-full flex items-center justify-center text-white text-[12px]">
                                ✓
                            </span>
                            Done{task.completedBy && ` by ${getCompleterName(task.completedBy)}`}
                            {task.completedAt && ` at ${new Date(task.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                        </div>
                        <button
                            onClick={onUndo}
                            disabled={isProcessing}
                            className="text-[12px] font-medium text-textSub hover:text-forest transition-colors disabled:opacity-50"
                        >
                            Undo
                        </button>
                    </div>
                )}
            </div>

            {/* Postpone Bottom Sheet */}
            {showPostponeSheet && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
                    onClick={() => setShowPostponeSheet(false)}
                >
                    <div
                        className="bg-white rounded-t-[28px] w-full max-w-[420px] p-6 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-dmSerif text-[22px] text-forest mb-1.5">Postpone task</h3>
                        <p className="text-[14px] text-[#8BA18D] mb-5">
                            Delay "{task.name}"?
                        </p>
                        <div className="space-y-2.5">
                            {POSTPONE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onPostpone(option.value);
                                        setShowPostponeSheet(false);
                                    }}
                                    disabled={isProcessing}
                                    className="w-full py-3.5 px-4 rounded-2xl border border-forest/10 bg-cream flex items-center gap-3 font-semibold text-[15px] text-forest transition-colors active:bg-softGreen disabled:opacity-50"
                                >
                                    <span className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-base">
                                        {option.icon}
                                    </span>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowPostponeSheet(false)}
                            className="w-full py-3.5 mt-2.5 text-[14px] font-semibold text-[#8BA18D]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Image Modal */}
            {showImageModal && task.imageUrl && (
                <div
                    className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-5"
                    onClick={() => setShowImageModal(false)}
                >
                    <button
                        className="absolute top-5 right-5 text-white text-3xl leading-none"
                        onClick={() => setShowImageModal(false)}
                    >
                        ×
                    </button>
                    <img
                        src={task.imageUrl}
                        alt={task.name}
                        className="max-w-full max-h-[80vh] rounded-xl object-contain"
                    />
                </div>
            )}

            {/* Menu Bottom Sheet */}
            {showMenuSheet && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
                    onClick={() => setShowMenuSheet(false)}
                >
                    <div
                        className="bg-white rounded-t-[28px] w-full max-w-[420px] p-6 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-dmSerif text-[22px] text-forest mb-1.5">Task options</h3>
                        <p className="text-[14px] text-[#8BA18D] mb-5 truncate">
                            {task.name}
                        </p>
                        <div className="space-y-2.5">
                            {/* Edit option */}
                            <Link
                                href={task.isRegimenTask
                                    ? `/day-hub/edit-task/${(task as RegimenDayTask).regimenId}`
                                    : `/day-hub/edit-task/${task.taskId}`}
                                onClick={() => setShowMenuSheet(false)}
                                className="w-full py-3.5 px-4 rounded-2xl border border-forest/10 bg-cream flex items-center gap-3 font-semibold text-[15px] text-forest transition-colors active:bg-softGreen"
                            >
                                <span className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-base">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </span>
                                Edit task
                            </Link>

                            {/* Delete option */}
                            <button
                                onClick={() => {
                                    setShowMenuSheet(false);
                                    if (isRecurring) {
                                        setShowDeleteSheet(true);
                                    } else {
                                        // For one-time tasks, delete directly
                                        onDelete("all");
                                    }
                                }}
                                className="w-full py-3.5 px-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-3 font-semibold text-[15px] text-red-600 transition-colors active:bg-red-100"
                            >
                                <span className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-base">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                </span>
                                Delete task
                            </button>
                        </div>
                        <button
                            onClick={() => setShowMenuSheet(false)}
                            className="w-full py-3.5 mt-2.5 text-[14px] font-semibold text-[#8BA18D]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Options Bottom Sheet (for recurring tasks) */}
            {showDeleteSheet && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
                    onClick={() => setShowDeleteSheet(false)}
                >
                    <div
                        className="bg-white rounded-t-[28px] w-full max-w-[420px] p-6 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-dmSerif text-[22px] text-forest mb-1.5">Delete task</h3>
                        <p className="text-[14px] text-[#8BA18D] mb-5">
                            This is a recurring task. What would you like to delete?
                        </p>
                        <div className="space-y-2.5">
                            {/* Delete this occurrence only */}
                            <button
                                onClick={() => {
                                    onDelete("this_occurrence");
                                    setShowDeleteSheet(false);
                                }}
                                disabled={isProcessing}
                                className="w-full py-3.5 px-4 rounded-2xl border border-forest/10 bg-cream flex items-center gap-3 font-semibold text-[15px] text-forest transition-colors active:bg-softGreen disabled:opacity-50"
                            >
                                <span className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-base">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                </span>
                                <div className="text-left">
                                    <div>Only this occurrence</div>
                                    <div className="text-xs text-textSub font-normal">Just for today</div>
                                </div>
                            </button>

                            {/* Delete this and all future */}
                            <button
                                onClick={() => {
                                    onDelete("this_and_future");
                                    setShowDeleteSheet(false);
                                }}
                                disabled={isProcessing}
                                className="w-full py-3.5 px-4 rounded-2xl border border-forest/10 bg-cream flex items-center gap-3 font-semibold text-[15px] text-forest transition-colors active:bg-softGreen disabled:opacity-50"
                            >
                                <span className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-base">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14" />
                                        <path d="M12 5l7 7-7 7" />
                                    </svg>
                                </span>
                                <div className="text-left">
                                    <div>This and all future</div>
                                    <div className="text-xs text-textSub font-normal">End task from today onwards</div>
                                </div>
                            </button>

                            {/* Delete entire task */}
                            <button
                                onClick={() => {
                                    onDelete("all");
                                    setShowDeleteSheet(false);
                                }}
                                disabled={isProcessing}
                                className="w-full py-3.5 px-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-3 font-semibold text-[15px] text-red-600 transition-colors active:bg-red-100 disabled:opacity-50"
                            >
                                <span className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-base">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </span>
                                <div className="text-left">
                                    <div>Delete entire task</div>
                                    <div className="text-xs font-normal">Remove task completely</div>
                                </div>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowDeleteSheet(false)}
                            className="w-full py-3.5 mt-2.5 text-[14px] font-semibold text-[#8BA18D]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default function DayHubPage() {
    useEnsureOnboarding();
    const { user } = useAuth();
    const { managesChildren, managesPets, caregivers } = useAppState();
    const {
        currentDate,
        setCurrentDate,
        timelineTasks,
        tasksByTimeSlot,
        progress,
        isLoaded,
        markTaskDone,
        postponeTask,
        undoTask,
        markRegimenTaskDone,
        postponeRegimenTask,
        undoRegimenTask,
        templates,
        regimens,
        deleteTask,
        deleteRegimen,
        excludeOccurrence,
        endRegimenOnDate,
    } = useDayHub();

    const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

    // Get completer name from user ID
    const getCompleterName = (userId: string): string => {
        if (user?.id === userId) {
            const currentUserCaregiver = caregivers.find(c => c.isCurrentUser);
            if (currentUserCaregiver) {
                return `${currentUserCaregiver.name} (you)`;
            }
            return user.email?.split("@")[0] || "you";
        }
        const caregiver = caregivers.find(c => c.id === userId);
        if (caregiver) {
            return caregiver.name || "someone";
        }
        return "someone";
    };

    // Format date for display
    const formatDateDisplay = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    // Date navigation
    const goToPrevDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    // Get date string for regimen tasks
    const formatDateForRegimen = (date: Date): string => {
        return date.toISOString().split("T")[0];
    };

    // Task handlers
    const handleDone = async (task: TimelineTask) => {
        setProcessingTaskId(task.id);
        if (task.isRegimenTask) {
            const regimenTask = task as RegimenDayTask;
            await markRegimenTaskDone(
                regimenTask.taskId,
                formatDateForRegimen(currentDate),
                regimenTask.occurrenceIndex
            );
        } else {
            const simpleTask = task as DayTask;
            await markTaskDone(simpleTask.taskId, simpleTask.instanceId);
        }
        setProcessingTaskId(null);
    };

    const handlePostpone = async (task: TimelineTask, option: PostponeOption) => {
        setProcessingTaskId(task.id);
        if (task.isRegimenTask) {
            const regimenTask = task as RegimenDayTask;
            await postponeRegimenTask(
                regimenTask.taskId,
                formatDateForRegimen(currentDate),
                regimenTask.occurrenceIndex,
                option
            );
        } else {
            const simpleTask = task as DayTask;
            await postponeTask(simpleTask.taskId, simpleTask.instanceId, option);
        }
        setProcessingTaskId(null);
    };

    const handleUndo = async (task: TimelineTask) => {
        setProcessingTaskId(task.id);
        if (task.isRegimenTask) {
            const regimenTask = task as RegimenDayTask;
            await undoRegimenTask(
                regimenTask.taskId,
                formatDateForRegimen(currentDate),
                regimenTask.occurrenceIndex
            );
        } else {
            const simpleTask = task as DayTask;
            await undoTask(simpleTask.taskId, simpleTask.instanceId);
        }
        setProcessingTaskId(null);
    };

    // Handle delete task
    const handleDelete = async (task: TimelineTask, option: DeleteOption) => {
        setProcessingTaskId(task.id);
        try {
            if (task.isRegimenTask) {
                const regimenTask = task as RegimenDayTask;
                switch (option) {
                    case "this_occurrence":
                        // Mark this occurrence as excluded
                        await excludeOccurrence(
                            regimenTask.taskId,
                            formatDateForRegimen(currentDate),
                            regimenTask.occurrenceIndex
                        );
                        break;
                    case "this_and_future":
                        // End the regimen from yesterday
                        const yesterday = new Date(currentDate);
                        yesterday.setDate(yesterday.getDate() - 1);
                        await endRegimenOnDate(regimenTask.regimenId, formatDateForRegimen(yesterday));
                        break;
                    case "all":
                        // Delete the entire regimen
                        await deleteRegimen(regimenTask.regimenId);
                        break;
                }
            } else {
                // For simple tasks, delete the task
                const simpleTask = task as DayTask;
                await deleteTask(simpleTask.taskId);
            }
        } catch (err) {
            console.error("Error deleting task:", err);
        }
        setProcessingTaskId(null);
    };

    // Get progress title
    const getProgressTitle = () => {
        if (progress.completed === 0) return "Let's get started";
        if (progress.completed < progress.total / 2) return "Nice progress!";
        if (progress.completed < progress.total) return "Almost there!";
        return "All done today!";
    };

    if (!isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    // Empty state - no templates or regimens
    if (templates.length === 0 && regimens.length === 0) {
        return (
            <AppShell>
                <div className="max-w-[520px] mx-auto">
                <div className="space-y-6">
                    <header className="pt-2">
                        <h1 className="font-dmSerif text-[32px] text-forest">Day Hub</h1>
                        <p className="text-[14px] text-[#8BA18D] mt-1">{formatDateDisplay(currentDate)}</p>
                    </header>

                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-softGreen/50 flex items-center justify-center text-3xl mx-auto mb-4">
                            {managesPets && !managesChildren ? "🐾" : "📋"}
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No schedules yet</h3>
                        <p className="text-sm text-textSub mb-6">
                            Create a schedule to start tracking daily tasks.
                        </p>
                        <Link
                            href="/day-hub/add-task"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 transition-colors"
                        >
                            + Add Task
                        </Link>
                    </div>
                </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="max-w-[520px] mx-auto">
            <div className="space-y-8 pb-20">
                {/* Header */}
                <header className="pt-2">
                    <h1 className="font-dmSerif text-[32px] text-forest">Day Hub</h1>
                    <p className="text-[14px] text-[#8BA18D] mt-1">{formatDateDisplay(currentDate)}</p>
                </header>

                {/* Progress Card - matching Travel Bag style */}
                <div
                    className="text-center text-white"
                    style={{
                        background: "linear-gradient(135deg, #2C3E2D 0%, #4CA1AF 100%)",
                        boxShadow: "0 8px 24px rgba(36, 52, 37, 0.08)",
                        padding: "32px 24px",
                        borderRadius: "32px",
                    }}
                >
                    {/* Title */}
                    <h3 className="font-dmSerif text-[22px] text-white mb-0">
                        {getProgressTitle()}
                    </h3>

                    {/* Stacked family member avatars */}
                    {(() => {
                        // Get unique family members with tasks today (use name + type as unique key)
                        const uniqueMembers = timelineTasks.reduce((acc, task) => {
                            const key = `${task.familyMemberType}-${task.familyMemberName}`;
                            if (!acc.find(m => `${m.type}-${m.name}` === key)) {
                                acc.push({
                                    type: task.familyMemberType,
                                    name: task.familyMemberName,
                                    avatarUrl: task.familyMemberAvatarUrl,
                                    emoji: task.familyMemberAvatarEmoji,
                                    badgeColor: task.familyMemberBadgeColor,
                                });
                            }
                            return acc;
                        }, [] as Array<{ type: string; name: string; avatarUrl?: string; emoji?: string; badgeColor: string }>);

                        if (uniqueMembers.length === 0) return null;

                        // Count children and pets (pets are cat, dog, bird, other - anything not 'child')
                        const childrenCount = uniqueMembers.filter(m => m.type === 'child').length;
                        const petsCount = uniqueMembers.filter(m => m.type !== 'child').length;

                        // Build description text
                        let membersText = '';
                        if (childrenCount > 0 && petsCount > 0) {
                            membersText = `${childrenCount} child${childrenCount > 1 ? 'ren' : ''} and ${petsCount} pet${petsCount > 1 ? 's' : ''}`;
                        } else if (childrenCount > 0) {
                            membersText = `${childrenCount} child${childrenCount > 1 ? 'ren' : ''}`;
                        } else if (petsCount > 0) {
                            membersText = `${petsCount} pet${petsCount > 1 ? 's' : ''}`;
                        }

                        return (
                            <div className="flex flex-col items-center mt-5 mb-4">
                                <div className="flex items-center justify-center">
                                    {uniqueMembers.map((member, index) => (
                                        <div
                                            key={`${member.type}-${member.name}`}
                                            className="relative rounded-full flex items-center justify-center overflow-hidden"
                                            style={{
                                                width: 52,
                                                height: 52,
                                                marginLeft: index === 0 ? 0 : -18,
                                                zIndex: 10 - index,
                                                border: "3px solid white",
                                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                                backgroundColor: member.avatarUrl ? "#f3f4f6" : member.badgeColor,
                                            }}
                                        >
                                            {member.avatarUrl ? (
                                                <img
                                                    src={member.avatarUrl}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : member.emoji ? (
                                                <span className="text-xl">{member.emoji}</span>
                                            ) : (
                                                <span className="text-lg font-semibold text-white">{member.name[0]}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[13px] text-white/60 mt-2">
                                    Taking care of {membersText}
                                </span>
                            </div>
                        );
                    })()}

                    {/* Progress text */}
                    <p className="text-[15px] text-white/80 mb-5">
                        {progress.completed} of {progress.total} tasks done
                    </p>

                    {/* Date navigation button */}
                    <div
                        className="inline-flex items-center gap-1 bg-white rounded-2xl px-2 py-2"
                        style={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" }}
                    >
                        <button
                            onClick={goToPrevDay}
                            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-forest"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <span className="text-[14px] font-semibold px-4 min-w-[100px] text-center text-forest">
                            {currentDate.toDateString() === new Date().toDateString()
                                ? "Today"
                                : currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <button
                            onClick={goToNextDay}
                            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-forest"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Timeline */}
                <div className="relative">
                    {/* Vertical line */}
                    <div
                        className="absolute left-[17px] top-2.5 bottom-0 w-0.5"
                        style={{ backgroundColor: "rgba(44, 62, 45, 0.1)" }}
                    />

                    {(Object.keys(TIME_SLOT_INFO) as TimeSlot[]).map((slot) => {
                        const tasks = tasksByTimeSlot[slot];
                        const slotInfo = TIME_SLOT_INFO[slot];
                        if (tasks.length === 0) return null;

                        const allCompleted = tasks.every(t => t.status === "completed");

                        return (
                            <div key={slot} className="mb-10 relative">
                                {/* Time marker */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div
                                        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-[11px] z-10 flex-shrink-0 ${
                                            allCompleted
                                                ? "bg-forest border-forest text-white"
                                                : "bg-white border-forest text-forest"
                                        }`}
                                    >
                                        {slotInfo.abbrev}
                                    </div>
                                    <div className="text-[12px] font-bold uppercase tracking-widest text-[#8BA18D]">
                                        {slotInfo.label} ({slotInfo.time})
                                    </div>
                                </div>

                                {/* Task cards */}
                                <div className="ml-[52px] space-y-4">
                                    {tasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onDone={() => handleDone(task)}
                                            onPostpone={(option) => handlePostpone(task, option)}
                                            onUndo={() => handleUndo(task)}
                                            onDelete={(option) => handleDelete(task, option)}
                                            isProcessing={processingTaskId === task.id}
                                            getCompleterName={getCompleterName}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty state for day with no tasks */}
                {timelineTasks.length === 0 && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">
                            📭
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No tasks for this day</h3>
                        <p className="text-sm text-textSub">
                            Add tasks to your schedules to see them here.
                        </p>
                    </div>
                )}
            </div>
            </div>

            {/* FAB */}
            <Link
                href="/day-hub/add-task"
                className="fixed bottom-24 right-6 z-40 w-[56px] h-[56px] bg-forest text-white rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{ boxShadow: "0 8px 24px rgba(44, 62, 45, 0.3)" }}
            >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </Link>

        </AppShell>
    );
}
