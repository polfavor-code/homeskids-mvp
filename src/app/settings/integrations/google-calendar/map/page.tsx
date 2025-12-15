"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { 
    getHomeStayCandidates,
    createMappingRule,
    ignoreCandidatesByTitle,
    CandidateGroup,
    MatchType,
} from "@/lib/google-calendar";
import { getHomeColor } from "@/lib/calendar/types";

type MappingChoice = {
    homeId: string | null; // null means "keep as event"
    matchType: MatchType;
    autoConfirm: boolean;
};

export default function GoogleCalendarMapPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const { homes, children } = useAppState();
    
    const [candidateGroups, setCandidateGroups] = useState<CandidateGroup[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [choices, setChoices] = useState<Map<string, MappingChoice>>(new Map());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);
    const [stats, setStats] = useState({ mapped: 0, ignored: 0, eventsUpdated: 0 });
    
    // Load candidates
    useEffect(() => {
        async function load() {
            setLoading(true);
            const result = await getHomeStayCandidates();
            
            if (result.error) {
                setError(result.error);
            } else {
                setCandidateGroups(result.groups);
                
                // Initialize default choices (keep as event)
                const initialChoices = new Map<string, MappingChoice>();
                result.groups.forEach(group => {
                    const key = `${group.title}::${group.calendarId}`;
                    initialChoices.set(key, {
                        homeId: null,
                        matchType: group.suggestedMatchType,
                        autoConfirm: false,
                    });
                });
                setChoices(initialChoices);
            }
            
            setLoading(false);
        }
        load();
    }, []);
    
    const currentGroup = candidateGroups[currentIndex];
    const currentKey = currentGroup ? `${currentGroup.title}::${currentGroup.calendarId}` : '';
    const currentChoice = choices.get(currentKey);
    
    const setHomeChoice = (homeId: string | null) => {
        setChoices(prev => {
            const newChoices = new Map(prev);
            newChoices.set(currentKey, {
                ...currentChoice!,
                homeId,
            });
            return newChoices;
        });
    };
    
    const setMatchType = (matchType: MatchType) => {
        setChoices(prev => {
            const newChoices = new Map(prev);
            newChoices.set(currentKey, {
                ...currentChoice!,
                matchType,
            });
            return newChoices;
        });
    };
    
    const handleNext = () => {
        if (currentIndex < candidateGroups.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // All done, save all choices
            handleSaveAll();
        }
    };
    
    const handleSkip = () => {
        // Set choice to ignore (keep as event)
        setHomeChoice(null);
        handleNext();
    };
    
    const handleSaveAll = async () => {
        setSaving(true);
        setError(null);
        
        let mapped = 0;
        let ignored = 0;
        let eventsUpdated = 0;
        
        for (const group of candidateGroups) {
            const key = `${group.title}::${group.calendarId}`;
            const choice = choices.get(key);
            
            if (!choice) continue;
            
            if (choice.homeId) {
                // Create mapping rule
                const result = await createMappingRule({
                    childId: group.childId,
                    googleCalendarId: group.calendarId,
                    matchType: choice.matchType,
                    matchValue: choice.matchType === 'event_id' 
                        ? group.candidates[0].eventId 
                        : group.title,
                    homeId: choice.homeId,
                    resultingEventType: 'home_day',
                    autoConfirm: choice.autoConfirm,
                });
                
                if (result.error) {
                    setError(result.error);
                    setSaving(false);
                    return;
                }
                
                mapped++;
                eventsUpdated += result.eventsUpdated;
            } else {
                // Ignore these events
                await ignoreCandidatesByTitle(group.title, group.calendarId, group.childId);
                ignored++;
            }
        }
        
        setStats({ mapped, ignored, eventsUpdated });
        setCompleted(true);
        setSaving(false);
    };
    
    const activeHomes = homes.filter(h => h.status === 'active');
    const childName = children.find(c => c.id === currentGroup?.childId)?.name || 'your child';
    
    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
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
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Link Events to Homes</h1>
                    <p className="text-sm text-textSub mt-1">
                        Tell us which Google Calendar events mean {childName} stays at a specific home.
                    </p>
                </div>
                
                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                {/* Loading */}
                {loading && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-8 h-8 border-3 border-terracotta/30 border-t-terracotta rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-textSub mt-3">Loading candidates...</p>
                    </div>
                )}
                
                {/* No candidates */}
                {!loading && candidateGroups.length === 0 && !completed && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2C3E2D" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-forest text-lg">All Set!</h3>
                        <p className="text-textSub mt-2">
                            No events need to be mapped right now. You can create mapping rules later if needed.
                        </p>
                        <Link href="/calendar" className="btn-accent py-2 px-6 mt-4 inline-block">
                            Go to Calendar
                        </Link>
                    </div>
                )}
                
                {/* Completed */}
                {completed && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2C3E2D" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-forest text-lg">Mapping Complete!</h3>
                        <p className="text-textSub mt-2">
                            Created {stats.mapped} mapping rule{stats.mapped !== 1 ? 's' : ''}, 
                            updated {stats.eventsUpdated} event{stats.eventsUpdated !== 1 ? 's' : ''}.
                            {stats.ignored > 0 && ` Ignored ${stats.ignored} event type${stats.ignored !== 1 ? 's' : ''}.`}
                        </p>
                        <div className="flex gap-3 justify-center mt-4">
                            <Link href="/settings/integrations/google-calendar/mappings" className="btn-secondary py-2 px-4">
                                View Mapping Rules
                            </Link>
                            <Link href="/calendar" className="btn-accent py-2 px-6">
                                Go to Calendar
                            </Link>
                        </div>
                    </div>
                )}
                
                {/* Mapping wizard */}
                {!loading && !completed && currentGroup && (
                    <>
                        {/* Progress */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-terracotta transition-all"
                                    style={{ width: `${((currentIndex + 1) / candidateGroups.length) * 100}%` }}
                                />
                            </div>
                            <span className="text-sm text-textSub">
                                {currentIndex + 1} of {candidateGroups.length}
                            </span>
                        </div>
                        
                        {/* Current candidate */}
                        <div className="card-organic p-5">
                            <div className="mb-4">
                                <div className="flex items-center gap-2 text-xs text-textSub mb-1">
                                    <span>From: {currentGroup.calendarName}</span>
                                    {currentGroup.recurrenceInfo && (
                                        <>
                                            <span>•</span>
                                            <span className="text-blue-600">{currentGroup.recurrenceInfo}</span>
                                        </>
                                    )}
                                </div>
                                <h2 className="font-dmSerif text-xl text-forest">&quot;{currentGroup.title}&quot;</h2>
                                <p className="text-sm text-textSub mt-1">
                                    {currentGroup.candidates.length} occurrence{currentGroup.candidates.length !== 1 ? 's' : ''} found
                                </p>
                            </div>
                            
                            {/* Question */}
                            <div className="bg-softGreen/50 rounded-xl p-4 mb-4">
                                <p className="font-medium text-forest">
                                    This event means {childName} stays at:
                                </p>
                            </div>
                            
                            {/* Home options */}
                            <div className="space-y-2">
                                {activeHomes.map(home => {
                                    const isSelected = currentChoice?.homeId === home.id;
                                    const homeColor = getHomeColor(home.name);
                                    
                                    return (
                                        <button
                                            key={home.id}
                                            onClick={() => setHomeChoice(home.id)}
                                            className={`
                                                w-full p-4 rounded-xl border-2 text-left transition-all
                                                ${isSelected 
                                                    ? 'border-terracotta bg-terracotta/5' 
                                                    : 'border-border hover:border-textSub'
                                                }
                                            `}
                                            style={{
                                                borderLeftWidth: '4px',
                                                borderLeftColor: isSelected ? homeColor : undefined,
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">🏠</span>
                                                <span className="font-medium text-forest">{home.name}</span>
                                                {isSelected && (
                                                    <svg className="ml-auto w-5 h-5 text-terracotta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                                
                                {/* Ignore option */}
                                <button
                                    onClick={() => setHomeChoice(null)}
                                    className={`
                                        w-full p-4 rounded-xl border-2 text-left transition-all
                                        ${currentChoice?.homeId === null 
                                            ? 'border-gray-400 bg-gray-50' 
                                            : 'border-border hover:border-textSub'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📅</span>
                                        <div>
                                            <span className="font-medium text-forest">Keep as regular event</span>
                                            <p className="text-xs text-textSub mt-0.5">
                                                Not a home stay, just a calendar event
                                            </p>
                                        </div>
                                        {currentChoice?.homeId === null && (
                                            <svg className="ml-auto w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            </div>
                            
                            {/* Match type options */}
                            {currentChoice?.homeId && currentGroup.candidates.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-sm font-medium text-forest mb-2">Apply this rule to:</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setMatchType('title_exact')}
                                            className={`
                                                flex-1 py-2 px-3 rounded-lg text-sm transition-colors
                                                ${currentChoice.matchType === 'title_exact'
                                                    ? 'bg-terracotta text-white'
                                                    : 'bg-gray-100 text-forest hover:bg-gray-200'
                                                }
                                            `}
                                        >
                                            All events with this title
                                        </button>
                                        <button
                                            onClick={() => setMatchType('event_id')}
                                            className={`
                                                flex-1 py-2 px-3 rounded-lg text-sm transition-colors
                                                ${currentChoice.matchType === 'event_id'
                                                    ? 'bg-terracotta text-white'
                                                    : 'bg-gray-100 text-forest hover:bg-gray-200'
                                                }
                                            `}
                                        >
                                            This event only
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSkip}
                                className="btn-secondary py-3 px-6"
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={saving}
                                className="btn-accent py-3 px-6 flex-1"
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Saving...
                                    </span>
                                ) : currentIndex < candidateGroups.length - 1 ? (
                                    'Next'
                                ) : (
                                    'Finish'
                                )}
                            </button>
                        </div>
                        
                        {/* Help text */}
                        <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                            <p className="font-medium">💡 One-time setup</p>
                            <p className="text-blue-700 mt-1">
                                You only need to do this once. Future events with the same title 
                                will automatically be recognized as home stays.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </AppShell>
    );
}
