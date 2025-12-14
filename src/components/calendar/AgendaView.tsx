"use client";

import React from "react";
import { useCalendar } from "@/lib/calendar/CalendarContext";
import { formatDateRange, isSameDay } from "@/lib/calendar/types";
import EventChip from "./EventChip";
import CalendarFilters from "./CalendarFilters";

export default function AgendaView() {
    const { events, setSelectedEvent, isLoading, currentDate } = useCalendar();
    
    // Group events by date
    const eventsByDate: Map<string, typeof events> = new Map();
    
    events.forEach(event => {
        const dateKey = event.startAt.toISOString().split('T')[0];
        if (!eventsByDate.has(dateKey)) {
            eventsByDate.set(dateKey, []);
        }
        eventsByDate.get(dateKey)!.push(event);
    });
    
    // Sort dates
    const sortedDates = Array.from(eventsByDate.keys()).sort();
    
    // Get current month for filtering display
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter to show only events in current month
    const filteredDates = sortedDates.filter(dateKey => {
        const date = new Date(dateKey);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const today = new Date();
    
    if (isLoading) {
        return (
            <div className="card-organic p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terracotta"></div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="card-organic p-4">
                <CalendarFilters />
            </div>
            
            {/* Events list */}
            <div className="card-organic divide-y divide-border">
                {filteredDates.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-textSub">No events this month</p>
                        <p className="text-sm text-textSub mt-1">Add a stay or event to get started</p>
                    </div>
                ) : (
                    filteredDates.map(dateKey => {
                        const date = new Date(dateKey);
                        const dayEvents = eventsByDate.get(dateKey) || [];
                        const isToday = isSameDay(date, today);
                        
                        return (
                            <div key={dateKey} className="p-4">
                                {/* Date header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`
                                        w-12 h-12 flex flex-col items-center justify-center rounded-xl
                                        ${isToday ? 'bg-terracotta text-white' : 'bg-softGreen text-forest'}
                                    `}>
                                        <span className="text-[10px] uppercase font-medium">
                                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                        <span className="text-lg font-bold leading-tight">
                                            {date.getDate()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-forest">
                                            {isToday ? 'Today' : date.toLocaleDateString('en-US', { 
                                                weekday: 'long',
                                            })}
                                        </p>
                                        <p className="text-sm text-textSub">
                                            {date.toLocaleDateString('en-US', { 
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Events for this date */}
                                <div className="space-y-2 ml-[60px]">
                                    {dayEvents.map(event => (
                                        <div key={event.id}>
                                            <EventChip
                                                event={event}
                                                onClick={() => setSelectedEvent(event)}
                                            />
                                            {/* Time display for non-all-day events */}
                                            {!event.allDay && (
                                                <p className="text-xs text-textSub mt-1 ml-3">
                                                    {formatDateRange(event.startAt, event.endAt, event.allDay)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
