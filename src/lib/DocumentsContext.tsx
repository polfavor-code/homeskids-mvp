"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";

// ==============================================
// V2 DOCUMENTS CONTEXT - Documents per child_v2
// ==============================================

// Types
export interface Document {
    id: string;
    name: string;
    category: "id" | "school" | "health" | "travel" | "legal" | "other";
    filePath?: string;
    fileType?: string;
    fileSize?: number;
    description?: string;
    expiryDate?: string;
    isPinned: boolean;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

interface DocumentsContextType {
    documents: Document[];
    isLoaded: boolean;
    addDocument: (document: Omit<Document, "id" | "createdAt" | "updatedAt">) => Promise<{ success: boolean; error?: string; document?: Document }>;
    updateDocument: (id: string, updates: Partial<Omit<Document, "id" | "createdAt" | "updatedAt">>) => Promise<{ success: boolean; error?: string }>;
    deleteDocument: (id: string) => Promise<{ success: boolean; error?: string }>;
    uploadFile: (file: File) => Promise<{ success: boolean; path?: string; error?: string }>;
    getFileUrl: (path: string) => Promise<string | null>;
    refreshData: () => Promise<void>;
    // Helpers
    getPinnedDocuments: () => Document[];
    getDocumentsByCategory: (category: Document["category"]) => Document[];
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export function DocumentsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { currentChildId } = useAppState();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const sessionUser = session?.user;

            if (!sessionUser || !currentChildId) {
                setDocuments([]);
                setIsLoaded(true);
                return;
            }

            // Fetch documents for the currently selected child
            const { data: documentsData } = await supabase
                .from("documents")
                .select("*")
                .eq("child_id", currentChildId)
                .order("is_pinned", { ascending: false })
                .order("created_at", { ascending: false });

            if (documentsData) {
                const mappedDocuments: Document[] = documentsData.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    category: d.category,
                    filePath: d.file_path,
                    fileType: d.file_type,
                    fileSize: d.file_size,
                    description: d.description,
                    expiryDate: d.expiry_date,
                    isPinned: d.is_pinned,
                    tags: d.tags,
                    createdAt: d.created_at,
                    updatedAt: d.updated_at,
                }));
                setDocuments(mappedDocuments);
            } else {
                setDocuments([]);
            }
        } catch (error) {
            console.error("Failed to load documents:", error);
        } finally {
            setIsLoaded(true);
        }
    }, [currentChildId]);

    // Fetch documents when child changes or on mount
    useEffect(() => {
        setIsLoaded(false);
        fetchData();
    }, [fetchData]);

    // Also listen to auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            setIsLoaded(false);
            fetchData();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchData]);

    const uploadFile = async (file: File): Promise<{ success: boolean; path?: string; error?: string }> => {
        if (!currentChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${currentChildId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error } = await supabase.storage
                .from("documents")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (error) throw error;

            return { success: true, path: fileName };
        } catch (error: any) {
            console.error("Failed to upload file:", error);
            return { success: false, error: error.message };
        }
    };

    const getFileUrl = async (path: string): Promise<string | null> => {
        try {
            const { data } = await supabase.storage
                .from("documents")
                .createSignedUrl(path, 3600); // 1 hour expiry

            return data?.signedUrl || null;
        } catch (error) {
            console.error("Failed to get file URL:", error);
            return null;
        }
    };

    const addDocument = async (document: Omit<Document, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string; document?: Document }> => {
        if (!currentChildId) {
            return { success: false, error: "No child selected" };
        }

        try {
            const { data, error } = await supabase
                .from("documents")
                .insert({
                    child_id: currentChildId,
                    name: document.name,
                    category: document.category,
                    file_path: document.filePath,
                    file_type: document.fileType,
                    file_size: document.fileSize,
                    description: document.description,
                    expiry_date: document.expiryDate,
                    is_pinned: document.isPinned,
                    tags: document.tags,
                    created_by: user?.id || null,
                })
                .select()
                .single();

            if (error) throw error;

            const newDocument: Document = {
                id: data.id,
                name: data.name,
                category: data.category,
                filePath: data.file_path,
                fileType: data.file_type,
                fileSize: data.file_size,
                description: data.description,
                expiryDate: data.expiry_date,
                isPinned: data.is_pinned,
                tags: data.tags,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setDocuments((prev) => [newDocument, ...prev]);
            return { success: true, document: newDocument };
        } catch (error: any) {
            console.error("Failed to add document:", error);
            return { success: false, error: error.message };
        }
    };

    const updateDocument = async (id: string, updates: Partial<Omit<Document, "id" | "createdAt" | "updatedAt">>): Promise<{ success: boolean; error?: string }> => {
        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.category !== undefined) dbUpdates.category = updates.category;
            if (updates.filePath !== undefined) dbUpdates.file_path = updates.filePath;
            if (updates.fileType !== undefined) dbUpdates.file_type = updates.fileType;
            if (updates.fileSize !== undefined) dbUpdates.file_size = updates.fileSize;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate;
            if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
            if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

            const { error } = await supabase
                .from("documents")
                .update(dbUpdates)
                .eq("id", id);

            if (error) throw error;

            setDocuments((prev) =>
                prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
            );
            return { success: true };
        } catch (error: any) {
            console.error("Failed to update document:", error);
            return { success: false, error: error.message };
        }
    };

    const deleteDocument = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Get the document to delete its file too
            const doc = documents.find((d) => d.id === id);

            const { error } = await supabase
                .from("documents")
                .delete()
                .eq("id", id);

            if (error) throw error;

            // Delete the file from storage if it exists
            if (doc?.filePath) {
                await supabase.storage.from("documents").remove([doc.filePath]);
            }

            setDocuments((prev) => prev.filter((d) => d.id !== id));
            return { success: true };
        } catch (error: any) {
            console.error("Failed to delete document:", error);
            return { success: false, error: error.message };
        }
    };

    const refreshData = async () => {
        setIsLoaded(false);
        await fetchData();
    };

    const getPinnedDocuments = () => {
        return documents.filter((d) => d.isPinned);
    };

    const getDocumentsByCategory = (category: Document["category"]) => {
        return documents.filter((d) => d.category === category);
    };

    return (
        <DocumentsContext.Provider
            value={{
                documents,
                isLoaded,
                addDocument,
                updateDocument,
                deleteDocument,
                uploadFile,
                getFileUrl,
                refreshData,
                getPinnedDocuments,
                getDocumentsByCategory,
            }}
        >
            {children}
        </DocumentsContext.Provider>
    );
}

export function useDocuments() {
    const context = useContext(DocumentsContext);
    if (context === undefined) {
        throw new Error("useDocuments must be used within a DocumentsProvider");
    }
    return context;
}
