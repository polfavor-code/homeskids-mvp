"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { 
    getIcsSources, 
    disconnectIcsCalendar, 
    syncIcsNow,
    IcsSourceDisplay,
} from "@/lib/apple-calendar";

// Apple Calendar Icon
function AppleCalendarIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" fill="#FF3B30"/>
            <rect x="3" y="4" width="18" height="5" fill="#D12F26"/>
            <path d="M7 2v4M17 2v4" stroke="#D12F26" strokeWidth="2" strokeLinecap="round"/>
            <text x="12" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">31</text>
        </svg>
    );
}

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

export default function AppleCalendarManagementPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [sources, setSources] = useState<IcsSourceDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Check for success from connect page
    useEffect(() => {
        const connected = searchParams.get('connected');
        const events = searchParams.get('events');
        const candidates = searchParams.get('candidates');
        
        if (connected === '1') {
            let msg = 'Calendar connected successfully!';
            if (events && parseInt(events) > 0) {
                msg += ` Imported ${events} event${parseInt(events) !== 1 ? 's' : ''}.`;
            }
            if (candidates && parseInt(candidates) > 0) {
                msg += ` Found ${candidates} possible home stay${parseInt(candidates) !== 1 ? 's' : ''}.`;
            }
            setSuccessMessage(msg);
            router.replace('/settings/integrations/apple-calendar');
        }
    }, [searchParams, router]);
    
    // Load sources
    useEffect(() => {
        async function load() {
            const result = await getIcsSources();
            if (result.error) {
                setError(result.error);
            } else {
                setSources(result.sources);
            }
            setLoading(false);
        }
        load();
    }, []);
    
    const handleSync = async (sourceId: string) => {
        setSyncingId(sourceId);
        setError(null);
        
        const result = await syncIcsNow(sourceId);
        
        if (result.success && result.result) {
            // Refresh sources to get updated status
            const refreshed = await getIcsSources();
            if (!refreshed.error) {
                setSources(refreshed.sources);
            }
            setSuccessMessage(
                `Synced: ${result.result.created} created, ${result.result.updated} updated, ${result.result.deleted} removed`
            );
        } else {
            setError(result.error || 'Sync failed');
        }
        
        setSyncingId(null);
    };
    
    const handleDisconnect = async (sourceId: string, displayName: string) => {
        if (!confirm(`Disconnect "${displayName}"? Imported events will be removed from the calendar.`)) {
            return;
        }
        
        setDisconnectingId(sourceId);
        setError(null);
        
        const result = await disconnectIcsCalendar(sourceId);
        
        if (result.success) {
            setSources(prev => prev.filter(s => s.id !== sourceId));
            setSuccessMessage('Calendar disconnected');
        } else {
            setError(result.error || 'Failed to disconnect');
        }
        
        setDisconnectingId(null);
    };
    
    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <Link 
                        href="/settings/integrations" 
                        className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-2"
                    >
                        ← Integrations
                    </Link>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3">
                            <AppleCalendarIcon size={32} />
                            <h1 className="font-dmSerif text-2xl text-forest">Apple Calendars</h1>
                        </div>
                        <Link
                            href="/settings/integrations/apple-calendar/connect"
                            className="btn-primary py-2 px-4 text-sm"
                        >
                            Add Calendar
                        </Link>
                    </div>
                </div>
                
                {/* Success Message */}
                {successMessage && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{successMessage}</span>
                        <button 
                            onClick={() => setSuccessMessage(null)} 
                            className="ml-auto text-green-600 hover:text-green-800"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                
                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                {/* Loading */}
                {loading ? (
                    <div className="card-organic p-8 text-center">
                        <span className="inline-block w-6 h-6 border-2 border-textSub/30 border-t-textSub rounded-full animate-spin"></span>
                        <p className="text-sm text-textSub mt-2">Loading calendars...</p>
                    </div>
                ) : sources.length === 0 ? (
                    <div className="card-organic p-8 text-center">
                        <AppleCalendarIcon size={48} />
                        <h3 className="font-semibold text-forest mt-4">No Apple Calendars Connected</h3>
                        <p className="text-sm text-textSub mt-2">
                            Connect an iCloud calendar to import events automatically.
                        </p>
                        <Link
                            href="/settings/integrations/apple-calendar/connect"
                            className="btn-primary py-2 px-6 mt-4 inline-block"
                        >
                            Connect Calendar
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sources.map(source => (
                            <div key={source.id} className="card-organic p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <AppleCalendarIcon size={24} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-forest truncate">
                                                {source.displayName}
                                            </h3>
                                            {source.lastSyncStatus === 'error' && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                                    Error
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p className="text-sm text-textSub mt-0.5">
                                            For {source.childName}
                                        </p>
                                        
                                        <p className="text-xs text-textSub mt-1 font-mono truncate">
                                            {source.maskedUrl}
                                        </p>
                                        
                                        {source.lastSyncedAt && (
                                            <p className="text-xs text-textSub mt-2">
                                                Last synced: {formatRelativeTime(source.lastSyncedAt)}
                                                {source.lastSyncStatus === 'ok' && (
                                                    <span className="text-green-600 ml-1">✓</span>
                                                )}
                                            </p>
                                        )}
                                        
                                        {source.lastSyncError && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {source.lastSyncError}
                                            </p>
                                        )}
                                        
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleSync(source.id)}
                                                disabled={syncingId === source.id}
                                                className="btn-secondary py-1.5 px-3 text-xs"
                                            >
                                                {syncingId === source.id ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"></span>
                                                        Syncing...
                                                    </span>
                                                ) : (
                                                    'Sync Now'
                                                )}
                                            </button>
                                            
                                            <Link
                                                href={`/settings/integrations/apple-calendar/${source.id}/replace`}
                                                className="btn-secondary py-1.5 px-3 text-xs"
                                            >
                                                Replace Link
                                            </Link>
                                            
                                            <button
                                                onClick={() => handleDisconnect(source.id, source.displayName)}
                                                disabled={disconnectingId === source.id}
                                                className="py-1.5 px-3 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                {disconnectingId === source.id ? 'Disconnecting...' : 'Disconnect'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Mapping Rules Link */}
                {sources.length > 0 && (
                    <div className="card-organic p-4 bg-softGreen/30">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <div className="flex-1">
                                <p className="text-sm text-forest">
                                    Set up mapping rules to automatically convert calendar events into home stays.
                                </p>
                            </div>
                            <Link
                                href="/settings/integrations/apple-calendar/mappings"
                                className="btn-secondary py-2 px-4 text-sm"
                            >
                                Mapping Rules
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
