import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { endpoint, p256dh, auth, platform } = body;

        // Validate required fields
        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json(
                { error: "Missing required fields: endpoint, p256dh, auth" },
                { status: 400 }
            );
        }

        // Get authenticated user via Authorization header (Bearer token)
        const authHeader = request.headers.get("authorization");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
        }

        const accessToken = authHeader.replace("Bearer ", "");

        // Create Supabase client with the user's token
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

        // Validate platform
        const validPlatform = ["ios", "android", "desktop", "unknown"].includes(platform)
            ? platform
            : "unknown";

        // Use admin client for database operations (bypasses RLS)
        const supabaseAdmin = createClient(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Upsert subscription (update if endpoint exists, insert if new)
        const { error: upsertError } = await supabaseAdmin
            .from("push_subscriptions")
            .upsert(
                {
                    user_id: user.id,
                    endpoint,
                    p256dh,
                    auth,
                    platform: validPlatform,
                    user_agent: request.headers.get("user-agent") || null,
                    is_active: true,
                    last_seen_at: new Date().toISOString(),
                },
                {
                    onConflict: "endpoint",
                }
            );

        if (upsertError) {
            console.error("Error upserting subscription:", upsertError);
            return NextResponse.json(
                { error: "Failed to save subscription" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Subscribe error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
