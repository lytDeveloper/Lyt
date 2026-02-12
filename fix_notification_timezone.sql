-- Fix timezone issue in user_notifications table
-- The problem: timezone('utc'::text, now()) converts current time to UTC wall-clock time,
-- then adds +09:00 offset, resulting in 9 hours behind
-- The solution: Use now() directly, which stores proper UTC timestamp

ALTER TABLE "public"."user_notifications" 
ALTER COLUMN "created_at" SET DEFAULT now();

-- Note: This only affects NEW notifications.
-- Existing notifications with wrong timestamps cannot be automatically fixed
-- because we don't know the original intended time.
