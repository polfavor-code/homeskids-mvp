"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { 
    getGoogleOAuthUrl, 
    getGoogleCalendarConnectionStatus,
    disconnectGoogleCalendar,
    GoogleCalendarConnection,
} from "@/lib/google-calendar";
import {
    hasAppleCalendarConnected,
} from "@/lib/apple-calendar";

// Google Calendar Icon
function GoogleCalendarIcon({ size = 24 }: { size?: number }) {
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

export default function IntegrationsPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Apple Calendar state
    const [appleConnected, setAppleConnected] = useState(false);
    const [appleSourceCount, setAppleSourceCount] = useState(0);
    const [appleLoading, setAppleLoading] = useState(true);
    
    // Check for error from OAuth callback
    useEffect(() => {
        const urlError = searchParams.get('error');
        if (urlError) {
            setError(decodeURIComponent(urlError));
            // Clear the error from URL
            router.replace('/settings/integrations');
        }
    }, [searchParams, router]);
    
    // Load connection status
    useEffect(() => {
        async function loadStatus() {
            // Load Google Calendar status
            const result = await getGoogleCalendarConnectionStatus();
            if (result.connection) {
                setConnection(result.connection);
            }
            setLoading(false);
            
            // Load Apple Calendar status
            const appleResult = await hasAppleCalendarConnected();
            setAppleConnected(appleResult.connected);
            setAppleSourceCount(appleResult.sources.length);
            setAppleLoading(false);
        }
        loadStatus();
    }, []);
    
    const handleConnectGoogle = async () => {
        setIsConnecting(true);
        setError(null);
        
        const result = await getGoogleOAuthUrl();
        
        if (result.error) {
            setError(result.error);
            setIsConnecting(false);
            return;
        }
        
        if (result.url) {
            window.location.href = result.url;
        }
    };
    
    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Google Calendar? Imported events will remain but won\'t sync anymore.')) {
            return;
        }
        
        setIsDisconnecting(true);
        const result = await disconnectGoogleCalendar();
        
        if (result.success) {
            setConnection(null);
        } else {
            setError(result.error || 'Failed to disconnect');
        }
        
        setIsDisconnecting(false);
    };
    
    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header with back link */}
                <div>
                    <Link 
                        href="/settings" 
                        className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-2"
                    >
                        ← Settings
                    </Link>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Integrations</h1>
                    <p className="text-sm text-textSub mt-1">
                        Connect external calendars and services.
                    </p>
                </div>
                
                {/* Error message */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                {/* Google Calendar Integration */}
                <div className="card-organic p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                            <GoogleCalendarIcon size={28} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-forest text-lg">Google Calendar</h3>
                            <p className="text-sm text-textSub mt-1">
                                Import events from Google Calendar and automatically detect home stays.
                            </p>
                            
                            {loading ? (
                                <div className="mt-4 flex items-center gap-2 text-sm text-textSub">
                                    <span className="w-4 h-4 border-2 border-textSub/30 border-t-textSub rounded-full animate-spin"></span>
                                    Checking connection...
                                </div>
                            ) : connection ? (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span className="text-forest font-medium">Connected</span>
                                        <span className="text-textSub">as {connection.googleAccountEmail}</span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <Link
                                            href="/settings/integrations/google-calendar/select"
                                            className="btn-secondary py-2 px-4 text-sm"
                                        >
                                            Manage Calendars
                                        </Link>
                                        <Link
                                            href="/settings/integrations/google-calendar/mappings"
                                            className="btn-secondary py-2 px-4 text-sm"
                                        >
                                            Mapping Rules
                                        </Link>
                                        <button
                                            onClick={handleDisconnect}
                                            disabled={isDisconnecting}
                                            className="py-2 px-4 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    <button
                                        onClick={handleConnectGoogle}
                                        disabled={isConnecting}
                                        className="btn-primary py-3 px-6 inline-flex items-center gap-3"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <GoogleCalendarIcon size={20} />
                                                Connect Google Calendar
                                            </>
                                        )}
                                    </button>
                                    
                                    <p className="text-xs text-textSub mt-3">
                                        We only request read-only access to your calendar.
                                        No events will be modified or deleted.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* How it works */}
                <div className="card-organic p-5">
                    <h3 className="font-semibold text-forest mb-4">How Google Calendar Import Works</h3>
                    
                    <div className="space-y-4 text-sm">
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-terracotta font-bold text-xs">1</span>
                            </div>
                            <div>
                                <p className="font-medium text-forest">Connect your Google account</p>
                                <p className="text-textSub mt-0.5">
                                    Grant Homes.kids read-only access to your calendars.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-terracotta font-bold text-xs">2</span>
                            </div>
                            <div>
                                <p className="font-medium text-forest">Select calendars & map to children</p>
                                <p className="text-textSub mt-0.5">
                                    Choose which calendars to import and which child they belong to.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-terracotta font-bold text-xs">3</span>
                            </div>
                            <div>
                                <p className="font-medium text-forest">Create mapping rules for home stays</p>
                                <p className="text-textSub mt-0.5">
                                    Tell us which events mean your child is staying at a specific home.
                                    For example: &quot;Daddy days&quot; → Paul&apos;s home.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-terracotta font-bold text-xs">4</span>
                            </div>
                            <div>
                                <p className="font-medium text-forest">Events sync automatically</p>
                                <p className="text-textSub mt-0.5">
                                    Changes in Google Calendar flow into Homes.kids. Home stays still require confirmation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Apple Calendar Integration */}
                <div className="card-organic p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                            <AppleCalendarIcon size={28} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-forest text-lg">Apple Calendar</h3>
                            <p className="text-sm text-textSub mt-1">
                                Import events from iCloud Calendar using a subscription link.
                            </p>
                            
                            {appleLoading ? (
                                <div className="mt-4 flex items-center gap-2 text-sm text-textSub">
                                    <span className="w-4 h-4 border-2 border-textSub/30 border-t-textSub rounded-full animate-spin"></span>
                                    Checking connection...
                                </div>
                            ) : appleConnected ? (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span className="text-forest font-medium">Connected</span>
                                        <span className="text-textSub">
                                            {appleSourceCount} calendar{appleSourceCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <Link
                                            href="/settings/integrations/apple-calendar"
                                            className="btn-secondary py-2 px-4 text-sm"
                                        >
                                            Manage Calendars
                                        </Link>
                                        <Link
                                            href="/settings/integrations/apple-calendar/mappings"
                                            className="btn-secondary py-2 px-4 text-sm"
                                        >
                                            Mapping Rules
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    <Link
                                        href="/settings/integrations/apple-calendar/connect"
                                        className="btn-primary py-3 px-6 inline-flex items-center gap-3"
                                    >
                                        <AppleCalendarIcon size={20} />
                                        Connect Apple Calendar
                                    </Link>
                                    
                                    <p className="text-xs text-textSub mt-3">
                                        Uses a read-only subscription link from iCloud.
                                        No events will be modified in your Apple Calendar.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Coming Soon */}
                <div className="card-organic p-5 opacity-60">
                    <h3 className="font-semibold text-forest mb-2">Coming Soon</h3>
                    <ul className="text-sm text-textSub space-y-1">
                        <li>• Outlook Calendar</li>
                        <li>• Two-way sync (optional)</li>
                    </ul>
                </div>
            </div>
        </AppShell>
    );
}
