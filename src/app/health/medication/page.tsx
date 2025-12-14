"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useAppState } from "@/lib/AppStateContextV2";
import { useHealth, Medication } from "@/lib/HealthContextV2";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { MedicationIcon } from "@/components/icons/DuotoneIcons";
import FileUploader from "@/components/FileUploader";
import FileViewerModal from "@/components/FileViewerModal";

export default function MedicationPage() {
    useEnsureOnboarding();
    const { child } = useAppState();
    const { medications, isLoaded, addMedication, deleteMedication, uploadFile, getFileUrl } = useHealth();
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
    const [newMedication, setNewMedication] = useState({
        name: "",
        dose: "",
        frequency: "",
        schedule: "",
        notes: "",
        isAsNeeded: false,
        isActive: true,
    });

    const resetForm = () => {
        setNewMedication({
            name: "",
            dose: "",
            frequency: "",
            schedule: "",
            notes: "",
            isAsNeeded: false,
            isActive: true,
        });
        setSelectedFile(null);
        setError("");
    };

    // Separate regular and as-needed medications
    const activeMedications = medications.filter((m) => m.isActive);
    const regularMedications = activeMedications.filter((m) => !m.isAsNeeded);
    const asNeededMedications = activeMedications.filter((m) => m.isAsNeeded);

    const handleAddMedication = async () => {
        if (!newMedication.name.trim()) {
            setError("Please enter a medication name");
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

            const result = await addMedication({
                name: newMedication.name.trim(),
                dose: newMedication.dose.trim() || undefined,
                frequency: newMedication.frequency.trim() || undefined,
                schedule: newMedication.schedule.trim() || undefined,
                notes: newMedication.notes.trim() || undefined,
                isAsNeeded: newMedication.isAsNeeded,
                isActive: true,
                filePath,
                fileType,
                fileSize,
            });

            if (result.success) {
                resetForm();
                setShowAddForm(false);
            } else {
                setError(result.error || "Failed to add medication");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this medication?")) return;
        await deleteMedication(id);
    };

    const handleOpenFile = async (med: Medication) => {
        if (!med.filePath) return;
        const url = await getFileUrl(med.filePath);
        if (url) {
            setViewerUrl(url);
            setViewerFileType(med.fileType);
            setViewerFileName(med.name);
            setViewerOpen(true);
        }
    };

    const handleCloseViewer = () => {
        setViewerOpen(false);
        setViewerUrl(null);
        setViewerFileType(undefined);
        setViewerFileName(undefined);
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
                href="/health"
                className="inline-flex items-center text-sm text-forest/70 hover:text-forest mb-4"
            >
                ← Health
            </Link>

            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-dmSerif text-forest">Medication</h1>
                    <p className="text-sm text-textSub mt-1">
                        List of medicines {childName} may need and how to use them.
                    </p>
                </div>

                {/* Info Card */}
                <div className="card-organic p-5 bg-blue-50/50">
                    <div className="flex items-start gap-3">
                        <div className="text-blue-600 mt-0.5">
                            <MedicationIcon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-forest leading-relaxed">
                                This page helps every caregiver give the right medicine at the right time.
                                Clear instructions mean less stress for everyone.
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

                {/* Add Medication Form */}
                {showAddForm && (
                    <div className="card-organic p-5 space-y-4">
                        <h2 className="font-bold text-forest text-lg">Add Medication</h2>

                        <div className="space-y-4">
                            {/* File Upload - Prescription or Photo */}
                            <FileUploader
                                onFileSelect={setSelectedFile}
                                currentFile={selectedFile ? { name: selectedFile.name, type: selectedFile.type } : null}
                                onRemove={() => setSelectedFile(null)}
                                label="Prescription or Photo (optional)"
                                hint="Upload a photo of the medication or prescription"
                            />

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Medication Name *
                                </label>
                                <input
                                    type="text"
                                    value={newMedication.name}
                                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    placeholder="e.g., Asthma inhaler, Vitamin D"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-1.5">
                                        Dose
                                    </label>
                                    <input
                                        type="text"
                                        value={newMedication.dose}
                                        onChange={(e) => setNewMedication({ ...newMedication, dose: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        placeholder="e.g., 5 ml, 2 puffs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-forest mb-1.5">
                                        Frequency
                                    </label>
                                    <input
                                        type="text"
                                        value={newMedication.frequency}
                                        onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        placeholder="e.g., Daily, Twice daily"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Schedule / When to give
                                </label>
                                <input
                                    type="text"
                                    value={newMedication.schedule}
                                    onChange={(e) => setNewMedication({ ...newMedication, schedule: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    placeholder="e.g., With breakfast, Before bed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-forest mb-1.5">
                                    Notes / Instructions
                                </label>
                                <textarea
                                    value={newMedication.notes}
                                    onChange={(e) => setNewMedication({ ...newMedication, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                                    placeholder="e.g., Use spacer with inhaler, Give with food"
                                />
                            </div>

                            {/* As Needed Toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setNewMedication({ ...newMedication, isAsNeeded: !newMedication.isAsNeeded })}
                                    className={`w-12 h-7 rounded-full transition-colors ${
                                        newMedication.isAsNeeded ? "bg-forest" : "bg-border"
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                                            newMedication.isAsNeeded ? "translate-x-6" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                                <label className="text-sm text-forest">
                                    As Needed (PRN) - only when symptoms occur
                                </label>
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
                                onClick={handleAddMedication}
                                disabled={saving}
                                className="btn-primary flex-1 disabled:opacity-50"
                            >
                                {saving ? "Uploading..." : "Add Medication"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Current Medication Card */}
                {regularMedications.length > 0 && (
                    <div className="card-organic p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-forest text-lg">Current Medication</h2>
                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                                {regularMedications.length} regular
                            </span>
                        </div>

                        <div className="space-y-3">
                            {regularMedications.map((med) => (
                                <div
                                    key={med.id}
                                    className={`flex items-start gap-3 p-4 rounded-xl bg-cream/50 border border-border/30 ${med.filePath ? "cursor-pointer hover:bg-cream/80 transition-colors" : ""}`}
                                    onClick={() => med.filePath && handleOpenFile(med)}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M8 12h8" />
                                            <path d="M12 8v8" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-forest">{med.name}</h3>
                                            {med.dose && (
                                                <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                                                    {med.dose}
                                                </span>
                                            )}
                                        </div>
                                        {(med.frequency || med.schedule) && (
                                            <p className="text-sm text-textSub mt-1">
                                                {[med.frequency, med.schedule].filter(Boolean).join(" • ")}
                                            </p>
                                        )}
                                        {med.notes && (
                                            <p className="text-sm text-forest mt-2 leading-relaxed">
                                                <strong>Notes:</strong> {med.notes}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(med.id); }}
                                        className="text-textSub/50 hover:text-red-500 transition-colors p-1"
                                        title="Delete medication"
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

                {/* As Needed Section */}
                {asNeededMedications.length > 0 && (
                    <div className="card-organic p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-forest text-lg">As Needed (PRN)</h2>
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                                {asNeededMedications.length} as needed
                            </span>
                        </div>

                        <div className="space-y-3">
                            {asNeededMedications.map((med) => (
                                <div
                                    key={med.id}
                                    className={`flex items-start gap-3 p-4 rounded-xl bg-green-50/50 border border-green-100 ${med.filePath ? "cursor-pointer hover:bg-green-50/80 transition-colors" : ""}`}
                                    onClick={() => med.filePath && handleOpenFile(med)}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M8 12h8" />
                                            <path d="M12 8v8" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-forest">{med.name}</h3>
                                            {med.dose && (
                                                <span className="text-xs text-green-700 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                                                    {med.dose}
                                                </span>
                                            )}
                                        </div>
                                        {(med.frequency || med.schedule) && (
                                            <p className="text-sm text-textSub mt-1">
                                                {[med.frequency, med.schedule].filter(Boolean).join(" • ")}
                                            </p>
                                        )}
                                        {med.notes && (
                                            <p className="text-sm text-forest mt-2 leading-relaxed">
                                                <strong>When:</strong> {med.notes}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(med.id); }}
                                        className="text-textSub/50 hover:text-red-500 transition-colors p-1"
                                        title="Delete medication"
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
                {medications.length === 0 && (
                    <div className="card-organic p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
                            <MedicationIcon size={32} />
                        </div>
                        <h3 className="font-bold text-forest text-lg mb-2">No medications recorded</h3>
                        <p className="text-sm text-textSub mb-4">
                            Add any medications {childName} takes so all caregivers know what to give and when.
                        </p>
                    </div>
                )}

                {/* Add Medication Button */}
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-forest/30 text-forest text-sm font-semibold hover:border-forest hover:bg-softGreen/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add medication
                    </button>
                )}

                {/* Helpful Notes */}
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
                            <p className="text-sm text-forest font-medium mb-1">Helpful Notes</p>
                            <p className="text-xs text-textSub leading-relaxed">
                                Soon you'll be able to set reminders, track doses given, and share updates between homes.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Future Features Note */}
                <div className="text-center py-4">
                    <p className="text-xs text-textSub">
                        Dose tracking and reminders coming soon.
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
