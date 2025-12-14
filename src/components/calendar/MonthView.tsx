"use client";

import React from "react";
import { useCalendar } from "@/lib/calendar/CalendarContext";
import { getDaysInMonth, isSameDay } from "@/lib/calendar/types";
import EventChip from "./EventChip";

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthView() {
    const { currentDate, getEventsForDate, setSelectedEvent, isLoading } = useCalendar();
    
    const days = getDaysInMonth(currentDate);
    const today = new Date();
    const currentMonth = currentDate.getMonth();
    
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
        <div className="card-organic overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
                {WEEKDAYS.map(day => (
                    <div 
                        key={day} 
                        className="py-2 text-center text-sm font-medium text-textSub bg-softGreen"
                    >
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Days grid */}
            <div className="grid grid-cols-7">
                {days.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentMonth;
                    const isToday = isSameDay(day, today);
                    const events = getEventsForDate(day);
                    const hasEvents = events.length > 0;
                    const hasPending = events.some(e => e.status === 'proposed' && e.canConfirm);
                    
                    // Show max 3 events, then "+N more"
                    const visibleEvents = events.slice(0, 3);
                    const moreCount = events.length - 3;
                    
                    return (
                        <div
                            key={index}
                            className={`
                                min-h-[100px] lg:min-h-[120px] p-1 border-b border-r border-border
                                ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                                ${index % 7 === 6 ? 'border-r-0' : ''}
                            `}
                        >
                            {/* Day number */}
                            <div className="flex items-center justify-between mb-1">
                                <span
                                    className={`
                                        w-7 h-7 flex items-center justify-center text-sm rounded-full
                                        ${isToday 
                                            ? 'bg-terracotta text-white font-bold' 
                                            : isCurrentMonth 
                                                ? 'text-forest' 
                                                : 'text-textSub'
                                        }
                                    `}
                                >
                                    {day.getDate()}
                                </span>
                                {hasPending && (
                                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                )}
                            </div>
                            
                            {/* Events */}
                            <div className="space-y-0.5">
                                {visibleEvents.map(event => (
                                    <EventChip
                                        key={event.id}
                                        event={event}
                                        compact
                                        onClick={() => setSelectedEvent(event)}
                                    />
                                ))}
                                {moreCount > 0 && (
                                    <button 
                                        className="w-full text-xs text-textSub hover:text-forest text-left px-1"
                                        onClick={() => {
                                            // TODO: Could expand to show all events for this day
                                            if (events.length > 0) {
                                                setSelectedEvent(events[0]);
                                            }
                                        }}
                                    >
                                        +{moreCount} more
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
