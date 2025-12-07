"use client";

import React, { useEffect, useState } from "react";

export interface ToastData {
    id: string;
    title: string;
    message: string;
    type: "success" | "info" | "error";
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastProps {
    toast: ToastData;
    onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(toast.id), 300);
        }, 5000);

        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const bgColor = toast.type === "error"
        ? "bg-red-50 border-red-200"
        : toast.type === "success"
        ? "bg-softGreen border-forest/20"
        : "bg-cream border-border";

    const iconBg = toast.type === "error"
        ? "bg-red-100 text-red-600"
        : toast.type === "success"
        ? "bg-forest/20 text-forest"
        : "bg-teal/20 text-teal";

    const icon = toast.type === "error"
        ? "!"
        : toast.type === "success"
        ? "✓"
        : "i";

    return (
        <div
            className={`
                ${bgColor}
                ${isExiting ? "animate-slide-out" : "animate-slide-in"}
                border rounded-2xl p-4 shadow-lg max-w-sm w-full
            `}
        >
            <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-forest text-sm">{toast.title}</h4>
                    <p className="text-xs text-textSub mt-0.5">{toast.message}</p>
                    {toast.action && (
                        <button
                            onClick={toast.action.onClick}
                            className="mt-2 text-xs text-teal font-semibold hover:text-forest transition-colors"
                        >
                            {toast.action.label} →
                        </button>
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsExiting(true);
                        setTimeout(() => onDismiss(toast.id), 300);
                    }}
                    className="text-textSub/50 hover:text-textSub p-1 -mr-1 -mt-1"
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 4L4 12M4 4L12 12" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

interface ToastContainerProps {
    toasts: ToastData[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

// Add animation styles
const styles = `
@keyframes slide-in {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slide-out {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.animate-slide-in {
    animation: slide-in 0.3s ease-out;
}

.animate-slide-out {
    animation: slide-out 0.3s ease-in;
}
`;

// Inject styles
if (typeof document !== "undefined") {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
}
