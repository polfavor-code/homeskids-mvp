"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { replaceIcsUrl } from "@/lib/apple-calendar";

export default function ReplaceIcsUrlPage() {
    useEnsureOnboarding();
    const router = useRouter();
    const params = useParams();
    const sourceId = params.sourceId as string;
    
    const [icsUrl, setIcsUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!icsUrl.trim()) {
            setError("Please enter a calendar link");
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        const result = await replaceIcsUrl(sourceId, icsUrl.trim());
        
        setIsSubmitting(false);
        
        if (result.success) {
            router.push('/settings/integrations/apple-calendar?replaced=1');
        } else {
            setError(result.error || "Failed to update link");
        }
    };
    
    return (
        <AppShell>
            <div className="space-y-6 max-w-lg mx-auto">
                {/* Header */}
                <div>
                    <Link 
                        href="/settings/integrations/apple-calendar" 
                        className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-2"
                    >
                        ← Apple Calendars
                    </Link>
                    <h1 className="font-dmSerif text-2xl text-forest mt-2">Replace Calendar Link</h1>
                    <p className="text-sm text-textSub mt-1">
                        Enter a new iCloud calendar link to replace the current one.
                    </p>
                </div>
                
                {/* Info Card */}
                <div className="card-organic p-4 bg-amber-50/50 border border-amber-200">
                    <div className="flex gap-3">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm text-amber-800">
                            If your calendar link expired or stopped working, you can replace it here.
                            Your existing events and mapping rules will be preserved.
                        </p>
                    </div>
                </div>
                
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="icsUrl" className="block text-sm font-medium text-forest mb-1.5">
                            New Calendar Link <span className="text-red-500">*</span>
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
                        <p className="text-xs text-textSub mt-1">
                            Generate a new public link from your iCloud Calendar settings.
                        </p>
                    </div>
                    
                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn-secondary py-2 px-4"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary py-2 px-4 flex-1"
                        >
                            {isSubmitting ? 'Updating...' : 'Replace Link'}
                        </button>
                    </div>
                </form>
            </div>
        </AppShell>
    );
}
