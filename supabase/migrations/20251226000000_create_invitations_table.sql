-- =====================================================
-- 초대 시스템 통합 마이그레이션
-- project_proposals + collaboration_invitations → invitations
-- =====================================================

-- 1. 새 통합 invitations 테이블 생성
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 타입 구분 (polymorphic)
  invitation_type VARCHAR(20) NOT NULL CHECK (invitation_type IN ('project', 'collaboration')),
  target_id UUID NOT NULL,  -- project_id 또는 collaboration_id

  -- 송수신자 (통일된 컬럼명)
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 상태 (통일)
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'expired', 'withdrawn', 'cancelled')),

  -- 메시지 및 상세
  message TEXT,
  position VARCHAR(255),
  responsibilities TEXT,
  budget_range VARCHAR(100),
  duration VARCHAR(100),

  -- Q&A 시스템 (JSONB 배열)
  question_answers JSONB DEFAULT '[]'::jsonb,

  -- 숨김 기능
  is_hidden_by_sender BOOLEAN DEFAULT false,
  is_hidden_by_receiver BOOLEAN DEFAULT false,

  -- 날짜 정보
  sent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_date TIMESTAMP WITH TIME ZONE,
  response_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,

  -- 응답 관련
  rejection_reason TEXT,
  acceptance_note TEXT,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 유니크 제약조건 (같은 대상에 중복 초대 방지)
  CONSTRAINT invitations_unique_target UNIQUE (invitation_type, target_id, sender_id, receiver_id)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(invitation_type);
CREATE INDEX IF NOT EXISTS idx_invitations_target ON invitations(target_id);
CREATE INDEX IF NOT EXISTS idx_invitations_sender ON invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_invitations_receiver ON invitations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_sent_date ON invitations(sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_type_status ON invitations(invitation_type, status);

-- 3. RLS 정책 활성화
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 송수신자만 조회 가능
CREATE POLICY "invitations_select_policy"
  ON invitations FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- 본인만 초대 생성 가능
CREATE POLICY "invitations_insert_policy"
  ON invitations FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- 관련자만 수정 가능
CREATE POLICY "invitations_update_policy"
  ON invitations FOR UPDATE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- 5. project_proposals 데이터 마이그레이션
INSERT INTO invitations (
  id,
  invitation_type,
  target_id,
  sender_id,
  receiver_id,
  status,
  message,
  position,
  responsibilities,
  budget_range,
  duration,
  question_answers,
  is_hidden_by_sender,
  is_hidden_by_receiver,
  sent_date,
  viewed_date,
  response_date,
  expiry_date,
  rejection_reason,
  acceptance_note,
  created_at,
  updated_at
)
SELECT
  id,
  'project',
  project_id,
  sender_id,
  receiver_id,
  status,
  message,
  position,
  responsibilities,
  budget_range,
  duration,
  COALESCE(question_answers, '[]'::jsonb),
  COALESCE(is_hidden_by_sender, false),
  COALESCE(is_hidden_by_receiver, false),
  COALESCE(sent_date, created_at),
  viewed_date,
  response_date,
  expiry_date,
  rejection_reason,
  acceptance_note,
  created_at,
  updated_at
FROM project_proposals
ON CONFLICT (invitation_type, target_id, sender_id, receiver_id) DO NOTHING;

-- 6. collaboration_invitations 데이터 마이그레이션
INSERT INTO invitations (
  id,
  invitation_type,
  target_id,
  sender_id,
  receiver_id,
  status,
  message,
  position,
  responsibilities,
  budget_range,
  duration,
  question_answers,
  is_hidden_by_sender,
  is_hidden_by_receiver,
  sent_date,
  response_date,
  expiry_date,
  rejection_reason,
  acceptance_note,
  created_at,
  updated_at
)
SELECT
  id,
  'collaboration',
  collaboration_id,
  inviter_id,
  invitee_id,
  status,
  message,
  position,
  responsibilities,
  compensation,  -- budget_range로 매핑
  NULL,  -- duration 없음
  '[]'::jsonb,  -- Q&A 없음, 빈 배열로 초기화
  COALESCE(is_hidden_by_inviter, false),
  COALESCE(is_hidden_by_invitee, false),
  COALESCE(sent_date, created_at),
  response_date,
  expiry_date,
  rejection_reason,
  acceptance_note,
  created_at,
  updated_at
FROM collaboration_invitations
ON CONFLICT (invitation_type, target_id, sender_id, receiver_id) DO NOTHING;

-- 7. 기존 테이블 백업 (이름 변경)
-- 주의: 기존 테이블을 사용하는 코드가 모두 마이그레이션된 후에 실행
-- ALTER TABLE project_proposals RENAME TO project_proposals_backup;
-- ALTER TABLE collaboration_invitations RENAME TO collaboration_invitations_backup;

-- 8. 초대 수락 시 자동 멤버 추가 함수
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_target_type TEXT;
  v_target_id UUID;
  v_chat_room_id UUID;
BEGIN
  -- 수락 상태로 변경된 경우에만 처리
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    v_target_type := NEW.invitation_type;
    v_target_id := NEW.target_id;

    IF v_target_type = 'project' THEN
      -- 프로젝트 멤버로 추가
      INSERT INTO project_members (
        project_id, user_id, position, responsibilities, status, is_leader, joined_date
      )
      VALUES (
        v_target_id, NEW.receiver_id, NEW.position, NEW.responsibilities, 'active', false, NOW()
      )
      ON CONFLICT (project_id, user_id) DO UPDATE SET status = 'active', joined_date = NOW();

      -- 프로젝트 채팅방에 추가 (Fixed: chat_participants, room_id)
      SELECT id INTO v_chat_room_id FROM chat_rooms WHERE project_id = v_target_id LIMIT 1;
      IF v_chat_room_id IS NOT NULL THEN
        INSERT INTO chat_participants (room_id, user_id, joined_at)
        VALUES (v_chat_room_id, NEW.receiver_id, NOW())
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;

    ELSIF v_target_type = 'collaboration' THEN
      -- 협업 멤버로 추가
      INSERT INTO collaboration_members (
        collaboration_id, user_id, position, responsibilities, status, is_leader, joined_date
      )
      VALUES (
        v_target_id, NEW.receiver_id, NEW.position, NEW.responsibilities, 'active', false, NOW()
      )
      ON CONFLICT (collaboration_id, user_id) DO UPDATE SET status = 'active', joined_date = NOW();

      -- 협업 채팅방에 추가 (Fixed: chat_participants, room_id)
      SELECT id INTO v_chat_room_id FROM chat_rooms WHERE collaboration_id = v_target_id LIMIT 1;
      IF v_chat_room_id IS NOT NULL THEN
        INSERT INTO chat_participants (room_id, user_id, joined_at)
        VALUES (v_chat_room_id, NEW.receiver_id, NOW())
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_invitation_accepted
  AFTER UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_accepted();

-- 9. 새 초대 알림 트리거
CREATE OR REPLACE FUNCTION handle_new_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_target_title TEXT;
  v_notification_type TEXT;
  v_title TEXT;
  v_content TEXT;
BEGIN
  -- 발신자 이름 조회
  SELECT COALESCE(nickname, name) INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- 대상 제목 조회
  IF NEW.invitation_type = 'project' THEN
    SELECT title INTO v_target_title FROM projects WHERE id = NEW.target_id;
    v_notification_type := 'project_invitation';
    v_title := '새로운 프로젝트 초대';
    v_content := v_sender_name || '님이 "' || COALESCE(v_target_title, '프로젝트') || '"에 초대했습니다.';
  ELSE
    SELECT title INTO v_target_title FROM collaborations WHERE id = NEW.target_id;
    v_notification_type := 'collaboration_invitation';
    v_title := '새로운 협업 초대';
    v_content := v_sender_name || '님이 "' || COALESCE(v_target_title, '협업') || '"에 초대했습니다.';
  END IF;

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
    v_notification_type,
    v_title,
    v_content,
    NEW.id,
    'invitation',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'target_id', NEW.target_id,
      'target_title', v_target_title,
      'invitation_type', NEW.invitation_type
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_invitation
  AFTER INSERT ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_invitation();

-- 10. 초대 응답 알림 트리거
CREATE OR REPLACE FUNCTION handle_invitation_response()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_name TEXT;
  v_target_title TEXT;
  v_notification_type TEXT;
  v_title TEXT;
  v_content TEXT;
BEGIN
  -- 상태가 accepted 또는 rejected로 변경된 경우
  IF (NEW.status IN ('accepted', 'rejected')) AND (OLD.status NOT IN ('accepted', 'rejected')) THEN
    -- 수신자 이름 조회
    SELECT COALESCE(nickname, name) INTO v_receiver_name
    FROM profiles WHERE id = NEW.receiver_id;

    -- 대상 제목 조회
    IF NEW.invitation_type = 'project' THEN
      SELECT title INTO v_target_title FROM projects WHERE id = NEW.target_id;
    ELSE
      SELECT title INTO v_target_title FROM collaborations WHERE id = NEW.target_id;
    END IF;

    IF NEW.status = 'accepted' THEN
      v_notification_type := 'invitation_accepted';
      v_title := '초대가 수락되었습니다';
      v_content := v_receiver_name || '님이 "' || COALESCE(v_target_title, '') || '" 초대를 수락했습니다.';
    ELSE
      v_notification_type := 'invitation_rejected';
      v_title := '초대가 거절되었습니다';
      v_content := v_receiver_name || '님이 "' || COALESCE(v_target_title, '') || '" 초대를 거절했습니다.';
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
      'invitation',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', v_receiver_name,
        'target_id', NEW.target_id,
        'target_title', v_target_title,
        'invitation_type', NEW.invitation_type,
        'response_status', NEW.status
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_invitation_response
  AFTER UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_response();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'invitations 테이블 생성 및 데이터 마이그레이션 완료';
END $$;
