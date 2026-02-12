-- ============================================================================
-- Talk Requests 테이블 생성
-- 대화 요청 기능을 위한 테이블 및 트리거
-- ============================================================================

-- ============================================================================
-- user_notifications 타입 체크 제약조건 업데이트
-- talk_request, talk_request_accepted, talk_request_rejected 타입 추가
-- ============================================================================
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check
  CHECK (type = ANY (ARRAY[
    'proposal'::text,
    'invitation'::text,
    'message'::text,
    'deadline'::text,
    'application'::text,
    'status_change'::text,
    'withdrawal'::text,
    'follow'::text,
    'like'::text,
    'partnership_inquiry'::text,
    'proposal_accepted'::text,
    'proposal_rejected'::text,
    'application_accepted'::text,
    'application_rejected'::text,
    'talk_request'::text,
    'talk_request_accepted'::text,
    'talk_request_rejected'::text,
    'question'::text,
    'answer'::text
  ]));

-- talk_requests 테이블 생성
CREATE TABLE IF NOT EXISTS talk_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 송수신자
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),

  -- 메시지 내용
  template_message TEXT NOT NULL,
  additional_message TEXT,  -- 선택사항, 최대 500자

  -- 날짜 정보
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 7일 후 만료

  -- 숨김 기능
  is_hidden_by_sender BOOLEAN DEFAULT false,
  is_hidden_by_receiver BOOLEAN DEFAULT false,

  -- 응답 관련
  rejection_reason TEXT,

  -- 결과 정보
  created_chat_room_id UUID REFERENCES chat_rooms(id),

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_talk_requests_sender ON talk_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_talk_requests_receiver ON talk_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_talk_requests_status ON talk_requests(status);
CREATE INDEX IF NOT EXISTS idx_talk_requests_expires ON talk_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_talk_requests_sent ON talk_requests(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_talk_requests_pending ON talk_requests(sender_id, receiver_id) WHERE status = 'pending';

-- RLS 정책
ALTER TABLE talk_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "talk_requests_select_policy" ON talk_requests;
DROP POLICY IF EXISTS "talk_requests_insert_policy" ON talk_requests;
DROP POLICY IF EXISTS "talk_requests_update_policy" ON talk_requests;

CREATE POLICY "talk_requests_select_policy"
  ON talk_requests FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "talk_requests_insert_policy"
  ON talk_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "talk_requests_update_policy"
  ON talk_requests FOR UPDATE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- ============================================================================
-- 트리거 함수들
-- ============================================================================

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_talk_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_talk_requests_updated_at ON talk_requests;
CREATE TRIGGER trigger_talk_requests_updated_at
  BEFORE UPDATE ON talk_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_talk_requests_updated_at();

-- ============================================================================
-- 새 대화 요청 알림 (INSERT)
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_talk_request()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_avatar TEXT;
BEGIN
  -- 발신자 이름 조회 (활성 프로필 우선)
  SELECT COALESCE(
    (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profiles WHERE id = NEW.sender_id)
  ) INTO v_sender_name;

  -- 발신자 아바타 조회 (활성 프로필 우선)
  SELECT COALESCE(
    (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT pf.profile_image_url FROM profile_fans pf WHERE pf.profile_id = NEW.sender_id AND pf.is_active = true LIMIT 1)
  ) INTO v_sender_avatar;

  -- 알림 생성
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
    NEW.receiver_id,
    'talk_request',
    '새로운 대화 요청',
    COALESCE(v_sender_name, '사용자') || '님이 대화를 요청했습니다.',
    NEW.id,
    'talk_request',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(v_sender_name, '사용자'),
      'sender_avatar', v_sender_avatar,
      'template_message', NEW.template_message
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_talk_request ON talk_requests;
CREATE TRIGGER trigger_new_talk_request
  AFTER INSERT ON talk_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_talk_request();

-- ============================================================================
-- 대화 요청 수락 시 채팅방 생성 (BEFORE UPDATE)
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_talk_request_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_receiver_name TEXT;
  v_room_title TEXT;
  v_room_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- 발신자 이름 조회
    SELECT COALESCE(
      (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
      (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profiles WHERE id = NEW.sender_id)
    ) INTO v_sender_name;

    -- 수신자 이름 조회
    SELECT COALESCE(
      (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT nickname FROM profiles WHERE id = NEW.receiver_id)
    ) INTO v_receiver_name;

    -- 채팅방 제목: "수신자이름-발신자이름"
    v_room_title := COALESCE(v_receiver_name, '사용자') || '-' || COALESCE(v_sender_name, '사용자');

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
    VALUES (v_room_id, NEW.receiver_id, '대화가 시작되었습니다.', 'system');

    -- talk_request에 생성된 채팅방 ID 저장
    NEW.created_chat_room_id := v_room_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_talk_request_accepted ON talk_requests;
CREATE TRIGGER trigger_talk_request_accepted
  BEFORE UPDATE ON talk_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_talk_request_accepted();

-- ============================================================================
-- 대화 요청 응답 알림 (AFTER UPDATE)
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_talk_request_response()
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
    -- 수신자(응답자) 이름 조회
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
      (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.receiver_id AND is_active = true LIMIT 1),
      (SELECT pf.profile_image_url FROM profile_fans pf WHERE pf.profile_id = NEW.receiver_id AND pf.is_active = true LIMIT 1)
    ) INTO v_receiver_avatar;

    IF NEW.status = 'accepted' THEN
      v_notification_type := 'talk_request_accepted';
      v_title := '대화 요청이 수락되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 대화 요청을 수락했습니다.';
    ELSE
      v_notification_type := 'talk_request_rejected';
      v_title := '대화 요청이 거절되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 대화 요청을 거절했습니다.';
    END IF;

    -- 발신자에게 알림
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
      'talk_request',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', COALESCE(v_receiver_name, '사용자'),
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

DROP TRIGGER IF EXISTS trigger_talk_request_response ON talk_requests;
CREATE TRIGGER trigger_talk_request_response
  AFTER UPDATE ON talk_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_talk_request_response();

-- ============================================================================
-- 권한 부여
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON talk_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
