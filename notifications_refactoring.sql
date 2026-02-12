-- ============================================================================
-- BridgeApp Notification System Refactoring (Phase 3)
-- 1. Server Notification Rename
-- 2. User Notification Table Creation
-- 3. Triggers for Real-time Notifications
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rename 'notification' to 'server_notifications'
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS "notification" RENAME TO "server_notifications";

-- Rename indexes for consistency (if they exist)
ALTER INDEX IF EXISTS "notification_pkey" RENAME TO "server_notifications_pkey";
ALTER INDEX IF EXISTS "idx_notification_active" RENAME TO "idx_server_notifications_active";
ALTER INDEX IF EXISTS "idx_notification_starts_at" RENAME TO "idx_server_notifications_starts_at";
ALTER INDEX IF EXISTS "idx_notification_ends_at" RENAME TO "idx_server_notifications_ends_at";
ALTER INDEX IF EXISTS "idx_notification_priority" RENAME TO "idx_server_notifications_priority";
ALTER INDEX IF EXISTS "idx_notification_type" RENAME TO "idx_server_notifications_type";
ALTER INDEX IF EXISTS "idx_notification_audiences" RENAME TO "idx_server_notifications_audiences";
ALTER INDEX IF EXISTS "idx_notification_app_min_version" RENAME TO "idx_server_notifications_app_min_version";
ALTER INDEX IF EXISTS "idx_notification_app_max_version" RENAME TO "idx_server_notifications_app_max_version";

-- ----------------------------------------------------------------------------
-- 2. Create 'user_notifications' table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "receiver_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "type" text NOT NULL CHECK (type IN ('proposal', 'invitation', 'message', 'deadline', 'application', 'status_change')),
    "title" text NOT NULL,
    "content" text NOT NULL,
    "related_id" uuid, -- proposal_id, room_id, etc.
    "related_type" text, -- 'project', 'collaboration', 'chat'
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
    ON "public"."user_notifications"
    FOR SELECT
    USING (auth.uid() = receiver_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
    ON "public"."user_notifications"
    FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Indexes
CREATE INDEX "idx_user_notifications_receiver" ON "public"."user_notifications"("receiver_id", "created_at" DESC);
CREATE INDEX "idx_user_notifications_unread" ON "public"."user_notifications"("receiver_id") WHERE "is_read" = false;

-- ----------------------------------------------------------------------------
-- 3. Create 'user_notification_settings' table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."user_notification_settings" (
    "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "notification_type" text NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY ("user_id", "notification_type")
);

-- Enable RLS
ALTER TABLE "public"."user_notification_settings" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings"
    ON "public"."user_notification_settings"
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON "public"."user_notification_settings"
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON "public"."user_notification_settings"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Triggers & Functions
-- ----------------------------------------------------------------------------

-- Helper function to check setting
CREATE OR REPLACE FUNCTION check_notification_enabled(user_uuid uuid, notif_type text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_notification_settings 
        WHERE user_id = user_uuid 
        AND notification_type = notif_type 
        AND is_enabled = true
    ) OR NOT EXISTS (
        SELECT 1 
        FROM user_notification_settings 
        WHERE user_id = user_uuid 
        AND notification_type = notif_type
    ); -- Default true if no setting exists
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.1 Project Proposal Trigger
CREATE OR REPLACE FUNCTION handle_new_proposal()
RETURNS TRIGGER AS $$
DECLARE
    project_title text;
    sender_name text;
BEGIN
    -- Get project title
    SELECT title INTO project_title FROM projects WHERE id = NEW.project_id;
    -- Get sender name
    SELECT nickname INTO sender_name FROM profiles WHERE id = NEW.sender_id;

    -- Check setting
    IF check_notification_enabled(NEW.receiver_id, 'proposal') THEN
        INSERT INTO user_notifications (
            receiver_id, type, title, content, related_id, related_type, metadata
        ) VALUES (
            NEW.receiver_id,
            'proposal',
            '새로운 프로젝트 제안',
            sender_name || '님이 "' || project_title || '" 프로젝트에 제안을 보냈습니다.',
            NEW.project_id,
            'project',
            jsonb_build_object(
                'proposal_id', NEW.id,
                'sender_id', NEW.sender_id,
                'sender_name', sender_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_proposal_created
    AFTER INSERT ON project_proposals
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_proposal();

-- 4.2 Collaboration Invitation Trigger
CREATE OR REPLACE FUNCTION handle_new_invitation()
RETURNS TRIGGER AS $$
DECLARE
    collab_title text;
    inviter_name text;
BEGIN
    SELECT title INTO collab_title FROM collaborations WHERE id = NEW.collaboration_id;
    SELECT nickname INTO inviter_name FROM profiles WHERE id = NEW.inviter_id;

    IF check_notification_enabled(NEW.invitee_id, 'invitation') THEN
        INSERT INTO user_notifications (
            receiver_id, type, title, content, related_id, related_type, metadata
        ) VALUES (
            NEW.invitee_id,
            'invitation',
            '새로운 협업 초대',
            inviter_name || '님이 "' || collab_title || '" 협업에 초대했습니다.',
            NEW.collaboration_id,
            'collaboration',
            jsonb_build_object(
                'invitation_id', NEW.id,
                'sender_id', NEW.inviter_id,
                'sender_name', inviter_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_invitation_created
    AFTER INSERT ON collaboration_invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_invitation();

-- 4.3 Chat Message Trigger
CREATE OR REPLACE FUNCTION handle_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    room_title text;
    sender_name text;
    participant RECORD;
    message_content text;
    has_content boolean;
    has_attachments boolean;
    image_count integer;
    file_count integer;
BEGIN
    -- Get room title (fallback to '채팅방')
    SELECT COALESCE(title, '채팅방') INTO room_title FROM chat_rooms WHERE id = NEW.room_id;
    -- Get sender name
    SELECT nickname INTO sender_name FROM profiles WHERE id = NEW.sender_id;

    -- Check if message has content
    has_content := (NEW.content IS NOT NULL AND trim(NEW.content) != '');
    
    -- Check attachments
    has_attachments := (NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0);
    
    -- Determine message content based on attachments and text
    IF has_attachments THEN
        -- Count image and file attachments
        SELECT 
            COUNT(*) FILTER (WHERE (elem->>'type') = 'image'),
            COUNT(*) FILTER (WHERE (elem->>'type') = 'file')
        INTO image_count, file_count
        FROM jsonb_array_elements(NEW.attachments) AS elem;
        
        IF has_content THEN
            -- Has both attachments and content
            IF image_count > 0 AND file_count > 0 THEN
                message_content := sender_name || ': (사진/파일첨부) 메세지를 보냈습니다';
            ELSIF image_count > 0 THEN
                message_content := sender_name || ': (사진첨부) 메세지를 보냈습니다';
            ELSE
                message_content := sender_name || ': (파일첨부) 메세지를 보냈습니다';
            END IF;
        ELSE
            -- Only attachments, no content
            IF image_count > 0 AND file_count > 0 THEN
                message_content := sender_name || ': 사진/파일을 보냈습니다';
            ELSIF image_count > 0 THEN
                message_content := sender_name || ': 사진을 보냈습니다';
            ELSE
                message_content := sender_name || ': 파일을 보냈습니다';
            END IF;
        END IF;
    ELSIF has_content THEN
        -- Only content, no attachments
        message_content := sender_name || ': ' || substring(NEW.content from 1 for 50);
    ELSE
        -- Fallback (shouldn't happen, but just in case)
        message_content := sender_name || ': 메시지를 보냈습니다';
    END IF;

    -- Loop through all participants except sender
    FOR participant IN 
        SELECT user_id 
        FROM chat_participants 
        WHERE room_id = NEW.room_id 
        AND user_id != NEW.sender_id
    LOOP
        IF check_notification_enabled(participant.user_id, 'message') THEN
            INSERT INTO user_notifications (
                receiver_id, type, title, content, related_id, related_type, metadata
            ) VALUES (
                participant.user_id,
                'message',
                room_title,
                message_content,
                NEW.room_id,
                'chat',
                jsonb_build_object(
                    'message_id', NEW.id,
                    'sender_id', NEW.sender_id,
                    'sender_name', sender_name
                )
            );
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_chat_message_created
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_chat_message();

-- 4.4 Application Trigger (Project & Collaboration)
CREATE OR REPLACE FUNCTION handle_new_project_application()
RETURNS TRIGGER AS $$
DECLARE
    project_title text;
    applicant_name text;
    owner_id uuid;
BEGIN
    SELECT title, created_by INTO project_title, owner_id FROM projects WHERE id = NEW.project_id;
    SELECT nickname INTO applicant_name FROM profiles WHERE id = NEW.applicant_id;

    IF check_notification_enabled(owner_id, 'application') THEN
        INSERT INTO user_notifications (
            receiver_id, type, title, content, related_id, related_type, metadata
        ) VALUES (
            owner_id,
            'application',
            '새로운 프로젝트 지원',
            applicant_name || '님이 "' || project_title || '" 프로젝트에 지원했습니다.',
            NEW.project_id,
            'project',
            jsonb_build_object(
                'application_id', NEW.id,
                'sender_id', NEW.applicant_id,
                'sender_name', applicant_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_application_created
    AFTER INSERT ON project_applications
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_project_application();

-- Collaboration Application Trigger
CREATE OR REPLACE FUNCTION handle_new_collaboration_application()
RETURNS TRIGGER AS $$
DECLARE
    collab_title text;
    applicant_name text;
    owner_id uuid;
BEGIN
    SELECT title, created_by INTO collab_title, owner_id FROM collaborations WHERE id = NEW.collaboration_id;
    SELECT nickname INTO applicant_name FROM profiles WHERE id = NEW.applicant_id;

    IF check_notification_enabled(owner_id, 'application') THEN
        INSERT INTO user_notifications (
            receiver_id, type, title, content, related_id, related_type, metadata
        ) VALUES (
            owner_id,
            'application',
            '새로운 협업 지원',
            applicant_name || '님이 "' || collab_title || '" 협업에 지원했습니다.',
            NEW.collaboration_id,
            'collaboration',
            jsonb_build_object(
                'application_id', NEW.id,
                'sender_id', NEW.applicant_id,
                'sender_name', applicant_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_collaboration_application_created
    AFTER INSERT ON collaboration_applications
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_collaboration_application();

-- Enable Realtime for user_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

