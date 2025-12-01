"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Item, MOCK_ITEMS } from "@/lib/mockData";

export type MissingMessage = {
    id: string;
    itemId: string;
    authorCaregiverId: string; // or "system"
    text: string;
    createdAt: string; // ISO string
};

interface ItemsContextType {
    items: Item[];
    addItem: (item: Item) => void;
    updateItemLocation: (
        itemId: string,
        newLocation: { caregiverId?: string; toBeFound?: boolean }
    ) => void;
    updateItemRequested: (itemId: string, requested: boolean) => void;
    missingMessages: MissingMessage[];
    addMissingMessage: (message: {
        itemId: string;
        authorCaregiverId: string;
        text: string;
    }) => void;
    getMissingMessagesForItem: (itemId: string) => MissingMessage[];
    markItemFound: (itemId: string) => void;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Item[]>(MOCK_ITEMS);
    const [missingMessages, setMissingMessages] = useState<MissingMessage[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem("homeskids_items_v1");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.items) setItems(parsed.items);
                if (parsed.missingMessages) setMissingMessages(parsed.missingMessages);
            }
        } catch (error) {
            console.error("Failed to load items:", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (!isLoaded) return;
        try {
            const stateToSave = {
                items,
                missingMessages,
            };
            localStorage.setItem("homeskids_items_v1", JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save items:", error);
        }
    }, [items, missingMessages, isLoaded]);

    const addItem = (newItem: Item) => {
        setItems((prev) => [newItem, ...prev]);
    };

    const updateItemLocation = (
        itemId: string,
        newLocation: { caregiverId?: string; toBeFound?: boolean }
    ) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;

                if (newLocation.toBeFound) {
                    // Set to "To be found"
                    return {
                        ...item,
                        isMissing: true,
                        isRequestedForNextVisit: false,
                        isPacked: false,
                    };
                } else if (newLocation.caregiverId) {
                    // Move to specific caregiver's home
                    return {
                        ...item,
                        locationCaregiverId: newLocation.caregiverId,
                        isMissing: false,
                        isRequestedForNextVisit: false,
                        isPacked: false,
                    };
                }

                return item;
            })
        );
    };

    const updateItemRequested = (itemId: string, requested: boolean) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;
                return {
                    ...item,
                    isRequestedForNextVisit: requested,
                };
            })
        );
    };

    const addMissingMessage = (message: {
        itemId: string;
        authorCaregiverId: string;
        text: string;
    }) => {
        const newMessage: MissingMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            itemId: message.itemId,
            authorCaregiverId: message.authorCaregiverId,
            text: message.text,
            createdAt: new Date().toISOString(),
        };
        setMissingMessages((prev) => [...prev, newMessage]);
    };

    const getMissingMessagesForItem = (itemId: string): MissingMessage[] => {
        return missingMessages.filter((msg) => msg.itemId === itemId);
    };

    const markItemFound = (itemId: string) => {
        // Clear missing state
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;
                return {
                    ...item,
                    isMissing: false,
                };
            })
        );

        // Add system message
        addMissingMessage({
            itemId,
            authorCaregiverId: "system",
            text: "Marked as found",
        });
    };

    return (
        <ItemsContext.Provider
            value={{
                items,
                addItem,
                updateItemLocation,
                updateItemRequested,
                missingMessages,
                addMissingMessage,
                getMissingMessagesForItem,
                markItemFound,
            }}
        >
            {children}
        </ItemsContext.Provider>
    );
}

export function useItems() {
    const context = useContext(ItemsContext);
    if (context === undefined) {
        throw new Error("useItems must be used within an ItemsProvider");
    }
    return context;
}
