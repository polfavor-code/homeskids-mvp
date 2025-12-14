"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAppState } from "../AppStateContext";
import {
    CalendarEventDisplay,
    ListEventsFilter,
    CreateEventPayload,
    CreateHomeDayPayload,
    UpdateEventPayload,
    EventType,
    EventStatus,
    getMonthStart,
    getMonthEnd,
} from "./types";
import {
    listChildEvents,
    createEvent,
    createHomeDayProposal,
    confirmHomeDay,
    rejectHomeDay,
    updateEvent,
    deleteEvent,
} from "./actions";

// ============================================
// TYPES
// ============================================

export type CalendarView = 'month' | 'agenda';

interface CalendarFilters {
    showEvents: boolean;
    showHomeDays: boolean;
    showPending: boolean;
    showRejected: boolean;
}

interface CalendarContextType {
    // Current view state
    view: CalendarView;
    setView: (view: CalendarView) => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    
    // Navigation
    goToToday: () => void;
    goToPrev: () => void;
    goToNext: () => void;
    
    // Events
    events: CalendarEventDisplay[];
    isLoading: boolean;
    error: string | null;
    
    // Filters
    filters: CalendarFilters;
    setFilters: (filters: Partial<CalendarFilters>) => void;
    
    // Actions
    refreshEvents: () => Promise<void>;
    addEvent: (payload: CreateEventPayload) => Promise<{ success: boolean; error?: string }>;
    addHomeDay: (payload: CreateHomeDayPayload) => Promise<{ success: boolean; error?: string; autoConfirmed?: boolean }>;
    confirmEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
    rejectEvent: (eventId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
    editEvent: (eventId: string, payload: UpdateEventPayload) => Promise<{ success: boolean; error?: string }>;
    removeEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
    
    // Selected event (for details panel)
    selectedEvent: CalendarEventDisplay | null;
    setSelectedEvent: (event: CalendarEventDisplay | null) => void;
    
    // Pending notifications count
    pendingCount: number;
    
    // Get events for a specific date
    getEventsForDate: (date: Date) => CalendarEventDisplay[];
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface CalendarProviderProps {
    children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
    const { currentChild, homes } = useAppState();
    
    // View state
    const [view, setView] = useState<CalendarView>('month');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    
    // Events state
    const [events, setEvents] = useState<CalendarEventDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Selected event
    const [selectedEvent, setSelectedEvent] = useState<CalendarEventDisplay | null>(null);
    
    // Filters
    const [filters, setFiltersState] = useState<CalendarFilters>({
        showEvents: true,
        showHomeDays: true,
        showPending: true,
        showRejected: false,
    });
    
    // Pending notifications count
    const pendingCount = events.filter(
        e => e.eventType === 'home_day' && e.status === 'proposed' && e.canConfirm
    ).length;
    
    // Set filters
    const setFilters = useCallback((newFilters: Partial<CalendarFilters>) => {
        setFiltersState(prev => ({ ...prev, ...newFilters }));
    }, []);
    
    // Navigation
    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);
    
    const goToPrev = useCallback(() => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    }, []);
    
    const goToNext = useCallback(() => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    }, []);
    
    // Fetch events
    const refreshEvents = useCallback(async () => {
        if (!currentChild) {
            setEvents([]);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Get events for current month +/- 1 month for buffer
            const rangeStart = new Date(currentDate);
            rangeStart.setMonth(rangeStart.getMonth() - 1);
            rangeStart.setDate(1);
            
            const rangeEnd = new Date(currentDate);
            rangeEnd.setMonth(rangeEnd.getMonth() + 2);
            rangeEnd.setDate(0);
            
            // Build event types filter
            const eventTypes: EventType[] = [];
            if (filters.showEvents) eventTypes.push('event');
            if (filters.showHomeDays) eventTypes.push('home_day');
            
            // Build status filter
            const statuses: EventStatus[] = ['confirmed'];
            if (filters.showPending) statuses.push('proposed');
            if (filters.showRejected) statuses.push('rejected');
            
            const filter: ListEventsFilter = {
                childId: currentChild.id,
                rangeStart,
                rangeEnd,
                eventTypes: eventTypes.length > 0 ? eventTypes : undefined,
                statuses,
            };
            
            const result = await listChildEvents(filter);
            
            if (result.error) {
                setError(result.error);
            } else {
                setEvents(result.events);
            }
        } catch (err) {
            console.error('Error refreshing events:', err);
            setError('Failed to load events');
        } finally {
            setIsLoading(false);
        }
    }, [currentChild, currentDate, filters]);
    
    // Refresh when child or date changes
    useEffect(() => {
        refreshEvents();
    }, [refreshEvents]);
    
    // Add event
    const addEvent = useCallback(async (payload: CreateEventPayload) => {
        const result = await createEvent(payload);
        if (result.event) {
            setEvents(prev => [...prev, result.event!].sort(
                (a, b) => a.startAt.getTime() - b.startAt.getTime()
            ));
            return { success: true };
        }
        return { success: false, error: result.error };
    }, []);
    
    // Add home day
    const addHomeDay = useCallback(async (payload: CreateHomeDayPayload) => {
        const result = await createHomeDayProposal(payload);
        if (result.event) {
            setEvents(prev => [...prev, result.event!].sort(
                (a, b) => a.startAt.getTime() - b.startAt.getTime()
            ));
            return { success: true, autoConfirmed: result.autoConfirmed };
        }
        return { success: false, error: result.error };
    }, []);
    
    // Confirm event
    const confirmEvent = useCallback(async (eventId: string) => {
        const result = await confirmHomeDay(eventId);
        if (result.success && result.event) {
            setEvents(prev => prev.map(e => 
                e.id === eventId ? result.event! : e
            ));
            // Update selected event if it's the one being confirmed
            if (selectedEvent?.id === eventId) {
                setSelectedEvent(result.event);
            }
        }
        return result;
    }, [selectedEvent]);
    
    // Reject event
    const rejectEvent = useCallback(async (eventId: string, reason?: string) => {
        const result = await rejectHomeDay(eventId, reason);
        if (result.success) {
            // Remove from list if not showing rejected, otherwise update status
            if (!filters.showRejected) {
                setEvents(prev => prev.filter(e => e.id !== eventId));
            } else {
                setEvents(prev => prev.map(e => 
                    e.id === eventId ? { ...e, status: 'rejected' as const } : e
                ));
            }
            // Clear selected event if it's the one being rejected
            if (selectedEvent?.id === eventId) {
                setSelectedEvent(null);
            }
        }
        return result;
    }, [filters.showRejected, selectedEvent]);
    
    // Edit event
    const editEvent = useCallback(async (eventId: string, payload: UpdateEventPayload) => {
        const result = await updateEvent(eventId, payload);
        if (result.event) {
            setEvents(prev => prev.map(e => 
                e.id === eventId ? result.event! : e
            ));
            if (selectedEvent?.id === eventId) {
                setSelectedEvent(result.event);
            }
            return { success: true };
        }
        return { success: false, error: result.error };
    }, [selectedEvent]);
    
    // Remove event
    const removeEvent = useCallback(async (eventId: string) => {
        const result = await deleteEvent(eventId);
        if (result.success) {
            setEvents(prev => prev.filter(e => e.id !== eventId));
            if (selectedEvent?.id === eventId) {
                setSelectedEvent(null);
            }
        }
        return result;
    }, [selectedEvent]);
    
    // Get events for a specific date
    const getEventsForDate = useCallback((date: Date): CalendarEventDisplay[] => {
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);
        
        return events.filter(event => {
            const eventStart = new Date(event.startAt);
            const eventEnd = new Date(event.endAt);
            // Event overlaps with the date
            return eventStart <= dateEnd && eventEnd >= dateStart;
        });
    }, [events]);
    
    return (
        <CalendarContext.Provider
            value={{
                view,
                setView,
                currentDate,
                setCurrentDate,
                goToToday,
                goToPrev,
                goToNext,
                events,
                isLoading,
                error,
                filters,
                setFilters,
                refreshEvents,
                addEvent,
                addHomeDay,
                confirmEvent,
                rejectEvent,
                editEvent,
                removeEvent,
                selectedEvent,
                setSelectedEvent,
                pendingCount,
                getEventsForDate,
            }}
        >
            {children}
        </CalendarContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useCalendar() {
    const context = useContext(CalendarContext);
    if (context === undefined) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
}
