"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';
import AdminNav from './components/AdminNav';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && mounted) {
            // Allow access to login and debug pages without full admin auth
            if (pathname === '/admin/login' || pathname === '/admin/debug') {
                return;
            }

            // Redirect to login if not authenticated or not admin
            if (!user || !isAdmin) {
                router.push('/admin/login');
            }
        }
    }, [user, isAdmin, loading, mounted, pathname, router]);

    // Don't render anything until mounted (prevents hydration mismatch)
    if (!mounted) {
        return null;
    }

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-forest border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-textSub text-sm">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    // Login page has its own layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Debug page - show with sidebar if logged in, standalone if not
    if (pathname === '/admin/debug') {
        if (user) {
            return (
                <div className="flex min-h-screen bg-cream">
                    <AdminNav />
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            );
        }
        return <>{children}</>;
    }

    // Redirect if not admin
    if (!user || !isAdmin) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-forest border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-textSub text-sm">Redirecting...</p>
                </div>
            </div>
        );
    }

    // Admin layout with sidebar
    return (
        <div className="flex min-h-screen bg-cream">
            <AdminNav />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminAuthProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminAuthProvider>
    );
}
