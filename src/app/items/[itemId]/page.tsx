"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import ItemPhoto from "@/components/ItemPhoto";

/**
 * Render the item detail page for the specified item.
 *
 * Displays the item's photo, status, current location selector, actions (request toggle or missing-note UI),
 * missing conversation (when applicable), and history. If the item cannot be found, renders a back link and a centered "Item not found" message.
 *
 * @param params - Route parameters containing the `itemId` of the item to display.
 * @returns The page UI for the item identified by `params.itemId`.
 */
export default function ItemDetailPage({
    params,
}: {
    params: { itemId: string };
}) {
    useEnsureOnboarding();

    const {
        items,
        updateItemLocation,
        updateItemRequested,
        getMissingMessagesForItem,
        addMissingMessage,
        markItemFound,
        deleteItem,
        updateItemName,
    } = useItems();
    const router = useRouter();
    const { caregivers, currentJuneCaregiverId } = useAppState();
    const item = items.find((i) => i.id === params.itemId);

    // Local UI state for toggles (initialized from item data)
    const [isRequested, setIsRequested] = useState(
        item?.isRequestedForNextVisit || false
    );

    // State for location change feedback
    const [updateMessage, setUpdateMessage] = useState("");

    // State for ephemeral history entries
    const [extraHistoryEntries, setExtraHistoryEntries] = useState<
        Array<{ text: string; time: string }>
    >([]);

    // State for missing conversation
    // State for missing conversation
    const [messageInput, setMessageInput] = useState("");

    // State for name editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(item?.name || "");

    const handleSaveName = async () => {
        if (!item || !editedName.trim()) return;
        try {
            await updateItemName(item.id, editedName.trim());
            setIsEditingName(false);
        } catch (error) {
            alert("Failed to update name");
        }
    };

    if (!item) {
        return (
            <AppShell>
                <div className="mb-4">
                    <Link
                        href="/items"
                        className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                    >
                        ← Back to list
                    </Link>
                </div>
                <div className="text-center py-10 bg-white rounded-2xl shadow-sm">
                    <p className="text-gray-500">Item not found</p>
                </div>
            </AppShell>
        );
    }

    // Derived data
    const caregiver = caregivers.find(
        (c) => c.id === item.locationCaregiverId
    );
    const locationLabel = item.isMissing
        ? "To be found"
        : caregiver
            ? `${caregiver.label}’s Home`
            : "Unknown Location";

    // Determine status pill
    let statusPill = null;
    if (item.isMissing) {
        statusPill = (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                To be found
            </span>
        );
    } else if (isRequested) {
        statusPill = (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Requested
            </span>
        );
    }

    // Handler for location change
    const handleLocationChange = (value: string) => {
        if (value === "TO_BE_FOUND") {
            updateItemLocation(item.id, { toBeFound: true });
            setUpdateMessage("Marked as 'To be found'.");
            setExtraHistoryEntries((prev) => [
                { text: "Marked as 'To be found'", time: "Just now" },
                ...prev,
            ]);
        } else {
            const selectedCaregiver = caregivers.find((c) => c.id === value);
            if (selectedCaregiver) {
                updateItemLocation(item.id, { caregiverId: value });
                setUpdateMessage(
                    `Location updated to ${selectedCaregiver.label}'s Home.`
                );
                setExtraHistoryEntries((prev) => [
                    {
                        text: `Location changed to ${selectedCaregiver.label}'s Home`,
                        time: "Just now",
                    },
                    ...prev,
                ]);
            }
        }
    };

    const handleDelete = async () => {
        if (
            window.confirm(
                "Are you sure you want to delete this item?\n\nThis cannot be undone and it will disappear for all caretakers from their lists."
            )
        ) {
            const result = await deleteItem(item.id);
            if (result.success) {
                router.push("/items");
            } else {
                alert(result.error || "Failed to delete item");
            }
        }
    };

    return (
        <AppShell>
            {/* Back Link */}
            <div className="mb-4">
                <Link
                    href="/items"
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    ← Back to list
                </Link>
            </div>

            {/* Header & Hero */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-4">
                <div className="text-center mb-6">
                    <div className="mx-auto mb-4 flex justify-center">
                        <ItemPhoto
                            photoPath={item.photoUrl}
                            itemName={item.name}
                            className="w-24 h-24"
                        />
                    </div>
                    {statusPill && <div className="mb-3">{statusPill}</div>}
                    {statusPill && <div className="mb-3">{statusPill}</div>}

                    {isEditingName ? (
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="text-2xl font-bold text-gray-900 text-center border-b-2 border-primary focus:outline-none bg-transparent w-full max-w-[250px]"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveName();
                                    if (e.key === "Escape") {
                                        setIsEditingName(false);
                                        setEditedName(item.name);
                                    }
                                }}
                            />
                            <button
                                onClick={handleSaveName}
                                className="p-1 text-green-600 hover:text-green-700 bg-green-50 rounded-full w-8 h-8 flex items-center justify-center"
                            >
                                ✓
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditingName(false);
                                    setEditedName(item.name);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
                            <button
                                onClick={() => {
                                    setEditedName(item.name);
                                    setIsEditingName(true);
                                }}
                                className="p-1 text-gray-400 hover:text-primary transition-colors"
                                aria-label="Edit name"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                    )}
                    <p className="text-gray-500 font-medium">
                        {item.category} · {locationLabel}
                    </p>
                </div>
            </div>

            {/* Current Home Section */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4">
                <h3 className="font-bold text-gray-900 mb-3">Current home</h3>
                <select
                    value={item.isMissing ? "TO_BE_FOUND" : item.locationCaregiverId ?? undefined}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                >
                    {caregivers.map((caregiver) => (
                        <option key={caregiver.id} value={caregiver.id}>
                            {caregiver.label}&apos;s Home
                        </option>
                    ))}
                    <option value="TO_BE_FOUND">To be found</option>
                </select>
                {updateMessage && (
                    <p className="text-xs text-gray-500 mt-2">{updateMessage}</p>
                )}
            </div>

            {/* Notes Section */}
            {item.notes && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4">
                    <h3 className="font-bold text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.notes}</p>
                </div>
            )}

            {/* Actions Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-4">
                {!item.isMissing ? (
                    <div className="space-y-3">
                        {/* Request Toggle */}
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                    Add to packing checklist
                                </span>
                                <button
                                    onClick={() => {
                                        const newValue = !isRequested;
                                        setIsRequested(newValue);
                                        updateItemRequested(item.id, newValue);
                                    }}
                                    className={`w-12 h-7 rounded-full transition-colors relative ${isRequested ? "bg-primary" : "bg-gray-300"
                                        }`}
                                    aria-pressed={isRequested}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isRequested ? "translate-x-5" : "translate-x-0"
                                            }`}
                                    />
                                </button>
                            </div>
                            {isRequested && (
                                <p className="text-xs text-gray-500 mt-2">
                                    This item will appear in the packing checklist.
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-gray-600 font-medium">
                            This item is currently in &apos;To be found&apos;.
                        </p>
                    </div>
                )}
            </div>

            {/* Missing Conversation Card */}
            {item.isMissing && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-4">
                    <h3 className="font-bold text-gray-900 mb-1">Missing conversation</h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Use this space to leave calm notes about where this item might be.
                    </p>

                    {/* Messages list */}
                    <div className="space-y-3 mb-4">
                        {getMissingMessagesForItem(item.id).length > 0 ? (
                            getMissingMessagesForItem(item.id).map((msg) => {
                                const authorProfile = caregivers.find(
                                    (c) => c.id === msg.authorCaregiverId
                                );
                                const authorName =
                                    msg.authorCaregiverId === "system"
                                        ? "System"
                                        : authorProfile?.label || "Someone";
                                const timeAgo = new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                });

                                return (
                                    <div
                                        key={msg.id}
                                        className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                                    >
                                        {/* Avatar */}
                                        {authorProfile ? (
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${authorProfile.avatarColor}`}
                                            >
                                                {authorProfile.avatarInitials}
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                                ?
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-900">
                                                    {authorName}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {timeAgo}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-snug">
                                                {msg.text}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-4">
                                No messages yet. You can leave a short note about what you checked.
                            </p>
                        )}
                    </div>

                    {/* New message input */}
                    <div className="space-y-3">
                        <textarea
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Example: Checked the small pocket, didn't see it."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (messageInput.trim()) {
                                        // Use current June location caregiver as author
                                        addMissingMessage({
                                            itemId: item.id,
                                            authorCaregiverId: currentJuneCaregiverId,
                                            text: messageInput.trim(),
                                        });
                                        setMessageInput("");
                                    }
                                }}
                                className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors shadow-sm active:scale-[0.98]"
                            >
                                Add note
                            </button>
                            <button
                                onClick={() => {
                                    markItemFound(item.id);
                                }}
                                className="flex-1 py-2.5 px-4 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors shadow-sm active:scale-[0.98]"
                            >
                                Mark as found
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
                <h3 className="font-bold text-gray-900 mb-4">History</h3>
                <div className="space-y-4">
                    {/* Ephemeral history entries */}
                    {extraHistoryEntries.map((entry, index) => (
                        <div key={`extra-${index}`} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                                {index < extraHistoryEntries.length - 1 && (
                                    <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                                )}
                            </div>
                            <div className="pb-2">
                                <p className="text-sm text-gray-900">{entry.text}</p>
                                <p className="text-xs text-gray-400">{entry.time}</p>
                            </div>
                        </div>
                    ))}

                    {/* Mocked history entries */}
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                            <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                        </div>
                        <div className="pb-2">
                            <p className="text-sm text-gray-900">Requested for next visit</p>
                            <p className="text-xs text-gray-400">Today</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                            <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                        </div>
                        <div className="pb-2">
                            <p className="text-sm text-gray-900">
                                Location changed to {locationLabel}
                            </p>
                            <p className="text-xs text-gray-400">1 day ago</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-900">Item created</p>
                            <p className="text-xs text-gray-400">2 days ago</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Button */}
            <div className="mt-8 mb-4 text-center">
                <button
                    onClick={handleDelete}
                    className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors py-2 px-4 rounded-lg hover:bg-red-50"
                >
                    Delete item
                </button>
            </div>
        </AppShell >
    );
}