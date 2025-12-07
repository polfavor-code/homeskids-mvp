"use client";

import React, { useState, useRef } from "react";

interface FileUploaderProps {
    onFileSelect: (file: File) => void;
    accept?: string; // e.g., "image/*,application/pdf"
    maxSizeMB?: number;
    currentFile?: {
        name: string;
        type?: string;
        url?: string;
    } | null;
    onRemove?: () => void;
    disabled?: boolean;
    label?: string;
    hint?: string;
}

export default function FileUploader({
    onFileSelect,
    accept = "image/*,application/pdf",
    maxSizeMB = 10,
    currentFile,
    onRemove,
    disabled = false,
    label = "Upload file",
    hint = "PDF, JPG, PNG up to 10MB",
}: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        setError("");

        // Check file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
            return;
        }

        // Create preview for images
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }

        onFileSelect(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        setError("");
        if (inputRef.current) {
            inputRef.current.value = "";
        }
        if (onRemove) {
            onRemove();
        }
    };

    const getFileIcon = (type?: string) => {
        if (type?.startsWith("image/")) {
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
            );
        }
        if (type === "application/pdf") {
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            );
        }
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        );
    };

    // Show current file or preview
    const showPreview = preview || currentFile?.url;
    const showFileInfo = currentFile && !preview;

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-semibold text-forest">
                    {label}
                </label>
            )}

            {/* File Preview */}
            {(showPreview || showFileInfo) && (
                <div className="relative rounded-xl border border-border bg-cream/50 p-3">
                    <div className="flex items-center gap-3">
                        {/* Thumbnail or Icon */}
                        {showPreview && (preview || currentFile?.url)?.startsWith("data:image") || currentFile?.type?.startsWith("image/") ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-border flex-shrink-0">
                                <img
                                    src={preview || currentFile?.url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                {getFileIcon(currentFile?.type)}
                            </div>
                        )}

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-forest text-sm truncate">
                                {currentFile?.name || "Selected file"}
                            </p>
                            <p className="text-xs text-textSub">
                                {currentFile?.type?.includes("pdf") ? "PDF Document" :
                                 currentFile?.type?.startsWith("image/") ? "Image" : "File"}
                            </p>
                        </div>

                        {/* Remove Button */}
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="p-2 text-textSub hover:text-red-500 transition-colors"
                            title="Remove file"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Area */}
            {!showPreview && !showFileInfo && (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative rounded-xl border-2 border-dashed transition-colors ${
                        dragActive
                            ? "border-forest bg-softGreen/20"
                            : "border-border hover:border-forest/50"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleChange}
                        disabled={disabled}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />

                    <div className="flex flex-col items-center justify-center py-8 px-4">
                        <div className="w-12 h-12 rounded-full bg-softGreen/50 flex items-center justify-center text-forest mb-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-forest mb-1">
                            {dragActive ? "Drop file here" : "Click or drag to upload"}
                        </p>
                        <p className="text-xs text-textSub">{hint}</p>
                    </div>
                </div>
            )}

            {/* Change File Button (when file is selected) */}
            {(showPreview || showFileInfo) && (
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleChange}
                        disabled={disabled}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <button
                        type="button"
                        className="w-full py-2 text-sm text-forest font-medium hover:text-teal transition-colors"
                    >
                        Change file
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}
