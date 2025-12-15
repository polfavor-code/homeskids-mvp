"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/lib/AppStateContext";
import { useCalendar } from "@/lib/calendar/CalendarContext";
import { CloseIcon } from "@/components/icons/DuotoneIcons";
import { getHomeColor } from "@/lib/calendar/types";

type EventTab = 'home_day' | 'travel' | 'event';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddEventModal({ isOpen, onClose }: AddEventModalProps) {
    const { currentChild, homes } = useAppState();
    const { addHomeDay, addTravel, addEvent } = useCalendar();
    
    const [tab, setTab] = useState<EventTab>('home_day');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Home Day form state
    const [selectedHomeId, setSelectedHomeId] = useState<string>('');
    const [homeDayStartDate, setHomeDayStartDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [homeDayEndDate, setHomeDayEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [homeDayStartTime, setHomeDayStartTime] = useState('09:00');
    const [homeDayEndTime, setHomeDayEndTime] = useState('18:00');
    const [homeDayAllDay, setHomeDayAllDay] = useState(true);
    
    // Travel form state
    const [travelFromHomeId, setTravelFromHomeId] = useState<string>('');
    const [travelFromLocation, setTravelFromLocation] = useState<string>('');
    const [travelToHomeId, setTravelToHomeId] = useState<string>('');
    const [travelToLocation, setTravelToLocation] = useState<string>('');
    const [travelStartDate, setTravelStartDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [travelStartTime, setTravelStartTime] = useState('09:00');
    const [travelEndDate, setTravelEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [travelEndTime, setTravelEndTime] = useState('10:00');
    const [travelWith, setTravelWith] = useState<string>('');
    const [travelNotes, setTravelNotes] = useState<string>('');
    const [travelTitle, setTravelTitle] = useState<string>('');
    
    // Event form state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventStartDate, setEventStartDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [eventStartTime, setEventStartTime] = useState('09:00');
    const [eventEndDate, setEventEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [eventEndTime, setEventEndTime] = useState('10:00');
    const [eventAllDay, setEventAllDay] = useState(true);
    
    // Auto-generate travel title
    useEffect(() => {
        const fromName = travelFromHomeId 
            ? homes.find(h => h.id === travelFromHomeId)?.name 
            : travelFromLocation || '';
        const toName = travelToHomeId 
            ? homes.find(h => h.id === travelToHomeId)?.name 
            : travelToLocation || '';
        
        if (fromName && toName) {
            setTravelTitle(`Travel: ${fromName} → ${toName}`);
        } else if (fromName) {
            setTravelTitle(`Travel from ${fromName}`);
        } else if (toName) {
            setTravelTitle(`Travel to ${toName}`);
        } else {
            setTravelTitle('');
        }
    }, [travelFromHomeId, travelFromLocation, travelToHomeId, travelToLocation, homes]);
    
    if (!isOpen) return null;
    
    const activeHomes = homes.filter(h => h.status === 'active');
    
    const resetForm = () => {
        // Reset home day
        setSelectedHomeId('');
        setHomeDayStartDate(new Date().toISOString().split('T')[0]);
        setHomeDayEndDate(new Date().toISOString().split('T')[0]);
        setHomeDayStartTime('09:00');
        setHomeDayEndTime('18:00');
        setHomeDayAllDay(true);
        // Reset travel
        setTravelFromHomeId('');
        setTravelFromLocation('');
        setTravelToHomeId('');
        setTravelToLocation('');
        setTravelStartDate(new Date().toISOString().split('T')[0]);
        setTravelStartTime('09:00');
        setTravelEndDate(new Date().toISOString().split('T')[0]);
        setTravelEndTime('10:00');
        setTravelWith('');
        setTravelNotes('');
        setTravelTitle('');
        // Reset event
        setEventTitle('');
        setEventDescription('');
        setEventStartDate(new Date().toISOString().split('T')[0]);
        setEventStartTime('09:00');
        setEventEndDate(new Date().toISOString().split('T')[0]);
        setEventEndTime('10:00');
        setEventAllDay(true);
        // Reset status
        setError(null);
        setSuccessMessage(null);
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleSubmitHomeDay = async () => {
        if (!currentChild || !selectedHomeId) {
            setError('Please select a home');
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            let startAt: Date;
            let endAt: Date;
            
            if (homeDayAllDay) {
                startAt = new Date(homeDayStartDate + 'T00:00:00');
                endAt = new Date(homeDayEndDate + 'T23:59:59');
            } else {
                startAt = new Date(homeDayStartDate + 'T' + homeDayStartTime);
                endAt = new Date(homeDayEndDate + 'T' + homeDayEndTime);
            }
            
            if (endAt < startAt) {
                setError('End date/time must be after start date/time');
                setIsSubmitting(false);
                return;
            }
            
            const result = await addHomeDay({
                childId: currentChild.id,
                homeId: selectedHomeId,
                startAt,
                endAt,
                allDay: homeDayAllDay,
            });
            
            if (result.success) {
                const homeName = homes.find(h => h.id === selectedHomeId)?.name || 'Home';
                if (result.autoConfirmed) {
                    setSuccessMessage(`Stay at ${homeName} added!`);
                } else {
                    setSuccessMessage(`Stay at ${homeName} sent for confirmation`);
                }
                
                setTimeout(() => {
                    handleClose();
                }, 1500);
            } else {
                setError(result.error || 'Failed to add stay');
            }
        } catch (err) {
            setError('Failed to add stay');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSubmitTravel = async () => {
        if (!currentChild) {
            setError('No child selected');
            return;
        }
        
        // Validate from location
        if (!travelFromHomeId && !travelFromLocation.trim()) {
            setError('Please select or enter a "From" location');
            return;
        }
        
        // Validate to location
        if (!travelToHomeId && !travelToLocation.trim()) {
            setError('Please select or enter a "To" location');
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            const startAt = new Date(travelStartDate + 'T' + travelStartTime);
            const endAt = new Date(travelEndDate + 'T' + travelEndTime);
            
            if (endAt < startAt) {
                setError('End date/time must be after start date/time');
                setIsSubmitting(false);
                return;
            }
            
            const result = await addTravel({
                childId: currentChild.id,
                fromHomeId: travelFromHomeId || null,
                fromLocation: !travelFromHomeId ? travelFromLocation.trim() : undefined,
                toHomeId: travelToHomeId || null,
                toLocation: !travelToHomeId ? travelToLocation.trim() : undefined,
                startAt,
                endAt,
                allDay: false,
                title: travelTitle || undefined,
                travelWith: travelWith.trim() || undefined,
                notes: travelNotes.trim() || undefined,
            });
            
            if (result.success) {
                setSuccessMessage('Travel added!');
                setTimeout(() => {
                    handleClose();
                }, 1000);
            } else {
                setError(result.error || 'Failed to add travel');
            }
        } catch (err) {
            setError('Failed to add travel');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSubmitEvent = async () => {
        if (!currentChild || !eventTitle.trim()) {
            setError('Please enter a title');
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            let startAt: Date;
            let endAt: Date;
            
            if (eventAllDay) {
                startAt = new Date(eventStartDate + 'T00:00:00');
                endAt = new Date(eventEndDate + 'T23:59:59');
            } else {
                startAt = new Date(eventStartDate + 'T' + eventStartTime);
                endAt = new Date(eventEndDate + 'T' + eventEndTime);
            }
            
            if (endAt < startAt) {
                setError('End date/time must be after start date/time');
                setIsSubmitting(false);
                return;
            }
            
            const result = await addEvent({
                childId: currentChild.id,
                title: eventTitle.trim(),
                description: eventDescription.trim() || undefined,
                startAt,
                endAt,
                allDay: eventAllDay,
            });
            
            if (result.success) {
                setSuccessMessage('Event added!');
                setTimeout(() => {
                    handleClose();
                }, 1000);
            } else {
                setError(result.error || 'Failed to add event');
            }
        } catch (err) {
            setError('Failed to add event');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSubmit = () => {
        switch (tab) {
            case 'home_day':
                return handleSubmitHomeDay();
            case 'travel':
                return handleSubmitTravel();
            case 'event':
                return handleSubmitEvent();
        }
    };
    
    const getSubmitButtonText = () => {
        if (isSubmitting) {
            return (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Adding...
                </span>
            );
        }
        switch (tab) {
            case 'home_day':
                return `Add ${currentChild?.name}'s stay`;
            case 'travel':
                return 'Add Travel';
            case 'event':
                return 'Add Event';
        }
    };
    
    const isSubmitDisabled = () => {
        if (isSubmitting) return true;
        switch (tab) {
            case 'home_day':
                return !selectedHomeId;
            case 'travel':
                return (!travelFromHomeId && !travelFromLocation.trim()) || 
                       (!travelToHomeId && !travelToLocation.trim());
            case 'event':
                return !eventTitle.trim();
        }
    };
    
    // Location selector component for Travel
    const LocationSelector = ({ 
        label, 
        selectedHomeId, 
        setSelectedHomeId, 
        customLocation, 
        setCustomLocation,
        placeholder 
    }: {
        label: string;
        selectedHomeId: string;
        setSelectedHomeId: (id: string) => void;
        customLocation: string;
        setCustomLocation: (loc: string) => void;
        placeholder: string;
    }) => (
        <div>
            <label className="block text-sm font-medium text-forest mb-2">{label}</label>
            <div className="space-y-2">
                {/* Home options */}
                <div className="flex flex-wrap gap-2">
                    {activeHomes.map(home => (
                        <button
                            key={home.id}
                            type="button"
                            onClick={() => {
                                setSelectedHomeId(home.id);
                                setCustomLocation('');
                            }}
                            className={`
                                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                ${selectedHomeId === home.id 
                                    ? 'text-white' 
                                    : 'bg-white border border-border text-forest hover:border-textSub'
                                }
                            `}
                            style={selectedHomeId === home.id ? { 
                                backgroundColor: getHomeColor(home.name) 
                            } : undefined}
                        >
                            {home.name}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedHomeId('');
                        }}
                        className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                            ${!selectedHomeId && customLocation 
                                ? 'bg-terracotta/10 border-2 border-terracotta text-terracotta' 
                                : 'bg-white border border-border text-forest hover:border-textSub'
                            }
                        `}
                    >
                        Other...
                    </button>
                </div>
                {/* Custom location input (shown when "Other" or nothing selected and homes exist) */}
                {!selectedHomeId && (
                    <input
                        type="text"
                        value={customLocation}
                        onChange={e => setCustomLocation(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 border border-border rounded-lg text-forest placeholder:text-textSub focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                    />
                )}
            </div>
        </div>
    );
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-card shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-dmSerif text-xl text-forest">Add to Calendar</h2>
                    <button
                        onClick={handleClose}
                        className="p-1 text-textSub hover:text-forest rounded-full hover:bg-softGreen transition-colors"
                    >
                        <CloseIcon size={20} />
                    </button>
                </div>
                
                {/* Success message overlay */}
                {successMessage && (
                    <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-10 rounded-card">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2C3E2D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium text-forest">{successMessage}</p>
                        </div>
                    </div>
                )}
                
                {/* 3-Tab selector */}
                <div className="p-4 border-b border-border">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Home Day Tab */}
                        <button
                            onClick={() => { setTab('home_day'); setError(null); }}
                            className={`
                                py-3 px-2 rounded-xl border-2 transition-all
                                ${tab === 'home_day' 
                                    ? 'border-terracotta bg-terracotta/5' 
                                    : 'border-border hover:border-textSub'
                                }
                            `}
                        >
                            <div className="text-center">
                                <span className="text-xl block mb-0.5">🏠</span>
                                <span className={`text-sm font-medium block ${tab === 'home_day' ? 'text-terracotta' : 'text-forest'}`}>
                                    {currentChild?.name}'s stay
                                </span>
                                <p className="text-[10px] text-textSub mt-0.5 leading-tight">
                                    Schedule where {currentChild?.name} will stay
                                </p>
                            </div>
                        </button>
                        
                        {/* Travel Tab */}
                        <button
                            onClick={() => { setTab('travel'); setError(null); }}
                            className={`
                                py-3 px-2 rounded-xl border-2 transition-all
                                ${tab === 'travel' 
                                    ? 'border-terracotta bg-terracotta/5' 
                                    : 'border-border hover:border-textSub'
                                }
                            `}
                        >
                            <div className="text-center">
                                <span className="text-xl block mb-0.5">🚗</span>
                                <span className={`text-sm font-medium block ${tab === 'travel' ? 'text-terracotta' : 'text-forest'}`}>
                                    Travel
                                </span>
                                <p className="text-[10px] text-textSub mt-0.5 leading-tight">
                                    Moving between homes or locations
                                </p>
                            </div>
                        </button>
                        
                        {/* Event Tab */}
                        <button
                            onClick={() => { setTab('event'); setError(null); }}
                            className={`
                                py-3 px-2 rounded-xl border-2 transition-all
                                ${tab === 'event' 
                                    ? 'border-terracotta bg-terracotta/5' 
                                    : 'border-border hover:border-textSub'
                                }
                            `}
                        >
                            <div className="text-center">
                                <span className="text-xl block mb-0.5">📅</span>
                                <span className={`text-sm font-medium block ${tab === 'event' ? 'text-terracotta' : 'text-forest'}`}>
                                    Event
                                </span>
                                <p className="text-[10px] text-textSub mt-0.5 leading-tight">
                                    Add an activity or reminder
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
                
                {/* Form content */}
                <div className="p-4 space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    
                    {tab === 'home_day' && (
                        /* Home Day Form */
                        <>
                            {/* Home selection */}
                            <div>
                                <label className="block text-sm font-medium text-forest mb-2">
                                    Select Home
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {activeHomes.map(home => (
                                        <button
                                            key={home.id}
                                            onClick={() => setSelectedHomeId(home.id)}
                                            className={`
                                                p-3 rounded-xl border-2 text-left transition-all
                                                ${selectedHomeId === home.id 
                                                    ? 'border-terracotta bg-terracotta/5' 
                                                    : 'border-border hover:border-textSub'
                                                }
                                            `}
                                            style={{
                                                borderLeftWidth: '4px',
                                                borderLeftColor: selectedHomeId === home.id 
                                                    ? getHomeColor(home.name)
                                                    : undefined,
                                            }}
                                        >
                                            <span className="font-medium text-forest">{home.name}</span>
                                        </button>
                                    ))}
                                </div>
                                {activeHomes.length === 0 && (
                                    <p className="text-sm text-textSub">No homes available</p>
                                )}
                            </div>
                            
                            {/* All day toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={homeDayAllDay}
                                    onChange={e => setHomeDayAllDay(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                                />
                                <span className="text-sm text-forest">All day</span>
                            </label>
                            
                            {/* Date/time range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        Start
                                    </label>
                                    <input
                                        type="date"
                                        value={homeDayStartDate}
                                        onChange={e => {
                                            setHomeDayStartDate(e.target.value);
                                            if (e.target.value > homeDayEndDate) {
                                                setHomeDayEndDate(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                    {!homeDayAllDay && (
                                        <input
                                            type="time"
                                            value={homeDayStartTime}
                                            onChange={e => setHomeDayStartTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30 mt-2"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        End
                                    </label>
                                    <input
                                        type="date"
                                        value={homeDayEndDate}
                                        min={homeDayStartDate}
                                        onChange={e => setHomeDayEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                    {!homeDayAllDay && (
                                        <input
                                            type="time"
                                            value={homeDayEndTime}
                                            onChange={e => setHomeDayEndTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30 mt-2"
                                        />
                                    )}
                                </div>
                            </div>
                            
                            {/* Info note */}
                            <div className="p-3 bg-softGreen rounded-lg text-sm text-forest">
                                <p className="font-medium">📋 Confirmation Required</p>
                                <p className="text-textSub mt-1">
                                    Stays need to be confirmed by another guardian before they're active.
                                </p>
                            </div>
                        </>
                    )}
                    
                    {tab === 'travel' && (
                        /* Travel Form */
                        <>
                            {/* From location */}
                            <LocationSelector
                                label="From"
                                selectedHomeId={travelFromHomeId}
                                setSelectedHomeId={setTravelFromHomeId}
                                customLocation={travelFromLocation}
                                setCustomLocation={setTravelFromLocation}
                                placeholder="e.g., School, Airport, Grandma's house"
                            />
                            
                            {/* To location */}
                            <LocationSelector
                                label="To"
                                selectedHomeId={travelToHomeId}
                                setSelectedHomeId={setTravelToHomeId}
                                customLocation={travelToLocation}
                                setCustomLocation={setTravelToLocation}
                                placeholder="e.g., School, Airport, Grandma's house"
                            />
                            
                            {/* Auto-generated title (editable) */}
                            {travelTitle && (
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={travelTitle}
                                        onChange={e => setTravelTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                </div>
                            )}
                            
                            {/* Date/time range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        Depart
                                    </label>
                                    <input
                                        type="date"
                                        value={travelStartDate}
                                        onChange={e => {
                                            setTravelStartDate(e.target.value);
                                            if (e.target.value > travelEndDate) {
                                                setTravelEndDate(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                    <input
                                        type="time"
                                        value={travelStartTime}
                                        onChange={e => setTravelStartTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30 mt-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        Arrive
                                    </label>
                                    <input
                                        type="date"
                                        value={travelEndDate}
                                        min={travelStartDate}
                                        onChange={e => setTravelEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                    <input
                                        type="time"
                                        value={travelEndTime}
                                        onChange={e => setTravelEndTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30 mt-2"
                                    />
                                </div>
                            </div>
                            
                            {/* With whom */}
                            <div>
                                <label className="block text-sm font-medium text-forest mb-1">
                                    Traveling with <span className="text-textSub font-normal">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={travelWith}
                                    onChange={e => setTravelWith(e.target.value)}
                                    placeholder="e.g., Mom, Dad, Both parents, Grandma"
                                    className="w-full px-3 py-2 border border-border rounded-lg text-forest placeholder:text-textSub focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                />
                            </div>
                            
                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-forest mb-1">
                                    Notes <span className="text-textSub font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={travelNotes}
                                    onChange={e => setTravelNotes(e.target.value)}
                                    placeholder="Flight details, pickup instructions..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-forest placeholder:text-textSub focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none"
                                />
                            </div>
                            
                            {/* Info note */}
                            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                                <p className="font-medium">🚗 During travel, {currentChild?.name} is "in transit"</p>
                                <p className="text-blue-600 mt-1">
                                    After arrival, their location updates to the destination.
                                </p>
                            </div>
                        </>
                    )}
                    
                    {tab === 'event' && (
                        /* Event Form */
                        <>
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-forest mb-1">
                                    Title <span className="text-terracotta">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={eventTitle}
                                    onChange={e => setEventTitle(e.target.value)}
                                    placeholder="e.g., Soccer practice, Doctor appointment"
                                    className="w-full px-3 py-2 border border-border rounded-lg text-forest placeholder:text-textSub focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                />
                            </div>
                            
                            {/* All day toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={eventAllDay}
                                    onChange={e => setEventAllDay(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                                />
                                <span className="text-sm text-forest">All day</span>
                            </label>
                            
                            {/* Date/time inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        Start
                                    </label>
                                    <input
                                        type="date"
                                        value={eventStartDate}
                                        onChange={e => {
                                            setEventStartDate(e.target.value);
                                            if (e.target.value > eventEndDate) {
                                                setEventEndDate(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                    {!eventAllDay && (
                                        <input
                                            type="time"
                                            value={eventStartTime}
                                            onChange={e => setEventStartTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30 mt-2"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        End
                                    </label>
                                    <input
                                        type="date"
                                        value={eventEndDate}
                                        min={eventStartDate}
                                        onChange={e => setEventEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                    {!eventAllDay && (
                                        <input
                                            type="time"
                                            value={eventEndTime}
                                            onChange={e => setEventEndTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30 mt-2"
                                        />
                                    )}
                                </div>
                            </div>
                            
                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-forest mb-1">
                                    Description <span className="text-textSub font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={eventDescription}
                                    onChange={e => setEventDescription(e.target.value)}
                                    placeholder="Add notes..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-forest placeholder:text-textSub focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none"
                                />
                            </div>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-border space-y-3">
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 btn-secondary py-2"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 btn-accent py-2"
                            disabled={isSubmitDisabled()}
                        >
                            {getSubmitButtonText()}
                        </button>
                    </div>
                    
                    {/* Calendar import links */}
                    <div className="flex items-center justify-center gap-4">
                        <a
                            href="/settings/integrations"
                            onClick={handleClose}
                            className="inline-flex items-center gap-1.5 text-xs text-textSub hover:text-blue-600 transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/>
                                <rect x="3" y="4" width="18" height="5" fill="#1967D2"/>
                                <rect x="6" y="12" width="3" height="3" fill="white"/>
                                <rect x="10.5" y="12" width="3" height="3" fill="white"/>
                                <rect x="15" y="12" width="3" height="3" fill="white"/>
                            </svg>
                            Google Calendar
                        </a>
                        <span className="text-textSub/30">|</span>
                        <a
                            href="/settings/integrations/apple-calendar/connect"
                            onClick={handleClose}
                            className="inline-flex items-center gap-1.5 text-xs text-textSub hover:text-red-600 transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="18" rx="2" fill="#FF3B30"/>
                                <rect x="3" y="4" width="18" height="5" fill="#D12F26"/>
                                <text x="12" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">31</text>
                            </svg>
                            Apple Calendar
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
