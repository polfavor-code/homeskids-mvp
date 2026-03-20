"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useAppState, PetProfile, ChildProfile } from "@/lib/AppStateContext";

// ==============================================
// DAY HUB CONTEXT
// Daily schedule/task tracker for medications, activities, and routines
// ==============================================

// Time slots for task organization
export type TimeSlot = "morning" | "afternoon" | "evening" | "night";

// Schedule types
export type ScheduleType = "medication" | "supplement" | "activity" | "pickup" | "routine" | "custom" | "therapy";

// Task statuses
export type TaskStatus = "pending" | "completed" | "postponed" | "skipped" | "excluded";

// Frequency types for regimen tasks
export type FrequencyType = "one_time" | "daily" | "x_times_daily" | "every_x_hours" | "every_x_days" | "specific_days";

// Postpone options
export type PostponeOption = "1_hour" | "2_hours" | "move_to_next_slot" | "skip_today";

// Family member types (for display)
export type FamilyMemberType = "child" | "cat" | "dog" | "bird" | "other";

// Schedule template
export interface ScheduleTemplate {
    id: string;
    childId?: string;
    petId?: string;
    familyMemberName?: string;
    familyMemberType?: FamilyMemberType;
    familyMemberAvatarUrl?: string;
    familyMemberAvatarEmoji?: string;
    familyMemberBadgeColor?: string;
    familyMemberBadgeTextColor?: string;
    name: string;
    description?: string;
    scheduleType: ScheduleType;
    createdBy: string;
    homeId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Schedule task (within a template)
export interface ScheduleTask {
    id: string;
    templateId: string;
    name: string;
    description?: string;
    taskType: ScheduleType;
    timeSlot: TimeSlot;
    scheduledTime?: string;
    sortOrder: number;
    imageUrls?: string[];
    metadata?: Record<string, any>;
    isActive: boolean;
    isRepeating: boolean; // true = daily, false = one-time on startDate
    startDate?: string; // YYYY-MM-DD - when task starts (and only date if not repeating)
    createdAt: string;
    updatedAt: string;
}

// Daily schedule instance
export interface DailyScheduleInstance {
    id: string;
    templateId: string;
    date: string;
    createdAt: string;
    updatedAt: string;
}

// Task completion record
export interface TaskCompletion {
    id: string;
    instanceId: string;
    taskId: string;
    status: TaskStatus;
    completedBy?: string;
    completedAt?: string;
    postponedUntil?: string;
    postponeReason?: string;
    originalTimeSlot?: TimeSlot;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// Combined task view for display (task + completion + family member info)
export interface DayTask {
    id: string;
    taskId: string;
    instanceId: string;
    completionId?: string;
    // Task info
    name: string;
    description?: string;
    taskType: ScheduleType;
    timeSlot: TimeSlot;
    scheduledTime?: string;
    sortOrder: number;
    imageUrls?: string[];
    metadata?: Record<string, any>;
    // Completion info
    status: TaskStatus;
    completedBy?: string;
    completedAt?: string;
    postponedUntil?: string;
    postponeReason?: string;
    originalTimeSlot?: TimeSlot;
    notes?: string;
    // Family member info
    familyMemberName: string;
    familyMemberType: FamilyMemberType;
    familyMemberAvatarUrl?: string;
    familyMemberAvatarEmoji?: string;
    familyMemberBadgeColor: string;
    familyMemberBadgeTextColor: string;
    // Template info
    templateId: string;
    templateName: string;
}

// Progress summary
export interface DayProgress {
    total: number;
    completed: number;
    pending: number;
    postponed: number;
    skipped: number;
    percentage: number;
}

// ==============================================
// REGIMEN TYPES (Multi-phase protocols)
// ==============================================

// Regimen (multi-phase protocol)
export interface Regimen {
    id: string;
    childId?: string;
    petId?: string;
    familyMemberName?: string;
    name: string;
    description?: string;
    regimenType: ScheduleType;
    startDate: string;
    status: "active" | "completed" | "paused";
    createdBy: string;
    homeId?: string;
    createdAt: string;
    updatedAt: string;
    // Computed
    phases?: RegimenPhase[];
}

// Regimen phase
export interface RegimenPhase {
    id: string;
    regimenId: string;
    phaseOrder: number;
    name?: string;
    durationDays?: number; // For X days duration
    endDate?: string; // Specific end date (alternative to durationDays)
    createdAt: string;
    // Computed
    tasks?: PhaseTask[];
    startDate?: string; // Computed based on regimen start and previous phases
    computedEndDate?: string; // Computed from durationDays OR endDate
    isActive?: boolean;
}

// Phase task (with frequency)
export interface PhaseTask {
    id: string;
    phaseId: string;
    name: string;
    description?: string;
    taskType: ScheduleType;
    frequencyType: FrequencyType;
    frequencyValue?: number;
    scheduledTimes: string[]; // ['08:00', '20:00']
    daysOfWeek?: number[]; // [1,3,5] for Mon/Wed/Fri
    sortOrder: number;
    imageUrls?: string[];
    metadata?: Record<string, any>;
    createdAt: string;
}

// Regimen completion
export interface RegimenCompletion {
    id: string;
    phaseTaskId: string;
    scheduledDate: string;
    scheduledTime?: string;
    occurrenceIndex: number;
    status: TaskStatus;
    completedBy?: string;
    completedAt?: string;
    postponedUntil?: string;
    postponeReason?: string;
    notes?: string;
    createdAt: string;
}

// Regimen day task (for display in timeline)
export interface RegimenDayTask {
    id: string;
    taskId: string;
    regimenId: string;
    phaseId: string;
    completionId?: string;
    occurrenceIndex: number;
    // Task info
    name: string;
    description?: string;
    taskType: ScheduleType;
    timeSlot: TimeSlot;
    scheduledTime?: string;
    imageUrls?: string[];
    // Completion info
    status: TaskStatus;
    completedBy?: string;
    completedAt?: string;
    postponedUntil?: string;
    postponeReason?: string;
    notes?: string;
    // Family member info
    familyMemberName: string;
    familyMemberType: FamilyMemberType;
    familyMemberAvatarUrl?: string;
    familyMemberAvatarEmoji?: string;
    familyMemberBadgeColor: string;
    familyMemberBadgeTextColor: string;
    // Regimen info
    regimenName: string;
    phaseName?: string;
    phaseOrder: number;
    // Flag to distinguish from simple tasks
    isRegimenTask: true;
}

// Result type for operations
export interface DayHubResult {
    success: boolean;
    error?: string;
    data?: any;
}

// Combined task for timeline (union of simple tasks and regimen tasks)
export type TimelineTask = (DayTask & { isRegimenTask?: false }) | RegimenDayTask;

interface DayHubContextType {
    // Current date
    currentDate: Date;
    setCurrentDate: (date: Date) => void;

    // Templates (simple daily schedules)
    templates: ScheduleTemplate[];
    isLoadingTemplates: boolean;

    // Regimens (multi-phase protocols)
    regimens: Regimen[];
    isLoadingRegimens: boolean;

    // Day tasks (simple tasks)
    dayTasks: DayTask[];

    // Regimen tasks for the day
    regimenDayTasks: RegimenDayTask[];

    // Combined timeline tasks (both simple and regimen)
    timelineTasks: TimelineTask[];
    tasksByTimeSlot: Record<TimeSlot, TimelineTask[]>;
    isLoadingTasks: boolean;

    // Progress (includes both types)
    progress: DayProgress;

    // Loading state
    isLoaded: boolean;

    // Simple task actions
    markTaskDone: (taskId: string, instanceId: string, notes?: string) => Promise<DayHubResult>;
    postponeTask: (taskId: string, instanceId: string, option: PostponeOption) => Promise<DayHubResult>;
    undoTask: (taskId: string, instanceId: string) => Promise<DayHubResult>;
    skipTask: (taskId: string, instanceId: string, reason?: string) => Promise<DayHubResult>;

    // Regimen task actions
    markRegimenTaskDone: (taskId: string, date: string, occurrenceIndex: number, notes?: string) => Promise<DayHubResult>;
    postponeRegimenTask: (taskId: string, date: string, occurrenceIndex: number, option: PostponeOption) => Promise<DayHubResult>;
    undoRegimenTask: (taskId: string, date: string, occurrenceIndex: number) => Promise<DayHubResult>;
    skipRegimenTask: (taskId: string, date: string, occurrenceIndex: number, reason?: string) => Promise<DayHubResult>;

    // Template CRUD
    createTemplate: (template: Omit<ScheduleTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">) => Promise<DayHubResult>;
    updateTemplate: (id: string, updates: Partial<ScheduleTemplate>) => Promise<DayHubResult>;
    deleteTemplate: (id: string) => Promise<DayHubResult>;

    // Task CRUD
    createTask: (task: Omit<ScheduleTask, "id" | "createdAt" | "updatedAt">) => Promise<DayHubResult>;
    updateTask: (id: string, updates: Partial<ScheduleTask>) => Promise<DayHubResult>;
    deleteTask: (id: string) => Promise<DayHubResult>;

    // Regimen CRUD
    createRegimen: (regimen: Omit<Regimen, "id" | "createdAt" | "updatedAt" | "createdBy" | "phases">, phases: Array<{
        name?: string;
        durationDays?: number;
        tasks: Array<Omit<PhaseTask, "id" | "phaseId" | "createdAt">>;
    }>) => Promise<DayHubResult>;
    updateRegimen: (id: string, updates: Partial<Regimen>) => Promise<DayHubResult>;
    updateRegimenFull: (id: string, updates: Partial<Omit<Regimen, "id" | "createdAt" | "updatedAt" | "createdBy" | "phases">>, phases: Array<{
        id?: string;
        name?: string;
        durationDays?: number;
        endDate?: string;
        tasks: Array<{
            id?: string;
            name: string;
            description?: string;
            taskType: ScheduleType;
            frequencyType: FrequencyType;
            frequencyValue?: number;
            scheduledTimes: string[];
            daysOfWeek?: number[];
            imageUrls?: string[];
            metadata?: Record<string, any>;
        }>;
    }>) => Promise<DayHubResult>;
    deleteRegimen: (id: string) => Promise<DayHubResult>;
    pauseRegimen: (id: string) => Promise<DayHubResult>;
    resumeRegimen: (id: string) => Promise<DayHubResult>;

    // Delete operations
    excludeOccurrence: (taskId: string, date: string, occurrenceIndex: number) => Promise<DayHubResult>;
    endRegimenOnDate: (regimenId: string, endDate: string) => Promise<DayHubResult>;

    // File upload for task images
    uploadTaskImage: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;

    // Refresh
    refreshData: () => Promise<void>;
}

const DayHubContext = createContext<DayHubContextType | undefined>(undefined);

// Helper to format date as YYYY-MM-DD (in local timezone)
const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Default progress
const defaultProgress: DayProgress = {
    total: 0,
    completed: 0,
    pending: 0,
    postponed: 0,
    skipped: 0,
    percentage: 0,
};

export function DayHubProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { children: childrenList, pets, currentChildId } = useAppState();

    // State
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
    const [dayTasks, setDayTasks] = useState<DayTask[]>([]);
    const [regimens, setRegimens] = useState<Regimen[]>([]);
    const [regimenDayTasks, setRegimenDayTasks] = useState<RegimenDayTask[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [isLoadingRegimens, setIsLoadingRegimens] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Ref for realtime channel
    const realtimeChannelRef = useRef<any>(null);
    const regimenRealtimeChannelRef = useRef<any>(null);
    const contentRealtimeChannelRef = useRef<any>(null);
    const contentBroadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Broadcast content update to other caregivers
    const broadcastContentUpdate = useCallback(() => {
        if (contentBroadcastChannelRef.current) {
            contentBroadcastChannelRef.current.send({
                type: "broadcast",
                event: "dayhub-content-updated",
                payload: { timestamp: Date.now() },
            });
        }
    }, []);

    // Computed: combined timeline tasks (simple + regimen)
    const timelineTasks: TimelineTask[] = [
        ...dayTasks.map(t => ({ ...t, isRegimenTask: false as const })),
        ...regimenDayTasks,
    ].sort((a, b) => {
        const slotOrder: Record<TimeSlot, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 };
        const slotDiff = slotOrder[a.timeSlot] - slotOrder[b.timeSlot];
        if (slotDiff !== 0) return slotDiff;
        // Sort by scheduled time if available
        if (a.scheduledTime && b.scheduledTime) {
            return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        return 0;
    });

    // Computed: tasks by time slot (combined)
    const tasksByTimeSlot: Record<TimeSlot, TimelineTask[]> = {
        morning: timelineTasks.filter(t => t.timeSlot === "morning"),
        afternoon: timelineTasks.filter(t => t.timeSlot === "afternoon"),
        evening: timelineTasks.filter(t => t.timeSlot === "evening"),
        night: timelineTasks.filter(t => t.timeSlot === "night"),
    };

    // Computed: progress (includes both simple and regimen tasks)
    const progress: DayProgress = {
        total: timelineTasks.length,
        completed: timelineTasks.filter(t => t.status === "completed").length,
        pending: timelineTasks.filter(t => t.status === "pending").length,
        postponed: timelineTasks.filter(t => t.status === "postponed").length,
        skipped: timelineTasks.filter(t => t.status === "skipped").length,
        percentage: timelineTasks.length > 0
            ? Math.round((timelineTasks.filter(t => t.status === "completed").length / timelineTasks.length) * 100)
            : 0,
    };

    // Get family member info from child or pet
    const getFamilyMemberInfo = useCallback((template: ScheduleTemplate): {
        name: string;
        type: FamilyMemberType;
        avatarUrl?: string;
        avatarEmoji?: string;
        badgeColor: string;
        badgeTextColor: string;
    } => {
        // If linked to a child
        if (template.childId) {
            const child = childrenList.find(c => c.id === template.childId);
            return {
                name: child?.name || template.familyMemberName || "Unknown",
                type: "child",
                avatarUrl: child?.avatarUrl,
                avatarEmoji: undefined,
                badgeColor: "#E0F2F1",
                badgeTextColor: "#00796B",
            };
        }

        // If linked to a pet
        if (template.petId) {
            const pet = pets.find(p => p.id === template.petId);
            const petType = pet?.species || template.familyMemberType || "other";
            const type: FamilyMemberType = ["cat", "dog", "bird"].includes(petType) ? petType as FamilyMemberType : "other";
            return {
                name: pet?.name || template.familyMemberName || "Unknown",
                type,
                avatarUrl: pet?.avatarUrl,
                avatarEmoji: type === "cat" ? "🐱" : type === "dog" ? "🐕" : type === "bird" ? "🐦" : "🐾",
                badgeColor: template.familyMemberBadgeColor || "#FFF3E0",
                badgeTextColor: template.familyMemberBadgeTextColor || "#E65100",
            };
        }

        // Custom family member
        return {
            name: template.familyMemberName || "Unknown",
            type: template.familyMemberType || "other",
            avatarUrl: template.familyMemberAvatarUrl,
            avatarEmoji: template.familyMemberAvatarEmoji || "👤",
            badgeColor: template.familyMemberBadgeColor || "#E0F2F1",
            badgeTextColor: template.familyMemberBadgeTextColor || "#00796B",
        };
    }, [childrenList, pets]);

    // Get family member info from regimen
    const getRegimenFamilyMemberInfo = useCallback((regimen: Regimen): {
        name: string;
        type: FamilyMemberType;
        avatarUrl?: string;
        avatarEmoji?: string;
        badgeColor: string;
        badgeTextColor: string;
    } => {
        // If linked to a child
        if (regimen.childId) {
            const child = childrenList.find(c => c.id === regimen.childId);
            return {
                name: child?.name || regimen.familyMemberName || "Unknown",
                type: "child",
                avatarUrl: child?.avatarUrl,
                avatarEmoji: undefined,
                badgeColor: "#E0F2F1",
                badgeTextColor: "#00796B",
            };
        }

        // If linked to a pet
        if (regimen.petId) {
            const pet = pets.find(p => p.id === regimen.petId);
            const petType = pet?.species || "other";
            const type: FamilyMemberType = ["cat", "dog", "bird"].includes(petType) ? petType as FamilyMemberType : "other";
            return {
                name: pet?.name || regimen.familyMemberName || "Unknown",
                type,
                avatarUrl: pet?.avatarUrl,
                avatarEmoji: type === "cat" ? "🐱" : type === "dog" ? "🐕" : type === "bird" ? "🐦" : "🐾",
                badgeColor: "#FFF3E0",
                badgeTextColor: "#E65100",
            };
        }

        // Custom family member
        return {
            name: regimen.familyMemberName || "Unknown",
            type: "other",
            avatarUrl: undefined,
            avatarEmoji: "👤",
            badgeColor: "#E0F2F1",
            badgeTextColor: "#00796B",
        };
    }, [childrenList, pets]);

    // Parse date string as local date (not UTC)
    const parseLocalDate = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    // Convert time string to TimeSlot
    const getTimeSlotFromTime = (time: string): TimeSlot => {
        const hour = parseInt(time.split(":")[0], 10);
        if (hour < 12) return "morning";
        if (hour < 17) return "afternoon";
        if (hour < 21) return "evening";
        return "night";
    };

    // Calculate active phase for a regimen on a given date
    const getActivePhase = useCallback((regimen: Regimen, phases: RegimenPhase[], date: Date): RegimenPhase | null => {
        const startDate = parseLocalDate(regimen.startDate);
        let currentDate = new Date(startDate);

        for (const phase of phases.sort((a, b) => a.phaseOrder - b.phaseOrder)) {
            // Determine phase end date: use endDate if set, otherwise calculate from durationDays
            let phaseEndDate: Date | null = null;

            if (phase.endDate) {
                // Use explicit end date
                phaseEndDate = parseLocalDate(phase.endDate);
                phaseEndDate.setDate(phaseEndDate.getDate() + 1); // End date is inclusive
            } else if (phase.durationDays !== null && phase.durationDays !== undefined) {
                // Calculate from duration days
                phaseEndDate = new Date(currentDate);
                phaseEndDate.setDate(phaseEndDate.getDate() + phase.durationDays);
            }
            // If both are null/undefined, it's a forever phase

            if (phaseEndDate === null) {
                // Forever phase - if we've reached this phase and date >= currentDate
                if (date >= currentDate) {
                    return {
                        ...phase,
                        startDate: formatDate(currentDate),
                        computedEndDate: undefined,
                        isActive: true,
                    };
                }
            } else {
                if (date >= currentDate && date < phaseEndDate) {
                    const endDateMinusOne = new Date(phaseEndDate.getTime() - 86400000);
                    return {
                        ...phase,
                        startDate: formatDate(currentDate),
                        computedEndDate: formatDate(endDateMinusOne),
                        isActive: true,
                    };
                }

                currentDate = phaseEndDate;
            }
        }

        return null; // Regimen completed or date before start
    }, []);

    // Check if a task should run on a given date based on frequency
    const shouldTaskRunOnDate = useCallback((task: PhaseTask, date: Date, phaseStartDate: Date): boolean => {
        const daysSincePhaseStart = Math.floor((date.getTime() - phaseStartDate.getTime()) / 86400000);

        switch (task.frequencyType) {
            case "one_time":
                // Only runs on the phase start date
                return daysSincePhaseStart === 0;

            case "daily":
            case "x_times_daily":
            case "every_x_hours":
                return true; // Runs every day

            case "every_x_days":
                return daysSincePhaseStart % (task.frequencyValue || 1) === 0;

            case "specific_days":
                // days_of_week: 1=Monday, 7=Sunday
                const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday from 0 to 7
                return task.daysOfWeek?.includes(dayOfWeek) || false;

            default:
                return true;
        }
    }, []);

    // Get scheduled times for a task on a given date
    const getTaskOccurrences = useCallback((task: PhaseTask, date: Date): string[] => {
        switch (task.frequencyType) {
            case "one_time":
                return task.scheduledTimes.slice(0, 1);

            case "daily":
                return task.scheduledTimes.slice(0, 1);

            case "x_times_daily":
                return task.scheduledTimes.slice(0, task.frequencyValue || 1);

            case "every_x_hours": {
                const times: string[] = [];
                const startTime = task.scheduledTimes[0] || "08:00";
                const [startHour] = startTime.split(":").map(Number);
                let currentHour = startHour;
                const interval = task.frequencyValue || 6;

                while (currentHour < 24) {
                    times.push(`${String(currentHour).padStart(2, "0")}:00`);
                    currentHour += interval;
                }
                return times;
            }

            case "every_x_days":
            case "specific_days":
                return task.scheduledTimes.slice(0, 1);

            default:
                return task.scheduledTimes;
        }
    }, []);

    // Fetch templates the user has access to
    const fetchTemplates = useCallback(async () => {
        if (!user) {
            setTemplates([]);
            return;
        }

        setIsLoadingTemplates(true);
        try {
            // Fetch all templates (RLS will filter based on access)
            const { data, error } = await supabase
                .from("schedule_templates")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching templates:", error);
                setTemplates([]);
                return;
            }

            const loadedTemplates: ScheduleTemplate[] = (data || []).map((t: any) => ({
                id: t.id,
                childId: t.child_id,
                petId: t.pet_id,
                familyMemberName: t.family_member_name,
                familyMemberType: t.family_member_type,
                familyMemberAvatarUrl: t.family_member_avatar_url,
                familyMemberAvatarEmoji: t.family_member_avatar_emoji,
                familyMemberBadgeColor: t.family_member_badge_color,
                familyMemberBadgeTextColor: t.family_member_badge_text_color,
                name: t.name,
                description: t.description,
                scheduleType: t.schedule_type,
                createdBy: t.created_by,
                homeId: t.home_id,
                isActive: t.is_active,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
            }));

            setTemplates(loadedTemplates);
        } catch (err) {
            console.error("Error in fetchTemplates:", err);
            setTemplates([]);
        } finally {
            setIsLoadingTemplates(false);
        }
    }, [user]);

    // Ensure daily instances exist for all templates
    const ensureDailyInstances = useCallback(async (templateIds: string[], date: string): Promise<Map<string, string>> => {
        const instanceMap = new Map<string, string>();

        if (templateIds.length === 0) return instanceMap;

        try {
            // First, try to get existing instances
            const { data: existingInstances } = await supabase
                .from("daily_schedule_instances")
                .select("id, template_id")
                .in("template_id", templateIds)
                .eq("date", date);

            // Build map of existing
            for (const inst of existingInstances || []) {
                instanceMap.set(inst.template_id, inst.id);
            }

            // Find templates without instances
            const missingTemplateIds = templateIds.filter(id => !instanceMap.has(id));

            if (missingTemplateIds.length > 0) {
                // Create missing instances
                const newInstances = missingTemplateIds.map(templateId => ({
                    template_id: templateId,
                    date,
                }));

                const { data: createdInstances, error } = await supabase
                    .from("daily_schedule_instances")
                    .upsert(newInstances, { onConflict: "template_id,date" })
                    .select("id, template_id");

                if (error) {
                    console.error("Error creating daily instances:", error);
                } else {
                    for (const inst of createdInstances || []) {
                        instanceMap.set(inst.template_id, inst.id);
                    }
                }
            }
        } catch (err) {
            console.error("Error in ensureDailyInstances:", err);
        }

        return instanceMap;
    }, []);

    // Fetch day tasks for the current date
    const fetchDayTasks = useCallback(async () => {
        if (!user || templates.length === 0) {
            setDayTasks([]);
            return;
        }

        setIsLoadingTasks(true);
        const dateStr = formatDate(currentDate);

        try {
            // Get template IDs
            const templateIds = templates.map(t => t.id);

            // Ensure daily instances exist
            const instanceMap = await ensureDailyInstances(templateIds, dateStr);

            // Fetch all tasks for these templates
            const { data: tasksData, error: tasksError } = await supabase
                .from("schedule_tasks")
                .select("*")
                .in("template_id", templateIds)
                .eq("is_active", true)
                .order("sort_order", { ascending: true });

            if (tasksError) {
                console.error("Error fetching tasks:", tasksError);
                setDayTasks([]);
                return;
            }

            // Get instance IDs
            const instanceIds = Array.from(instanceMap.values());

            // Fetch completions for these instances
            const { data: completionsData, error: completionsError } = await supabase
                .from("task_completions")
                .select("*")
                .in("instance_id", instanceIds);

            if (completionsError) {
                console.error("Error fetching completions:", completionsError);
            }

            // Build completion map: taskId + instanceId -> completion
            const completionMap = new Map<string, any>();
            for (const comp of completionsData || []) {
                completionMap.set(`${comp.task_id}_${comp.instance_id}`, comp);
            }

            // Build day tasks
            const loadedDayTasks: DayTask[] = [];

            for (const task of tasksData || []) {
                const template = templates.find(t => t.id === task.template_id);
                if (!template) continue;

                const instanceId = instanceMap.get(task.template_id);
                if (!instanceId) continue;

                // Filter by date: show task if it's repeating OR if start_date matches current date
                const isRepeating = task.is_repeating !== false; // Default to true for backwards compatibility
                const taskStartDate = task.start_date;

                if (!isRepeating && taskStartDate) {
                    // One-time task: only show on the specific date
                    if (taskStartDate !== dateStr) {
                        continue; // Skip this task, it's not for this date
                    }
                } else if (!isRepeating && !taskStartDate) {
                    // One-time task without start_date: skip (shouldn't happen)
                    continue;
                }
                // If repeating, check if we're on or after start_date (if specified)
                if (isRepeating && taskStartDate && taskStartDate > dateStr) {
                    continue; // Task hasn't started yet
                }

                const completion = completionMap.get(`${task.id}_${instanceId}`);
                const familyInfo = getFamilyMemberInfo(template);

                loadedDayTasks.push({
                    id: `${task.id}_${instanceId}`,
                    taskId: task.id,
                    instanceId,
                    completionId: completion?.id,
                    // Task info
                    name: task.name,
                    description: task.description,
                    taskType: task.task_type,
                    timeSlot: task.time_slot,
                    scheduledTime: task.scheduled_time,
                    sortOrder: task.sort_order,
                    imageUrls: task.image_url ? (task.image_url.startsWith('[') ? JSON.parse(task.image_url) : [task.image_url]) : undefined,
                    metadata: task.metadata,
                    // Completion info
                    status: completion?.status || "pending",
                    completedBy: completion?.completed_by,
                    completedAt: completion?.completed_at,
                    postponedUntil: completion?.postponed_until,
                    postponeReason: completion?.postpone_reason,
                    originalTimeSlot: completion?.original_time_slot,
                    notes: completion?.notes,
                    // Family member info
                    familyMemberName: familyInfo.name,
                    familyMemberType: familyInfo.type,
                    familyMemberAvatarUrl: familyInfo.avatarUrl,
                    familyMemberAvatarEmoji: familyInfo.avatarEmoji,
                    familyMemberBadgeColor: familyInfo.badgeColor,
                    familyMemberBadgeTextColor: familyInfo.badgeTextColor,
                    // Template info
                    templateId: template.id,
                    templateName: template.name,
                });
            }

            // Sort by time slot order, then sort order
            const slotOrder: Record<TimeSlot, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 };
            loadedDayTasks.sort((a, b) => {
                const slotDiff = slotOrder[a.timeSlot] - slotOrder[b.timeSlot];
                if (slotDiff !== 0) return slotDiff;
                return a.sortOrder - b.sortOrder;
            });

            setDayTasks(loadedDayTasks);
        } catch (err) {
            console.error("Error in fetchDayTasks:", err);
            setDayTasks([]);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [user, templates, currentDate, ensureDailyInstances, getFamilyMemberInfo]);

    // Fetch regimens
    const fetchRegimens = useCallback(async () => {
        if (!user) {
            setRegimens([]);
            return;
        }

        setIsLoadingRegimens(true);
        try {
            // Fetch all active regimens with their phases and tasks
            const { data: regimensData, error: regimensError } = await supabase
                .from("regimens")
                .select(`
                    *,
                    regimen_phases (
                        *,
                        phase_tasks (*)
                    )
                `)
                .in("status", ["active", "paused"])
                .order("created_at", { ascending: true });

            if (regimensError) {
                console.error("Error fetching regimens:", regimensError);
                setRegimens([]);
                return;
            }

            const loadedRegimens: Regimen[] = (regimensData || []).map((r: any) => ({
                id: r.id,
                childId: r.child_id,
                petId: r.pet_id,
                familyMemberName: r.family_member_name,
                name: r.name,
                description: r.description,
                regimenType: r.regimen_type,
                startDate: r.start_date,
                status: r.status,
                createdBy: r.created_by,
                homeId: r.home_id,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                phases: (r.regimen_phases || []).map((p: any) => ({
                    id: p.id,
                    regimenId: p.regimen_id,
                    phaseOrder: p.phase_order,
                    name: p.name,
                    durationDays: p.duration_days,
                    endDate: p.end_date,
                    createdAt: p.created_at,
                    tasks: (p.phase_tasks || []).map((t: any) => ({
                        id: t.id,
                        phaseId: t.phase_id,
                        name: t.name,
                        description: t.description,
                        taskType: t.task_type,
                        frequencyType: t.frequency_type,
                        frequencyValue: t.frequency_value,
                        scheduledTimes: t.scheduled_times || [],
                        daysOfWeek: t.days_of_week,
                        sortOrder: t.sort_order,
                        imageUrls: t.image_url ? (t.image_url.startsWith('[') ? JSON.parse(t.image_url) : [t.image_url]) : undefined,
                        metadata: t.metadata,
                        createdAt: t.created_at,
                    })),
                })),
            }));

            setRegimens(loadedRegimens);
        } catch (err) {
            console.error("Error in fetchRegimens:", err);
            setRegimens([]);
        } finally {
            setIsLoadingRegimens(false);
        }
    }, [user]);

    // Fetch regimen day tasks for the current date
    const fetchRegimenDayTasks = useCallback(async () => {
        if (!user || regimens.length === 0) {
            setRegimenDayTasks([]);
            return;
        }

        const dateStr = formatDate(currentDate);
        const date = new Date(currentDate);
        date.setHours(0, 0, 0, 0);

        try {
            const loadedTasks: RegimenDayTask[] = [];

            for (const regimen of regimens) {
                if (regimen.status !== "active") continue;

                // Check if regimen has started
                const startDate = parseLocalDate(regimen.startDate);
                if (date < startDate) continue;

                // Get active phase
                const phases = regimen.phases || [];
                const activePhase = getActivePhase(regimen, phases, date);
                if (!activePhase) continue;

                const phaseStartDate = parseLocalDate(activePhase.startDate || regimen.startDate);

                // Get tasks for this phase
                const phaseTasks = activePhase.tasks || [];

                for (const task of phaseTasks) {
                    // Check if task runs on this date
                    if (!shouldTaskRunOnDate(task, date, phaseStartDate)) continue;

                    // Get occurrences for this task today
                    const occurrences = getTaskOccurrences(task, date);
                    const familyInfo = getRegimenFamilyMemberInfo(regimen);

                    for (let i = 0; i < occurrences.length; i++) {
                        const time = occurrences[i];

                        loadedTasks.push({
                            id: `${task.id}_${dateStr}_${i}`,
                            taskId: task.id,
                            regimenId: regimen.id,
                            phaseId: activePhase.id,
                            occurrenceIndex: i,
                            // Task info
                            name: task.name,
                            description: task.description,
                            taskType: task.taskType,
                            timeSlot: getTimeSlotFromTime(time),
                            scheduledTime: time,
                            imageUrls: task.imageUrls,
                            // Completion info (will be filled in)
                            status: "pending",
                            // Family member info
                            familyMemberName: familyInfo.name,
                            familyMemberType: familyInfo.type,
                            familyMemberAvatarUrl: familyInfo.avatarUrl,
                            familyMemberAvatarEmoji: familyInfo.avatarEmoji,
                            familyMemberBadgeColor: familyInfo.badgeColor,
                            familyMemberBadgeTextColor: familyInfo.badgeTextColor,
                            // Regimen info
                            regimenName: regimen.name,
                            phaseName: activePhase.name,
                            phaseOrder: activePhase.phaseOrder,
                            isRegimenTask: true,
                        });
                    }
                }
            }

            // Fetch completions for these tasks
            const taskIds = Array.from(new Set(loadedTasks.map(t => t.taskId)));
            if (taskIds.length > 0) {
                const { data: completionsData, error: completionsError } = await supabase
                    .from("regimen_completions")
                    .select("*")
                    .in("phase_task_id", taskIds)
                    .eq("scheduled_date", dateStr);

                if (completionsError) {
                    console.error("Error fetching regimen completions:", completionsError);
                } else {
                    // Map completions to tasks
                    const completionMap = new Map<string, any>();
                    for (const comp of completionsData || []) {
                        completionMap.set(`${comp.phase_task_id}_${comp.occurrence_index}`, comp);
                    }

                    for (const task of loadedTasks) {
                        const completion = completionMap.get(`${task.taskId}_${task.occurrenceIndex}`);
                        if (completion) {
                            task.completionId = completion.id;
                            task.status = completion.status;
                            task.completedBy = completion.completed_by;
                            task.completedAt = completion.completed_at;
                            task.postponedUntil = completion.postponed_until;
                            task.postponeReason = completion.postpone_reason;
                            task.notes = completion.notes;
                        }
                    }
                }
            }

            // Filter out excluded tasks
            const filteredTasks = loadedTasks.filter(t => t.status !== "excluded");

            setRegimenDayTasks(filteredTasks);
        } catch (err) {
            console.error("Error in fetchRegimenDayTasks:", err);
            setRegimenDayTasks([]);
        }
    }, [user, regimens, currentDate, getActivePhase, shouldTaskRunOnDate, getTaskOccurrences, getRegimenFamilyMemberInfo]);

    // Mark task as done
    const markTaskDone = useCallback(async (taskId: string, instanceId: string, notes?: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { data, error } = await supabase
                .from("task_completions")
                .upsert({
                    instance_id: instanceId,
                    task_id: taskId,
                    status: "completed",
                    completed_by: user.id,
                    completed_at: new Date().toISOString(),
                    notes,
                }, { onConflict: "instance_id,task_id" })
                .select()
                .single();

            if (error) {
                console.error("Error marking task done:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.instanceId === instanceId
                    ? { ...t, status: "completed" as TaskStatus, completedBy: user.id, completedAt: new Date().toISOString(), completionId: data.id, notes }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in markTaskDone:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user]);

    // Postpone task
    const postponeTask = useCallback(async (taskId: string, instanceId: string, option: PostponeOption): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const task = dayTasks.find(t => t.taskId === taskId && t.instanceId === instanceId);
            if (!task) return { success: false, error: "Task not found" };

            let postponedUntil: Date | undefined;
            let newTimeSlot: TimeSlot | undefined;
            const now = new Date();

            switch (option) {
                case "1_hour":
                    postponedUntil = new Date(now.getTime() + 60 * 60 * 1000);
                    break;
                case "2_hours":
                    postponedUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                    break;
                case "move_to_next_slot":
                    const slots: TimeSlot[] = ["morning", "afternoon", "evening", "night"];
                    const currentIndex = slots.indexOf(task.timeSlot);
                    newTimeSlot = currentIndex < slots.length - 1 ? slots[currentIndex + 1] : undefined;
                    break;
                case "skip_today":
                    // Mark as skipped instead
                    return skipTask(taskId, instanceId, "Skipped for today");
            }

            const { data, error } = await supabase
                .from("task_completions")
                .upsert({
                    instance_id: instanceId,
                    task_id: taskId,
                    status: "postponed",
                    postponed_until: postponedUntil?.toISOString(),
                    postpone_reason: option,
                    original_time_slot: task.timeSlot,
                }, { onConflict: "instance_id,task_id" })
                .select()
                .single();

            if (error) {
                console.error("Error postponing task:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.instanceId === instanceId
                    ? {
                        ...t,
                        status: "postponed" as TaskStatus,
                        postponedUntil: postponedUntil?.toISOString(),
                        postponeReason: option,
                        originalTimeSlot: task.timeSlot,
                        completionId: data.id,
                        timeSlot: newTimeSlot || t.timeSlot,
                    }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in postponeTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, dayTasks]);

    // Skip task
    const skipTask = useCallback(async (taskId: string, instanceId: string, reason?: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { data, error } = await supabase
                .from("task_completions")
                .upsert({
                    instance_id: instanceId,
                    task_id: taskId,
                    status: "skipped",
                    postpone_reason: reason,
                }, { onConflict: "instance_id,task_id" })
                .select()
                .single();

            if (error) {
                console.error("Error skipping task:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.instanceId === instanceId
                    ? { ...t, status: "skipped" as TaskStatus, postponeReason: reason, completionId: data.id }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in skipTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user]);

    // Mark regimen task as done
    const markRegimenTaskDone = useCallback(async (taskId: string, date: string, occurrenceIndex: number, notes?: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            // Get task to find scheduled time
            const task = regimenDayTasks.find(t => t.taskId === taskId && t.occurrenceIndex === occurrenceIndex);

            const { data, error } = await supabase
                .from("regimen_completions")
                .upsert({
                    phase_task_id: taskId,
                    scheduled_date: date,
                    scheduled_time: task?.scheduledTime,
                    occurrence_index: occurrenceIndex,
                    status: "completed",
                    completed_by: user.id,
                    completed_at: new Date().toISOString(),
                    notes,
                }, { onConflict: "phase_task_id,scheduled_date,occurrence_index" })
                .select()
                .single();

            if (error) {
                console.error("Error marking regimen task done:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setRegimenDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.occurrenceIndex === occurrenceIndex
                    ? { ...t, status: "completed" as TaskStatus, completedBy: user.id, completedAt: new Date().toISOString(), completionId: data.id, notes }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in markRegimenTaskDone:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, regimenDayTasks]);

    // Postpone regimen task
    const postponeRegimenTask = useCallback(async (taskId: string, date: string, occurrenceIndex: number, option: PostponeOption): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const task = regimenDayTasks.find(t => t.taskId === taskId && t.occurrenceIndex === occurrenceIndex);
            if (!task) return { success: false, error: "Task not found" };

            let postponedUntil: Date | undefined;
            const now = new Date();

            switch (option) {
                case "1_hour":
                    postponedUntil = new Date(now.getTime() + 60 * 60 * 1000);
                    break;
                case "2_hours":
                    postponedUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                    break;
                case "skip_today":
                    return skipRegimenTask(taskId, date, occurrenceIndex, "Skipped for today");
            }

            const { data, error } = await supabase
                .from("regimen_completions")
                .upsert({
                    phase_task_id: taskId,
                    scheduled_date: date,
                    scheduled_time: task.scheduledTime,
                    occurrence_index: occurrenceIndex,
                    status: "postponed",
                    postponed_until: postponedUntil?.toISOString(),
                    postpone_reason: option,
                }, { onConflict: "phase_task_id,scheduled_date,occurrence_index" })
                .select()
                .single();

            if (error) {
                console.error("Error postponing regimen task:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setRegimenDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.occurrenceIndex === occurrenceIndex
                    ? { ...t, status: "postponed" as TaskStatus, postponedUntil: postponedUntil?.toISOString(), postponeReason: option, completionId: data.id }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in postponeRegimenTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, regimenDayTasks]);

    // Skip regimen task
    const skipRegimenTask = useCallback(async (taskId: string, date: string, occurrenceIndex: number, reason?: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const task = regimenDayTasks.find(t => t.taskId === taskId && t.occurrenceIndex === occurrenceIndex);

            const { data, error } = await supabase
                .from("regimen_completions")
                .upsert({
                    phase_task_id: taskId,
                    scheduled_date: date,
                    scheduled_time: task?.scheduledTime,
                    occurrence_index: occurrenceIndex,
                    status: "skipped",
                    postpone_reason: reason,
                }, { onConflict: "phase_task_id,scheduled_date,occurrence_index" })
                .select()
                .single();

            if (error) {
                console.error("Error skipping regimen task:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setRegimenDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.occurrenceIndex === occurrenceIndex
                    ? { ...t, status: "skipped" as TaskStatus, postponeReason: reason, completionId: data.id }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in skipRegimenTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, regimenDayTasks]);

    // Undo regimen task
    const undoRegimenTask = useCallback(async (taskId: string, date: string, occurrenceIndex: number): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const task = regimenDayTasks.find(t => t.taskId === taskId && t.occurrenceIndex === occurrenceIndex);

            const { data, error } = await supabase
                .from("regimen_completions")
                .upsert({
                    phase_task_id: taskId,
                    scheduled_date: date,
                    scheduled_time: task?.scheduledTime,
                    occurrence_index: occurrenceIndex,
                    status: "pending",
                    completed_by: null,
                    completed_at: null,
                    postponed_until: null,
                    postpone_reason: null,
                }, { onConflict: "phase_task_id,scheduled_date,occurrence_index" })
                .select()
                .single();

            if (error) {
                console.error("Error undoing regimen task:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setRegimenDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.occurrenceIndex === occurrenceIndex
                    ? { ...t, status: "pending" as TaskStatus, completedBy: undefined, completedAt: undefined, postponedUntil: undefined, postponeReason: undefined, completionId: data.id }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in undoRegimenTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, regimenDayTasks]);

    // Undo task (reset to pending)
    const undoTask = useCallback(async (taskId: string, instanceId: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { data, error } = await supabase
                .from("task_completions")
                .upsert({
                    instance_id: instanceId,
                    task_id: taskId,
                    status: "pending",
                    completed_by: null,
                    completed_at: null,
                    postponed_until: null,
                    postpone_reason: null,
                }, { onConflict: "instance_id,task_id" })
                .select()
                .single();

            if (error) {
                console.error("Error undoing task:", error);
                return { success: false, error: error.message };
            }

            // Update local state
            setDayTasks(prev => prev.map(t =>
                t.taskId === taskId && t.instanceId === instanceId
                    ? {
                        ...t,
                        status: "pending" as TaskStatus,
                        completedBy: undefined,
                        completedAt: undefined,
                        postponedUntil: undefined,
                        postponeReason: undefined,
                        completionId: data.id,
                        timeSlot: t.originalTimeSlot || t.timeSlot,
                    }
                    : t
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in undoTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user]);

    // Create template
    const createTemplate = useCallback(async (template: Omit<ScheduleTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { data, error } = await supabase
                .from("schedule_templates")
                .insert({
                    child_id: template.childId,
                    pet_id: template.petId,
                    family_member_name: template.familyMemberName,
                    family_member_type: template.familyMemberType,
                    family_member_avatar_url: template.familyMemberAvatarUrl,
                    family_member_avatar_emoji: template.familyMemberAvatarEmoji,
                    family_member_badge_color: template.familyMemberBadgeColor,
                    family_member_badge_text_color: template.familyMemberBadgeTextColor,
                    name: template.name,
                    description: template.description,
                    schedule_type: template.scheduleType,
                    created_by: user.id,
                    home_id: template.homeId,
                    is_active: template.isActive ?? true,
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating template:", error);
                return { success: false, error: error.message };
            }

            await fetchTemplates();
            broadcastContentUpdate();
            return { success: true, data };
        } catch (err) {
            console.error("Error in createTemplate:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchTemplates, broadcastContentUpdate]);

    // Update template
    const updateTemplate = useCallback(async (id: string, updates: Partial<ScheduleTemplate>): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.scheduleType !== undefined) updateData.schedule_type = updates.scheduleType;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

            const { data, error } = await supabase
                .from("schedule_templates")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();

            if (error) {
                console.error("Error updating template:", error);
                return { success: false, error: error.message };
            }

            await fetchTemplates();
            broadcastContentUpdate();
            return { success: true, data };
        } catch (err) {
            console.error("Error in updateTemplate:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchTemplates, broadcastContentUpdate]);

    // Delete template
    const deleteTemplate = useCallback(async (id: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { error } = await supabase
                .from("schedule_templates")
                .delete()
                .eq("id", id);

            if (error) {
                console.error("Error deleting template:", error);
                return { success: false, error: error.message };
            }

            await fetchTemplates();
            broadcastContentUpdate();
            return { success: true };
        } catch (err) {
            console.error("Error in deleteTemplate:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchTemplates, broadcastContentUpdate]);

    // Create task
    const createTask = useCallback(async (task: Omit<ScheduleTask, "id" | "createdAt" | "updatedAt">): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { data, error } = await supabase
                .from("schedule_tasks")
                .insert({
                    template_id: task.templateId,
                    name: task.name,
                    description: task.description,
                    task_type: task.taskType,
                    time_slot: task.timeSlot,
                    scheduled_time: task.scheduledTime,
                    sort_order: task.sortOrder,
                    image_url: task.imageUrls ? JSON.stringify(task.imageUrls) : null,
                    metadata: task.metadata,
                    is_active: task.isActive ?? true,
                    is_repeating: task.isRepeating ?? true,
                    start_date: task.startDate,
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating task:", error);
                return { success: false, error: error.message };
            }

            await fetchDayTasks();
            broadcastContentUpdate();
            return { success: true, data };
        } catch (err) {
            console.error("Error in createTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchDayTasks, broadcastContentUpdate]);

    // Update task
    const updateTask = useCallback(async (id: string, updates: Partial<ScheduleTask>): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.taskType !== undefined) updateData.task_type = updates.taskType;
            if (updates.timeSlot !== undefined) updateData.time_slot = updates.timeSlot;
            if (updates.scheduledTime !== undefined) updateData.scheduled_time = updates.scheduledTime;
            if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
            if (updates.imageUrls !== undefined) updateData.image_url = updates.imageUrls ? JSON.stringify(updates.imageUrls) : null;
            if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

            const { data, error } = await supabase
                .from("schedule_tasks")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();

            if (error) {
                console.error("Error updating task:", error);
                return { success: false, error: error.message };
            }

            await fetchDayTasks();
            broadcastContentUpdate();
            return { success: true, data };
        } catch (err) {
            console.error("Error in updateTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchDayTasks, broadcastContentUpdate]);

    // Delete task
    const deleteTask = useCallback(async (id: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { error } = await supabase
                .from("schedule_tasks")
                .delete()
                .eq("id", id);

            if (error) {
                console.error("Error deleting task:", error);
                return { success: false, error: error.message };
            }

            await fetchDayTasks();
            broadcastContentUpdate();
            return { success: true };
        } catch (err) {
            console.error("Error in deleteTask:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchDayTasks, broadcastContentUpdate]);

    // Create regimen with phases and tasks
    const createRegimen = useCallback(async (
        regimen: Omit<Regimen, "id" | "createdAt" | "updatedAt" | "createdBy" | "phases">,
        phases: Array<{
            name?: string;
            durationDays?: number;
            endDate?: string;
            tasks: Array<Omit<PhaseTask, "id" | "phaseId" | "createdAt">>;
        }>
    ): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            // Create the regimen first
            const { data: regimenData, error: regimenError } = await supabase
                .from("regimens")
                .insert({
                    child_id: regimen.childId,
                    pet_id: regimen.petId,
                    family_member_name: regimen.familyMemberName,
                    name: regimen.name,
                    description: regimen.description,
                    regimen_type: regimen.regimenType,
                    start_date: regimen.startDate,
                    status: regimen.status || "active",
                    created_by: user.id,
                    home_id: regimen.homeId,
                })
                .select()
                .single();

            if (regimenError) {
                console.error("Error creating regimen:", regimenError);
                return { success: false, error: regimenError.message };
            }

            // Create phases
            for (let i = 0; i < phases.length; i++) {
                const phase = phases[i];
                const { data: phaseData, error: phaseError } = await supabase
                    .from("regimen_phases")
                    .insert({
                        regimen_id: regimenData.id,
                        phase_order: i + 1,
                        name: phase.name,
                        duration_days: phase.durationDays,
                        end_date: phase.endDate,
                    })
                    .select()
                    .single();

                if (phaseError) {
                    console.error("Error creating phase:", phaseError);
                    // Clean up by deleting regimen
                    await supabase.from("regimens").delete().eq("id", regimenData.id);
                    return { success: false, error: phaseError.message };
                }

                // Create tasks for this phase
                if (phase.tasks.length > 0) {
                    const tasksToInsert = phase.tasks.map((task, j) => ({
                        phase_id: phaseData.id,
                        name: task.name,
                        description: task.description,
                        task_type: task.taskType,
                        frequency_type: task.frequencyType,
                        frequency_value: task.frequencyValue,
                        scheduled_times: task.scheduledTimes,
                        days_of_week: task.daysOfWeek,
                        sort_order: j,
                        image_url: task.imageUrls ? JSON.stringify(task.imageUrls) : null,
                        metadata: task.metadata,
                    }));

                    const { error: tasksError } = await supabase
                        .from("phase_tasks")
                        .insert(tasksToInsert);

                    if (tasksError) {
                        console.error("Error creating phase tasks:", tasksError);
                        await supabase.from("regimens").delete().eq("id", regimenData.id);
                        return { success: false, error: tasksError.message };
                    }
                }
            }

            await fetchRegimens();
            broadcastContentUpdate();
            return { success: true, data: regimenData };
        } catch (err) {
            console.error("Error in createRegimen:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchRegimens, broadcastContentUpdate]);

    // Update regimen
    const updateRegimen = useCallback(async (id: string, updates: Partial<Regimen>): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.status !== undefined) updateData.status = updates.status;

            const { data, error } = await supabase
                .from("regimens")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();

            if (error) {
                console.error("Error updating regimen:", error);
                return { success: false, error: error.message };
            }

            await fetchRegimens();
            broadcastContentUpdate();
            return { success: true, data };
        } catch (err) {
            console.error("Error in updateRegimen:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchRegimens, broadcastContentUpdate]);

    // Update regimen with full phases and tasks (replaces all phases/tasks)
    const updateRegimenFull = useCallback(async (
        id: string,
        updates: Partial<Omit<Regimen, "id" | "createdAt" | "updatedAt" | "createdBy" | "phases">>,
        phases: Array<{
            id?: string; // existing phase id, or undefined for new phase
            name?: string;
            durationDays?: number;
            endDate?: string;
            tasks: Array<{
                id?: string; // existing task id, or undefined for new task
                name: string;
                description?: string;
                taskType: ScheduleType;
                frequencyType: FrequencyType;
                frequencyValue?: number;
                scheduledTimes: string[];
                daysOfWeek?: number[];
                imageUrls?: string[];
                metadata?: Record<string, any>;
            }>;
        }>
    ): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            // 1. Update the regimen itself
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
            if (updates.status !== undefined) updateData.status = updates.status;

            const { error: regimenError } = await supabase
                .from("regimens")
                .update(updateData)
                .eq("id", id);

            if (regimenError) {
                console.error("Error updating regimen:", regimenError);
                return { success: false, error: regimenError.message };
            }

            // 2. Get existing phases for this regimen
            const { data: existingPhases } = await supabase
                .from("regimen_phases")
                .select("id")
                .eq("regimen_id", id);

            const existingPhaseIds = new Set((existingPhases || []).map(p => p.id));
            const newPhaseIds = new Set(phases.filter(p => p.id).map(p => p.id));

            // 3. Delete phases that are no longer in the update
            const phasesToDelete = Array.from(existingPhaseIds).filter(pid => !newPhaseIds.has(pid));
            if (phasesToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from("regimen_phases")
                    .delete()
                    .in("id", phasesToDelete);

                if (deleteError) {
                    console.error("Error deleting old phases:", deleteError);
                }
            }

            // 4. Update or create phases
            for (let i = 0; i < phases.length; i++) {
                const phase = phases[i];

                if (phase.id && existingPhaseIds.has(phase.id)) {
                    // Update existing phase
                    const { error: phaseUpdateError } = await supabase
                        .from("regimen_phases")
                        .update({
                            phase_order: i + 1,
                            name: phase.name,
                            duration_days: phase.durationDays,
                            end_date: phase.endDate,
                        })
                        .eq("id", phase.id);

                    if (phaseUpdateError) {
                        console.error("Error updating phase:", phaseUpdateError);
                        return { success: false, error: phaseUpdateError.message };
                    }

                    // Get existing tasks for this phase
                    const { data: existingTasks } = await supabase
                        .from("phase_tasks")
                        .select("id")
                        .eq("phase_id", phase.id);

                    const existingTaskIds = new Set((existingTasks || []).map(t => t.id));
                    const newTaskIds = new Set(phase.tasks.filter(t => t.id).map(t => t.id));

                    // Delete tasks no longer in the phase
                    const tasksToDelete = Array.from(existingTaskIds).filter(tid => !newTaskIds.has(tid));
                    if (tasksToDelete.length > 0) {
                        await supabase.from("phase_tasks").delete().in("id", tasksToDelete);
                    }

                    // Update or create tasks
                    for (let j = 0; j < phase.tasks.length; j++) {
                        const task = phase.tasks[j];
                        if (task.id && existingTaskIds.has(task.id)) {
                            // Update existing task
                            await supabase
                                .from("phase_tasks")
                                .update({
                                    name: task.name,
                                    description: task.description,
                                    task_type: task.taskType,
                                    frequency_type: task.frequencyType,
                                    frequency_value: task.frequencyValue,
                                    scheduled_times: task.scheduledTimes,
                                    days_of_week: task.daysOfWeek,
                                    sort_order: j,
                                    image_url: task.imageUrls ? JSON.stringify(task.imageUrls) : null,
                                    metadata: task.metadata,
                                })
                                .eq("id", task.id);
                        } else {
                            // Create new task
                            await supabase.from("phase_tasks").insert({
                                phase_id: phase.id,
                                name: task.name,
                                description: task.description,
                                task_type: task.taskType,
                                frequency_type: task.frequencyType,
                                frequency_value: task.frequencyValue,
                                scheduled_times: task.scheduledTimes,
                                days_of_week: task.daysOfWeek,
                                sort_order: j,
                                image_url: task.imageUrls ? JSON.stringify(task.imageUrls) : null,
                                metadata: task.metadata,
                            });
                        }
                    }
                } else {
                    // Create new phase
                    const { data: newPhaseData, error: phaseInsertError } = await supabase
                        .from("regimen_phases")
                        .insert({
                            regimen_id: id,
                            phase_order: i + 1,
                            name: phase.name,
                            duration_days: phase.durationDays,
                            end_date: phase.endDate,
                        })
                        .select()
                        .single();

                    if (phaseInsertError) {
                        console.error("Error creating phase:", phaseInsertError);
                        return { success: false, error: phaseInsertError.message };
                    }

                    // Create tasks for new phase
                    if (phase.tasks.length > 0) {
                        const tasksToInsert = phase.tasks.map((task, j) => ({
                            phase_id: newPhaseData.id,
                            name: task.name,
                            description: task.description,
                            task_type: task.taskType,
                            frequency_type: task.frequencyType,
                            frequency_value: task.frequencyValue,
                            scheduled_times: task.scheduledTimes,
                            days_of_week: task.daysOfWeek,
                            sort_order: j,
                            image_url: task.imageUrls ? JSON.stringify(task.imageUrls) : null,
                            metadata: task.metadata,
                        }));

                        const { error: tasksError } = await supabase
                            .from("phase_tasks")
                            .insert(tasksToInsert);

                        if (tasksError) {
                            console.error("Error creating phase tasks:", tasksError);
                            return { success: false, error: tasksError.message };
                        }
                    }
                }
            }

            await fetchRegimens();
            broadcastContentUpdate();
            return { success: true };
        } catch (err) {
            console.error("Error in updateRegimenFull:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchRegimens, broadcastContentUpdate]);

    // Delete regimen
    const deleteRegimen = useCallback(async (id: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const { error } = await supabase
                .from("regimens")
                .delete()
                .eq("id", id);

            if (error) {
                console.error("Error deleting regimen:", error);
                return { success: false, error: error.message };
            }

            await fetchRegimens();
            broadcastContentUpdate();
            return { success: true };
        } catch (err) {
            console.error("Error in deleteRegimen:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, fetchRegimens, broadcastContentUpdate]);

    // Pause regimen
    const pauseRegimen = useCallback(async (id: string): Promise<DayHubResult> => {
        return updateRegimen(id, { status: "paused" });
    }, [updateRegimen]);

    // Resume regimen
    const resumeRegimen = useCallback(async (id: string): Promise<DayHubResult> => {
        return updateRegimen(id, { status: "active" });
    }, [updateRegimen]);

    // Exclude a single occurrence (mark as deleted/excluded)
    const excludeOccurrence = useCallback(async (taskId: string, date: string, occurrenceIndex: number): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            // Get task to find scheduled time
            const task = regimenDayTasks.find(t => t.taskId === taskId && t.occurrenceIndex === occurrenceIndex);

            const { data, error } = await supabase
                .from("regimen_completions")
                .upsert({
                    phase_task_id: taskId,
                    scheduled_date: date,
                    scheduled_time: task?.scheduledTime,
                    occurrence_index: occurrenceIndex,
                    status: "excluded",
                }, { onConflict: "phase_task_id,scheduled_date,occurrence_index" })
                .select()
                .single();

            if (error) {
                console.error("Error excluding occurrence:", error);
                return { success: false, error: error.message };
            }

            // Update local state - remove from day tasks
            setRegimenDayTasks(prev => prev.filter(t =>
                !(t.taskId === taskId && t.occurrenceIndex === occurrenceIndex)
            ));

            return { success: true, data };
        } catch (err) {
            console.error("Error in excludeOccurrence:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, regimenDayTasks]);

    // End regimen on a specific date (updates phase end_date)
    const endRegimenOnDate = useCallback(async (regimenId: string, endDate: string): Promise<DayHubResult> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            // Find the regimen and its active phase
            const regimen = regimens.find(r => r.id === regimenId);
            if (!regimen) {
                return { success: false, error: "Regimen not found" };
            }

            // Find the currently active phase (or the latest phase)
            const phases = regimen.phases || [];
            const activePhase = getActivePhase(regimen, phases, parseLocalDate(endDate));

            if (!activePhase) {
                // If no active phase, mark the regimen as completed
                const { error: statusError } = await supabase
                    .from("regimens")
                    .update({ status: "completed" })
                    .eq("id", regimenId);

                if (statusError) {
                    return { success: false, error: statusError.message };
                }

                await fetchRegimens();
                broadcastContentUpdate();
                return { success: true };
            }

            // Update the active phase's end_date
            const { error: phaseError } = await supabase
                .from("regimen_phases")
                .update({ end_date: endDate, duration_days: null })
                .eq("id", activePhase.id);

            if (phaseError) {
                console.error("Error updating phase end_date:", phaseError);
                return { success: false, error: phaseError.message };
            }

            // Delete any future phases after the active one
            const futurePhasesToDelete = phases.filter(p => p.phaseOrder > activePhase.phaseOrder);
            if (futurePhasesToDelete.length > 0) {
                const { error: deletePhasesError } = await supabase
                    .from("regimen_phases")
                    .delete()
                    .in("id", futurePhasesToDelete.map(p => p.id));

                if (deletePhasesError) {
                    console.error("Error deleting future phases:", deletePhasesError);
                }
            }

            await fetchRegimens();
            broadcastContentUpdate();
            return { success: true };
        } catch (err) {
            console.error("Error in endRegimenOnDate:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user, regimens, getActivePhase, fetchRegimens, broadcastContentUpdate]);

    // Upload task image
    const uploadTaskImage = useCallback(async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("task-images")
                .upload(fileName, file);

            if (uploadError) {
                console.error("Error uploading image:", uploadError);
                return { success: false, error: uploadError.message };
            }

            // Get public URL (bucket is public)
            const { data: urlData } = supabase.storage
                .from("task-images")
                .getPublicUrl(fileName);

            return { success: true, url: urlData.publicUrl };
        } catch (err) {
            console.error("Error in uploadTaskImage:", err);
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
        }
    }, [user]);

    // Refresh all data
    const refreshData = useCallback(async () => {
        await fetchTemplates();
        await fetchRegimens();
        // fetchDayTasks and fetchRegimenDayTasks will be called after data is loaded
    }, [fetchTemplates, fetchRegimens]);

    // Initial load
    useEffect(() => {
        if (user) {
            fetchTemplates();
            fetchRegimens();
        }
    }, [user, fetchTemplates, fetchRegimens]);

    // Load day tasks when templates or date change
    useEffect(() => {
        if (templates.length > 0) {
            fetchDayTasks();
        } else if (user) {
            setDayTasks([]);
        }
    }, [templates, currentDate, fetchDayTasks, user]);

    // Load regimen day tasks when regimens or date change
    useEffect(() => {
        if (regimens.length > 0) {
            fetchRegimenDayTasks();
        } else if (user) {
            setRegimenDayTasks([]);
        }
    }, [regimens, currentDate, fetchRegimenDayTasks, user]);

    // Set loaded state
    useEffect(() => {
        if (!isLoadingTemplates && !isLoadingTasks && !isLoadingRegimens) {
            setIsLoaded(true);
        }
    }, [isLoadingTemplates, isLoadingTasks, isLoadingRegimens]);

    // Setup realtime subscription for task_completions
    useEffect(() => {
        if (!user) return;

        // Clean up previous channel
        if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
        }

        const channel = supabase
            .channel(`day-hub-completions-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "task_completions",
                },
                (payload) => {
                    console.log("[DayHub] Realtime update:", payload);
                    // Refresh day tasks on any completion change
                    fetchDayTasks();
                }
            )
            .subscribe();

        realtimeChannelRef.current = channel;

        return () => {
            if (realtimeChannelRef.current) {
                supabase.removeChannel(realtimeChannelRef.current);
            }
        };
    }, [user, fetchDayTasks]);

    // Setup realtime subscription for regimen_completions
    useEffect(() => {
        if (!user) return;

        // Clean up previous channel
        if (regimenRealtimeChannelRef.current) {
            supabase.removeChannel(regimenRealtimeChannelRef.current);
        }

        const channel = supabase
            .channel(`day-hub-regimen-completions-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "regimen_completions",
                },
                (payload) => {
                    console.log("[DayHub] Regimen realtime update:", payload);
                    // Refresh regimen day tasks on any completion change
                    fetchRegimenDayTasks();
                }
            )
            .subscribe();

        regimenRealtimeChannelRef.current = channel;

        return () => {
            if (regimenRealtimeChannelRef.current) {
                supabase.removeChannel(regimenRealtimeChannelRef.current);
            }
        };
    }, [user, fetchRegimenDayTasks]);

    // Setup realtime subscription for content tables (templates, tasks, regimens, phases, phase_tasks)
    useEffect(() => {
        if (!user) return;

        // Clean up previous channel
        if (contentRealtimeChannelRef.current) {
            supabase.removeChannel(contentRealtimeChannelRef.current);
        }

        const channel = supabase
            .channel(`day-hub-content-${user.id}-${Date.now()}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "schedule_templates" },
                (payload) => {
                    console.log("[DayHub] Template change:", payload.eventType);
                    fetchTemplates();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "schedule_tasks" },
                (payload) => {
                    console.log("[DayHub] Task change:", payload.eventType);
                    fetchDayTasks();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "regimens" },
                (payload) => {
                    console.log("[DayHub] Regimen change:", payload.eventType);
                    fetchRegimens();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "regimen_phases" },
                (payload) => {
                    console.log("[DayHub] Phase change:", payload.eventType);
                    fetchRegimens();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "phase_tasks" },
                (payload) => {
                    console.log("[DayHub] Phase task change:", payload.eventType);
                    fetchRegimens();
                    fetchRegimenDayTasks();
                }
            )
            .subscribe((status) => {
                console.log("[DayHub] Content realtime subscription status:", status);
            });

        contentRealtimeChannelRef.current = channel;

        return () => {
            if (contentRealtimeChannelRef.current) {
                supabase.removeChannel(contentRealtimeChannelRef.current);
            }
        };
    }, [user, fetchTemplates, fetchDayTasks, fetchRegimens, fetchRegimenDayTasks]);

    // Broadcast channel for instant sync between caregivers (scoped to current child)
    useEffect(() => {
        if (!user || !currentChildId) return;

        const broadcastChannelName = `dayhub-broadcast-${currentChildId}`;
        console.log("[DayHub] Setting up broadcast channel:", broadcastChannelName);

        const broadcastChannel = supabase
            .channel(broadcastChannelName)
            .on("broadcast", { event: "dayhub-content-updated" }, () => {
                console.log("[DayHub] Received broadcast - refreshing content");
                refreshData();
            })
            .subscribe((status) => {
                console.log("[DayHub] Broadcast channel status:", status);
            });

        contentBroadcastChannelRef.current = broadcastChannel;

        return () => {
            if (contentBroadcastChannelRef.current) {
                supabase.removeChannel(contentBroadcastChannelRef.current);
                contentBroadcastChannelRef.current = null;
            }
        };
    }, [user, currentChildId, refreshData]);

    // Refresh data when user returns to the tab/app (fallback for realtime)
    useEffect(() => {
        if (!user) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                console.log("[DayHub] Tab became visible, refreshing data");
                refreshData();
            }
        };

        const handleFocus = () => {
            console.log("[DayHub] Window focused, refreshing data");
            refreshData();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
        };
    }, [user, refreshData]);

    // Polling fallback for reliable sync (every 10 seconds, only when visible)
    useEffect(() => {
        if (!user || typeof document === "undefined") return;

        let pollInterval: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (!pollInterval && document.visibilityState === "visible") {
                pollInterval = setInterval(() => {
                    refreshData();
                }, 10000);
            }
        };

        const stopPolling = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                startPolling();
            } else {
                stopPolling();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        startPolling();

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            stopPolling();
        };
    }, [user, refreshData]);

    return (
        <DayHubContext.Provider
            value={{
                currentDate,
                setCurrentDate,
                // Templates (simple)
                templates,
                isLoadingTemplates,
                // Regimens
                regimens,
                isLoadingRegimens,
                // Day tasks
                dayTasks,
                regimenDayTasks,
                timelineTasks,
                tasksByTimeSlot,
                isLoadingTasks,
                // Progress
                progress,
                isLoaded,
                // Simple task actions
                markTaskDone,
                postponeTask,
                undoTask,
                skipTask,
                // Regimen task actions
                markRegimenTaskDone,
                postponeRegimenTask,
                undoRegimenTask,
                skipRegimenTask,
                // Template CRUD
                createTemplate,
                updateTemplate,
                deleteTemplate,
                // Task CRUD
                createTask,
                updateTask,
                deleteTask,
                // Regimen CRUD
                createRegimen,
                updateRegimen,
                updateRegimenFull,
                deleteRegimen,
                pauseRegimen,
                resumeRegimen,
                // Delete operations
                excludeOccurrence,
                endRegimenOnDate,
                // Upload
                uploadTaskImage,
                refreshData,
            }}
        >
            {children}
        </DayHubContext.Provider>
    );
}

export function useDayHub() {
    const context = useContext(DayHubContext);
    if (context === undefined) {
        throw new Error("useDayHub must be used within a DayHubProvider");
    }
    return context;
}
