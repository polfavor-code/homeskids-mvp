import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create admin client with service role key (bypasses RLS)
// Lazy initialization to avoid build errors when env var is not set
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
        }

        supabaseAdmin = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return supabaseAdmin;
}

export async function POST(request: NextRequest) {
    try {
        const admin = getSupabaseAdmin();

        const { userId, newEmail } = await request.json();

        if (!userId || !newEmail) {
            return NextResponse.json(
                { error: "Missing userId or newEmail" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        const normalizedEmail = newEmail.toLowerCase();

        // Check if email is already in use by another user
        const { data: existingUser } = await admin
            .from("profiles")
            .select("id")
            .eq("email", normalizedEmail)
            .neq("id", userId)
            .maybeSingle();

        if (existingUser) {
            return NextResponse.json(
                { error: "This email is already in use" },
                { status: 400 }
            );
        }

        // Update auth user email using admin API (no verification required)
        const { data: authData, error: authError } = await admin.auth.admin.updateUserById(
            userId,
            { email: normalizedEmail }
        );

        if (authError) {
            console.error("Auth update error:", authError);
            return NextResponse.json(
                { error: authError.message },
                { status: 500 }
            );
        }

        // Update profiles table
        const { error: profileError } = await admin
            .from("profiles")
            .update({ email: normalizedEmail })
            .eq("id", userId);

        if (profileError) {
            console.error("Profile update error:", profileError);
            // Auth was updated but profile failed - try to log but don't fail
        }

        return NextResponse.json({
            success: true,
            email: normalizedEmail,
        });
    } catch (error: any) {
        console.error("Update email error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update email" },
            { status: 500 }
        );
    }
}
