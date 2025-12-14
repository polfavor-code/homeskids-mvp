import type { Metadata, Viewport } from "next";
import { ItemsProvider } from "@/lib/ItemsContextV2";
import { AppStateProvider } from "@/lib/AppStateContextV2";
import { AuthProvider } from "@/lib/AuthContext";
import { ContactsProvider } from "@/lib/ContactsContextV2";
import { HealthProvider } from "@/lib/HealthContextV2";
import { DocumentsProvider } from "@/lib/DocumentsContextV2";
import { TravelBagProvider } from "@/lib/TravelBagContext";
import { ItemsAddedAlertProvider } from "@/lib/ItemsAddedAlertContext";
import { ItemsAddedToastContainer } from "@/components/ItemsAddedToast";
import { HomeSwitchAlertProvider } from "@/lib/HomeSwitchAlertContext";
import { HomeSwitchToastContainer } from "@/components/HomeSwitchToast";
import { DocumentAddedAlertProvider } from "@/lib/DocumentAddedAlertContext";
import { DocumentAddedToastContainer } from "@/components/DocumentAddedToast";
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
                        <ItemsProvider>
                            <ItemsAddedAlertProvider>
                                <HomeSwitchAlertProvider>
                                    <TravelBagProvider>
                                        <ContactsProvider>
                                            <HealthProvider>
                                                <DocumentsProvider>
                                                    <DocumentAddedAlertProvider>
                                                        {children}
                                                        <ItemsAddedToastContainer />
                                                        <HomeSwitchToastContainer />
                                                        <DocumentAddedToastContainer />
                                                    </DocumentAddedAlertProvider>
                                                </DocumentsProvider>
                                            </HealthProvider>
                                        </ContactsProvider>
                                    </TravelBagProvider>
                                </HomeSwitchAlertProvider>
                            </ItemsAddedAlertProvider>
                        </ItemsProvider>
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
