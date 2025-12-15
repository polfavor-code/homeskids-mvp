"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";
import { getIcsCandidates } from "@/lib/apple-calendar";

interface MappingRule {
    id: string;
    matchType: 'event_id' | 'title_exact' | 'title_contains';
    matchValue: string;
    homeId: string | null;
    homeName: string | null;
    resultingEventType: 'home_day' | 'event';
    autoConfirm: boolean;
    active: boolean;
}

interface Candidate {
    eventId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    candidateReason: string;
    occurrenceCount: number;
}

export default function AppleCalendarMappingsPage() {
    useEnsureOnboarding();
    const { children, homes } = useAppState();
    
    const [rules, setRules] = useState<MappingRule[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // New rule form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMatchType, setNewMatchType] = useState<'title_exact' | 'title_contains'>('title_contains');
    const [newMatchValue, setNewMatchValue] = useState('');
    const [newHomeId, setNewHomeId] = useState('');
    const [newAutoConfirm, setNewAutoConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Load data
    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            // Load existing rules
            const { data: rulesData, error: rulesError } = await supabase
                .from('calendar_event_mappings')
                .select('*, homes(name)')
                .eq('source', 'ics')
                .eq('active', true)
                .order('priority', { ascending: false });
            
            if (rulesError) {
                setError('Failed to load mapping rules');
            } else {
                setRules((rulesData || []).map(r => ({
                    id: r.id,
                    matchType: r.match_type,
                    matchValue: r.match_value,
                    homeId: r.home_id,
                    homeName: r.homes?.name || null,
                    resultingEventType: r.resulting_event_type,
                    autoConfirm: r.auto_confirm,
                    active: r.active,
                })));
            }
            
            // Load candidates for first child
            if (children.length > 0) {
                const candidatesResult = await getIcsCandidates(children[0].id);
                if (!candidatesResult.error) {
                    setCandidates(candidatesResult.candidates);
                }
            }
            
            setLoading(false);
        }
        load();
    }, [children]);
    
    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMatchValue.trim() || !newHomeId) return;
        
        setIsSubmitting(true);
        setError(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError('Not authenticated');
            setIsSubmitting(false);
            return;
        }
        
        const { data, error: insertError } = await supabase
            .from('calendar_event_mappings')
            .insert({
                source: 'ics',
                child_id: children[0]?.id,
                match_type: newMatchType,
                match_value: newMatchValue.trim(),
                home_id: newHomeId,
                resulting_event_type: 'home_day',
                auto_confirm: newAutoConfirm,
                active: true,
                created_by: user.id,
            })
            .select('*, homes(name)')
            .single();
        
        if (insertError) {
            setError('Failed to create rule');
        } else if (data) {
            setRules(prev => [...prev, {
                id: data.id,
                matchType: data.match_type,
                matchValue: data.match_value,
                homeId: data.home_id,
                homeName: data.homes?.name || null,
                resultingEventType: data.resulting_event_type,
                autoConfirm: data.auto_confirm,
                active: true,
            }]);
            setNewMatchValue('');
            setNewHomeId('');
            setNewAutoConfirm(false);
            setShowAddForm(false);
        }
        
        setIsSubmitting(false);
    };
    
    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Delete this mapping rule?')) return;
        
        const { error: deleteError } = await supabase
            .from('calendar_event_mappings')
            .update({ active: false })
            .eq('id', ruleId);
        
        if (deleteError) {
            setError('Failed to delete rule');
        } else {
            setRules(prev => prev.filter(r => r.id !== ruleId));
        }
    };
    
    const handleQuickMap = (title: string) => {
        setNewMatchType('title_contains');
        setNewMatchValue(title);
        setShowAddForm(true);
    };
    
    const reasonLabels: Record<string, string> = {
        all_day: 'All-day event',
        multi_day: 'Multi-day event',
        recurring: 'Recurring event',
        title_match: 'Title matches pattern',
    };
    
    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <Link
                        href="/settings/integrations/apple-calendar"
                        className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-2"
                    >
                        ← Apple Calendars
                    </Link>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Mapping Rules</h1>
                    <p className="text-sm text-textSub mt-1">
                        Automatically convert imported events into home stays.
                    </p>
                </div>
                
                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                {/* Loading */}
                {loading ? (
                    <div className="card-organic p-8 text-center">
                        <span className="inline-block w-6 h-6 border-2 border-textSub/30 border-t-textSub rounded-full animate-spin"></span>
                    </div>
                ) : (
                    <>
                        {/* Existing Rules */}
                        <div className="card-organic p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-forest">Active Rules</h2>
                                <button
                                    onClick={() => setShowAddForm(!showAddForm)}
                                    className="btn-secondary py-1.5 px-3 text-sm"
                                >
                                    {showAddForm ? 'Cancel' : 'Add Rule'}
                                </button>
                            </div>
                            
                            {/* Add Rule Form */}
                            {showAddForm && (
                                <form onSubmit={handleAddRule} className="mb-4 p-4 bg-gray-50 rounded-xl space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-forest mb-1">
                                                Match Type
                                            </label>
                                            <select
                                                value={newMatchType}
                                                onChange={(e) => setNewMatchType(e.target.value as 'title_exact' | 'title_contains')}
                                                className="input-organic w-full text-sm"
                                            >
                                                <option value="title_contains">Title contains</option>
                                                <option value="title_exact">Title exactly matches</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-forest mb-1">
                                                Match Value
                                            </label>
                                            <input
                                                type="text"
                                                value={newMatchValue}
                                                onChange={(e) => setNewMatchValue(e.target.value)}
                                                placeholder="e.g., Daddy days"
                                                className="input-organic w-full text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-forest mb-1">
                                            Assign to Home
                                        </label>
                                        <select
                                            value={newHomeId}
                                            onChange={(e) => setNewHomeId(e.target.value)}
                                            className="input-organic w-full text-sm"
                                            required
                                        >
                                            <option value="">Select home...</option>
                                            {homes.map(home => (
                                                <option key={home.id} value={home.id}>
                                                    {home.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={newAutoConfirm}
                                            onChange={(e) => setNewAutoConfirm(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                        <span className="text-sm text-textSub">
                                            Auto-confirm (skip approval step)
                                        </span>
                                    </label>
                                    
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="btn-primary py-2 px-4 text-sm"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Rule'}
                                    </button>
                                </form>
                            )}
                            
                            {/* Rules List */}
                            {rules.length === 0 ? (
                                <p className="text-sm text-textSub py-4 text-center">
                                    No mapping rules yet. Create one to automatically convert events to home stays.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {rules.map(rule => (
                                        <div key={rule.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-forest">
                                                    {rule.matchType === 'title_contains' ? 'Contains: ' : 'Equals: '}
                                                    &quot;{rule.matchValue}&quot;
                                                </p>
                                                <p className="text-xs text-textSub mt-0.5">
                                                    → {rule.homeName || 'Unknown home'}
                                                    {rule.autoConfirm && ' (auto-confirm)'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Candidates */}
                        {candidates.length > 0 && (
                            <div className="card-organic p-5">
                                <h2 className="font-semibold text-forest mb-4">
                                    Possible Home Stays ({candidates.length})
                                </h2>
                                <p className="text-sm text-textSub mb-4">
                                    These events look like they might be home stays. Click to create a mapping rule.
                                </p>
                                
                                <div className="space-y-2">
                                    {candidates.slice(0, 10).map(candidate => (
                                        <button
                                            key={candidate.eventId}
                                            onClick={() => handleQuickMap(candidate.title)}
                                            className="w-full text-left p-3 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-forest">{candidate.title}</p>
                                                    <p className="text-xs text-textSub mt-0.5">
                                                        {reasonLabels[candidate.candidateReason] || candidate.candidateReason}
                                                        {candidate.occurrenceCount > 1 && ` • ${candidate.occurrenceCount} occurrences`}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-terracotta">Create rule →</span>
                                            </div>
                                        </button>
                                    ))}
                                    
                                    {candidates.length > 10 && (
                                        <p className="text-xs text-textSub text-center py-2">
                                            And {candidates.length - 10} more...
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppShell>
    );
}
