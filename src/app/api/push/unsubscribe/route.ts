import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json(
                { error: "Missing required field: endpoint" },
                { status: 400 }
            );
        }

        // Get authenticated user via Authorization header
        const authHeader = request.headers.get("authorization");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error("Missing Supabase env vars:", { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
        }

        const accessToken = authHeader.replace("Bearer ", "");

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        });

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use admin client for database operations (bypasses RLS)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Soft-delete: set is_active to false
        // This preserves the record for debugging but prevents notifications
        const { error: updateError } = await supabaseAdmin
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("endpoint", endpoint)
            .eq("user_id", user.id);

        if (updateError) {
            console.error("Error deactivating subscription:", updateError);
            return NextResponse.json(
                { error: "Failed to unsubscribe" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Unsubscribe error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
