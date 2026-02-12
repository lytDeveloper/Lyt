-- ============================================================================
-- 멘션된 사용자에게 일반 채팅 알림 중복 방지
-- - 멘션 알림은 프론트(messageService.sendMentionNotifications)에서 별도 생성됨
-- - DB 트리거에서 멘션된 userId를 추출하여 일반 채팅 알림 INSERT 시 제외
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    room_title text;
    sender_name text;
    participant RECORD;
    message_content text;
    has_content boolean;
    has_attachments boolean;
    image_count integer;
    file_count integer;
    mentioned_user_ids uuid[];
    mention_match text[];
BEGIN
    -- Get room title (fallback to '채팅방')
    SELECT COALESCE(title, '채팅방') INTO room_title FROM chat_rooms WHERE id = NEW.room_id;
    -- Get sender name (비팬 프로필 이름 우선)
    SELECT get_vfan_display_name(NEW.sender_id) INTO sender_name;

    -- =========================================================================
    -- 멘션된 userId 추출: @[이름](userId) 패턴에서 userId(UUID) 추출
    -- =========================================================================
    mentioned_user_ids := ARRAY[]::uuid[];
    IF NEW.content IS NOT NULL THEN
        -- regexp_matches로 모든 매치를 찾아 UUID 배열 생성
        FOR mention_match IN
            SELECT regexp_matches(NEW.content, '@\[[^\]]+\]\(([0-9a-fA-F\-]{36})\)', 'g')
        LOOP
            -- mention_match[1]이 userId (UUID 형식)
            BEGIN
                mentioned_user_ids := array_append(mentioned_user_ids, mention_match[1]::uuid);
            EXCEPTION WHEN OTHERS THEN
                -- UUID 변환 실패 시 무시
                NULL;
            END;
        END LOOP;
    END IF;

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
                message_content := sender_name || ': (사진/파일첨부) 메시지를 보냈습니다';
            ELSIF image_count > 0 THEN
                message_content := sender_name || ': (사진첨부) 메시지를 보냈습니다';
            ELSE
                message_content := sender_name || ': (파일첨부) 메시지를 보냈습니다';
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
        -- =====================================================================
        -- 멘션된 사용자는 일반 채팅 알림 스킵 (멘션 알림이 프론트에서 별도 생성됨)
        -- =====================================================================
        IF participant.user_id = ANY(mentioned_user_ids) THEN
            CONTINUE; -- 멘션된 사용자는 일반 알림 건너뜀
        END IF;

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
$function$;

-- 마이그레이션 적용 확인용 코멘트
COMMENT ON FUNCTION public.handle_new_chat_message() IS '채팅 메시지 생성 시 알림 발송 - 멘션된 사용자는 일반 채팅 알림에서 제외 (멘션 알림은 프론트에서 별도 생성)';

