import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:info@homes.kids";

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// Types
interface NotificationRow {
    id: string;
    user_id: string;
    title: string;
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, any>;
    status: string;
    attempts: number;
}

interface PushSubscription {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}

// Max attempts before marking as failed
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
    try {
        // Verify webhook secret
        const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
        const providedSecret = request.headers.get("x-webhook-secret");

        if (webhookSecret && providedSecret !== webhookSecret) {
            console.error("Invalid webhook secret");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check VAPID configuration
        if (!vapidPublicKey || !vapidPrivateKey) {
            console.error("VAPID keys not configured");
            return NextResponse.json(
                { error: "Push notifications not configured" },
                { status: 500 }
            );
        }

        // Parse webhook payload
        // Supabase webhooks send: { type, table, record, schema, old_record }
        const payload = await request.json();
        
        // Extract the notification record
        // Handle both direct record and webhook format
        const notification: NotificationRow = payload.record || payload;

        if (!notification.id || !notification.user_id || !notification.title) {
            console.error("Invalid notification payload:", payload);
            return NextResponse.json(
                { error: "Invalid payload" },
                { status: 400 }
            );
        }

        // Initialize Supabase admin client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Idempotency check: only process pending notifications
        // Atomically update status to 'processing' if still pending
        const { data: updated, error: updateError } = await supabaseAdmin
            .from("notification_queue")
            .update({ 
                status: "processing",
                attempts: notification.attempts + 1 
            })
            .eq("id", notification.id)
            .eq("status", "pending")
            .select()
            .single();

        if (updateError || !updated) {
            // Already processed or doesn't exist
            console.log("Notification already processed or not found:", notification.id);
            return NextResponse.json({ 
                success: true, 
                skipped: true,
                reason: "Already processed or not pending"
            });
        }

        // Check max attempts
        if (updated.attempts > MAX_ATTEMPTS) {
            await supabaseAdmin
                .from("notification_queue")
                .update({ 
                    status: "failed",
                    last_error: "Max attempts exceeded",
                    processed_at: new Date().toISOString()
                })
                .eq("id", notification.id);

            return NextResponse.json({ 
                success: false, 
                error: "Max attempts exceeded" 
            });
        }

        // Get active subscriptions for the user
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", notification.user_id)
            .eq("is_active", true);

        if (subError) {
            console.error("Error fetching subscriptions:", subError);
            await markFailed(supabaseAdmin, notification.id, "Failed to fetch subscriptions");
            return NextResponse.json(
                { error: "Failed to fetch subscriptions" },
                { status: 500 }
            );
        }

        if (!subscriptions || subscriptions.length === 0) {
            // No active subscriptions, mark as sent (nothing to do)
            await supabaseAdmin
                .from("notification_queue")
                .update({ 
                    status: "sent",
                    processed_at: new Date().toISOString(),
                    last_error: "No active subscriptions"
                })
                .eq("id", notification.id);

            return NextResponse.json({ 
                success: true, 
                sent: 0,
                reason: "No active subscriptions"
            });
        }

        // Prepare push payload
        const pushPayload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            url: notification.url || "/",
            icon: notification.icon || "/icons/icon-192.png",
            tag: notification.tag,
            data: notification.data || {},
        });

        // Send to all subscriptions
        const results = await Promise.allSettled(
            subscriptions.map(async (sub: PushSubscription) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth,
                            },
                        },
                        pushPayload
                    );

                    // Update last_seen_at on successful send
                    await supabaseAdmin
                        .from("push_subscriptions")
                        .update({ last_seen_at: new Date().toISOString() })
                        .eq("id", sub.id);

                    return { success: true, endpoint: sub.endpoint };
                } catch (error: any) {
                    console.error("Push send error:", error.statusCode, error.body);

                    // Handle subscription gone (410) or not found (404)
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Deactivate this subscription
                        await supabaseAdmin
                            .from("push_subscriptions")
                            .update({ is_active: false })
                            .eq("id", sub.id);

                        return { 
                            success: false, 
                            endpoint: sub.endpoint, 
                            expired: true,
                            error: "Subscription expired"
                        };
                    }

                    return { 
                        success: false, 
                        endpoint: sub.endpoint, 
                        error: error.message || "Send failed"
                    };
                }
            })
        );

        // Count results
        const successful = results.filter(
            (r) => r.status === "fulfilled" && r.value.success
        ).length;
        const failed = results.filter(
            (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
        ).length;
        const expired = results.filter(
            (r) => r.status === "fulfilled" && !r.value.success && r.value.expired
        ).length;

        // Determine final status
        const allFailed = successful === 0 && failed > 0;
        const lastError = allFailed
            ? `All ${failed} subscriptions failed (${expired} expired)`
            : null;

        // Update notification status
        await supabaseAdmin
            .from("notification_queue")
            .update({
                status: allFailed ? "failed" : "sent",
                processed_at: new Date().toISOString(),
                last_error: lastError,
            })
            .eq("id", notification.id);

        return NextResponse.json({
            success: !allFailed,
            notification_id: notification.id,
            sent: successful,
            failed,
            expired,
            total: subscriptions.length,
        });
    } catch (error: any) {
        console.error("Push send error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// Helper to mark notification as failed
async function markFailed(
    supabase: ReturnType<typeof createClient>,
    notificationId: string,
    error: string
) {
    await supabase
        .from("notification_queue")
        .update({
            status: "failed",
            last_error: error,
            processed_at: new Date().toISOString(),
        })
        .eq("id", notificationId);
}
