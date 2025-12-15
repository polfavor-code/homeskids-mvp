"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { PhoneNumber, PhoneType } from "@/lib/ContactsContext";

// Common country codes with flags
const COUNTRIES = [
    { code: "+1", flag: "🇺🇸", name: "United States", shortCode: "US" },
    { code: "+1", flag: "🇨🇦", name: "Canada", shortCode: "CA" },
    { code: "+44", flag: "🇬🇧", name: "United Kingdom", shortCode: "GB" },
    { code: "+34", flag: "🇪🇸", name: "Spain", shortCode: "ES" },
    { code: "+33", flag: "🇫🇷", name: "France", shortCode: "FR" },
    { code: "+49", flag: "🇩🇪", name: "Germany", shortCode: "DE" },
    { code: "+39", flag: "🇮🇹", name: "Italy", shortCode: "IT" },
    { code: "+31", flag: "🇳🇱", name: "Netherlands", shortCode: "NL" },
    { code: "+32", flag: "🇧🇪", name: "Belgium", shortCode: "BE" },
    { code: "+41", flag: "🇨🇭", name: "Switzerland", shortCode: "CH" },
    { code: "+43", flag: "🇦🇹", name: "Austria", shortCode: "AT" },
    { code: "+351", flag: "🇵🇹", name: "Portugal", shortCode: "PT" },
    { code: "+353", flag: "🇮🇪", name: "Ireland", shortCode: "IE" },
    { code: "+46", flag: "🇸🇪", name: "Sweden", shortCode: "SE" },
    { code: "+47", flag: "🇳🇴", name: "Norway", shortCode: "NO" },
    { code: "+45", flag: "🇩🇰", name: "Denmark", shortCode: "DK" },
    { code: "+358", flag: "🇫🇮", name: "Finland", shortCode: "FI" },
    { code: "+48", flag: "🇵🇱", name: "Poland", shortCode: "PL" },
    { code: "+420", flag: "🇨🇿", name: "Czech Republic", shortCode: "CZ" },
    { code: "+36", flag: "🇭🇺", name: "Hungary", shortCode: "HU" },
    { code: "+30", flag: "🇬🇷", name: "Greece", shortCode: "GR" },
    { code: "+90", flag: "🇹🇷", name: "Turkey", shortCode: "TR" },
    { code: "+7", flag: "🇷🇺", name: "Russia", shortCode: "RU" },
    { code: "+81", flag: "🇯🇵", name: "Japan", shortCode: "JP" },
    { code: "+82", flag: "🇰🇷", name: "South Korea", shortCode: "KR" },
    { code: "+86", flag: "🇨🇳", name: "China", shortCode: "CN" },
    { code: "+91", flag: "🇮🇳", name: "India", shortCode: "IN" },
    { code: "+61", flag: "🇦🇺", name: "Australia", shortCode: "AU" },
    { code: "+64", flag: "🇳🇿", name: "New Zealand", shortCode: "NZ" },
    { code: "+55", flag: "🇧🇷", name: "Brazil", shortCode: "BR" },
    { code: "+52", flag: "🇲🇽", name: "Mexico", shortCode: "MX" },
    { code: "+54", flag: "🇦🇷", name: "Argentina", shortCode: "AR" },
    { code: "+56", flag: "🇨🇱", name: "Chile", shortCode: "CL" },
    { code: "+57", flag: "🇨🇴", name: "Colombia", shortCode: "CO" },
    { code: "+27", flag: "🇿🇦", name: "South Africa", shortCode: "ZA" },
    { code: "+971", flag: "🇦🇪", name: "UAE", shortCode: "AE" },
    { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", shortCode: "SA" },
    { code: "+972", flag: "🇮🇱", name: "Israel", shortCode: "IL" },
    { code: "+65", flag: "🇸🇬", name: "Singapore", shortCode: "SG" },
    { code: "+60", flag: "🇲🇾", name: "Malaysia", shortCode: "MY" },
    { code: "+66", flag: "🇹🇭", name: "Thailand", shortCode: "TH" },
    { code: "+63", flag: "🇵🇭", name: "Philippines", shortCode: "PH" },
    { code: "+62", flag: "🇮🇩", name: "Indonesia", shortCode: "ID" },
    { code: "+84", flag: "🇻🇳", name: "Vietnam", shortCode: "VN" },
];

const PHONE_TYPES: { value: PhoneType; label: string }[] = [
    { value: "mobile", label: "Mobile" },
    { value: "home", label: "Home" },
    { value: "work", label: "Work" },
    { value: "other", label: "Other" },
];

interface PhoneNumbersInputProps {
    phoneNumbers: PhoneNumber[];
    onChange: (phoneNumbers: PhoneNumber[]) => void;
    defaultCountryCode?: string;
}

// Generate unique ID for new phone numbers
const generateId = () => `phone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create default empty phone
const createEmptyPhone = (countryCode: string): PhoneNumber => ({
    id: generateId(),
    number: "",
    countryCode,
    type: "mobile",
});

// Individual phone row component to maintain its own input state
interface PhoneRowProps {
    phone: PhoneNumber;
    index: number;
    canRemove: boolean;
    onUpdate: (index: number, phone: PhoneNumber) => void;
    onRemove: (index: number) => void;
}

function PhoneRow({ phone, index, canRemove, onUpdate, onRemove }: PhoneRowProps) {
    const [localNumber, setLocalNumber] = useState(phone.number);
    const [openCountry, setOpenCountry] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local state when prop changes (e.g., from parent reset)
    useEffect(() => {
        setLocalNumber(phone.number);
    }, [phone.number]);

    const currentCountry = COUNTRIES.find((c) => c.code === phone.countryCode) || COUNTRIES[0];

    const filteredCountries = searchTerm
        ? COUNTRIES.filter(
              (c) =>
                  c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.code.includes(searchTerm) ||
                  c.shortCode.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : COUNTRIES;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenCountry(false);
                setSearchTerm("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (openCountry && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [openCountry]);

    // Handle number change - update local state immediately, debounce parent update
    const handleNumberChange = useCallback((value: string) => {
        setLocalNumber(value);
        // Update parent with new value
        onUpdate(index, { ...phone, number: value });
    }, [index, phone, onUpdate]);

    const handleCountrySelect = useCallback((countryCode: string) => {
        onUpdate(index, { ...phone, countryCode });
        setOpenCountry(false);
        setSearchTerm("");
        // Focus back on input after selection
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [index, phone, onUpdate]);

    const handleTypeChange = useCallback((type: PhoneType) => {
        onUpdate(index, { ...phone, type });
    }, [index, phone, onUpdate]);

    const handleCloseCountryPicker = useCallback(() => {
        setOpenCountry(false);
        setSearchTerm("");
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Mobile-first: Stack on mobile, row on desktop */}
            <div className="flex flex-col sm:flex-row gap-2">
                {/* Phone number with country code */}
                <div className="flex-1 flex border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-forest/20 focus-within:border-forest bg-white">
                    {/* Country Selector Button */}
                    <button
                        type="button"
                        onClick={() => setOpenCountry(!openCountry)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-3 bg-cream/50 border-r border-border hover:bg-cream transition-colors shrink-0"
                    >
                        <span className="text-base sm:text-lg">{currentCountry.flag}</span>
                        <span className="text-xs sm:text-sm font-medium text-forest">{currentCountry.code}</span>
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`text-textSub transition-transform ${openCountry ? "rotate-180" : ""}`}
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>

                    {/* Phone Number Input */}
                    <input
                        ref={inputRef}
                        type="tel"
                        inputMode="tel"
                        value={localNumber}
                        onChange={(e) => handleNumberChange(e.target.value)}
                        placeholder="Phone number"
                        className="flex-1 min-w-0 px-3 py-3 text-base sm:text-sm outline-none bg-white"
                        autoComplete="tel"
                    />
                </div>

                {/* Type selector and remove button */}
                <div className="flex gap-2">
                    {/* Type Dropdown */}
                    <select
                        value={phone.type}
                        onChange={(e) => handleTypeChange(e.target.value as PhoneType)}
                        className="h-12 sm:h-11 px-3 border border-border rounded-xl text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest appearance-none cursor-pointer min-w-[100px] flex-1 sm:flex-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px', paddingRight: '32px' }}
                    >
                        {PHONE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>

                    {/* Remove Button - only show if more than 1 phone */}
                    {canRemove && (
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="h-12 sm:h-11 w-12 sm:w-11 flex items-center justify-center border border-border rounded-xl text-textSub hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shrink-0"
                            title="Remove phone"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Desktop Country Dropdown */}
            {openCountry && (
                <div className="hidden sm:block absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-50 max-h-72 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-border bg-white">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search country..."
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-forest focus:outline-none focus:ring-1 focus:ring-forest/30 focus:border-forest"
                            autoComplete="off"
                            autoCorrect="off"
                        />
                    </div>

                    {/* Country List */}
                    <div className="overflow-y-auto max-h-52 bg-white">
                        {filteredCountries.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-textSub">No countries found</div>
                        ) : (
                            filteredCountries.map((country, cIndex) => (
                                <button
                                    key={`${country.shortCode}-${cIndex}`}
                                    type="button"
                                    onClick={() => handleCountrySelect(country.code)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream transition-colors text-left ${
                                        country.code === phone.countryCode ? "bg-softGreen" : "bg-white"
                                    }`}
                                >
                                    <span className="text-lg">{country.flag}</span>
                                    <span className="flex-1 text-sm text-forest">{country.name}</span>
                                    <span className="text-sm text-textSub font-medium">{country.code}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Full Screen Country Picker */}
            {openCountry && (
                <div className="sm:hidden fixed inset-0 z-50 bg-white flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white safe-area-top">
                        <h2 className="text-lg font-dmSerif text-forest">Select country</h2>
                        <button
                            type="button"
                            onClick={handleCloseCountryPicker}
                            className="p-2 text-textSub hover:text-forest rounded-full hover:bg-cream transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-4 py-3 border-b border-border bg-cream/30">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search country..."
                            className="w-full px-4 py-3 text-base border border-border rounded-xl bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                        />
                    </div>

                    {/* Country List */}
                    <div className="flex-1 overflow-y-auto overscroll-contain">
                        {filteredCountries.length === 0 ? (
                            <div className="px-4 py-6 text-center text-textSub">No countries found</div>
                        ) : (
                            filteredCountries.map((country, cIndex) => (
                                <button
                                    key={`mobile-${country.shortCode}-${cIndex}`}
                                    type="button"
                                    onClick={() => handleCountrySelect(country.code)}
                                    className={`w-full flex items-center gap-4 px-4 py-4 border-b border-border/50 active:bg-cream transition-colors text-left ${
                                        country.code === phone.countryCode ? "bg-softGreen" : "bg-white"
                                    }`}
                                >
                                    <span className="text-2xl">{country.flag}</span>
                                    <span className="flex-1 text-base text-forest">{country.name}</span>
                                    <span className="text-base text-textSub font-medium">{country.code}</span>
                                </button>
                            ))
                        )}
                        <div className="h-8 safe-area-bottom" />
                    </div>
                </div>
            )}

            {/* Safe area styles for mobile */}
            <style jsx>{`
                .safe-area-top {
                    padding-top: env(safe-area-inset-top, 0);
                }
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0);
                }
            `}</style>
        </div>
    );
}

export default function PhoneNumbersInput({
    phoneNumbers,
    onChange,
    defaultCountryCode = "+1",
}: PhoneNumbersInputProps) {
    // Use internal state to manage phones, sync with props
    const [phones, setPhones] = useState<PhoneNumber[]>(() => {
        if (phoneNumbers.length > 0) {
            return phoneNumbers;
        }
        return [createEmptyPhone(defaultCountryCode)];
    });

    // Sync internal state when props change significantly (e.g., loading data)
    useEffect(() => {
        if (phoneNumbers.length > 0) {
            // Only update if IDs are different (external data loaded)
            const propIds = phoneNumbers.map(p => p.id).join(',');
            const stateIds = phones.map(p => p.id).join(',');
            if (propIds !== stateIds) {
                setPhones(phoneNumbers);
            }
        }
    }, [phoneNumbers]);

    const handleUpdatePhone = useCallback((index: number, updatedPhone: PhoneNumber) => {
        setPhones(prev => {
            const updated = [...prev];
            updated[index] = updatedPhone;
            // Notify parent
            onChange(updated);
            return updated;
        });
    }, [onChange]);

    const handleRemovePhone = useCallback((index: number) => {
        if (phones.length <= 1) return;
        setPhones(prev => {
            const updated = prev.filter((_, i) => i !== index);
            onChange(updated);
            return updated;
        });
    }, [phones.length, onChange]);

    const handleAddPhone = useCallback(() => {
        const newPhone = createEmptyPhone(defaultCountryCode);
        setPhones(prev => {
            const updated = [...prev, newPhone];
            onChange(updated);
            return updated;
        });
    }, [defaultCountryCode, onChange]);

    return (
        <div className="space-y-3">
            {phones.map((phone, index) => (
                <PhoneRow
                    key={phone.id}
                    phone={phone}
                    index={index}
                    canRemove={phones.length > 1}
                    onUpdate={handleUpdatePhone}
                    onRemove={handleRemovePhone}
                />
            ))}

            {/* Add Phone Button */}
            <button
                type="button"
                onClick={handleAddPhone}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-forest hover:bg-cream rounded-lg transition-colors"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add phone
            </button>
        </div>
    );
}
