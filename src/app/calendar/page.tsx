"use client";

import React, { useState } from "react";
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

function CalendarContent() {
    const { view, error, isLoading } = useCalendar();
    const { currentChild, isLoaded: appLoaded } = useAppState();
    const [showAddModal, setShowAddModal] = useState(false);
    
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
