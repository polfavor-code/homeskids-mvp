"use client";

import { useState, useEffect, useCallback } from "react";

// Types
export type PushPermissionState = "prompt" | "granted" | "denied" | "unsupported";
export type Platform = "ios" | "android" | "desktop" | "unknown";

export interface PushNotificationState {
    isSupported: boolean;
    permission: PushPermissionState;
    isSubscribed: boolean;
    isLoading: boolean;
    error: string | null;
    platform: Platform;
    isStandalone: boolean;
}

interface UsePushNotificationsReturn extends PushNotificationState {
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
    requestPermission: () => Promise<boolean>;
}

// Convert base64 URL to Uint8Array for applicationServerKey
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Detect platform from user agent
export function detectPlatform(): Platform {
    if (typeof navigator === "undefined") return "unknown";
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return "ios";
    if (/Android/.test(ua)) return "android";
    if (/Windows|Macintosh|Linux/.test(ua)) return "desktop";
    return "unknown";
}

// Check if we're on iOS
export function isIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if PWA is installed (standalone mode)
export function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
    );
}

export function usePushNotifications(): UsePushNotificationsReturn {
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        permission: "unsupported",
        isSubscribed: false,
        isLoading: true,
        error: null,
        platform: "unknown",
        isStandalone: false,
    });

    // Check support and current state on mount
    useEffect(() => {
        const checkSupport = async () => {
            const platform = detectPlatform();
            const standalone = isStandalone();

            // Check basic support
            const supported =
                typeof window !== "undefined" &&
                "serviceWorker" in navigator &&
                "PushManager" in window &&
                "Notification" in window;

            if (!supported) {
                setState({
                    isSupported: false,
                    permission: "unsupported",
                    isSubscribed: false,
                    isLoading: false,
                    error: "Push notifications are not supported in this browser",
                    platform,
                    isStandalone: standalone,
                });
                return;
            }

            // iOS specific check - needs to be installed as PWA
            if (platform === "ios" && !standalone) {
                setState({
                    isSupported: true,
                    permission: "unsupported",
                    isSubscribed: false,
                    isLoading: false,
                    error: "On iOS, add this app to your Home Screen first to enable notifications",
                    platform,
                    isStandalone: standalone,
                });
                return;
            }

            // Get current permission state
            const permission = Notification.permission as PushPermissionState;

            // Check if already subscribed
            let isSubscribed = false;
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                isSubscribed = subscription !== null;
            } catch (e) {
                console.error("Error checking subscription:", e);
            }

            setState({
                isSupported: true,
                permission,
                isSubscribed,
                isLoading: false,
                error: null,
                platform,
                isStandalone: standalone,
            });
        };

        checkSupport();
    }, []);

    // Request notification permission
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!state.isSupported) return false;

        try {
            const permission = await Notification.requestPermission();
            setState((prev) => ({
                ...prev,
                permission: permission as PushPermissionState,
            }));
            return permission === "granted";
        } catch (e) {
            console.error("Error requesting permission:", e);
            setState((prev) => ({
                ...prev,
                error: "Failed to request notification permission",
            }));
            return false;
        }
    }, [state.isSupported]);

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!state.isSupported) return false;

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            // First request permission if not granted
            if (Notification.permission !== "granted") {
                const granted = await requestPermission();
                if (!granted) {
                    setState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: "Notification permission denied",
                    }));
                    return false;
                }
            }

            // Get VAPID public key
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                throw new Error("VAPID public key not configured");
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            // Get subscription details
            const subscriptionJson = subscription.toJSON();
            const { endpoint, keys } = subscriptionJson;

            if (!endpoint || !keys?.p256dh || !keys?.auth) {
                throw new Error("Invalid subscription data");
            }

            // Save subscription via API (handles auth internally)
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    platform: state.platform,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to save subscription");
            }

            setState((prev) => ({
                ...prev,
                isSubscribed: true,
                isLoading: false,
                error: null,
            }));

            return true;
        } catch (e: any) {
            console.error("Error subscribing to push:", e);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: e.message || "Failed to subscribe to notifications",
            }));
            return false;
        }
    }, [state.isSupported, state.platform, requestPermission]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Tell server to deactivate (via API)
                await fetch("/api/push/unsubscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });

                // Unsubscribe from push
                await subscription.unsubscribe();
            }

            setState((prev) => ({
                ...prev,
                isSubscribed: false,
                isLoading: false,
                error: null,
            }));

            return true;
        } catch (e: any) {
            console.error("Error unsubscribing:", e);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: e.message || "Failed to unsubscribe",
            }));
            return false;
        }
    }, []);

    return {
        ...state,
        subscribe,
        unsubscribe,
        requestPermission,
    };
}

// Utility hook to check if app should prompt for installation
export function useInstallPrompt() {
    const [canInstall, setCanInstall] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (isStandalone()) {
            setIsInstalled(true);
            return;
        }

        // Listen for beforeinstallprompt event (Android/Desktop Chrome)
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        // Listen for appinstalled event
        const handleInstalled = () => {
            setIsInstalled(true);
            setCanInstall(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return false;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setCanInstall(false);

        return outcome === "accepted";
    }, [deferredPrompt]);

    return {
        canInstall,
        isInstalled,
        isIOS: isIOS(),
        isStandalone: isStandalone(),
        platform: detectPlatform(),
        promptInstall,
    };
}
