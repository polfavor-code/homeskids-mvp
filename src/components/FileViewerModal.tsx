"use client";

import React, { useEffect } from "react";

interface FileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string | null;
    fileType?: string;
    fileName?: string;
}

export default function FileViewerModal({
    isOpen,
    onClose,
    fileUrl,
    fileType,
    fileName,
}: FileViewerModalProps) {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !fileUrl) return null;

    const isPdf = fileType?.includes("pdf") || fileUrl.toLowerCase().includes(".pdf");
    const isImage = fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName || "download";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onClose}
        >
            {/* Modal Container */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h3 className="text-forest font-semibold text-lg truncate pr-4">
                        {fileName || "File"}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="p-2 text-textSub hover:text-forest hover:bg-cream rounded-lg transition-colors"
                            aria-label="Download"
                            title="Download"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-textSub hover:text-forest hover:bg-cream rounded-lg transition-colors"
                            aria-label="Close"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 overflow-auto bg-cream/30" style={{ maxHeight: "calc(85vh - 73px)" }}>
                    {isImage && (
                        <img
                            src={fileUrl}
                            alt={fileName || "Document"}
                            className="w-full h-auto rounded-xl object-contain shadow-sm"
                        />
                    )}

                    {isPdf && (
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm" style={{ height: "65vh" }}>
                            <iframe
                                src={fileUrl}
                                title={fileName || "PDF Document"}
                                className="w-full h-full"
                            />
                        </div>
                    )}

                    {!isImage && !isPdf && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                            </div>
                            <p className="text-forest font-medium mb-2">{fileName || "File"}</p>
                            <p className="text-sm text-textSub">This file type cannot be previewed</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
