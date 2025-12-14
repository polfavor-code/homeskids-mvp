"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContext";
import { useDocuments, Document } from "@/lib/DocumentsContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { SchoolIcon } from "@/components/icons/DuotoneIcons";
import FileUploader from "@/components/FileUploader";
import FileViewerModal from "@/components/FileViewerModal";

export default function SchoolDocsPage() {
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

    // Get only school documents
    const schoolDocuments = getDocumentsByCategory("school");

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
                category: "school",
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
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
            {/* Back Link */}
            <Link
                href="/documents"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Documents
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">School Documents</h1>
                    <p className="text-sm text-textSub mt-1">
                        Store {childName}'s school forms, report cards, and notes.
                    </p>
                </div>

                {/* Info Card */}
                <div className="card-organic p-5 bg-amber-50/50">
                    <div className="flex items-start gap-3">
                        <div className="text-amber-600 mt-0.5">
                            <SchoolIcon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-forest leading-relaxed">
                                Keep all school paperwork in one place so both parents stay informed.
                                Permission slips, report cards, teacher notes — everything you need for
                                parent-teacher conferences and school events.
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
                        <h2 className="font-bold text-forest text-lg">Add School Document</h2>

                        <div className="space-y-4">
                            {/* File Upload */}
                            <FileUploader
                                onFileSelect={setSelectedFile}
                                currentFile={selectedFile ? { name: selectedFile.name, type: selectedFile.type } : null}
                                onRemove={() => setSelectedFile(null)}
                                label="Upload File or Photo"
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
                                    placeholder="e.g., Report Card, Field Trip Permission, Photo Consent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Due Date / Date <span className="font-normal text-textSub">(optional)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={newDocument.expiryDate}
                                        onChange={(e) => setNewDocument({ ...newDocument, expiryDate: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 ${newDocument.expiryDate ? 'text-forest' : 'text-textSub'}`}
                                    />
                                    {newDocument.expiryDate && (
                                        <button
                                            type="button"
                                            onClick={() => setNewDocument({ ...newDocument, expiryDate: "" })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-textSub hover:text-forest transition-colors"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
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
                                    placeholder="e.g., Signed by Mom, Spring 2024"
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

                {/* School Documents List */}
                {schoolDocuments.length > 0 && (
                    <div className="card-organic p-5">
                        <h2 className="font-bold text-forest text-lg mb-4">School Documents</h2>

                        <div className="space-y-3">
                            {schoolDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl bg-cream/50 border border-border/30 ${doc.filePath ? "cursor-pointer hover:bg-cream/80 transition-colors" : ""}`}
                                    onClick={() => doc.filePath && handleOpenFile(doc)}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                        {doc.fileType?.startsWith("image/") ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-forest text-sm truncate">{doc.name}</h3>
                                        <p className="text-xs text-textSub">
                                            {doc.description || (doc.expiryDate ? formatDate(doc.expiryDate) : "No date")}
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
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {schoolDocuments.length === 0 && !showAddForm && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
                            <SchoolIcon size={32} />
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No school documents yet</h3>
                        <p className="text-sm text-textSub mb-4">
                            Add {childName}'s report cards, permission slips, and teacher notes.
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
                        Add school document
                    </button>
                )}

                {/* Future Features Note */}
                <div className="text-center py-4">
                    <p className="text-xs text-textSub">
                        Deadline tracking and sharing coming soon.
                    </p>
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
