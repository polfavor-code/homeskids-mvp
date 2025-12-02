"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function InvitePage() {
    const params = useParams();
    const token = params.token as string;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                            👋
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            You've been invited to homes.kids
                        </h1>
                        <p className="text-sm text-gray-600">
                            Join a family to help track their child's belongings across homes.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Link
                            href="/login"
                            className="block w-full px-6 py-3 bg-primary text-white text-center rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Log in to existing account
                        </Link>
                        <Link
                            href="/register"
                            className="block w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 text-center rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Create account and join
                        </Link>
                    </div>

                    <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 text-center">
                            Invite token: <code className="text-gray-700">{token}</code>
                        </p>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            (TODO: Wire real invite acceptance logic)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
