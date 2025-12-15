import type { Metadata, Viewport } from "next";
import { ItemsProvider } from "@/lib/ItemsContext";
import { AppStateProvider } from "@/lib/AppStateContext";
import { AuthProvider } from "@/lib/AuthContext";
import { ContactsProvider } from "@/lib/ContactsContext";
import { HealthProvider } from "@/lib/HealthContext";
import { DocumentsProvider } from "@/lib/DocumentsContext";
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
    appleWebApp: {
        statusBarStyle: "default",
        title: "homes.kids",
    },
    openGraph: {
        title: "homes.kids",
        description: "Everything your child needs between homes.",
        siteName: "homes.kids",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "homes.kids",
        description: "Everything your child needs between homes.",
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
