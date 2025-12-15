"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCalendar } from "@/lib/calendar/CalendarContext";
import { CalendarIcon } from "@/components/icons/DuotoneIcons";
import { getGoogleCalendarConnectionStatus } from "@/lib/google-calendar";

// Google Calendar Icon
function GoogleCalendarIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/>
            <rect x="3" y="4" width="18" height="5" fill="#1967D2"/>
            <path d="M7 2v4M17 2v4" stroke="#1967D2" strokeWidth="2" strokeLinecap="round"/>
            <rect x="6" y="12" width="3" height="3" fill="white"/>
            <rect x="10.5" y="12" width="3" height="3" fill="white"/>
            <rect x="15" y="12" width="3" height="3" fill="white"/>
            <rect x="6" y="16.5" width="3" height="3" fill="white"/>
            <rect x="10.5" y="16.5" width="3" height="3" fill="white"/>
        </svg>
    );
}

interface CalendarHeaderProps {
    onAddClick: () => void;
}

export default function CalendarHeader({ onAddClick }: CalendarHeaderProps) {
    const { 
        view, 
        setView, 
        currentDate, 
        goToToday, 
        goToPrev, 
        goToNext,
        pendingCount,
    } = useCalendar();
    
    const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
    const [googleEmail, setGoogleEmail] = useState<string | null>(null);
    
    // Check Google Calendar connection status
    useEffect(() => {
        async function checkConnection() {
            const result = await getGoogleCalendarConnectionStatus();
            setGoogleConnected(result.connected);
            setGoogleEmail(result.connection?.googleAccountEmail || null);
        }
        checkConnection();
    }, []);
    
    const monthYear = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });
    
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Title */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-softGreen rounded-xl">
                    <CalendarIcon size={24} className="text-forest" />
                </div>
                <div>
                    <h1 className="font-dmSerif text-2xl text-forest">Calendar</h1>
                    <p className="text-sm text-textSub">
                        {pendingCount > 0 ? (
                            <span className="text-terracotta font-medium">
                                {pendingCount} pending confirmation{pendingCount > 1 ? 's' : ''}
                            </span>
                        ) : (
                            'Manage schedules and events'
                        )}
                    </p>
                </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Show today button */}
                <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-forest bg-white border border-border hover:bg-softGreen rounded-lg transition-colors"
                >
                    Show today
                </button>
                
                {/* Month navigation */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={goToPrev}
                        className="p-2 text-textSub hover:text-forest hover:bg-softGreen rounded-lg transition-colors"
                        aria-label="Previous month"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    
                    <span className="text-lg font-medium text-forest min-w-[160px] text-center">
                        {monthYear}
                    </span>
                    
                    <button
                        onClick={goToNext}
                        className="p-2 text-textSub hover:text-forest hover:bg-softGreen rounded-lg transition-colors"
                        aria-label="Next month"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
                
                {/* View toggle */}
                <div className="flex bg-softGreen rounded-lg p-1">
                    <button
                        onClick={() => setView('month')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            view === 'month'
                                ? 'bg-white text-forest shadow-sm'
                                : 'text-textSub hover:text-forest'
                        }`}
                    >
                        Month
                    </button>
                    <button
                        onClick={() => setView('agenda')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            view === 'agenda'
                                ? 'bg-white text-forest shadow-sm'
                                : 'text-textSub hover:text-forest'
                        }`}
                    >
                        Agenda
                    </button>
                </div>
                
                {/* Google Calendar status/connect button */}
                {googleConnected === null ? (
                    // Loading state
                    <div className="px-3 py-1.5 text-sm text-textSub">
                        <span className="w-4 h-4 border-2 border-textSub/30 border-t-textSub rounded-full animate-spin inline-block"></span>
                    </div>
                ) : googleConnected ? (
                    // Connected state - show badge with manage link
                    <Link
                        href="/settings/integrations"
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors group"
                        title={`Synced with ${googleEmail}`}
                    >
                        <GoogleCalendarIcon size={16} />
                        <span>Google synced</span>
                        <span className="text-blue-500 group-hover:text-blue-700 text-xs">Manage</span>
                    </Link>
                ) : (
                    // Not connected state - show connect button
                    <Link
                        href="/settings/integrations"
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg transition-colors"
                    >
                        <GoogleCalendarIcon size={16} />
                        <span>Connect Google</span>
                    </Link>
                )}
                
                {/* Add button */}
                <button
                    onClick={onAddClick}
                    className="btn-accent flex items-center gap-2 py-2"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add</span>
                </button>
            </div>
        </div>
    );
}
