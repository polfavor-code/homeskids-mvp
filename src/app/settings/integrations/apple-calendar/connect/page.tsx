"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { connectIcsCalendar } from "@/lib/apple-calendar";

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

export default function ConnectAppleCalendarPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const { children } = useAppState();
    
    const [icsUrl, setIcsUrl] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || "");
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);
    
    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!icsUrl.trim()) {
            setError("Please enter a calendar link");
            return;
        }
        
        if (!selectedChildId) {
            setError("Please select a child");
            return;
        }
        
        setIsConnecting(true);
        setError(null);
        
        const result = await connectIcsCalendar({
            icsUrl: icsUrl.trim(),
            childId: selectedChildId,
            displayName: displayName.trim() || undefined,
        });
        
        setIsConnecting(false);
        
        if (result.success) {
            // Show success and redirect
            router.push(`/settings/integrations/apple-calendar?connected=1&events=${result.initialImport?.eventsImported || 0}&candidates=${result.initialImport?.candidatesFound || 0}`);
        } else {
            setError(result.error || "Failed to connect calendar");
        }
    };
    
    return (
        <AppShell>
            <div className="space-y-6 max-w-lg mx-auto">
                {/* Header */}
                <div>
                    <Link 
                        href="/settings/integrations" 
                        className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-2"
                    >
                        ← Integrations
                    </Link>
                    <div className="flex items-center gap-3 mt-2">
                        <AppleCalendarIcon size={32} />
                        <h1 className="font-dmSerif text-2xl text-forest">Connect Apple Calendar</h1>
                    </div>
                </div>
                
                {/* Info Card */}
                <div className="card-organic p-4 bg-blue-50/50 border border-blue-100">
                    <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-blue-800">
                            iCloud provides a read-only link. Anyone with the link can view this calendar.
                        </p>
                    </div>
                </div>
                
                {/* Form */}
                <form onSubmit={handleConnect} className="space-y-5">
                    {/* URL Input */}
                    <div>
                        <label htmlFor="icsUrl" className="block text-sm font-medium text-forest mb-1.5">
                            Apple Calendar Link <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            id="icsUrl"
                            value={icsUrl}
                            onChange={(e) => setIcsUrl(e.target.value)}
                            placeholder="webcal://p123-caldav.icloud.com/..."
                            className="input-organic w-full"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="mt-2 text-sm text-terracotta hover:underline inline-flex items-center gap-1"
                        >
                            {showInstructions ? "Hide" : "How to get your link"}
                            <svg 
                                className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth="2"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Instructions */}
                    {showInstructions && (
                        <div className="card-organic p-4 bg-gray-50 space-y-4 text-sm">
                            <div>
                                <h4 className="font-semibold text-forest mb-2">iPhone / iPad</h4>
                                <ol className="list-decimal list-inside space-y-1 text-textSub">
                                    <li>Open the Calendar app</li>
                                    <li>Tap &quot;Calendars&quot; at the bottom</li>
                                    <li>Tap the (i) icon next to your calendar</li>
                                    <li>Enable &quot;Public Calendar&quot;</li>
                                    <li>Tap &quot;Share Link&quot; and copy</li>
                                </ol>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-forest mb-2">Mac</h4>
                                <ol className="list-decimal list-inside space-y-1 text-textSub">
                                    <li>Open Calendar app</li>
                                    <li>Right-click the calendar in the sidebar</li>
                                    <li>Select &quot;Share Calendar&quot;</li>
                                    <li>Check &quot;Public Calendar&quot;</li>
                                    <li>Copy the subscription URL</li>
                                </ol>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-forest mb-2">iCloud.com</h4>
                                <ol className="list-decimal list-inside space-y-1 text-textSub">
                                    <li>Go to icloud.com/calendar</li>
                                    <li>Click the share icon next to your calendar</li>
                                    <li>Check &quot;Public Calendar&quot;</li>
                                    <li>Copy the URL shown</li>
                                </ol>
                            </div>
                        </div>
                    )}
                    
                    {/* Child Selection */}
                    <div>
                        <label htmlFor="child" className="block text-sm font-medium text-forest mb-1.5">
                            Assign to child <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="child"
                            value={selectedChildId}
                            onChange={(e) => setSelectedChildId(e.target.value)}
                            className="input-organic w-full"
                            required
                        >
                            {children.map(child => (
                                <option key={child.id} value={child.id}>
                                    {child.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-textSub mt-1">
                            Events from this calendar will appear on this child&apos;s calendar.
                        </p>
                    </div>
                    
                    {/* Display Name */}
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-forest mb-1.5">
                            Name this calendar <span className="text-textSub">(optional)</span>
                        </label>
                        <input
                            type="text"
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="iCloud Calendar"
                            className="input-organic w-full"
                        />
                    </div>
                    
                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    
                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isConnecting}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    >
                        {isConnecting ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Connecting...
                            </>
                        ) : (
                            <>
                                <AppleCalendarIcon size={20} />
                                Connect Calendar
                            </>
                        )}
                    </button>
                </form>
                
                {/* Privacy Note */}
                <div className="text-xs text-textSub text-center">
                    <p>
                        Your calendar link is encrypted and stored securely.
                        We only read calendar events and never modify your iCloud calendar.
                    </p>
                </div>
            </div>
        </AppShell>
    );
}
