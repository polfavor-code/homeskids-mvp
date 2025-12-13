"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session immediately
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        };

        initSession();

        // Subscribe to auth changes for subsequent updates
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event:", event);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // When user confirms email change, sync the new email to profiles table
            if (event === "USER_UPDATED" && session?.user?.email) {
                try {
                    const { error } = await supabase
                        .from("profiles")
                        .update({ email: session.user.email.toLowerCase() })
                        .eq("id", session.user.id);

                    if (error) {
                        console.error("Error syncing profile email:", error);
                    } else {
                        console.log("Profile email synced to:", session.user.email);
                    }
                } catch (err) {
                    console.error("Failed to sync profile email:", err);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
