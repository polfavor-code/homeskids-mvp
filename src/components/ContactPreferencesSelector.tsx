"use client";

import React from "react";
import { 
    ContactMethod, 
    CONTACT_METHODS, 
    ContactMethodIcon 
} from "./ContactPreferenceIcons";

interface ContactPreferencesSelectorProps {
    selectedMethods: ContactMethod[];
    onMethodsChange: (methods: ContactMethod[]) => void;
    // Field values
    phone?: string;
    email?: string;
    telegram?: string;
    instagram?: string;
    // Field change handlers
    onTelegramChange?: (value: string) => void;
    onInstagramChange?: (value: string) => void;
    // Phone and email are typically handled separately
    showInputs?: boolean;
}

const ALL_METHODS: ContactMethod[] = ["whatsapp", "phone", "sms", "signal", "email", "telegram", "instagram"];

export default function ContactPreferencesSelector({
    selectedMethods,
    onMethodsChange,
    phone,
    email,
    telegram,
    instagram,
    onTelegramChange,
    onInstagramChange,
    showInputs = true,
}: ContactPreferencesSelectorProps) {
    const toggleMethod = (method: ContactMethod) => {
        if (selectedMethods.includes(method)) {
            onMethodsChange(selectedMethods.filter(m => m !== method));
        } else {
            onMethodsChange([...selectedMethods, method]);
        }
    };

    // Check if a method is available (has the required data)
    const isMethodAvailable = (method: ContactMethod): boolean => {
        switch (method) {
            case "whatsapp":
            case "phone":
            case "sms":
            case "signal":
                return !!phone;
            case "email":
                return !!email;
            case "telegram":
                return !!telegram || !!phone; // Can use phone as fallback
            case "instagram":
                return !!instagram;
            default:
                return false;
        }
    };

    // Check if method requires additional input (telegram, instagram)
    const methodNeedsInput = (method: ContactMethod): boolean => {
        return method === "telegram" || method === "instagram";
    };

    // Get the hint text for methods that need phone/email
    const getHintText = (method: ContactMethod): string | null => {
        if (method === "whatsapp" || method === "phone" || method === "sms" || method === "signal") {
            if (!phone) return "Add phone number above";
        }
        if (method === "email" && !email) {
            return "Add email above";
        }
        return null;
    };

    return (
        <div className="space-y-3">
            {/* Method chips */}
            <div className="flex flex-wrap gap-2">
                {ALL_METHODS.map(method => {
                    const meta = CONTACT_METHODS[method];
                    const isSelected = selectedMethods.includes(method);
                    const isAvailable = isMethodAvailable(method);
                    const hint = getHintText(method);
                    const needsInput = methodNeedsInput(method);
                    
                    // For methods that need their own input (telegram, instagram),
                    // they're always selectable
                    const isDisabled = !needsInput && !isAvailable && !isSelected;

                    return (
                        <button
                            key={method}
                            type="button"
                            onClick={() => toggleMethod(method)}
                            disabled={isDisabled}
                            className={`
                                flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                                transition-all duration-150 min-w-[100px]
                                ${isSelected 
                                    ? `text-white shadow-sm` 
                                    : `bg-white border border-border text-forest hover:border-forest/50`
                                }
                                ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                            `}
                            style={isSelected ? { backgroundColor: meta.color } : undefined}
                            title={hint || meta.label}
                        >
                            <ContactMethodIcon 
                                method={method} 
                                size={18} 
                                className={isSelected ? "text-white" : ""} 
                            />
                            <span>{meta.label}</span>
                            {isSelected && (
                                <svg 
                                    width="14" 
                                    height="14" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="3"
                                    className="ml-auto"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Inline inputs for methods that need their own data */}
            {showInputs && (
                <div className="space-y-3">
                    {/* Telegram input - show when selected */}
                    {selectedMethods.includes("telegram") && onTelegramChange && (
                        <div className="flex items-center gap-3 p-3 bg-[#0088cc]/5 rounded-xl border border-[#0088cc]/20">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: "#0088cc" }}
                            >
                                <ContactMethodIcon method="telegram" size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-textSub mb-1">
                                    Telegram
                                </label>
                                <input
                                    type="text"
                                    value={telegram || ""}
                                    onChange={(e) => onTelegramChange(e.target.value)}
                                    placeholder="@username or phone number"
                                    className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Instagram input - show when selected */}
                    {selectedMethods.includes("instagram") && onInstagramChange && (
                        <div className="flex items-center gap-3 p-3 bg-[#E4405F]/5 rounded-xl border border-[#E4405F]/20">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: "#E4405F" }}
                            >
                                <ContactMethodIcon method="instagram" size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-textSub mb-1">
                                    Instagram
                                </label>
                                <input
                                    type="text"
                                    value={instagram || ""}
                                    onChange={(e) => onInstagramChange(e.target.value)}
                                    placeholder="@username or profile URL"
                                    className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E4405F]/20 focus:border-[#E4405F]"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Help text */}
            {selectedMethods.length === 0 && (
                <p className="text-xs text-textSub">
                    Select how this contact prefers to be reached. Leave empty for no preference.
                </p>
            )}
        </div>
    );
}
