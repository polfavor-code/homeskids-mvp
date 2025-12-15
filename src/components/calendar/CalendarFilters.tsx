"use client";

import React from "react";
import { useCalendar } from "@/lib/calendar/CalendarContext";

export default function CalendarFilters() {
    const { filters, setFilters, view } = useCalendar();
    
    // Only show filters in agenda view
    if (view !== 'agenda') return null;
    
    return (
        <div className="flex flex-wrap gap-2 items-center text-sm">
            <span className="text-textSub mr-1">Show:</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={filters.showHomeDays}
                    onChange={e => setFilters({ showHomeDays: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                />
                <span className="text-forest">🏠 Stays</span>
            </label>
            
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={filters.showTravel}
                    onChange={e => setFilters({ showTravel: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                />
                <span className="text-forest">🚗 Travel</span>
            </label>
            
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={filters.showEvents}
                    onChange={e => setFilters({ showEvents: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                />
                <span className="text-forest">📅 Events</span>
            </label>
            
            <span className="text-border mx-2">|</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={filters.showPending}
                    onChange={e => setFilters({ showPending: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                />
                <span className="text-forest">Pending</span>
            </label>
            
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={filters.showRejected}
                    onChange={e => setFilters({ showRejected: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                />
                <span className="text-forest">Rejected</span>
            </label>
        </div>
    );
}
