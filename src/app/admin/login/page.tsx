"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Check if already logged in as admin
    useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                // Check if user is admin
                const { data } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", session.user.id)
                    .single();

                if (data?.is_admin === true) {
                    router.push("/admin");
                    return;
                }
            }
            setCheckingAuth(false);
        };

        checkExistingSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setError("");
        setLoading(true);

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            // Check if user is admin
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", authData.user?.id)
                .single();

            if (profileError) {
                setError("Error checking admin status.");
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            if (profileData?.is_admin !== true) {
                setError("Access denied. You are not an administrator.");
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            router.push("/admin");
        } catch (err) {
            setError("An unexpected error occurred.");
            console.error(err);
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-forest border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Admin Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex-col items-center justify-center p-12 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Logo size="lg" variant="light" />
                </div>

                <p className="text-lg opacity-90 mt-4 mb-8">
                    Admin Dashboard
                </p>

                <div className="max-w-sm p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <h3 className="font-semibold mb-3">Admin Access Only</h3>
                    <p className="text-white/80 text-sm">
                        This area is restricted to system administrators.
                        You must have admin privileges to access this dashboard.
                    </p>
                </div>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-sm">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Admin Dashboard</p>
                    </div>

                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 bg-forest/10 text-forest text-xs font-semibold rounded-full mb-3">
                            ADMIN
                        </span>
                        <h2 className="font-dmSerif text-2xl text-forest">
                            Administrator Login
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-forest mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-all"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-forest/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Authenticating..." : "Access Admin Panel"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
