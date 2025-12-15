"use client";

import React, { useState } from "react";
import { useCalendar } from "@/lib/calendar/CalendarContext";
import { formatDateRange } from "@/lib/calendar/types";
import { CloseIcon, TrashIcon, CheckIcon, EditIcon } from "@/components/icons/DuotoneIcons";

export default function EventDetailPanel() {
    const { 
        selectedEvent, 
        setSelectedEvent, 
        confirmEvent, 
        rejectEvent, 
        removeEvent,
        editEvent,
    } = useCalendar();
    
    const [isConfirming, setIsConfirming] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    
    // Edit form state
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editAllDay, setEditAllDay] = useState(true);
    
    if (!selectedEvent) return null;
    
    const isHomeDay = selectedEvent.eventType === 'home_day';
    const isTravel = selectedEvent.eventType === 'travel';
    const isPending = selectedEvent.status === 'proposed';
    const isConfirmed = selectedEvent.status === 'confirmed';
    const isRejected = selectedEvent.status === 'rejected';
    
    const startEditMode = () => {
        setEditTitle(selectedEvent.title);
        setEditDescription(selectedEvent.description || '');
        setEditStartDate(selectedEvent.startAt.toISOString().split('T')[0]);
        setEditEndDate(selectedEvent.endAt.toISOString().split('T')[0]);
        setEditAllDay(selectedEvent.allDay);
        setIsEditing(true);
        setActionMessage(null);
    };
    
    const cancelEdit = () => {
        setIsEditing(false);
        setActionMessage(null);
    };
    
    const handleSaveEdit = async () => {
        setIsSaving(true);
        setActionMessage(null);
        
        try {
            const startAt = new Date(editStartDate + 'T00:00:00');
            const endAt = new Date(editEndDate + 'T23:59:59');
            
            if (endAt < startAt) {
                setActionMessage('Error: End date must be after start date');
                setIsSaving(false);
                return;
            }
            
            const result = await editEvent(selectedEvent.id, {
                title: editTitle.trim(),
                description: editDescription.trim() || undefined,
                startAt,
                endAt,
                allDay: editAllDay,
            });
            
            if (result.success) {
                setActionMessage('✓ Saved!');
                setIsEditing(false);
                setTimeout(() => setActionMessage(null), 2000);
            } else {
                setActionMessage(`Error: ${result.error}`);
            }
        } catch (err) {
            setActionMessage('Error: Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleConfirm = async () => {
        setIsConfirming(true);
        setActionMessage(null);
        
        const result = await confirmEvent(selectedEvent.id);
        
        if (result.success) {
            setActionMessage('✓ Stay confirmed!');
            setTimeout(() => {
                setSelectedEvent(null);
            }, 1500);
        } else {
            setActionMessage(`Error: ${result.error}`);
        }
        
        setIsConfirming(false);
    };
    
    const handleReject = async () => {
        setIsRejecting(true);
        setActionMessage(null);
        
        const result = await rejectEvent(selectedEvent.id);
        
        if (result.success) {
            setActionMessage('Stay rejected');
            setTimeout(() => {
                setSelectedEvent(null);
            }, 1500);
        } else {
            setActionMessage(`Error: ${result.error}`);
        }
        
        setIsRejecting(false);
    };
    
    const handleDelete = async () => {
        setIsDeleting(true);
        setActionMessage(null);
        
        const result = await removeEvent(selectedEvent.id);
        
        if (result.success) {
            setSelectedEvent(null);
        } else {
            setActionMessage(`Error: ${result.error}`);
            setIsDeleting(false);
        }
    };
    
    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setSelectedEvent(null)}
            />
            
            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{isHomeDay ? '🏠' : isTravel ? '🚗' : '📅'}</span>
                        <h2 className="font-dmSerif text-lg text-forest">
                            {isEditing ? 'Edit' : ''} {isHomeDay ? 'Stay' : isTravel ? 'Travel' : 'Event'} {isEditing ? '' : 'Details'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && !selectedEvent.isReadOnly && (
                            <button
                                onClick={startEditMode}
                                className="p-1.5 text-textSub hover:text-forest rounded-full hover:bg-softGreen transition-colors"
                                title="Edit"
                            >
                                <EditIcon size={20} />
                            </button>
                        )}
                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="p-1.5 text-textSub hover:text-forest rounded-full hover:bg-softGreen transition-colors"
                        >
                            <CloseIcon size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Action message */}
                    {actionMessage && (
                        <div className={`p-3 rounded-lg text-sm ${
                            actionMessage.startsWith('Error') 
                                ? 'bg-red-50 text-red-700' 
                                : 'bg-softGreen text-forest'
                        }`}>
                            {actionMessage}
                        </div>
                    )}
                    
                    {isEditing ? (
                        /* Edit Mode */
                        <>
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-forest mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                />
                            </div>
                            
                            {/* Description (only for regular events) */}
                            {!isHomeDay && (
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none"
                                    />
                                </div>
                            )}
                            
                            {/* Home info (read-only for home days) */}
                            {isHomeDay && selectedEvent.homeName && (
                                <div 
                                    className="p-3 rounded-lg"
                                    style={{ 
                                        backgroundColor: selectedEvent.homeColor 
                                            ? `${selectedEvent.homeColor}15` 
                                            : '#E8EFE8',
                                        borderLeft: `4px solid ${selectedEvent.homeColor || '#4CA1AF'}`,
                                    }}
                                >
                                    <p className="text-sm text-textSub">Home (cannot be changed)</p>
                                    <p className="font-medium text-forest">{selectedEvent.homeName}</p>
                                </div>
                            )}
                            
                            {/* Date range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editStartDate}
                                        onChange={e => {
                                            setEditStartDate(e.target.value);
                                            if (e.target.value > editEndDate) {
                                                setEditEndDate(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editEndDate}
                                        min={editStartDate}
                                        onChange={e => setEditEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-forest focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                                    />
                                </div>
                            </div>
                            
                            {/* All day toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editAllDay}
                                    onChange={e => setEditAllDay(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-terracotta focus:ring-terracotta"
                                />
                                <span className="text-sm text-forest">All day</span>
                            </label>
                        </>
                    ) : (
                        /* View Mode */
                        <>
                            {/* Status badge */}
                            {isHomeDay && (
                                <div className="flex items-center gap-2">
                                    {isPending && (
                                        <span className="px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700 rounded-full">
                                            ⏳ Pending Confirmation
                                        </span>
                                    )}
                                    {isConfirmed && (
                                        <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full">
                                            ✓ Confirmed
                                        </span>
                                    )}
                                    {isRejected && (
                                        <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-500 rounded-full">
                                            ✕ Rejected
                                        </span>
                                    )}
                                </div>
                            )}
                            
                            {/* Title */}
                            <div>
                                <h3 className="text-xl font-medium text-forest">{selectedEvent.title}</h3>
                                {selectedEvent.description && (
                                    <p className="text-textSub mt-1">{selectedEvent.description}</p>
                                )}
                            </div>
                            
                            {/* Home info for home days */}
                            {isHomeDay && selectedEvent.homeName && (
                                <div 
                                    className="p-3 rounded-lg"
                                    style={{ 
                                        backgroundColor: selectedEvent.homeColor 
                                            ? `${selectedEvent.homeColor}15` 
                                            : '#E8EFE8',
                                        borderLeft: `4px solid ${selectedEvent.homeColor || '#4CA1AF'}`,
                                    }}
                                >
                                    <p className="text-sm text-textSub">Home</p>
                                    <p className="font-medium text-forest">{selectedEvent.homeName}</p>
                                </div>
                            )}
                            
                            {/* Travel route for travel events */}
                            {isTravel && (
                                <div className="space-y-2">
                                    {/* From */}
                                    <div 
                                        className="p-3 rounded-lg"
                                        style={{ 
                                            backgroundColor: selectedEvent.fromHomeColor 
                                                ? `${selectedEvent.fromHomeColor}15` 
                                                : '#f3f4f6',
                                            borderLeft: `4px solid ${selectedEvent.fromHomeColor || '#6b7280'}`,
                                        }}
                                    >
                                        <p className="text-sm text-textSub">From</p>
                                        <p className="font-medium text-forest">
                                            {selectedEvent.fromHomeName || selectedEvent.fromLocation || 'Unknown'}
                                        </p>
                                    </div>
                                    
                                    {/* Arrow */}
                                    <div className="flex justify-center">
                                        <span className="text-textSub">↓</span>
                                    </div>
                                    
                                    {/* To */}
                                    <div 
                                        className="p-3 rounded-lg"
                                        style={{ 
                                            backgroundColor: selectedEvent.toHomeColor 
                                                ? `${selectedEvent.toHomeColor}15` 
                                                : '#f3f4f6',
                                            borderLeft: `4px solid ${selectedEvent.toHomeColor || '#6b7280'}`,
                                        }}
                                    >
                                        <p className="text-sm text-textSub">To</p>
                                        <p className="font-medium text-forest">
                                            {selectedEvent.toHomeName || selectedEvent.toLocation || 'Unknown'}
                                        </p>
                                    </div>
                                    
                                    {/* Traveling with */}
                                    {selectedEvent.travelWith && (
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-textSub">Traveling with</p>
                                            <p className="font-medium text-forest">{selectedEvent.travelWith}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Date/time */}
                            <div className="p-3 bg-softGreen rounded-lg">
                                <p className="text-sm text-textSub">Date & Time</p>
                                <p className="font-medium text-forest">
                                    {formatDateRange(selectedEvent.startAt, selectedEvent.endAt, selectedEvent.allDay)}
                                </p>
                                {selectedEvent.allDay && (
                                    <p className="text-xs text-textSub mt-1">All day</p>
                                )}
                            </div>
                            
                            {/* Confirmation info for home days */}
                            {isHomeDay && (
                                <div className="space-y-2">
                                    {selectedEvent.proposedByName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-textSub">Proposed by:</span>
                                            <span className="text-forest">{selectedEvent.proposedByName}</span>
                                        </div>
                                    )}
                                    {isConfirmed && selectedEvent.confirmedByName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-textSub">Confirmed by:</span>
                                            <span className="text-forest">{selectedEvent.confirmedByName}</span>
                                        </div>
                                    )}
                                    {isRejected && selectedEvent.rejectedByName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-textSub">Rejected by:</span>
                                            <span className="text-forest">{selectedEvent.rejectedByName}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Eligible confirmers for pending home days */}
                            {isPending && selectedEvent.eligibleConfirmers && selectedEvent.eligibleConfirmers.length > 0 && (
                                <div className="p-3 bg-amber-50 rounded-lg">
                                    <p className="text-sm font-medium text-amber-800">Waiting for confirmation from:</p>
                                    <ul className="mt-1">
                                        {selectedEvent.eligibleConfirmers.map(c => (
                                            <li key={c.userId} className="text-sm text-amber-700">
                                                • {c.userName}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {/* Imported from Google indicator */}
                            {selectedEvent.source === 'google' && (
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                        <span className="text-sm text-blue-800">Imported from Google Calendar</span>
                                    </div>
                                    {selectedEvent.externalHtmlLink && (
                                        <a 
                                            href={selectedEvent.externalHtmlLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                        >
                                            View in Google Calendar →
                                        </a>
                                    )}
                                    {selectedEvent.isReadOnly && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            This event is read-only. Edit it in Google Calendar.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {/* Imported from Apple Calendar indicator */}
                            {selectedEvent.source === 'ics' && (
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <rect x="3" y="4" width="18" height="18" rx="2" fill="#FF3B30"/>
                                            <rect x="3" y="4" width="18" height="5" fill="#D12F26"/>
                                            <text x="12" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">31</text>
                                        </svg>
                                        <span className="text-sm text-red-800">Imported from Apple Calendar</span>
                                    </div>
                                    {selectedEvent.isReadOnly && (
                                        <p className="text-xs text-red-600 mt-1">
                                            This event is read-only. Edit it in Apple Calendar.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {/* Meta info */}
                            <div className="text-xs text-textSub pt-2 border-t border-border">
                                <p>Created: {selectedEvent.createdAt.toLocaleDateString()}</p>
                                {selectedEvent.createdByName && (
                                    <p>By: {selectedEvent.createdByName}</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
                
                {/* Actions footer */}
                <div className="p-4 border-t border-border space-y-3">
                    {isEditing ? (
                        /* Edit mode actions */
                        <div className="flex gap-3">
                            <button
                                onClick={cancelEdit}
                                className="flex-1 btn-secondary py-2"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSaving || !editTitle.trim()}
                                className="flex-1 btn-accent py-2"
                            >
                                {isSaving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    ) : (
                        /* View mode actions */
                        <>
                            {/* Confirm/Reject for pending home days */}
                            {isPending && selectedEvent.canConfirm && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleReject}
                                        disabled={isRejecting || isConfirming}
                                        className="flex-1 btn-secondary py-2 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        {isRejecting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></span>
                                                Rejecting...
                                            </span>
                                        ) : (
                                            'Reject'
                                        )}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isConfirming || isRejecting}
                                        className="flex-1 btn-primary py-2 bg-green-600 hover:bg-green-700"
                                    >
                                        {isConfirming ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Confirming...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <CheckIcon size={18} />
                                                Confirm
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}
                            
                            {/* Pending info for non-confirmers */}
                            {isPending && !selectedEvent.canConfirm && (
                                <p className="text-sm text-center text-textSub">
                                    Waiting for confirmation from {selectedEvent.homeName} members.
                                </p>
                            )}
                            
                            {/* Edit and Delete buttons (only for non-read-only events) */}
                            {!selectedEvent.isReadOnly && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={startEditMode}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-forest bg-softGreen hover:bg-softGreen/80 rounded-lg transition-colors"
                                    >
                                        <EditIcon size={18} />
                                        Edit
                                    </button>
                                    
                                    {!showDeleteConfirm ? (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                        >
                                            <TrashIcon size={18} />
                                            Delete
                                        </button>
                                    ) : (
                                        <div className="flex-1 p-2 bg-red-50 rounded-lg">
                                            <p className="text-xs text-red-700 mb-2">Delete this?</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    className="flex-1 py-1 text-xs text-gray-600 hover:bg-white rounded"
                                                >
                                                    No
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    disabled={isDeleting}
                                                    className="flex-1 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                                                >
                                                    {isDeleting ? '...' : 'Yes'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="w-full btn-secondary py-2"
                            >
                                Close
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
