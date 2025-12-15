"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { 
    getMappingRules,
    deleteMappingRule,
    getHomeStayCandidates,
    CalendarEventMapping,
} from "@/lib/google-calendar";
import { getHomeColor } from "@/lib/calendar/types";

export default function GoogleCalendarMappingsPage() {
    useEnsureOnboarding();
    const { homes, children } = useAppState();
    
    const [mappings, setMappings] = useState<CalendarEventMapping[]>([]);
    const [candidateCount, setCandidateCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Load mappings
    useEffect(() => {
        async function load() {
            setLoading(true);
            
            const [mappingsResult, candidatesResult] = await Promise.all([
                getMappingRules(),
                getHomeStayCandidates(),
            ]);
            
            if (mappingsResult.error) {
                setError(mappingsResult.error);
            } else {
                setMappings(mappingsResult.mappings);
            }
            
            setCandidateCount(candidatesResult.groups.length);
            setLoading(false);
        }
        load();
    }, []);
    
    const handleDelete = async (mappingId: string) => {
        if (!confirm('Delete this mapping rule? Events will be converted back to regular events.')) {
            return;
        }
        
        setDeletingId(mappingId);
        const result = await deleteMappingRule(mappingId);
        
        if (result.success) {
            setMappings(prev => prev.filter(m => m.id !== mappingId));
        } else {
            setError(result.error || 'Failed to delete');
        }
        
        setDeletingId(null);
    };
    
    const getHomeName = (homeId: string | null) => {
        if (!homeId) return 'Keep as event';
        return homes.find(h => h.id === homeId)?.name || 'Unknown home';
    };
    
    const getChildName = (childId: string) => {
        return children.find(c => c.id === childId)?.name || 'Unknown child';
    };
    
    const getMatchTypeLabel = (matchType: string) => {
        switch (matchType) {
            case 'event_id': return 'Single event';
            case 'title_exact': return 'Exact title match';
            case 'title_contains': return 'Title contains';
            default: return matchType;
        }
    };
    
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
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Mapping Rules</h1>
                    <p className="text-sm text-textSub mt-1">
                        Rules that convert Google Calendar events into home stays.
                    </p>
                </div>
                
                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                {/* Pending candidates alert */}
                {candidateCount > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⏳</span>
                            <div className="flex-1">
                                <p className="font-medium text-amber-800">
                                    {candidateCount} event type{candidateCount !== 1 ? 's' : ''} need mapping
                                </p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Some imported events might be home stays. Review them to set up mapping rules.
                                </p>
                            </div>
                            <Link
                                href="/settings/integrations/google-calendar/map"
                                className="btn-accent py-2 px-4 text-sm"
                            >
                                Review
                            </Link>
                        </div>
                    </div>
                )}
                
                {/* Loading */}
                {loading && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-8 h-8 border-3 border-terracotta/30 border-t-terracotta rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-textSub mt-3">Loading mapping rules...</p>
                    </div>
                )}
                
                {/* Empty state */}
                {!loading && mappings.length === 0 && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-forest text-lg">No Mapping Rules</h3>
                        <p className="text-textSub mt-2">
                            Mapping rules convert Google Calendar events into home stays.
                            {candidateCount > 0 
                                ? ' Review imported events to create rules.'
                                : ' Import a calendar first to detect potential home stays.'}
                        </p>
                        {candidateCount > 0 ? (
                            <Link href="/settings/integrations/google-calendar/map" className="btn-accent py-2 px-6 mt-4 inline-block">
                                Create Mapping Rules
                            </Link>
                        ) : (
                            <Link href="/settings/integrations/google-calendar/select" className="btn-secondary py-2 px-6 mt-4 inline-block">
                                Select Calendars
                            </Link>
                        )}
                    </div>
                )}
                
                {/* Mappings list */}
                {!loading && mappings.length > 0 && (
                    <div className="card-organic divide-y divide-border">
                        {mappings.map(mapping => {
                            const homeName = getHomeName(mapping.homeId);
                            const homeColor = mapping.homeId ? getHomeColor(homeName) : '#9CA3AF';
                            
                            return (
                                <div key={mapping.id} className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${homeColor}20` }}
                                        >
                                            <span className="text-lg">
                                                {mapping.homeId ? '🏠' : '📅'}
                                            </span>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-forest">
                                                    &quot;{mapping.matchValue}&quot;
                                                </span>
                                                <span className="text-textSub">→</span>
                                                <span 
                                                    className="font-medium"
                                                    style={{ color: homeColor }}
                                                >
                                                    {homeName}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-1 text-xs text-textSub flex-wrap">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded">
                                                    {getMatchTypeLabel(mapping.matchType)}
                                                </span>
                                                <span>•</span>
                                                <span>For {getChildName(mapping.childId)}</span>
                                                {mapping.autoConfirm && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-green-600">Auto-confirm</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleDelete(mapping.id)}
                                            disabled={deletingId === mapping.id}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete rule"
                                        >
                                            {deletingId === mapping.id ? (
                                                <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin block"></span>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Info note */}
                <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                    <p className="font-medium">💡 How mapping rules work</p>
                    <p className="text-blue-700 mt-1">
                        When Google Calendar events match a rule, they're automatically converted 
                        to home stays. Future events with the same title will also be converted.
                        Deleting a rule converts those events back to regular calendar events.
                    </p>
                </div>
            </div>
        </AppShell>
    );
}
