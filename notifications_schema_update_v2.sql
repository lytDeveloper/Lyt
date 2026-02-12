-- Migration to support multiple images for advertisement notifications
ALTER TABLE server_notifications ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Migrate existing single image_url to image_urls array
UPDATE server_notifications 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND image_urls = '{}';

-- Drop the old column (optional, but cleaner if we are fully switching)
-- For backward compatibility during dev, maybe keep it or just drop it if we update code simultaneously.
-- Let's drop it to force code updates and avoid confusion.
ALTER TABLE server_notifications DROP COLUMN IF EXISTS image_url;
