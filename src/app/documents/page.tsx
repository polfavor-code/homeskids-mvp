"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import MobileSelect from "@/components/MobileSelect";
import { useAppState } from "@/lib/AppStateContext";
import { useDocuments, Document } from "@/lib/DocumentsContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { DocumentsIcon, IdDocIcon, SchoolIcon, HealthIcon } from "@/components/icons/DuotoneIcons";
import FileUploader from "@/components/FileUploader";
import FileViewerModal from "@/components/FileViewerModal";

const categoryColors: Record<string, { bg: string; text: string; badge: string }> = {
    id: { bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
    school: { bg: "bg-amber-50", text: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
    health: { bg: "bg-pink-50", text: "text-pink-600", badge: "bg-pink-100 text-pink-700" },
    travel: { bg: "bg-green-50", text: "text-green-600", badge: "bg-green-100 text-green-700" },
    legal: { bg: "bg-purple-50", text: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
    other: { bg: "bg-gray-50", text: "text-gray-600", badge: "bg-gray-100 text-gray-700" },
};

const categoryLabels: Record<string, string> = {
    id: "ID",
    school: "School",
    health: "Health",
    travel: "Travel",
    legal: "Legal",
    other: "Other",
};

export default function DocumentsPage() {
    useEnsureOnboarding();
    const { child, currentChild } = useAppState();
    const { documents, isLoaded, addDocument, deleteDocument, updateDocument, uploadFile, getFileUrl, getPinnedDocuments } = useDocuments();

    const activeChild = currentChild || child;
    const childName = activeChild?.name || "your child";

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
        category: "other" as Document["category"],
        description: "",
        expiryDate: "",
    });

    const pinnedDocuments = getPinnedDocuments();

    const resetForm = () => {
        setNewDocument({
            name: "",
            category: "other",
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
                category: newDocument.category,
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

    const handleTogglePin = async (doc: Document) => {
        await updateDocument(doc.id, { isPinned: !doc.isPinned });
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

    const getFileTypeLabel = (type?: string) => {
        if (!type) return null;
        if (type.includes("pdf")) return "PDF";
        if (type.startsWith("image/")) return "Image";
        return "File";
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
                    <h1 className="font-dmSerif text-2xl text-forest">{childName}&apos;s Documents</h1>
                    <p className="text-sm text-textSub mt-1">
                        A shared place for everything important for {childName}.
                    </p>
                </div>

                {/* Info Card */}
                <div className="card-organic p-5 bg-softGreen/30">
                    <div className="flex items-start gap-3">
                        <div className="text-forest mt-0.5">
                            <DocumentsIcon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-forest leading-relaxed">
                                Keep all of {childName}'s important documents in one secure place.
                                Passports, school forms, medical letters, insurance cards — everything
                                both parents need, accessible anytime.
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
                        <h2 className="font-bold text-forest text-lg">Add Document</h2>

                        <div className="space-y-4">
                            {/* File Upload */}
                            <FileUploader
                                onFileSelect={setSelectedFile}
                                currentFile={selectedFile ? { name: selectedFile.name, type: selectedFile.type } : null}
                                onRemove={() => setSelectedFile(null)}
                                label="Upload File"
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
                                    placeholder="e.g., Passport, Report Card, Insurance Card"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-1.5">
                                        Category
                                    </label>
                                    <MobileSelect
                                        value={newDocument.category}
                                        onChange={(value) => setNewDocument({ ...newDocument, category: value as Document["category"] })}
                                        options={[
                                            { value: "id", label: "ID & Identity" },
                                            { value: "school", label: "School" },
                                            { value: "health", label: "Health" },
                                            { value: "travel", label: "Travel" },
                                            { value: "legal", label: "Legal" },
                                            { value: "other", label: "Other" },
                                        ]}
                                        title="Select category"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-1.5">
                                        Expiry Date <span className="font-normal text-textSub">(optional)</span>
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
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Description / Notes
                                </label>
                                <textarea
                                    value={newDocument.description}
                                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                                    placeholder="e.g., Official copy, Stored in safe"
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

                {/* Pinned Documents Card */}
                {pinnedDocuments.length > 0 && (
                    <div className="card-organic p-5">
                        <h2 className="font-bold text-forest text-lg mb-4">Pinned Documents</h2>

                        <div className="space-y-3">
                            {pinnedDocuments.map((doc) => {
                                const colors = categoryColors[doc.category] || categoryColors.other;
                                return (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center gap-2 p-3 rounded-xl bg-cream/50 border border-border/30 min-w-0 ${doc.filePath ? "cursor-pointer hover:bg-cream/80 transition-colors" : ""}`}
                                        onClick={() => doc.filePath && handleOpenFile(doc)}
                                    >
                                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text} flex-shrink-0`}>
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
                                            <p className="text-xs text-textSub truncate">
                                                {getFileTypeLabel(doc.fileType) && <span className="mr-1">{getFileTypeLabel(doc.fileType)} •</span>}
                                                {doc.description || (doc.expiryDate ? `Expires ${formatDate(doc.expiryDate)}` : "No expiry")}
                                            </p>
                                        </div>
                                        <span className={`hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${colors.badge}`}>
                                            {categoryLabels[doc.category] || doc.category}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTogglePin(doc); }}
                                            className="text-amber-500 hover:text-amber-600 transition-colors p-1 flex-shrink-0"
                                            title="Unpin document"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                            className="text-textSub/50 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                                            title="Delete document"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                {/* All Documents */}
                {documents.filter(d => !d.isPinned).length > 0 && (
                    <div className="card-organic p-5">
                        <h2 className="font-bold text-forest text-lg mb-4">All Documents</h2>

                        <div className="space-y-3">
                            {documents.filter(d => !d.isPinned).map((doc) => {
                                const colors = categoryColors[doc.category] || categoryColors.other;
                                return (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center gap-2 p-3 rounded-xl bg-cream/50 border border-border/30 min-w-0 ${doc.filePath ? "cursor-pointer hover:bg-cream/80 transition-colors" : ""}`}
                                        onClick={() => doc.filePath && handleOpenFile(doc)}
                                    >
                                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text} flex-shrink-0`}>
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
                                            <p className="text-xs text-textSub truncate">
                                                {getFileTypeLabel(doc.fileType) && <span className="mr-1">{getFileTypeLabel(doc.fileType)} •</span>}
                                                {doc.description || (doc.expiryDate ? `Expires ${formatDate(doc.expiryDate)}` : "No expiry")}
                                            </p>
                                        </div>
                                        <span className={`hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${colors.badge}`}>
                                            {categoryLabels[doc.category] || doc.category}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTogglePin(doc); }}
                                            className="text-textSub/30 hover:text-amber-500 transition-colors p-1 flex-shrink-0"
                                            title="Pin document"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                            className="text-textSub/50 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                                            title="Delete document"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                {documents.length === 0 && !showAddForm && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-softGreen/50 flex items-center justify-center text-forest mx-auto mb-4">
                            <DocumentsIcon size={32} />
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No documents yet</h3>
                        <p className="text-sm text-textSub mb-4">
                            Add {childName}'s important documents to keep everything organized.
                        </p>
                    </div>
                )}

                {/* Document Categories */}
                <div className="card-organic p-5">
                    <h2 className="font-bold text-forest text-lg mb-4">Document Categories</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Important IDs */}
                        <Link
                            href="/documents/ids"
                            className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-105 transition-transform">
                                <IdDocIcon size={20} />
                            </div>
                            <h3 className="font-semibold text-forest text-sm">Important IDs</h3>
                            <p className="text-xs text-textSub mt-1">Passports, IDs, insurance</p>
                        </Link>

                        {/* School Docs */}
                        <Link
                            href="/documents/school"
                            className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 hover:border-amber-200 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3 group-hover:scale-105 transition-transform">
                                <SchoolIcon size={20} />
                            </div>
                            <h3 className="font-semibold text-forest text-sm">School Docs</h3>
                            <p className="text-xs text-textSub mt-1">Forms, reports, notes</p>
                        </Link>

                        {/* Health & Medical */}
                        <Link
                            href="/health"
                            className="p-4 rounded-xl bg-pink-50/50 border border-pink-100 hover:border-pink-200 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 mb-3 group-hover:scale-105 transition-transform">
                                <HealthIcon size={20} />
                            </div>
                            <h3 className="font-semibold text-forest text-sm">Health & Medical</h3>
                            <p className="text-xs text-textSub mt-1">Medical records, prescriptions</p>
                        </Link>
                    </div>
                </div>

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
                        Add document
                    </button>
                )}
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
