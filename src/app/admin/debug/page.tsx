"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DebugInfo {
    success?: boolean;
    error?: string;
    envCheck?: {
        hasSupabaseUrl: boolean;
        hasServiceKey: boolean;
    };
    user?: {
        id: string;
        email: string;
    };
    profile?: {
        id: string;
        email: string;
        name: string;
        is_admin: boolean;
        hasIsAdminColumn: boolean;
    };
    isAdmin?: boolean;
    step?: string;
    hint?: string;
}

export default function AdminDebugPage() {
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionInfo, setSessionInfo] = useState<{
        hasSession: boolean;
        userId?: string;
        email?: string;
        accessToken?: string;
    } | null>(null);

    useEffect(() => {
        const runDiagnostics = async () => {
            // Step 1: Check client-side session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            setSessionInfo({
                hasSession: !!session,
                userId: session?.user?.id,
                email: session?.user?.email,
                accessToken: session?.access_token ? session.access_token.substring(0, 30) + '...' : undefined,
            });

            if (!session) {
                setDebugInfo({
                    error: 'No session found',
                    step: 'client_session',
                    hint: 'You need to log in first. Go to /admin/login',
                });
                setLoading(false);
                return;
            }

            // Step 2: Call debug API
            try {
                const response = await fetch('/api/admin/debug', {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                });

                const data = await response.json();
                setDebugInfo(data);
            } catch (err) {
                setDebugInfo({
                    error: 'Failed to call debug API',
                    hint: err instanceof Error ? err.message : 'Unknown error',
                });
            }

            setLoading(false);
        };

        runDiagnostics();
    }, []);

    const copySQL = () => {
        if (sessionInfo?.userId) {
            const sql = `UPDATE profiles SET is_admin = true WHERE id = '${sessionInfo.userId}';`;
            navigator.clipboard.writeText(sql);
            alert('SQL copied to clipboard!');
        }
    };

    return (
        <div className="p-8 max-w-4xl">
            <h1 className="font-dmSerif text-3xl text-forest mb-2">Admin Debug</h1>
            <p className="text-textSub mb-8">Diagnose admin panel authentication issues</p>

            {loading ? (
                <div className="bg-white rounded-xl border border-border p-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                        <div className="h-4 w-64 bg-gray-200 rounded"></div>
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Client Session */}
                    <div className="bg-white rounded-xl border border-border p-6">
                        <h2 className="font-semibold text-forest mb-4 flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${sessionInfo?.hasSession ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            Client Session
                        </h2>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-textSub">Has Session:</span> {sessionInfo?.hasSession ? 'Yes' : 'No'}</p>
                            {sessionInfo?.userId && (
                                <>
                                    <p><span className="text-textSub">User ID:</span> <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{sessionInfo.userId}</code></p>
                                    <p><span className="text-textSub">Email:</span> {sessionInfo.email}</p>
                                    <p><span className="text-textSub">Token:</span> <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{sessionInfo.accessToken}</code></p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* API Response */}
                    <div className="bg-white rounded-xl border border-border p-6">
                        <h2 className="font-semibold text-forest mb-4 flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${debugInfo?.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            Server Validation
                        </h2>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-textSub">Step:</span> {debugInfo?.step || 'N/A'}</p>
                            {debugInfo?.error && (
                                <p><span className="text-textSub">Error:</span> <span className="text-red-600">{debugInfo.error}</span></p>
                            )}
                            {debugInfo?.profile && (
                                <>
                                    <p><span className="text-textSub">Profile Name:</span> {debugInfo.profile.name || 'Not set'}</p>
                                    <p><span className="text-textSub">Profile Email:</span> {debugInfo.profile.email}</p>
                                    <p><span className="text-textSub">is_admin Column Exists:</span> {debugInfo.profile.hasIsAdminColumn ? 'Yes' : 'No'}</p>
                                    <p>
                                        <span className="text-textSub">is_admin Value:</span>{' '}
                                        <span className={debugInfo.profile.is_admin ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                            {debugInfo.profile.is_admin ? 'true' : 'false'}
                                        </span>
                                    </p>
                                </>
                            )}
                            {debugInfo?.envCheck && (
                                <>
                                    <p><span className="text-textSub">Server has SUPABASE_URL:</span> {debugInfo.envCheck.hasSupabaseUrl ? 'Yes' : 'No'}</p>
                                    <p><span className="text-textSub">Server has SERVICE_ROLE_KEY:</span> {debugInfo.envCheck.hasServiceKey ? 'Yes' : 'No'}</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Hint / Next Steps */}
                    {debugInfo?.hint && (
                        <div className={`rounded-xl border p-6 ${debugInfo.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            <h2 className="font-semibold mb-2">{debugInfo.success ? 'Status' : 'Next Step'}</h2>
                            <p className="text-sm">{debugInfo.hint}</p>

                            {!debugInfo.success && sessionInfo?.userId && debugInfo.step !== 'client_session' && (
                                <div className="mt-4">
                                    <p className="text-sm text-textSub mb-2">Run this SQL in Supabase SQL Editor:</p>
                                    <div className="bg-white border border-amber-300 rounded-lg p-3 font-mono text-sm">
                                        UPDATE profiles SET is_admin = true WHERE id = '{sessionInfo.userId}';
                                    </div>
                                    <button
                                        onClick={copySQL}
                                        className="mt-2 px-4 py-2 bg-forest text-white text-sm rounded-lg hover:bg-forest/90 transition-colors"
                                    >
                                        Copy SQL
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Raw Response */}
                    <details className="bg-white rounded-xl border border-border p-6">
                        <summary className="font-semibold text-forest cursor-pointer">Raw Debug Response</summary>
                        <pre className="mt-4 bg-gray-50 p-4 rounded-lg text-xs overflow-auto">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
}
