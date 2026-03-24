"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState, ChildProfile, PetProfile, PetSpecies } from "@/lib/AppStateContext";
import { useDayHub, TimeSlot, DayTask, PostponeOption, TimelineTask, RegimenDayTask, FamilyMemberType } from "@/lib/DayHubContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { useAuth } from "@/lib/AuthContext";
import {
    DogIcon,
    CatIcon,
    BirdIcon,
    FishIcon,
    ReptileIcon,
    HamsterIcon,
    PawIcon,
    IconProps
} from "@/components/icons/DuotoneIcons";
import { CircleCheckbox } from "@/components/ui/CircleCheckbox";

// Helper to get pet species icon
function getSpeciesIcon(species: PetSpecies | undefined): React.ComponentType<IconProps> {
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

// Time slot display info (order: night before 6am, then morning, afternoon, evening)
const TIME_SLOT_INFO: Record<TimeSlot, { label: string; abbrev: string; time: string }> = {
    night: { label: "Night", abbrev: "NT", time: "05:00" },
    morning: { label: "Morning", abbrev: "AM", time: "08:00" },
    afternoon: { label: "Afternoon", abbrev: "PM", time: "14:00" },
    evening: { label: "Evening", abbrev: "EV", time: "19:00" },
};

// Ordered list of time slots for iteration
const TIME_SLOT_ORDER: TimeSlot[] = ["night", "morning", "afternoon", "evening"];

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
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
                        ) : ["cat", "dog", "bird", "other"].includes(task.familyMemberType) ? (
                            // Render pet icon based on species stored in avatarEmoji field
                            React.createElement(getSpeciesIcon(task.familyMemberAvatarEmoji as PetSpecies), { size: 26 })
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
                            {/* Show scheduled time for multi-dose tasks */}
                            {task.scheduledTime && (
                                <span className="ml-2 text-[11px] font-medium text-[#8BA18D] bg-gray-100 px-1.5 py-0.5 rounded">
                                    {task.scheduledTime.slice(0, 5)}
                                </span>
                            )}
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
                            {/* Creator info - subtle, inline with pills */}
                            {task.createdBy && (
                                <span className="text-[10px] text-[#8BA18D]/70">
                                    · {getCompleterName(task.createdBy).replace(" (you)", "")}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Image thumbnails - stacked */}
                    {task.imageUrls && task.imageUrls.length > 0 && (
                        <div className="relative flex-shrink-0" style={{ width: task.imageUrls.length > 1 ? 44 + (task.imageUrls.length - 1) * 6 : 44 }}>
                            {task.imageUrls.slice(0, 3).map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setSelectedImageIndex(index);
                                        setShowImageModal(true);
                                    }}
                                    className="w-11 h-11 rounded-xl overflow-hidden border border-black/5 bg-white absolute"
                                    style={{
                                        left: index * 6,
                                        zIndex: 10 - index,
                                        boxShadow: index > 0 ? "-2px 0 4px rgba(0,0,0,0.1)" : undefined,
                                    }}
                                >
                                    <img
                                        src={url}
                                        alt={`${task.name} ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
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
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-forest/5">
                        <button
                            onClick={onDone}
                            disabled={isProcessing}
                            className="flex items-center gap-2 py-2 px-4 rounded-lg bg-gray-100 text-forest font-medium text-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            <CircleCheckbox
                                checked={false}
                                disabled={isProcessing}
                                size={20}
                            />
                            Done?
                        </button>
                        <button
                            onClick={() => setShowPostponeSheet(true)}
                            disabled={isProcessing}
                            className="py-2 px-4 rounded-lg border border-gray-200 text-textSub font-medium text-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            Later
                        </button>
                    </div>
                )}

                {/* Postponed actions */}
                {isPostponed && (
                    <div className="flex items-center mt-3.5 pt-3.5 border-t border-forest/5">
                        <button
                            onClick={onDone}
                            disabled={isProcessing}
                            className="flex items-center gap-2 py-2 px-4 rounded-lg bg-gray-100 text-forest font-medium text-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            <CircleCheckbox
                                checked={false}
                                disabled={isProcessing}
                                size={20}
                            />
                            Done?
                        </button>
                    </div>
                )}

                {/* Completed stamp - tap checkbox to undo */}
                {isCompleted && (
                    <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-forest/5">
                        <CircleCheckbox
                            checked={true}
                            onChange={onUndo}
                            disabled={isProcessing}
                            size={20}
                        />
                        <span className="text-[12px] font-semibold text-[#4A7C59]">
                            Done{task.completedBy && ` by ${getCompleterName(task.completedBy)}`}
                            {task.completedAt && ` at ${new Date(task.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                        </span>
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
            {showImageModal && task.imageUrls && task.imageUrls.length > 0 && (
                <div
                    className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-5"
                    onClick={() => setShowImageModal(false)}
                >
                    <button
                        className="absolute top-5 right-5 text-white text-3xl leading-none"
                        onClick={() => setShowImageModal(false)}
                    >
                        ×
                    </button>
                    <img
                        src={task.imageUrls[selectedImageIndex]}
                        alt={task.name}
                        className="max-w-full max-h-[70vh] rounded-xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {/* Thumbnail navigation for multiple images */}
                    {task.imageUrls.length > 1 && (
                        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                            {task.imageUrls.map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                                        selectedImageIndex === index ? "border-white" : "border-transparent opacity-60"
                                    }`}
                                >
                                    <img
                                        src={url}
                                        alt={`${task.name} ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
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

// Family member for filter display
interface FilterableMember {
    id: string;
    name: string;
    type: FamilyMemberType;
    avatarUrl?: string;
    AvatarIcon?: React.ComponentType<IconProps>;
    badgeColor: string;
    hasTasksToday: boolean;
}

export default function DayHubPage() {
    useEnsureOnboarding();
    const { user } = useAuth();
    const { managesChildren, managesPets, caregivers, children: childrenList, pets } = useAppState();
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

    // Track which family members are selected for filtering
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

    // Build list of all family members (children + pets) with info about whether they have tasks today
    const allFamilyMembers = useMemo((): FilterableMember[] => {
        // Get unique members from tasks to know who has tasks today
        const membersWithTasks = new Set<string>();
        timelineTasks.forEach(task => {
            // Create a unique key for family member
            const key = `${task.familyMemberType}-${task.familyMemberName}`;
            membersWithTasks.add(key);
        });

        const members: FilterableMember[] = [];

        // Add all children
        childrenList.forEach(child => {
            const key = `child-${child.name}`;
            members.push({
                id: `child-${child.id}`,
                name: child.name,
                type: "child",
                avatarUrl: child.avatarUrl,
                AvatarIcon: undefined,
                badgeColor: "#E0F2F1",
                hasTasksToday: membersWithTasks.has(key),
            });
        });

        // Add all pets
        pets.forEach(pet => {
            const petType: FamilyMemberType = ["cat", "dog", "bird"].includes(pet.species || "")
                ? (pet.species as FamilyMemberType)
                : "other";
            const key = `${petType}-${pet.name}`;
            members.push({
                id: `pet-${pet.id}`,
                name: pet.name,
                type: petType,
                avatarUrl: pet.avatarUrl,
                AvatarIcon: getSpeciesIcon(pet.species),
                badgeColor: "#D4EDDA",
                hasTasksToday: membersWithTasks.has(key),
            });
        });

        return members;
    }, [childrenList, pets, timelineTasks]);

    // Create a stable key for detecting changes to family members with tasks
    const membersWithTasksKey = useMemo(() =>
        allFamilyMembers.map(m => `${m.id}-${m.hasTasksToday}`).join(','),
    [allFamilyMembers]);

    // Initialize selected members to those with tasks (on mount and when tasks change)
    React.useEffect(() => {
        const membersWithTasks = allFamilyMembers.filter(m => m.hasTasksToday).map(m => m.id);
        setSelectedMemberIds(new Set(membersWithTasks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [membersWithTasksKey]);

    // Toggle member selection
    const toggleMemberSelection = (memberId: string) => {
        setSelectedMemberIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(memberId)) {
                newSet.delete(memberId);
            } else {
                newSet.add(memberId);
            }
            return newSet;
        });
    };

    // Select all members with tasks (for "Show all" button)
    const selectAllMembersWithTasks = () => {
        const membersWithTasks = allFamilyMembers.filter(m => m.hasTasksToday).map(m => m.id);
        setSelectedMemberIds(new Set(membersWithTasks));
    };

    // Filter timeline tasks based on selected members
    const filteredTimelineTasks = useMemo(() => {
        if (selectedMemberIds.size === 0) return [];  // Show nothing when none selected

        return timelineTasks.filter(task => {
            // Find the matching family member
            const matchingMember = allFamilyMembers.find(m =>
                m.name === task.familyMemberName && m.type === task.familyMemberType
            );
            return matchingMember && selectedMemberIds.has(matchingMember.id);
        });
    }, [timelineTasks, selectedMemberIds, allFamilyMembers]);

    // Filtered tasks by time slot
    const filteredTasksByTimeSlot: Record<TimeSlot, TimelineTask[]> = useMemo(() => ({
        morning: filteredTimelineTasks.filter(t => t.timeSlot === "morning"),
        afternoon: filteredTimelineTasks.filter(t => t.timeSlot === "afternoon"),
        evening: filteredTimelineTasks.filter(t => t.timeSlot === "evening"),
        night: filteredTimelineTasks.filter(t => t.timeSlot === "night"),
    }), [filteredTimelineTasks]);

    // Filtered progress
    const filteredProgress = useMemo(() => ({
        total: filteredTimelineTasks.length,
        completed: filteredTimelineTasks.filter(t => t.status === "completed").length,
        pending: filteredTimelineTasks.filter(t => t.status === "pending").length,
        postponed: filteredTimelineTasks.filter(t => t.status === "postponed").length,
        skipped: filteredTimelineTasks.filter(t => t.status === "skipped").length,
        percentage: filteredTimelineTasks.length > 0
            ? Math.round((filteredTimelineTasks.filter(t => t.status === "completed").length / filteredTimelineTasks.length) * 100)
            : 0,
    }), [filteredTimelineTasks]);

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
        // Check if tasks are hidden by filter
        if (filteredProgress.total === 0 && timelineTasks.length > 0) return "Tasks hidden";
        if (filteredProgress.total === 0) return "No tasks today";
        if (filteredProgress.completed === 0) return "Let's get started";
        if (filteredProgress.completed < filteredProgress.total / 2) return "Nice progress!";
        if (filteredProgress.completed < filteredProgress.total) return "Almost there!";
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
                        <div className="w-16 h-16 rounded-full bg-softGreen/50 flex items-center justify-center mx-auto mb-4 text-forest">
                            {managesPets && !managesChildren ? <PawIcon size={32} /> : <span className="text-3xl">📋</span>}
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

                {/* Family Member Filter Row */}
                {allFamilyMembers.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {allFamilyMembers.map((member) => {
                            const isSelected = selectedMemberIds.has(member.id);
                            const hasTasksToday = member.hasTasksToday;
                            const isClickable = hasTasksToday;

                            return (
                                <button
                                    key={member.id}
                                    onClick={() => isClickable && toggleMemberSelection(member.id)}
                                    disabled={!isClickable}
                                    className={`flex flex-col items-center gap-1.5 transition-all ${
                                        !isClickable ? 'cursor-not-allowed' : 'cursor-pointer'
                                    }`}
                                >
                                    {/* Avatar with selection ring */}
                                    <div
                                        className={`relative transition-all ${
                                            isSelected && hasTasksToday
                                                ? 'ring-2 ring-forest ring-offset-2 ring-offset-cream rounded-full'
                                                : ''
                                        } ${
                                            !hasTasksToday
                                                ? 'opacity-30 grayscale'
                                                : isSelected
                                                    ? ''
                                                    : 'opacity-100'
                                        }`}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                                            style={{
                                                backgroundColor: member.avatarUrl ? "#f3f4f6" : member.badgeColor,
                                            }}
                                        >
                                            {member.avatarUrl ? (
                                                <img
                                                    src={member.avatarUrl}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : member.AvatarIcon ? (
                                                <member.AvatarIcon size={24} className="text-forest" />
                                            ) : (
                                                <span className="text-lg font-semibold text-forest">{member.name[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Name label */}
                                    <span className={`text-[11px] font-medium max-w-[60px] truncate ${
                                        !hasTasksToday
                                            ? 'text-textSub/50'
                                            : isSelected
                                                ? 'text-forest'
                                                : 'text-textSub'
                                    }`}>
                                        {member.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

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
                    <h3 className="font-dmSerif text-[22px] text-white mb-3">
                        {getProgressTitle()}
                    </h3>

                    {/* Progress text */}
                    <p className="text-[15px] text-white/80 mb-5">
                        {filteredProgress.total === 0 && timelineTasks.length > 0
                            ? "Select someone above to see their tasks"
                            : `${filteredProgress.completed} of ${filteredProgress.total} tasks done`
                        }
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

                    {TIME_SLOT_ORDER.map((slot) => {
                        const tasks = filteredTasksByTimeSlot[slot];
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
                                        {slotInfo.label}
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
                {filteredTimelineTasks.length === 0 && (
                    <div className="card-organic p-8 text-center">
                        {timelineTasks.length > 0 ? (
                            // Tasks exist but are hidden by filter
                            <>
                                <div className="w-16 h-16 rounded-full bg-softGreen flex items-center justify-center text-3xl mx-auto mb-4">
                                    🙈
                                </div>
                                <h3 className="font-bold text-forest text-lg mb-2">Tasks are hidden</h3>
                                <p className="text-sm text-textSub mb-5">
                                    {timelineTasks.length} task{timelineTasks.length > 1 ? 's' : ''} available. Select someone above or show all.
                                </p>
                                <button
                                    onClick={selectAllMembersWithTasks}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 transition-colors"
                                >
                                    Show all tasks
                                </button>
                            </>
                        ) : (
                            // Truly no tasks for this day
                            <>
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">
                                    📭
                                </div>
                                <h3 className="font-bold text-forest text-lg mb-2">No tasks for this day</h3>
                                <p className="text-sm text-textSub">
                                    Add tasks to your schedules to see them here.
                                </p>
                            </>
                        )}
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
