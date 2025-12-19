"use client";

import React, { useState, useEffect } from "react";
import { useInstallPrompt } from "@/lib/usePushNotifications";

interface InstallPromptProps {
    onDismiss?: () => void;
}

export default function InstallPrompt({ onDismiss }: InstallPromptProps) {
    const { isIOS, isStandalone, canInstall, promptInstall } = useInstallPrompt();
    const [dismissed, setDismissed] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    // Check if user has dismissed the prompt before
    useEffect(() => {
        const wasDismissed = localStorage.getItem("installPromptDismissed");
        if (wasDismissed) {
            setDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem("installPromptDismissed", "true");
        setDismissed(true);
        onDismiss?.();
    };

    const handleInstall = async () => {
        const accepted = await promptInstall();
        if (accepted) {
            handleDismiss();
        }
    };

    // Don't show if already installed or dismissed
    if (isStandalone || dismissed) {
        return null;
    }

    // Don't show if can't install (not iOS and no install prompt)
    if (!isIOS && !canInstall) {
        return null;
    }

    return (
        <>
            {/* iOS Guide Modal */}
            {showIOSGuide && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowIOSGuide(false)}
                    />
                    <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 sm:pb-6 animate-slide-up">
                        <button
                            onClick={() => setShowIOSGuide(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                                    <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <line x1="12" y1="18" x2="12" y2="18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-forest">Add to Home Screen</h3>
                            <p className="text-sm text-textSub mt-1">Get the full app experience</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">1</span>
                                </div>
                                <div>
                                    <p className="font-medium text-forest">Tap the Share button</p>
                                    <p className="text-sm text-textSub">
                                        Look for{" "}
                                        <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                                                <polyline points="16 6 12 2 8 6" />
                                                <line x1="12" y1="2" x2="12" y2="15" />
                                            </svg>
                                        </span>{" "}
                                        at the bottom of Safari
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">2</span>
                                </div>
                                <div>
                                    <p className="font-medium text-forest">Scroll down and tap</p>
                                    <p className="text-sm text-textSub">
                                        Find{" "}
                                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded font-medium">
                                            Add to Home Screen
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">3</span>
                                </div>
                                <div>
                                    <p className="font-medium text-forest">Tap &quot;Add&quot;</p>
                                    <p className="text-sm text-textSub">
                                        The app will be added to your Home Screen
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <p className="text-xs text-center text-textSub">
                                Once installed, you&apos;ll be able to receive push notifications
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Install Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-4 py-3">
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                        <img
                            src="/icons/icon-192.png"
                            alt="homes.kids"
                            className="w-8 h-8 rounded-lg"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-forest text-sm">Install homes.kids</p>
                        <p className="text-xs text-textSub truncate">
                            {isIOS
                                ? "Add to Home Screen for notifications"
                                : "Install for the best experience"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isIOS ? (
                            <button
                                onClick={() => setShowIOSGuide(true)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Install
                            </button>
                        ) : (
                            <button
                                onClick={handleInstall}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Install
                            </button>
                        )}
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 text-gray-400 hover:text-gray-600"
                            aria-label="Dismiss"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
