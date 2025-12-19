import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// API route to create notifications when items are added
// Called by the client after successfully adding items

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { childId, itemCount, itemNames } = body;

        if (!childId || !itemCount) {
            return NextResponse.json(
                { error: "Missing required fields: childId, itemCount" },
                { status: 400 }
            );
        }

        // Get authenticated user
        const cookieStore = await cookies();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    cookie: cookieStore.toString(),
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
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
        const title = "New items added";
        const itemWord = itemCount === 1 ? "item" : "items";
        let body = `${userName} added ${itemCount} ${itemWord}`;
        
        // Add item names if provided (up to 3)
        if (itemNames && itemNames.length > 0) {
            const displayNames = itemNames.slice(0, 3);
            if (itemNames.length > 3) {
                body = `${userName} added ${displayNames.join(", ")} and ${itemNames.length - 3} more`;
            } else {
                body = `${userName} added ${displayNames.join(", ")}`;
            }
        }

        body += ` for ${childName}`;

        // Create notifications for each caregiver
        const notifications = otherCaregivers.map((caregiver) => ({
            user_id: caregiver.user_id,
            title,
            body,
            url: "/items",
            tag: "items-added",
            data: {
                type: "items_added",
                childId,
                addedBy: user.id,
                itemCount,
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
        console.error("Notify items added error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
