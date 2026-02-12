-- ============================================================================
-- BridgeApp Push Notification Support (Phase 4 Prep)
-- Schema for User Push Tokens
-- ============================================================================

-- 1. Create user_push_tokens table
CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "token" text NOT NULL, -- Expo Push Token (e.g., ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx])
    "device_type" text, -- 'ios', 'android', 'web'
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE ("user_id", "token") -- Prevent duplicate tokens for same user
);

-- Enable RLS
ALTER TABLE "public"."user_push_tokens" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own push tokens"
    ON "public"."user_push_tokens"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
    ON "public"."user_push_tokens"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
    ON "public"."user_push_tokens"
    FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_push_tokens_modtime
    BEFORE UPDATE ON user_push_tokens
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 3. (Optional) Create a function to cleanup invalid tokens
-- This can be called by Edge Function when Expo returns 'DeviceNotRegistered'
-- CREATE OR REPLACE FUNCTION delete_invalid_push_token(token_to_delete text)
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM user_push_tokens WHERE token = token_to_delete;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

