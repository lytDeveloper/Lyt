-- Add columns for pinning and notifications to chat_rooms table
ALTER TABLE chat_rooms 
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_notification_enabled BOOLEAN DEFAULT TRUE;

-- Comment on columns
COMMENT ON COLUMN chat_rooms.is_pinned IS 'Whether the chat room is pinned to the top';
COMMENT ON COLUMN chat_rooms.pinned_at IS 'Timestamp when the room was pinned, used for sorting pinned rooms';
COMMENT ON COLUMN chat_rooms.is_notification_enabled IS 'Whether notifications are enabled for this chat room';
