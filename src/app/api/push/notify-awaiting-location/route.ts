import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// API route to create notifications when an item is marked as "awaiting location"
// Called by the client after marking an item as lost/missing

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { childId, itemId, itemName } = body;

        if (!childId || !itemId || !itemName) {
            return NextResponse.json(
                { error: "Missing required fields: childId, itemId, itemName" },
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

        // Get admin client for cross-user operations
        const supabaseAdmin = createClient(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get user's name
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("name, label")
            .eq("id", user.id)
            .single();

        const userName = profile?.label || profile?.name?.split(" ")[0] || "Someone";

        // Get child's name
        const { data: child } = await supabaseAdmin
            .from("children")
            .select("name")
            .eq("id", childId)
            .single();

        const childName = child?.name || "your child";

        // Get all other caregivers with access to this child
        const { data: otherCaregivers, error: caregiversError } = await supabaseAdmin
            .from("child_access")
            .select("user_id")
            .eq("child_id", childId)
            .neq("user_id", user.id);

        if (caregiversError) {
            console.error("Error fetching caregivers:", caregiversError);
            return NextResponse.json(
                { error: "Failed to fetch caregivers" },
                { status: 500 }
            );
        }

        if (!otherCaregivers || otherCaregivers.length === 0) {
            // No other caregivers to notify
            return NextResponse.json({ success: true, notified: 0 });
        }

        // Build notification content
        const title = "📍 Item needs location";
        const messageBody = `${userName} marked "${itemName}" as awaiting location for ${childName}`;

        // Create notifications for each caregiver
        const notifications = otherCaregivers.map((caregiver) => ({
            user_id: caregiver.user_id,
            title,
            body: messageBody,
            url: "/items",
            tag: "awaiting-location",
            data: {
                type: "awaiting_location",
                childId,
                itemId,
                itemName,
                markedBy: user.id,
            },
        }));

        // Insert all notifications (webhook will send them)
        const { error: insertError } = await supabaseAdmin
            .from("notification_queue")
            .insert(notifications);

        if (insertError) {
            console.error("Error inserting notifications:", insertError);
            return NextResponse.json(
                { error: "Failed to create notifications" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            notified: otherCaregivers.length,
        });
    } catch (error: any) {
        console.error("Notify awaiting location error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
