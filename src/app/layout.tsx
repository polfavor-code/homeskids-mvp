import type { Metadata, Viewport } from "next";
import { ItemsProvider } from "@/lib/ItemsContext";
import { AppStateProvider } from "@/lib/AppStateContext";
import { AuthProvider } from "@/lib/AuthContext";
import "../styles/globals.css";
import Script from "next/script";

export const metadata: Metadata = {
    title: "homes.kids",
    description: "Everything your child needs between homes.",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: "/icons/icon-192.png",
        apple: "/icons/icon-192.png",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "homes.kids",
    },
};

export const viewport: Viewport = {
    themeColor: "#4A90E2",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

/**
 * Root layout component that wraps the application content with authentication, application state, and items providers and registers a service worker.
 *
 * @param children - The content to render inside the provider tree.
 * @returns The root HTML element containing the body with the provider hierarchy and an inline service worker registration script.
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <AppStateProvider>
                        <ItemsProvider>{children}</ItemsProvider>
                    </AppStateProvider>
                </AuthProvider>
                <Script id="register-sw" strategy="afterInteractive">
                    {`
                        if ('serviceWorker' in navigator) {
                            window.addEventListener('load', () => {
                                navigator.serviceWorker.register('/sw.js').catch(() => {});
                            });
                        }
                    `}
                </Script>
            </body>
        </html>
    );
}