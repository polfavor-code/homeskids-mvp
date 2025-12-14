"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import MobileSelect from "@/components/MobileSelect";
import ImageCropper from "@/components/ImageCropper";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import Avatar from "@/components/Avatar";
import ItemPhoto from "@/components/ItemPhoto";
import { supabase } from "@/lib/supabase";
import { processImageForUpload, generateImagePaths } from "@/lib/imageUtils";

const CATEGORIES = [
    "Clothing",
    "Toys",
    "School stuff",
    "Sports",
    "Musical instruments",
    "Medicine",
    "Electronics",
    "Other",
];

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
        updateItemName,
        updateItemNotes,
        updateItemCategory,
        updateItemPhoto,
        updateItem,
        getMissingMessagesForItem,
        addMissingMessage,
        markItemFound,
        deleteItem,
    } = useItems();
    const router = useRouter();
    const { caregivers, homes, currentJuneCaregiverId, currentHomeId, child } = useAppState();
    const item = items.find((i) => i.id === params.itemId);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const [messageInput, setMessageInput] = useState("");

    // State for name editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(item?.name || "");

    // State for notes editing
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editedNotes, setEditedNotes] = useState(item?.notes || "");

    // State for category editing
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [editedCategory, setEditedCategory] = useState(item?.category || "");

    // State for photo upload
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // State for origin editing
    const [isEditingOrigin, setIsEditingOrigin] = useState(false);
    const [editedOriginHomeId, setEditedOriginHomeId] = useState(item?.originHomeId || "");

    // Image cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string>("");

    const handleSaveName = async () => {
        if (!item || !editedName.trim()) return;
        try {
            await updateItemName(item.id, editedName.trim());
            setIsEditingName(false);
        } catch (error) {
            alert("Failed to update name");
        }
    };

    const handleSaveNotes = async () => {
        if (!item) return;
        try {
            await updateItemNotes(item.id, editedNotes.trim());
            setIsEditingNotes(false);
        } catch (error) {
            alert("Failed to update notes");
        }
    };

    const handleSaveCategory = async () => {
        if (!item || !editedCategory) return;
        try {
            await updateItemCategory(item.id, editedCategory);
            setIsEditingCategory(false);
        } catch (error) {
            alert("Failed to update category");
        }
    };

    const handleSaveOrigin = async () => {
        if (!item) return;
        try {
            await updateItem(item.id, { originHomeId: editedOriginHomeId || null });
            setIsEditingOrigin(false);
        } catch (error) {
            alert("Failed to update origin");
        }
    };

    const handleClearOrigin = async () => {
        if (!item) return;
        try {
            await updateItem(item.id, { originHomeId: null, originUserId: null });
            setEditedOriginHomeId("");
            setIsEditingOrigin(false);
        } catch (error) {
            alert("Failed to clear origin");
        }
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImageToCrop(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCroppedPhoto = async (croppedBlob: Blob) => {
        if (!item) return;

        setShowCropper(false);
        setImageToCrop("");
        setUploadingPhoto(true);

        try {
            // Get user's family ID for family-folder structure
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                throw new Error("Please log in to upload photos.");
            }

            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", session.user.id)
                .single();

            if (!familyMember) {
                throw new Error("No family found. Please complete onboarding.");
            }

            // Convert blob to file
            const file = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" });

            // Process image: create original and display versions
            const processed = await processImageForUpload(file);
            const paths = generateImagePaths(familyMember.family_id, file.name);

            console.log("[Image Upload] Original size:", processed.originalWidth, "x", processed.originalHeight);
            console.log("[Image Upload] Needs resize:", processed.needsResize);

            // Upload original (full resolution)
            const { error: originalError } = await supabase.storage
                .from("item-photos")
                .upload(paths.originalPath, processed.original, {
                    cacheControl: "31536000", // 1 year cache for originals
                    upsert: false,
                });

            if (originalError) throw originalError;

            let finalPhotoPath = paths.originalPath;

            // Upload display version (max 1024px) - only if different from original
            if (processed.needsResize) {
                const { error: displayError } = await supabase.storage
                    .from("item-photos")
                    .upload(paths.displayPath, processed.display, {
                        cacheControl: "3600", // 1 hour cache for display
                        upsert: false,
                    });

                if (displayError) {
                    console.error("Display upload error:", displayError);
                    // Continue anyway - we have the original
                } else {
                    finalPhotoPath = paths.displayPath;
                }
            }

            // Store the path for UI usage
            await updateItemPhoto(item.id, finalPhotoPath);
        } catch (error) {
            console.error("Error uploading photo:", error);
            alert("Failed to upload photo");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!item || !item.photoUrl) return;

        if (!window.confirm("Remove this photo?")) return;

        try {
            // Delete from storage
            await supabase.storage.from("item-photos").remove([item.photoUrl]);
            // Update item
            await updateItemPhoto(item.id, null);
        } catch (error) {
            console.error("Error removing photo:", error);
            alert("Failed to remove photo");
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

    // Derived data - prefer home-based location, fallback to caregiver
    const itemHome = homes.find((h) => h.id === item.locationHomeId);
    const caregiver = caregivers.find(
        (c) => c.id === item.locationCaregiverId
    );
    const locationLabel = item.isMissing
        ? "Missing"
        : itemHome
            ? itemHome.name
            : caregiver
                ? `${caregiver.label}'s Home`
                : "Unknown Location";

    // Determine status pill - only show one
    let statusPill = null;
    if (item.isMissing) {
        statusPill = (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                Missing
            </span>
        );
    } else if (isRequested) {
        statusPill = (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Requested
            </span>
        );
    }

    // Handler for location change - now uses homes instead of caregivers
    const handleLocationChange = (value: string) => {
        if (value === "TO_BE_FOUND") {
            updateItemLocation(item.id, { toBeFound: true });
            setUpdateMessage("Marked as 'Missing'.");
            setExtraHistoryEntries((prev) => [
                { text: "Marked as 'Missing'", time: "Just now" },
                ...prev,
            ]);
        } else {
            const selectedHome = homes.find((h) => h.id === value);
            if (selectedHome) {
                updateItemLocation(item.id, { homeId: value });
                setUpdateMessage(
                    `Location updated to ${selectedHome.name}.`
                );
                setExtraHistoryEntries((prev) => [
                    {
                        text: `Location changed to ${selectedHome.name}`,
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

            {/* Header & Hero with Full-Width Image */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 mb-4 overflow-hidden">
                {/* Full-width Image/Placeholder */}
                <div className="relative w-full aspect-[4/3] bg-gray-100">
                    {item.photoUrl ? (
                        <ItemPhoto
                            photoPath={item.photoUrl}
                            itemName={item.name}
                            className="w-full h-full object-cover"
                            useOriginal={true}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-8xl font-bold text-gray-300">
                            {item.name.charAt(0)}
                        </div>
                    )}

                    {/* Photo actions overlay */}
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-forest text-sm font-medium rounded-lg shadow-sm hover:bg-white transition-colors disabled:opacity-50"
                        >
                            {uploadingPhoto ? "Uploading..." : item.photoUrl ? "Change photo" : "Add photo"}
                        </button>
                        {item.photoUrl && (
                            <button
                                onClick={handleRemovePhoto}
                                className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-red-600 text-sm font-medium rounded-lg shadow-sm hover:bg-white transition-colors"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>

                {/* Image Cropper Modal */}
                {showCropper && imageToCrop && (
                    <ImageCropper
                        imageSrc={imageToCrop}
                        onCropComplete={handleCroppedPhoto}
                        onCancel={() => {
                            setShowCropper(false);
                            setImageToCrop("");
                        }}
                        aspectRatio={4 / 3}
                        cropShape="rect"
                    />
                )}

                {/* Item Info */}
                <div className="p-6 text-center">
                    {statusPill && <div className="mb-3">{statusPill}</div>}

                    {isEditingName ? (
                        <div className="flex items-center justify-center gap-2 mb-2">
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
                        <div className="flex items-center justify-center gap-2 mb-2">
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

                    {/* Editable Category */}
                    {isEditingCategory ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-40">
                                <MobileSelect
                                    value={editedCategory}
                                    onChange={setEditedCategory}
                                    options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                                    title="Select category"
                                />
                            </div>
                            <button
                                onClick={handleSaveCategory}
                                className="p-1 text-green-600 hover:text-green-700 bg-green-50 rounded-full w-6 h-6 flex items-center justify-center text-sm"
                            >
                                ✓
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditingCategory(false);
                                    setEditedCategory(item.category || "");
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full w-6 h-6 flex items-center justify-center text-sm"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <p
                            className="text-gray-500 font-medium cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-1"
                            onClick={() => {
                                setEditedCategory(item.category || "");
                                setIsEditingCategory(true);
                            }}
                        >
                            {item.category || "Uncategorized"} · {locationLabel}
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </p>
                    )}
                </div>
            </div>

            {/* Current Home Section */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4">
                <h3 className="font-bold text-gray-900 mb-3">Current home</h3>
                <MobileSelect
                    value={item.isMissing ? "TO_BE_FOUND" : (item.locationHomeId ?? item.locationCaregiverId ?? "")}
                    onChange={handleLocationChange}
                    options={[
                        ...homes.map((home) => ({ value: home.id, label: home.name })),
                        { value: "TO_BE_FOUND", label: "Missing" }
                    ]}
                    title="Select home"
                />
                {updateMessage && (
                    <p className="text-xs text-gray-500 mt-2">{updateMessage}</p>
                )}
            </div>

            {/* Notes Section - Always show, editable */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">Notes</h3>
                    {!isEditingNotes && (
                        <button
                            onClick={() => {
                                setEditedNotes(item.notes || "");
                                setIsEditingNotes(true);
                            }}
                            className="text-sm text-primary hover:text-teal transition-colors"
                        >
                            {item.notes ? "Edit" : "Add notes"}
                        </button>
                    )}
                </div>

                {isEditingNotes ? (
                    <div className="space-y-2">
                        <textarea
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            placeholder="Add notes about this item..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveNotes}
                                className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditingNotes(false);
                                    setEditedNotes(item.notes || "");
                                }}
                                className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {item.notes || <span className="text-gray-400 italic">No notes added</span>}
                    </p>
                )}
            </div>

            {/* Origin Section - "Originally from X's home" */}
            {(item.originHomeId || item.originUserId) && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Origin</h3>
                        {!isEditingOrigin && (
                            <button
                                onClick={() => {
                                    setEditedOriginHomeId(item.originHomeId || "");
                                    setIsEditingOrigin(true);
                                }}
                                className="text-sm text-primary hover:text-teal transition-colors"
                            >
                                Change
                            </button>
                        )}
                    </div>

                    {isEditingOrigin ? (
                        <div className="space-y-2">
                            <MobileSelect
                                value={editedOriginHomeId}
                                onChange={setEditedOriginHomeId}
                                options={[
                                    { value: "", label: "No origin specified" },
                                    ...homes.map((home) => ({
                                        value: home.id,
                                        label: home.name
                                    })),
                                ]}
                                placeholder="Select origin home"
                                title="Where did this item originally come from?"
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleSaveOrigin}
                                    className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleClearOrigin}
                                    className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Clear origin
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingOrigin(false);
                                        setEditedOriginHomeId(item.originHomeId || "");
                                    }}
                                    className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                This helps coordinate where items should go back to when children move between homes.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-700">
                            {(() => {
                                const originHome = homes.find(h => h.id === item.originHomeId);
                                if (originHome) {
                                    return `Originally from ${originHome.name}`;
                                }
                                // Fallback to user if no home but user is set
                                if (item.originUserId) {
                                    const originUser = caregivers.find(c => c.id === item.originUserId);
                                    if (originUser) {
                                        return `Originally from ${originUser.label}'s home`;
                                    }
                                }
                                return <span className="text-gray-400 italic">Origin not specified</span>;
                            })()}
                        </p>
                    )}
                </div>
            )}

            {/* Actions Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-4">
                {!item.isMissing ? (
                    <div className="space-y-3">
                        {/* Request Toggle */}
                        {(() => {
                            // Determine if item is at current home or another home
                            const itemHome = homes.find(h => h.id === item.locationHomeId);
                            const isAtCurrentHome = item.locationHomeId === currentHomeId;
                            const itemHomeName = itemHome?.name || "another home";

                            // Dynamic label and description
                            const toggleLabel = isAtCurrentHome
                                ? "Include in current packing list"
                                : `Request from ${itemHomeName}`;

                            const toggleDescription = isAtCurrentHome
                                ? "This item will appear in the travel bag checklist."
                                : `This item will be added to the packing list when ${child?.name || "your child"} moves to ${itemHomeName}.`;

                            return (
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">
                                            {toggleLabel}
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
                                    <p className="text-xs text-gray-500 mt-2">
                                        {toggleDescription}
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-gray-600 font-medium">
                            This item is currently marked as &apos;Missing&apos;.
                        </p>
                    </div>
                )}
            </div>

            {/* Pending Request Info Badge */}
            {item.isRequestedForNextVisit && item.locationHomeId !== currentHomeId && !item.isMissing && (() => {
                const itemHome = homes.find(h => h.id === item.locationHomeId);
                const itemHomeName = itemHome?.name || "another home";
                return (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                        <p className="text-sm text-amber-800">
                            <strong>Pending request:</strong> This item will appear in {itemHomeName}&apos;s packing list when {child?.name || "your child"} moves there.
                        </p>
                    </div>
                );
            })()}

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
                                        <Avatar
                                            src={authorProfile?.avatarUrl}
                                            initial={authorProfile?.avatarInitials}
                                            emoji="👤"
                                            size={32}
                                            bgColor={authorProfile ? "#2C3E2D" : "#9CA3AF"}
                                        />

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

                    {/* Added to packing list - only show if requested */}
                    {item.isRequestedForNextVisit && item.requestedBy && (() => {
                        const currentUserCg = caregivers.find(c => c.isCurrentUser);
                        const requester = caregivers.find(c => c.id === item.requestedBy);
                        const requesterName = requester?.label || requester?.name;

                        // Format the requested timestamp
                        const requestedTime = item.requestedAt
                            ? new Date(item.requestedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: new Date(item.requestedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })
                            : "Recently";

                        // If current user added it to their own packing list
                        if (currentUserCg && item.requestedBy === currentUserCg.id) {
                            return (
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                                        <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                                    </div>
                                    <div className="pb-2">
                                        <p className="text-sm text-gray-900">Added to packing list</p>
                                        <p className="text-xs text-gray-400">{requestedTime}</p>
                                    </div>
                                </div>
                            );
                        }

                        // Someone else requested it - show who (with fallback for missing caregiver data)
                        const displayName = requesterName || "someone";
                        if (!requesterName && item.requestedBy) {
                            console.warn(`Data integrity: Caregiver lookup failed for requestedBy ID: ${item.requestedBy}`);
                        }
                        return (
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                                    <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                                </div>
                                <div className="pb-2">
                                    <p className="text-sm text-gray-900">Requested by {displayName}</p>
                                    <p className="text-xs text-gray-400">{requestedTime}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Item created */}
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-900">
                                Item created
                                {item.createdBy && (() => {
                                    const creator = caregivers.find(c => c.id === item.createdBy);
                                    return creator ? ` by ${creator.label || creator.name}` : "";
                                })()}
                            </p>
                            <p className="text-xs text-gray-400">
                                {item.createdAt
                                    ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: new Date(item.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                      })
                                    : "Unknown date"}
                            </p>
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
