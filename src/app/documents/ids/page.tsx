"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useDocuments, Document } from "@/lib/DocumentsContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { IdDocIcon } from "@/components/icons/DuotoneIcons";
import FileUploader from "@/components/FileUploader";
import FileViewerModal from "@/components/FileViewerModal";

export default function ImportantIDsPage() {
    useEnsureOnboarding();
    const { child } = useAppState();
    const { isLoaded, addDocument, deleteDocument, uploadFile, getFileUrl, getDocumentsByCategory } = useDocuments();
    const childName = child?.name || "your child";

    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Modal state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerFileType, setViewerFileType] = useState<string | undefined>();
    const [viewerFileName, setViewerFileName] = useState<string | undefined>();

    // Form state
    const [newDocument, setNewDocument] = useState({
        name: "",
        description: "",
        expiryDate: "",
    });

    // Get only ID documents
    const idDocuments = getDocumentsByCategory("id");

    const resetForm = () => {
        setNewDocument({
            name: "",
            description: "",
            expiryDate: "",
        });
        setSelectedFile(null);
        setError("");
    };

    const handleAddDocument = async () => {
        if (!newDocument.name.trim()) {
            setError("Please enter a document name");
            return;
        }

        setSaving(true);
        setError("");

        try {
            let filePath: string | undefined;
            let fileType: string | undefined;
            let fileSize: number | undefined;

            // Upload file if selected
            if (selectedFile) {
                const uploadResult = await uploadFile(selectedFile);
                if (!uploadResult.success) {
                    setError(uploadResult.error || "Failed to upload file");
                    setSaving(false);
                    return;
                }
                filePath = uploadResult.path;
                fileType = selectedFile.type;
                fileSize = selectedFile.size;
            }

            const result = await addDocument({
                name: newDocument.name.trim(),
                category: "id",
                description: newDocument.description.trim() || undefined,
                expiryDate: newDocument.expiryDate || undefined,
                filePath,
                fileType,
                fileSize,
                isPinned: false,
            });

            if (result.success) {
                resetForm();
                setShowAddForm(false);
            } else {
                setError(result.error || "Failed to add document");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;
        await deleteDocument(id);
    };

    const handleOpenFile = async (doc: Document) => {
        if (!doc.filePath) return;
        const url = await getFileUrl(doc.filePath);
        if (url) {
            setViewerUrl(url);
            setViewerFileType(doc.fileType);
            setViewerFileName(doc.name);
            setViewerOpen(true);
        }
    };

    const handleCloseViewer = () => {
        setViewerOpen(false);
        setViewerUrl(null);
        setViewerFileType(undefined);
        setViewerFileName(undefined);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    };

    const isExpiringSoon = (dateStr?: string) => {
        if (!dateStr) return false;
        const expiry = new Date(dateStr);
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        return expiry <= threeMonths && expiry > new Date();
    };

    const isExpired = (dateStr?: string) => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    };

    if (!isLoaded) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Important IDs</h1>
                    <p className="text-sm text-textSub mt-1">
                        Keep {childName}'s identity documents in one safe place.
                    </p>
                </div>

                {/* Info Card */}
                <div className="card-organic p-5 bg-blue-50/50">
                    <div className="flex items-start gap-3">
                        <div className="text-blue-600 mt-0.5">
                            <IdDocIcon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-forest leading-relaxed">
                                Identity documents are essential for travel, school registration, medical emergencies,
                                and everyday life. Having them organized means you're always prepared.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Add Document Form */}
                {showAddForm && (
                    <div className="card-organic p-5 space-y-4">
                        <h2 className="font-bold text-forest text-lg">Add ID Document</h2>

                        <div className="space-y-4">
                            {/* File Upload */}
                            <FileUploader
                                onFileSelect={setSelectedFile}
                                currentFile={selectedFile ? { name: selectedFile.name, type: selectedFile.type } : null}
                                onRemove={() => setSelectedFile(null)}
                                label="Upload Scan or Photo"
                                hint="PDF, JPG, PNG up to 10MB"
                            />

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Document Name *
                                </label>
                                <input
                                    type="text"
                                    value={newDocument.name}
                                    onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    placeholder="e.g., Passport, Birth Certificate, Insurance Card"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    value={newDocument.expiryDate}
                                    onChange={(e) => setNewDocument({ ...newDocument, expiryDate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    value={newDocument.description}
                                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                                    placeholder="e.g., Official copy, ID number: XXX-XXX"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => { setShowAddForm(false); resetForm(); }}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddDocument}
                                disabled={saving}
                                className="btn-primary flex-1 disabled:opacity-50"
                            >
                                {saving ? "Uploading..." : "Add Document"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ID Documents List */}
                {idDocuments.length > 0 && (
                    <div className="card-organic p-5">
                        <h2 className="font-bold text-forest text-lg mb-4">Identity Documents</h2>

                        <div className="space-y-3">
                            {idDocuments.map((doc) => {
                                const expired = isExpired(doc.expiryDate);
                                const expiringSoon = isExpiringSoon(doc.expiryDate);

                                return (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center gap-4 p-4 rounded-xl border ${
                                            expired ? "bg-red-50/50 border-red-200" :
                                            expiringSoon ? "bg-amber-50/50 border-amber-200" :
                                            "bg-cream/50 border-border/30"
                                        } ${doc.filePath ? "cursor-pointer hover:bg-cream/80 transition-colors" : ""}`}
                                        onClick={() => doc.filePath && handleOpenFile(doc)}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            expired ? "bg-red-100 text-red-600" :
                                            expiringSoon ? "bg-amber-100 text-amber-600" :
                                            "bg-blue-100 text-blue-600"
                                        }`}>
                                            {doc.fileType?.startsWith("image/") ? (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <polyline points="21 15 16 10 5 21" />
                                                </svg>
                                            ) : (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                    <circle cx="12" cy="10" r="3" />
                                                    <path d="M7 18v-1a5 5 0 0 1 10 0v1" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-forest">{doc.name}</h3>
                                            <p className="text-sm text-textSub">
                                                {doc.expiryDate ? (
                                                    expired ? (
                                                        <span className="text-red-600 font-medium">Expired {formatDate(doc.expiryDate)}</span>
                                                    ) : expiringSoon ? (
                                                        <span className="text-amber-600 font-medium">Expires {formatDate(doc.expiryDate)}</span>
                                                    ) : (
                                                        `Expires ${formatDate(doc.expiryDate)}`
                                                    )
                                                ) : doc.description || "No expiry date"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                            className="text-textSub/50 hover:text-red-500 transition-colors p-2"
                                            title="Delete document"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {idDocuments.length === 0 && !showAddForm && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
                            <IdDocIcon size={32} />
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No ID documents yet</h3>
                        <p className="text-sm text-textSub mb-4">
                            Add {childName}'s passports, birth certificates, and insurance cards.
                        </p>
                    </div>
                )}

                {/* Add Document Button */}
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-forest/30 text-forest text-sm font-semibold hover:border-forest hover:bg-softGreen/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add ID document
                    </button>
                )}

                {/* Future Features Note */}
                <div className="card-organic p-4 bg-softGreen/30">
                    <div className="flex items-start gap-3">
                        <div className="text-forest mt-0.5">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-forest font-medium mb-1">Coming Soon</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Expiry reminders and secure sharing with co-parents.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* File Viewer Modal */}
            <FileViewerModal
                isOpen={viewerOpen}
                onClose={handleCloseViewer}
                fileUrl={viewerUrl}
                fileType={viewerFileType}
                fileName={viewerFileName}
            />
        </AppShell>
    );
}
