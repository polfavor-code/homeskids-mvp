-- ============================================
-- PUSH NOTIFICATIONS V2
-- Event-driven via Supabase Database Webhooks
-- ============================================
-- 
-- SETUP STEPS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Configure Database Webhook in Supabase Dashboard:
--    - Go to Database > Webhooks
--    - Create new webhook:
--      - Name: push-notification-sender
--      - Table: notification_queue
--      - Events: INSERT
--      - URL: https://your-domain.vercel.app/api/push/send
--      - Headers: x-webhook-secret: YOUR_SUPABASE_WEBHOOK_SECRET
--
-- ============================================

-- Drop old tables if they exist (clean slate)
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- ============================================
-- A) PUSH_SUBSCRIPTIONS TABLE
-- ============================================
-- Stores Web Push subscriptions for each user/device

CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    platform TEXT CHECK (platform IN ('ios', 'android', 'desktop', 'unknown')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user_active 
    ON push_subscriptions(user_id, is_active) 
    WHERE is_active = true;

CREATE INDEX idx_push_subscriptions_endpoint 
    ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
    ON push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
    ON push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
    ON push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscription_timestamp();

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;

-- Comments
COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions per user/device';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL (unique per subscription)';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'P-256 ECDH public key for payload encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for encryption';
COMMENT ON COLUMN push_subscriptions.platform IS 'Device platform: ios, android, desktop, or unknown';
COMMENT ON COLUMN push_subscriptions.is_active IS 'False when user disables or subscription expires';
COMMENT ON COLUMN push_subscriptions.last_seen_at IS 'Last time this subscription was used successfully';

-- ============================================
-- B) NOTIFICATION_QUEUE TABLE
-- ============================================
-- Queue for outgoing push notifications
-- Supabase webhook triggers on INSERT to send immediately

CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    icon TEXT,
    tag TEXT,
    data JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notification_queue_status_created 
    ON notification_queue(status, created_at) 
    WHERE status = 'pending';

CREATE INDEX idx_notification_queue_user_status 
    ON notification_queue(user_id, status);

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies: 
-- - Service role can do everything (for webhook processing)
-- - Users can view their own notifications (for in-app notification center)
CREATE POLICY "Users can view own notifications"
    ON notification_queue FOR SELECT
    USING (auth.uid() = user_id);

-- Inserts happen via service role from server-side code
-- But allow authenticated users to insert for their own notifications if needed
CREATE POLICY "Authenticated can insert"
    ON notification_queue FOR INSERT
    WITH CHECK (true);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON notification_queue TO authenticated;

-- Comments
COMMENT ON TABLE notification_queue IS 'Queue for push notifications - webhook triggers on INSERT';
COMMENT ON COLUMN notification_queue.status IS 'pending -> processing -> sent/failed';
COMMENT ON COLUMN notification_queue.tag IS 'Optional: allows notification collapsing on device';
COMMENT ON COLUMN notification_queue.data IS 'Extra JSON payload delivered to service worker';
COMMENT ON COLUMN notification_queue.attempts IS 'Number of send attempts (max 5)';

-- ============================================
-- C) HELPER FUNCTION: Create notification
-- ============================================
-- Server-side function to queue a notification

CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_url TEXT DEFAULT NULL,
    p_tag TEXT DEFAULT NULL,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Only create if user has active push subscriptions
    IF EXISTS (
        SELECT 1 FROM push_subscriptions 
        WHERE user_id = p_user_id AND is_active = true
    ) THEN
        INSERT INTO notification_queue (user_id, title, body, url, tag, data)
        VALUES (p_user_id, p_title, p_body, p_url, p_tag, p_data)
        RETURNING id INTO v_notification_id;
        
        RETURN v_notification_id;
    END IF;
    
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

COMMENT ON FUNCTION create_notification IS 'Queue a push notification for a user (only if they have active subscriptions)';

-- ============================================
-- D) WEBHOOK CONFIGURATION NOTES
-- ============================================
-- 
-- After running this SQL, configure the Supabase Database Webhook:
--
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Click "Create a new webhook"
-- 3. Configure:
--    - Name: push-notification-sender
--    - Table: notification_queue
--    - Events: INSERT
--    - Type: HTTP Request
--    - Method: POST
--    - URL: https://YOUR_VERCEL_DOMAIN/api/push/send
--    - Headers:
--      - x-webhook-secret: YOUR_SECRET_VALUE
--      - Content-Type: application/json
--
-- 4. Save the webhook
--
-- The webhook will automatically POST the new row data whenever
-- a notification is inserted, triggering immediate push delivery.
--
-- ============================================
