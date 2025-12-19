"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { supabase } from "@/lib/supabase";

// Helper to convert base64 URL to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Detect platform
function detectPlatform(): "ios" | "android" | "desktop" | "unknown" {
    if (typeof navigator === "undefined") return "unknown";
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return "ios";
    if (/Android/.test(ua)) return "android";
    if (/Windows|Macintosh|Linux/.test(ua)) return "desktop";
    return "unknown";
}

// Check if iOS
function isIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if running as installed PWA (standalone)
function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true
    );
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export default function NotificationsSettingsPage() {
    useEnsureOnboarding();
    const { user } = useAuth();

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Detection state
    const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("unknown");
    const [standalone, setStandalone] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [permission, setPermission] = useState<PermissionState>("default");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);

    // Show toast
    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Check current state on mount
    useEffect(() => {
        const checkState = async () => {
            // Detect platform
            setPlatform(detectPlatform());
            setStandalone(isStandalone());

            // Check push support
            const supported =
                typeof window !== "undefined" &&
                "serviceWorker" in navigator &&
                "PushManager" in window &&
                "Notification" in window;
            setPushSupported(supported);

            if (!supported) {
                setPermission("unsupported");
                setIsLoading(false);
                return;
            }

            // Get permission state
            const perm = Notification.permission as PermissionState;
            setPermission(perm);

            // Check if already subscribed
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    setIsSubscribed(true);
                    setSubscriptionEndpoint(subscription.endpoint);
                }
            } catch (e) {
                console.error("Error checking subscription:", e);
            }

            setIsLoading(false);
        };

        checkState();
    }, []);

    // Enable notifications
    const handleEnable = async () => {
        if (!pushSupported || !user) return;

        setIsProcessing(true);

        try {
            // Request permission if not granted
            if (Notification.permission !== "granted") {
                const result = await Notification.requestPermission();
                setPermission(result as PermissionState);
                if (result !== "granted") {
                    showToast("Permission denied. Enable in browser settings.", "error");
                    setIsProcessing(false);
                    return;
                }
            }

            // Get VAPID public key
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                throw new Error("Push notifications not configured");
            }

            // Register service worker if needed
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
            });

            const subJson = subscription.toJSON();
            if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
                throw new Error("Invalid subscription");
            }

            // Send to server
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    p256dh: subJson.keys.p256dh,
                    auth: subJson.keys.auth,
                    platform: detectPlatform(),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to save subscription");
            }

            setIsSubscribed(true);
            setSubscriptionEndpoint(subJson.endpoint);
            showToast("Notifications enabled");
        } catch (e: any) {
            console.error("Enable error:", e);
            showToast(e.message || "Failed to enable notifications", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Disable notifications
    const handleDisable = async () => {
        if (!subscriptionEndpoint) return;

        setIsProcessing(true);

        try {
            // Get current subscription and unsubscribe
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
            }

            // Tell server
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: subscriptionEndpoint }),
            });

            setIsSubscribed(false);
            setSubscriptionEndpoint(null);
            showToast("Notifications disabled");
        } catch (e: any) {
            console.error("Disable error:", e);
            showToast(e.message || "Failed to disable notifications", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Render iOS install instructions
    const renderIOSInstallGuide = () => (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                        <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                        <line x1="12" y1="18" x2="12" y2="18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-forest">Install homes.kids first</h3>
                    <p className="text-sm text-textSub mt-1">
                        On iPhone, you need to add the app to your Home Screen to receive notifications.
                    </p>
                </div>
            </div>

            <div className="space-y-4 ml-1">
                <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        1
                    </div>
                    <div className="pt-0.5">
                        <p className="font-medium text-forest">Tap the Share button</p>
                        <p className="text-sm text-textSub flex items-center gap-1">
                            Look for{" "}
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                                    <polyline points="16 6 12 2 8 6" />
                                    <line x1="12" y1="2" x2="12" y2="15" />
                                </svg>
                            </span>{" "}
                            at the bottom of Safari
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        2
                    </div>
                    <div className="pt-0.5">
                        <p className="font-medium text-forest">Scroll and tap &quot;Add to Home Screen&quot;</p>
                        <p className="text-sm text-textSub">
                            It&apos;s in the list of share options
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        3
                    </div>
                    <div className="pt-0.5">
                        <p className="font-medium text-forest">Open from Home Screen</p>
                        <p className="text-sm text-textSub">
                            Then return here to enable notifications
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render status indicators
    const renderStatus = () => (
        <div className="bg-cream/50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm text-textSub">Installed</span>
                <span className={`text-sm font-medium ${standalone ? "text-green-600" : "text-amber-600"}`}>
                    {standalone ? "Yes" : "No"}
                </span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-textSub">Permission</span>
                <span className={`text-sm font-medium ${
                    permission === "granted" ? "text-green-600" : 
                    permission === "denied" ? "text-red-600" : "text-gray-500"
                }`}>
                    {permission === "granted" ? "Allowed" : 
                     permission === "denied" ? "Blocked" : 
                     permission === "unsupported" ? "Not supported" : "Not asked"}
                </span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-textSub">Notifications enabled</span>
                <span className={`text-sm font-medium ${isSubscribed ? "text-green-600" : "text-gray-500"}`}>
                    {isSubscribed ? "Yes" : "No"}
                </span>
            </div>
        </div>
    );

    // Loading state
    if (isLoading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    const showIOSInstallPrompt = platform === "ios" && !standalone;
    const canEnable = pushSupported && permission !== "denied" && !showIOSInstallPrompt;

    return (
        <AppShell>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg ${
                    toast.type === "success" ? "bg-green-600" : "bg-red-600"
                } text-white font-medium text-sm animate-fade-in`}>
                    {toast.message}
                </div>
            )}

            {/* Back Link */}
            <Link
                href="/settings"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Settings
            </Link>

            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-softGreen rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-forest">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-dmSerif text-forest">Enable notifications</h1>
                    <p className="text-sm text-textSub mt-2">
                        Get alerts when items are added or plans change.
                    </p>
                </div>

                {/* iOS Install Guide */}
                {showIOSInstallPrompt && renderIOSInstallGuide()}

                {/* Status */}
                {renderStatus()}

                {/* Permission Denied Warning */}
                {permission === "denied" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                        <p className="font-medium text-red-800 text-sm">Notifications are blocked</p>
                        <p className="text-xs text-red-600 mt-1">
                            {platform === "ios" 
                                ? "Go to iPhone Settings > Safari > Notifications to allow."
                                : "Enable notifications in your browser settings for this site."}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                    {!isSubscribed ? (
                        <button
                            onClick={handleEnable}
                            disabled={!canEnable || isProcessing}
                            className="w-full py-3.5 px-4 rounded-xl bg-forest text-white font-semibold hover:bg-forest/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Enabling...
                                </span>
                            ) : (
                                "Enable notifications"
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleDisable}
                            disabled={isProcessing}
                            className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? "Disabling..." : "Disable on this device"}
                        </button>
                    )}
                </div>

                {/* Platform Info */}
                <p className="text-xs text-center text-textSub mt-6">
                    {platform === "ios" && "iPhone"}
                    {platform === "android" && "Android"}
                    {platform === "desktop" && "Desktop"}
                    {platform === "unknown" && "Unknown device"}
                    {standalone && " • Installed"}
                </p>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translate(-50%, -10px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </AppShell>
    );
}
