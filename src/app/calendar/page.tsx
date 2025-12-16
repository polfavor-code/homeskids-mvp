"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { CalendarProvider, useCalendar } from "@/lib/calendar/CalendarContext";
import { useAppState } from "@/lib/AppStateContext";
import { FEATURES } from "@/lib/supabase";
import {
    CalendarHeader,
    MonthView,
    AgendaView,
    AddEventModal,
    EventDetailPanel,
} from "@/components/calendar";
import PlaceholderPage from "@/components/PlaceholderPage";
import { CalendarIcon } from "@/components/icons/DuotoneIcons";
import { getGoogleCalendarConnectionStatus } from "@/lib/google-calendar";
import { hasAppleCalendarConnected } from "@/lib/apple-calendar";

// Google Calendar Icon
function GoogleCalendarIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/>
            <rect x="3" y="4" width="18" height="5" fill="#1967D2"/>
            <rect x="6" y="12" width="3" height="3" fill="white"/>
            <rect x="10.5" y="12" width="3" height="3" fill="white"/>
            <rect x="15" y="12" width="3" height="3" fill="white"/>
        </svg>
    );
}

// Apple Calendar Icon
function AppleCalendarIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" fill="#FF3B30"/>
            <rect x="3" y="4" width="18" height="5" fill="#D12F26"/>
            <text x="12" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">31</text>
        </svg>
    );
}

function CalendarContent() {
    const { view, error, isLoading } = useCalendar();
    const { currentChild, isLoaded: appLoaded, accessibleHomes } = useAppState();
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Check if user has home access
    const hasHomeAccess = accessibleHomes.length > 0;
    
    // Calendar sync status
    const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
    const [appleConnected, setAppleConnected] = useState<boolean | null>(null);
    
    useEffect(() => {
        async function checkConnections() {
            const googleResult = await getGoogleCalendarConnectionStatus();
            setGoogleConnected(googleResult.connected);
            
            const appleResult = await hasAppleCalendarConnected();
            setAppleConnected(appleResult.connected);
        }
        checkConnections();
    }, []);
    
    // Show loading state while app state loads
    if (!appLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terracotta"></div>
                </div>
            </AppShell>
        );
    }
    
    // No home access - show empty state
    if (!hasHomeAccess) {
        return (
            <AppShell>
                <div className="space-y-6">
                    <div>
                        <h1 className="font-dmSerif text-2xl text-forest mt-2">Calendar</h1>
                        <p className="text-sm text-textSub mt-1">Events and schedules.</p>
                    </div>
                    
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon size={32} className="text-forest" />
                        </div>
                        <h2 className="font-dmSerif text-xl text-forest mb-2">No events yet</h2>
                        <p className="text-textSub">
                            Once you&apos;re added to a home, calendar events will appear here automatically.
                        </p>
                    </div>
                </div>
            </AppShell>
        );
    }
    
    // Show message if no child selected
    if (!currentChild) {
        return (
            <AppShell>
                <div className="card-organic p-8 text-center">
                    <div className="w-16 h-16 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon size={32} className="text-forest" />
                    </div>
                    <h2 className="font-dmSerif text-xl text-forest mb-2">No Child Selected</h2>
                    <p className="text-textSub">
                        Please select a child to view their calendar.
                    </p>
                </div>
            </AppShell>
        );
    }
    
    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header with controls */}
                <CalendarHeader onAddClick={() => setShowAddModal(true)} />
                
                {/* Error message */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}
                
                {/* Calendar view */}
                {view === 'month' ? <MonthView /> : <AgendaView />}
                
                {/* Calendar sync status footer */}
                {(googleConnected !== null || appleConnected !== null) && (
                    <div className="flex items-center justify-center gap-4 text-xs text-textSub pt-4 border-t border-border/50">
                        <Link 
                            href="/settings/integrations"
                            className="inline-flex items-center gap-1.5 hover:text-forest transition-colors"
                        >
                            <GoogleCalendarIcon size={14} />
                            <span>Google Calendar</span>
                            <span>-</span>
                            <span className={googleConnected ? "text-green-600" : ""}>
                                {googleConnected ? "connected" : "not connected"}
                            </span>
                        </Link>
                        
                        <span className="text-textSub/30">|</span>
                        
                        <Link 
                            href="/settings/integrations/apple-calendar"
                            className="inline-flex items-center gap-1.5 hover:text-forest transition-colors"
                        >
                            <AppleCalendarIcon size={14} />
                            <span>Apple Calendar</span>
                            <span>-</span>
                            <span className={appleConnected ? "text-green-600" : ""}>
                                {appleConnected ? "connected" : "not connected"}
                            </span>
                        </Link>
                    </div>
                )}
                
                {/* Add event modal */}
                <AddEventModal 
                    isOpen={showAddModal} 
                    onClose={() => setShowAddModal(false)} 
                />
                
                {/* Event detail panel */}
                <EventDetailPanel />
            </div>
        </AppShell>
    );
}

export default function CalendarPage() {
    // Check if calendar feature is enabled
    if (!FEATURES.CALENDAR) {
        return (
            <PlaceholderPage
                title="Calendar"
                icon={<CalendarIcon size={32} />}
                joke="This calendar is still syncing naps, pickups and pizza nights."
                description="Keep track of when your child is with each parent, schedule important events, and never miss a pickup or activity."
                features={[
                    "See when your child is with Daddy, Mommy, or other homes",
                    "Track pickup and drop-off times",
                    "Add school events, holidays and activities",
                    "Get reminders for travel bag packing",
                    "See medical or appointment reminders"
                ]}
            />
        );
    }
    
    return (
        <CalendarProvider>
            <CalendarContent />
        </CalendarProvider>
    );
}
