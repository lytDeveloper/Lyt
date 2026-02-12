-- Add image_url column to server_notifications table
ALTER TABLE server_notifications ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update the type check constraint to include 'advertisement'
ALTER TABLE server_notifications DROP CONSTRAINT IF EXISTS server_notifications_type_check;
ALTER TABLE server_notifications ADD CONSTRAINT server_notifications_type_check 
  CHECK (type IN ('announcement', 'version_update', 'maintenance', 'advertisement'));

-- Update the view active_notifications (usually this view selects * so it might update automatically, but good to recreate to be sure)
CREATE OR REPLACE VIEW active_notifications AS
SELECT *
FROM server_notifications
WHERE is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now());
