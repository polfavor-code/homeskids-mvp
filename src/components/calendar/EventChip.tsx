"use client";

import React from "react";
import { CalendarEventDisplay } from "@/lib/calendar/types";

interface EventChipProps {
    event: CalendarEventDisplay;
    compact?: boolean;
    onClick?: () => void;
}

export default function EventChip({ event, compact = false, onClick }: EventChipProps) {
    const isHomeDay = event.eventType === 'home_day';
    const isPending = event.status === 'proposed';
    const isRejected = event.status === 'rejected';
    
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
                {isHomeDay && (
                    <span className="text-lg flex-shrink-0">🏠</span>
                )}
            </div>
        </button>
    );
}
