"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { 
    fetchGoogleCalendars, 
    saveCalendarSources,
    getCalendarSources,
    performInitialImport,
    GoogleCalendarListItem,
    GoogleCalendarSource,
} from "@/lib/google-calendar";

export default function GoogleCalendarSelectPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const { children } = useAppState();
    
    const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
    const [existingSources, setExistingSources] = useState<GoogleCalendarSource[]>([]);
    const [selections, setSelections] = useState<Map<string, { selected: boolean; childId: string | null }>>(new Map());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ created: number; candidates: number } | null>(null);
    
    // Load calendars and existing sources
    useEffect(() => {
        async function load() {
            setLoading(true);
            
            // Fetch available calendars from Google
            const calendarsResult = await fetchGoogleCalendars();
            if (calendarsResult.error) {
                setError(calendarsResult.error);
                setLoading(false);
                return;
            }
            setCalendars(calendarsResult.calendars);
            
            // Fetch existing sources
            const sourcesResult = await getCalendarSources();
            setExistingSources(sourcesResult.sources);
            
            // Initialize selections from existing sources
            const initialSelections = new Map<string, { selected: boolean; childId: string | null }>();
            for (const cal of calendarsResult.calendars) {
                const existingSource = sourcesResult.sources.find(s => s.googleCalendarId === cal.id);
                initialSelections.set(cal.id, {
                    selected: !!existingSource,
                    childId: existingSource?.childId || null,
                });
            }
            setSelections(initialSelections);
            
            setLoading(false);
        }
        load();
    }, []);
    
    const toggleCalendar = (calendarId: string) => {
        setSelections(prev => {
            const newSelections = new Map(prev);
            const current = newSelections.get(calendarId) || { selected: false, childId: null };
            newSelections.set(calendarId, {
                ...current,
                selected: !current.selected,
                // If deselecting, clear childId; if selecting with only one child, auto-select
                childId: !current.selected && children.length === 1 ? children[0].id : current.childId,
            });
            return newSelections;
        });
    };
    
    const setCalendarChild = (calendarId: string, childId: string) => {
        setSelections(prev => {
            const newSelections = new Map(prev);
            const current = newSelections.get(calendarId) || { selected: true, childId: null };
            newSelections.set(calendarId, { ...current, childId });
            return newSelections;
        });
    };
    
    const getSelectedCalendars = () => {
        const selected: { calendar: GoogleCalendarListItem; childId: string }[] = [];
        selections.forEach((sel, calendarId) => {
            if (sel.selected && sel.childId) {
                const cal = calendars.find(c => c.id === calendarId);
                if (cal) {
                    selected.push({ calendar: cal, childId: sel.childId });
                }
            }
        });
        return selected;
    };
    
    const handleSave = async () => {
        const selected = getSelectedCalendars();
        
        // Validate all selected calendars have a child
        const incomplete = Array.from(selections.entries())
            .filter(([_, sel]) => sel.selected && !sel.childId);
        
        if (incomplete.length > 0) {
            setError('Please select a child for all selected calendars');
            return;
        }
        
        setSaving(true);
        setError(null);
        
        const result = await saveCalendarSources({
            calendars: selected.map(s => ({
                googleCalendarId: s.calendar.id,
                googleCalendarName: s.calendar.summary,
                googleCalendarColor: s.calendar.backgroundColor,
                isPrimary: s.calendar.primary || false,
                childId: s.childId,
            })),
        });
        
        if (result.error) {
            setError(result.error);
            setSaving(false);
            return;
        }
        
        // Perform initial import
        setImporting(true);
        const importRes = await performInitialImport();
        
        if (importRes.error) {
            setError(importRes.error);
        } else {
            setImportResult({
                created: importRes.totalCreated,
                candidates: importRes.candidatesFound,
            });
        }
        
        setSaving(false);
        setImporting(false);
    };
    
    const handleContinue = () => {
        if (importResult && importResult.candidates > 0) {
            // Go to mapping wizard
            router.push('/settings/integrations/google-calendar/map');
        } else {
            // No candidates, go to Calendar page
            router.push('/calendar');
        }
    };
    
    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header with back link */}
                <div>
                    <Link 
                        href="/settings/integrations" 
                        className="text-sm text-terracotta hover:underline inline-flex items-center gap-1"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Integrations
                    </Link>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Select Calendars</h1>
                    <p className="text-sm text-textSub mt-1">
                        Choose which calendars to import and assign them to a child.
                    </p>
                </div>
                
                {/* Error message */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                {/* Import result success */}
                {importResult && (
                    <div className="p-4 bg-softGreen border border-green-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-forest">Import Complete!</p>
                                <p className="text-sm text-textSub mt-1">
                                    Imported {importResult.created} events.
                                    {importResult.candidates > 0 && (
                                        <> Found <strong>{importResult.candidates}</strong> potential home stays to review.</>
                                    )}
                                </p>
                                <button
                                    onClick={handleContinue}
                                    className="btn-accent py-2 px-4 mt-3"
                                >
                                    {importResult.candidates > 0 ? 'Review Home Stays →' : 'Done'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Loading state */}
                {loading && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-8 h-8 border-3 border-terracotta/30 border-t-terracotta rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-textSub mt-3">Loading your calendars...</p>
                    </div>
                )}
                
                {/* Calendar list */}
                {!loading && !importResult && (
                    <>
                        <div className="card-organic divide-y divide-border">
                            {calendars.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-textSub">No calendars found in your Google account.</p>
                                </div>
                            ) : (
                                calendars.map(calendar => {
                                    const selection = selections.get(calendar.id) || { selected: false, childId: null };
                                    
                                    return (
                                        <div key={calendar.id} className="p-4">
                                            <div className="flex items-start gap-3">
                                                {/* Checkbox */}
                                                <label className="flex items-center cursor-pointer mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={selection.selected}
                                                        onChange={() => toggleCalendar(calendar.id)}
                                                        className="w-5 h-5 rounded border-border text-terracotta focus:ring-terracotta"
                                                    />
                                                </label>
                                                
                                                {/* Calendar info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {calendar.backgroundColor && (
                                                            <div 
                                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: calendar.backgroundColor }}
                                                            />
                                                        )}
                                                        <span className="font-medium text-forest truncate">
                                                            {calendar.summary}
                                                        </span>
                                                        {calendar.primary && (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                    {calendar.description && (
                                                        <p className="text-xs text-textSub mt-0.5 truncate">
                                                            {calendar.description}
                                                        </p>
                                                    )}
                                                    
                                                    {/* Child selection */}
                                                    {selection.selected && (
                                                        <div className="mt-3">
                                                            <label className="text-xs text-textSub block mb-1">
                                                                Import events for:
                                                            </label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {children.map(child => (
                                                                    <button
                                                                        key={child.id}
                                                                        onClick={() => setCalendarChild(calendar.id, child.id)}
                                                                        className={`
                                                                            px-3 py-1.5 rounded-lg text-sm transition-colors
                                                                            ${selection.childId === child.id
                                                                                ? 'bg-terracotta text-white'
                                                                                : 'bg-gray-100 text-forest hover:bg-gray-200'
                                                                            }
                                                                        `}
                                                                    >
                                                                        {child.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {!selection.childId && (
                                                                <p className="text-xs text-red-600 mt-1">
                                                                    Please select a child
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        
                        {/* Save button */}
                        {calendars.length > 0 && (
                            <div className="flex gap-3">
                                <Link
                                    href="/settings/integrations"
                                    className="btn-secondary py-3 px-6"
                                >
                                    Cancel
                                </Link>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || importing || getSelectedCalendars().length === 0}
                                    className="btn-accent py-3 px-6 flex-1"
                                >
                                    {importing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Importing events...
                                        </span>
                                    ) : saving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Saving...
                                        </span>
                                    ) : (
                                        `Import ${getSelectedCalendars().length} Calendar${getSelectedCalendars().length !== 1 ? 's' : ''}`
                                    )}
                                </button>
                            </div>
                        )}
                        
                        {/* Info note */}
                        <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                            <p className="font-medium">💡 One calendar per child</p>
                            <p className="text-blue-700 mt-1">
                                Each calendar you select will be imported for one specific child. 
                                If a calendar contains events for multiple children, select the primary child it relates to.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </AppShell>
    );
}
