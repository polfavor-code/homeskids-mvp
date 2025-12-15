"use client";

import React from "react";
import { CalendarEventDisplay } from "@/lib/calendar/types";

// Small Google icon for imported events
function GoogleIcon({ size = 12 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
    );
}

interface EventChipProps {
    event: CalendarEventDisplay;
    compact?: boolean;
    onClick?: () => void;
}

export default function EventChip({ event, compact = false, onClick }: EventChipProps) {
    const isHomeDay = event.eventType === 'home_day';
    const isPending = event.status === 'proposed';
    const isRejected = event.status === 'rejected';
    const isImported = event.source === 'google';
    
    // Get background color
    const getBgColor = () => {
        if (isRejected) return 'bg-gray-100';
        if (isHomeDay && event.homeColor) {
            // Convert hex to rgba for lighter background
            return 'bg-opacity-20';
        }
        return 'bg-softGreen';
    };
    
    // Get text color
    const getTextColor = () => {
        if (isRejected) return 'text-gray-400';
        if (isHomeDay && event.homeColor) return 'text-forest';
        return 'text-forest';
    };
    
    // Get border style for home days
    const getBorderStyle = () => {
        if (isHomeDay && event.homeColor && !isRejected) {
            return { borderLeft: `3px solid ${event.homeColor}` };
        }
        return {};
    };
    
    if (compact) {
        return (
            <button
                onClick={onClick}
                className={`
                    w-full text-left text-xs truncate px-1.5 py-0.5 rounded
                    ${getBgColor()} ${getTextColor()}
                    hover:opacity-80 transition-opacity
                    ${isPending ? 'ring-1 ring-amber-400' : ''}
                    ${isRejected ? 'line-through opacity-60' : ''}
                `}
                style={{
                    ...getBorderStyle(),
                    backgroundColor: isHomeDay && event.homeColor && !isRejected 
                        ? `${event.homeColor}20` 
                        : undefined,
                }}
            >
                {isHomeDay ? '🏠' : '📅'} {event.title}
                {isPending && <span className="ml-1 text-amber-600">●</span>}
                {isImported && <span className="ml-1 opacity-60"><GoogleIcon size={10} /></span>}
            </button>
        );
    }
    
    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left px-3 py-2 rounded-lg
                ${getBgColor()} ${getTextColor()}
                hover:opacity-80 transition-opacity
                ${isPending ? 'ring-2 ring-amber-400' : ''}
                ${isRejected ? 'opacity-60' : ''}
            `}
            style={{
                ...getBorderStyle(),
                backgroundColor: isHomeDay && event.homeColor && !isRejected 
                    ? `${event.homeColor}15` 
                    : undefined,
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium ${isRejected ? 'line-through' : ''}`}>
                            {event.title}
                        </span>
                        {isPending && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded">
                                Pending
                            </span>
                        )}
                        {isRejected && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-200 text-gray-500 rounded">
                                Rejected
                            </span>
                        )}
                    </div>
                    {event.description && (
                        <p className="text-xs text-textSub mt-0.5 truncate">{event.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {isImported && (
                        <span className="opacity-60" title="Imported from Google Calendar">
                            <GoogleIcon size={14} />
                        </span>
                    )}
                    {isHomeDay && (
                        <span className="text-lg">🏠</span>
                    )}
                </div>
            </div>
        </button>
    );
}
