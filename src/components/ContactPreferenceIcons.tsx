"use client";

import React from "react";

// Contact preference method types
export type ContactMethod = 
    | "whatsapp" 
    | "phone" 
    | "sms" 
    | "email" 
    | "telegram" 
    | "instagram"
    | "signal";

export interface ContactPreference {
    method: ContactMethod;
    value: string; // phone number, email, username, etc.
}

// Metadata for each contact method
export const CONTACT_METHODS: Record<ContactMethod, {
    label: string;
    placeholder: string;
    inputType: "phone" | "email" | "text";
    fieldKey: "phone" | "email" | "telegram" | "instagram";
    color: string;
    bgColor: string;
    hoverColor: string;
}> = {
    whatsapp: {
        label: "WhatsApp",
        placeholder: "Phone number",
        inputType: "phone",
        fieldKey: "phone",
        color: "#25D366",
        bgColor: "bg-[#25D366]/10",
        hoverColor: "hover:bg-[#25D366]/20",
    },
    phone: {
        label: "Phone call",
        placeholder: "Phone number",
        inputType: "phone",
        fieldKey: "phone",
        color: "#2C3E2D",
        bgColor: "bg-forest/10",
        hoverColor: "hover:bg-forest/20",
    },
    sms: {
        label: "SMS",
        placeholder: "Phone number",
        inputType: "phone",
        fieldKey: "phone",
        color: "#4CA1AF",
        bgColor: "bg-teal/10",
        hoverColor: "hover:bg-teal/20",
    },
    email: {
        label: "Email",
        placeholder: "Email address",
        inputType: "email",
        fieldKey: "email",
        color: "#D76F4B",
        bgColor: "bg-terracotta/10",
        hoverColor: "hover:bg-terracotta/20",
    },
    telegram: {
        label: "Telegram",
        placeholder: "Username or phone",
        inputType: "text",
        fieldKey: "telegram",
        color: "#0088cc",
        bgColor: "bg-[#0088cc]/10",
        hoverColor: "hover:bg-[#0088cc]/20",
    },
    instagram: {
        label: "Instagram",
        placeholder: "Username or profile URL",
        inputType: "text",
        fieldKey: "instagram",
        color: "#E4405F",
        bgColor: "bg-[#E4405F]/10",
        hoverColor: "hover:bg-[#E4405F]/20",
    },
    signal: {
        label: "Signal",
        placeholder: "Phone number",
        inputType: "phone",
        fieldKey: "phone",
        color: "#3A76F0",
        bgColor: "bg-[#3A76F0]/10",
        hoverColor: "hover:bg-[#3A76F0]/20",
    },
};

// Icon components for each method
interface IconProps {
    size?: number;
    className?: string;
}

export function WhatsAppIcon({ size = 20, className = "" }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    );
}

export function PhoneIcon({ size = 20, className = "" }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

export function SmsIcon({ size = 20, className = "" }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h.01" />
            <path d="M12 10h.01" />
            <path d="M16 10h.01" />
        </svg>
    );
}

export function EmailIcon({ size = 20, className = "" }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    );
}

export function TelegramIcon({ size = 20, className = "" }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
    );
}

export function InstagramIcon({ size = 20, className = "" }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
    );
}

export function SignalIcon({ size = 20, className = "" }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm0 3.6c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 2.4c1.988 0 3.6 1.612 3.6 3.6s-1.612 3.6-3.6 3.6-3.6-1.612-3.6-3.6 1.612-3.6 3.6-3.6z"/>
        </svg>
    );
}

// Map method to icon component
export function ContactMethodIcon({ method, size = 20, className = "" }: { method: ContactMethod; size?: number; className?: string }) {
    const icons: Record<ContactMethod, React.ReactNode> = {
        whatsapp: <WhatsAppIcon size={size} className={className} />,
        phone: <PhoneIcon size={size} className={className} />,
        sms: <SmsIcon size={size} className={className} />,
        email: <EmailIcon size={size} className={className} />,
        telegram: <TelegramIcon size={size} className={className} />,
        instagram: <InstagramIcon size={size} className={className} />,
        signal: <SignalIcon size={size} className={className} />,
    };
    return <>{icons[method]}</>;
}

// Helper to format username for display (adds @ prefix if not present)
export function formatUsernameForDisplay(value: string | undefined): string {
    if (!value) return "";
    // Don't add @ if it's a URL or phone number
    if (value.includes(".") || value.includes("/") || /^\+?\d+$/.test(value.replace(/\s/g, ""))) {
        return value;
    }
    // Add @ if not already present
    return value.startsWith("@") ? value : `@${value}`;
}

// Helper to generate contact URLs
export function getContactUrl(method: ContactMethod, value: string, phoneCountryCode?: string): string {
    const cleanPhone = (phoneCountryCode || "") + value.replace(/\D/g, "");
    
    switch (method) {
        case "whatsapp":
            return `https://wa.me/${cleanPhone.replace("+", "")}`;
        case "phone":
            return `tel:${cleanPhone}`;
        case "sms":
            return `sms:${cleanPhone}`;
        case "email":
            return `mailto:${value}`;
        case "telegram":
            // Handle both username and phone
            if (value.startsWith("@")) {
                return `https://t.me/${value.substring(1)}`;
            } else if (value.includes("t.me/")) {
                return value.startsWith("http") ? value : `https://${value}`;
            } else if (/^\+?\d+$/.test(value.replace(/\s/g, ""))) {
                return `https://t.me/+${value.replace(/\D/g, "")}`;
            }
            return `https://t.me/${value}`;
        case "instagram":
            // Handle both username and full URL
            if (value.includes("instagram.com")) {
                return value.startsWith("http") ? value : `https://${value}`;
            }
            const username = value.startsWith("@") ? value.substring(1) : value;
            return `https://instagram.com/${username}`;
        case "signal":
            // Signal uses phone numbers - opens signal.me link
            return `https://signal.me/#p/${cleanPhone}`;
        default:
            return "#";
    }
}

// Clickable contact icon button for use in contact lists
interface ContactActionButtonProps {
    method: ContactMethod;
    value: string;
    phoneCountryCode?: string;
    size?: "sm" | "md" | "lg";
}

export function ContactActionButton({ method, value, phoneCountryCode, size = "md" }: ContactActionButtonProps) {
    const meta = CONTACT_METHODS[method];
    const url = getContactUrl(method, value, phoneCountryCode);
    
    const sizeClasses = {
        sm: "w-7 h-7",
        md: "w-8 h-8",
        lg: "w-10 h-10",
    };
    
    const iconSizes = {
        sm: 14,
        md: 16,
        lg: 20,
    };

    // Native actions (phone, sms, email) use href directly
    // External apps (whatsapp, telegram, instagram) open in new window to keep page open
    const isNativeAction = method === "phone" || method === "sms" || method === "email";

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (isNativeAction) {
            // For native actions, navigate directly
            window.location.href = url;
        } else {
            // For external apps, open in new window/tab
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-colors ${meta.bgColor} ${meta.hoverColor} cursor-pointer`}
            style={{ color: meta.color }}
            title={meta.label}
        >
            <ContactMethodIcon method={method} size={iconSizes[size]} />
        </button>
    );
}

// Row of contact action buttons for a contact
interface ContactActionsProps {
    preferences: ContactMethod[];
    phone?: string;
    phoneCountryCode?: string;
    email?: string;
    telegram?: string;
    instagram?: string;
    size?: "sm" | "md" | "lg";
}

export function ContactActions({ 
    preferences, 
    phone, 
    phoneCountryCode, 
    email, 
    telegram, 
    instagram,
    size = "md" 
}: ContactActionsProps) {
    // Map method to its value
    const getValue = (method: ContactMethod): string | undefined => {
        switch (method) {
            case "whatsapp":
            case "phone":
            case "sms":
            case "signal":
                return phone;
            case "email":
                return email;
            case "telegram":
                return telegram || phone; // Telegram can use phone as fallback
            case "instagram":
                return instagram;
            default:
                return undefined;
        }
    };

    // Filter to only methods that have values
    const activePreferences = preferences.filter(method => getValue(method));

    if (activePreferences.length === 0) {
        return null;
    }

    return (
        <div className="flex gap-1 flex-wrap">
            {activePreferences.map(method => (
                <ContactActionButton
                    key={method}
                    method={method}
                    value={getValue(method)!}
                    phoneCountryCode={method === "whatsapp" || method === "phone" || method === "sms" || method === "signal" ? phoneCountryCode : undefined}
                    size={size}
                />
            ))}
        </div>
    );
}
