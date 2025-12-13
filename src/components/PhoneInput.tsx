"use client";

import React, { useState, useRef, useEffect } from "react";

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

interface PhoneInputProps {
    value: string;
    countryCode: string;
    onChange: (phone: string, countryCode: string) => void;
    placeholder?: string;
}

export default function PhoneInput({
    value,
    countryCode,
    onChange,
    placeholder = "Phone number",
}: PhoneInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find current country by code
    const currentCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

    // Filter countries by search
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
                setIsOpen(false);
                setSearchTerm("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
        onChange(value, country.code);
        setIsOpen(false);
        setSearchTerm("");
        inputRef.current?.focus();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-forest/20 focus-within:border-forest">
                {/* Country Selector Button */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 px-3 py-3 bg-cream/50 border-r border-border hover:bg-cream transition-colors"
                >
                    <span className="text-lg">{currentCountry.flag}</span>
                    <span className="text-sm font-medium text-forest">{currentCountry.code}</span>
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-textSub transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>

                {/* Phone Number Input */}
                <input
                    ref={inputRef}
                    type="tel"
                    value={value}
                    onChange={(e) => onChange(e.target.value, countryCode)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                />
            </div>

            {/* Country Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-50 max-h-72 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-border">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search country..."
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal"
                            autoFocus
                        />
                    </div>

                    {/* Country List */}
                    <div className="overflow-y-auto max-h-52">
                        {filteredCountries.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-textSub">No countries found</div>
                        ) : (
                            filteredCountries.map((country, index) => (
                                <button
                                    key={`${country.shortCode}-${index}`}
                                    type="button"
                                    onClick={() => handleCountrySelect(country)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream transition-colors text-left ${
                                        country.code === countryCode ? "bg-softGreen" : ""
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
        </div>
    );
}
