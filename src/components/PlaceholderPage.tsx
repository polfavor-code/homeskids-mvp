import React, { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";

interface PlaceholderPageProps {
    title: string;
    icon?: ReactNode;
    joke: string;
    description: string;
    features: string[];
}

export default function PlaceholderPage({ title, icon, joke, description, features }: PlaceholderPageProps) {
    return (
        <AppShell>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="font-dmSerif text-2xl text-forest mt-2">{title}</h1>
                        <p className="text-sm text-textSub italic mt-1">{joke}</p>
                    </div>
                    <span className="px-3 py-1 bg-softGreen text-forest text-xs font-bold rounded-full mt-2">
                        Coming soon
                    </span>
                </div>

                {/* Main Content Card */}
                <div className="card-organic p-6 space-y-4">
                    <p className="text-forest leading-relaxed">{description}</p>

                    <div className="pt-2">
                        <h3 className="font-bold text-forest mb-3">What you'll be able to do here:</h3>
                        <ul className="space-y-2">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <span className="text-terracotta mt-1 flex-shrink-0">•</span>
                                    <span className="text-textSub text-sm">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="text-center py-4">
                    <p className="text-xs text-textSub">
                        Please leave feedback, but later I need my feet back! 🦶
                    </p>
                </div>
            </div>
        </AppShell>
    );
}
