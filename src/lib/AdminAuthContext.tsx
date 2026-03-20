"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
import { User, Session } from "@supabase/supabase-js";

interface AdminAuthContextType {
    user: User | null;
    session: Session | null;
    isAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
    checkAdminStatus: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkAdminStatus = async (): Promise<boolean> => {
        if (!user) return false;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Error checking admin status:", error);
                return false;
            }

            const adminStatus = data?.is_admin === true;
            setIsAdmin(adminStatus);
            return adminStatus;
        } catch (err) {
            console.error("Failed to check admin status:", err);
            return false;
        }
    };

    useEffect(() => {
        // Get initial session
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);

            // Check admin status if user is logged in
            if (session?.user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", session.user.id)
                    .single();

                setIsAdmin(data?.is_admin === true);
            }

            setLoading(false);
        };

        initSession();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", session.user.id)
                    .single();

                setIsAdmin(data?.is_admin === true);
            } else {
                setIsAdmin(false);
            }

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
    };

    return (
        <AdminAuthContext.Provider value={{ user, session, isAdmin, loading, signOut, checkAdminStatus }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
}
