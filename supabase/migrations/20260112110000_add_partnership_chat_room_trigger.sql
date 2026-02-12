-- ============================================================================
-- Partnership Inquiries 채팅방 자동 생성 트리거
-- 파트너십 문의 수락 시 1:1 채팅방 생성
-- ============================================================================

-- ============================================================================
-- created_chat_room_id 컬럼 추가
-- ============================================================================
ALTER TABLE partnership_inquiries 
ADD COLUMN IF NOT EXISTS created_chat_room_id UUID REFERENCES chat_rooms(id);

-- response_date 컬럼 추가 (없는 경우)
ALTER TABLE partnership_inquiries 
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 파트너십 문의 수락 시 채팅방 생성 트리거 함수 (BEFORE UPDATE)
-- talk_requests 패턴 참고
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_partnership_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_receiver_name TEXT;
  v_room_title TEXT;
  v_room_id UUID;
BEGIN
  -- 상태가 accepted로 변경된 경우에만 처리
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- 발신자(문의자) 이름 조회
    SELECT COALESCE(
      (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
      (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profiles WHERE id = NEW.sender_id)
    ) INTO v_sender_name;

    -- 수신자(브랜드) 이름 조회
    SELECT COALESCE(
      (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profiles WHERE id = NEW.receiver_id)
    ) INTO v_receiver_name;

    -- 채팅방 제목: "수신자이름-발신자이름"
    v_room_title := COALESCE(v_receiver_name, '브랜드') || '-' || COALESCE(v_sender_name, '사용자');

    -- 채팅방 생성
    INSERT INTO chat_rooms (type, title, created_by)
    VALUES ('partner', v_room_title, NEW.receiver_id)
    RETURNING id INTO v_room_id;

    -- 참가자 추가
    INSERT INTO chat_participants (room_id, user_id, role)
    VALUES
      (v_room_id, NEW.sender_id, 'member'),
      (v_room_id, NEW.receiver_id, 'owner');

    -- 시스템 메시지 추가
    INSERT INTO chat_messages (room_id, sender_id, content, type)
    VALUES (v_room_id, NEW.receiver_id, '파트너십 문의가 수락되어 대화가 시작되었어요.', 'system');

    -- partnership_inquiries에 생성된 채팅방 ID 저장
    NEW.created_chat_room_id := v_room_id;
    
    -- 응답 시간 기록
    NEW.response_date := NOW();
  END IF;

  -- 거절 시에도 응답 시간 기록
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.response_date := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_partnership_accepted ON partnership_inquiries;
CREATE TRIGGER trigger_partnership_accepted
  BEFORE UPDATE ON partnership_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION handle_partnership_accepted();

-- ============================================================================
-- 파트너십 문의 응답 알림 (AFTER UPDATE)
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_partnership_response()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_name TEXT;
  v_receiver_avatar TEXT;
  v_notification_type TEXT;
  v_title TEXT;
  v_content TEXT;
BEGIN
  -- 상태가 accepted 또는 rejected로 변경된 경우
  IF (NEW.status IN ('accepted', 'rejected')) AND (OLD.status = 'pending') THEN
    -- 수신자(응답자=브랜드) 이름 조회
    SELECT COALESCE(
      (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profiles WHERE id = NEW.receiver_id)
    ) INTO v_receiver_name;

    -- 수신자(응답자) 아바타 조회
    SELECT COALESCE(
      (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1)
    ) INTO v_receiver_avatar;

    IF NEW.status = 'accepted' THEN
      v_notification_type := 'partnership_inquiry';
      v_title := '파트너십 문의가 수락되었습니다';
      v_content := COALESCE(v_receiver_name, '브랜드') || '님이 파트너십 문의를 수락했어요.';
    ELSE
      v_notification_type := 'partnership_inquiry';
      v_title := '파트너십 문의가 거절되었습니다';
      v_content := COALESCE(v_receiver_name, '브랜드') || '님이 파트너십 문의를 거절했어요.';
    END IF;

    -- 발신자(문의자)에게 알림
    INSERT INTO user_notifications (
      receiver_id,
      type,
      title,
      content,
      related_id,
      related_type,
      metadata,
      is_read
    )
    VALUES (
      NEW.sender_id,
      v_notification_type,
      v_title,
      v_content,
      NEW.id,
      'partnership_inquiry',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', COALESCE(v_receiver_name, '브랜드'),
        'receiver_avatar', v_receiver_avatar,
        'response_status', NEW.status,
        'chat_room_id', NEW.created_chat_room_id
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_partnership_response ON partnership_inquiries;
CREATE TRIGGER trigger_partnership_response
  AFTER UPDATE ON partnership_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION handle_partnership_response();

-- ============================================================================
-- 인덱스 추가
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_chat_room 
  ON partnership_inquiries(created_chat_room_id) 
  WHERE created_chat_room_id IS NOT NULL;
