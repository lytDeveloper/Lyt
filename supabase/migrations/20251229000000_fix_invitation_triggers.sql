-- =====================================================
-- 초대 시스템 트리거 수정
-- 1. profiles.name → profiles.username 으로 변경
-- 2. 허용된 notification type 사용 ('invitation')
-- =====================================================

-- 1. 새 초대 알림 트리거 수정
CREATE OR REPLACE FUNCTION handle_new_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_target_title TEXT;
  v_title TEXT;
  v_content TEXT;
BEGIN
  -- 발신자 이름 조회 (nickname 우선, 없으면 username)
  SELECT COALESCE(nickname, username) INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- 대상 제목 조회
  IF NEW.invitation_type = 'project' THEN
    SELECT title INTO v_target_title FROM projects WHERE id = NEW.target_id;
    v_title := '새로운 프로젝트 초대';
    v_content := COALESCE(v_sender_name, '사용자') || '님이 "' || COALESCE(v_target_title, '프로젝트') || '"에 초대했습니다.';
  ELSE
    SELECT title INTO v_target_title FROM collaborations WHERE id = NEW.target_id;
    v_title := '새로운 협업 초대';
    v_content := COALESCE(v_sender_name, '사용자') || '님이 "' || COALESCE(v_target_title, '협업') || '"에 초대했습니다.';
  END IF;

  -- 알림 생성 (type: 'invitation' 사용 - DB 제약조건에 맞는 타입)
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
    'invitation',
    v_title,
    v_content,
    NEW.id,
    'invitation',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(v_sender_name, '사용자'),
      'target_id', NEW.target_id,
      'target_title', v_target_title,
      'invitation_type', NEW.invitation_type,
      'action', 'new'
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 초대 응답 알림 트리거 수정
CREATE OR REPLACE FUNCTION handle_invitation_response()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_name TEXT;
  v_target_title TEXT;
  v_title TEXT;
  v_content TEXT;
BEGIN
  -- 상태가 accepted 또는 rejected로 변경된 경우
  IF (NEW.status IN ('accepted', 'rejected')) AND (OLD.status NOT IN ('accepted', 'rejected')) THEN
    -- 수신자 이름 조회 (nickname 우선, 없으면 username)
    SELECT COALESCE(nickname, username) INTO v_receiver_name
    FROM profiles WHERE id = NEW.receiver_id;

    -- 대상 제목 조회
    IF NEW.invitation_type = 'project' THEN
      SELECT title INTO v_target_title FROM projects WHERE id = NEW.target_id;
    ELSE
      SELECT title INTO v_target_title FROM collaborations WHERE id = NEW.target_id;
    END IF;

    IF NEW.status = 'accepted' THEN
      v_title := '초대가 수락되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 "' || COALESCE(v_target_title, '') || '" 초대를 수락했습니다.';
    ELSE
      v_title := '초대가 거절되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 "' || COALESCE(v_target_title, '') || '" 초대를 거절했습니다.';
    END IF;

    -- 발신자에게 알림 (type: 'invitation' 사용 - DB 제약조건에 맞는 타입)
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
      'invitation',
      v_title,
      v_content,
      NEW.id,
      'invitation',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', COALESCE(v_receiver_name, '사용자'),
        'target_id', NEW.target_id,
        'target_title', v_target_title,
        'invitation_type', NEW.invitation_type,
        'response_status', NEW.status,
        'action', NEW.status
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '초대 트리거 수정 완료: profiles.name → profiles.username, notification type → invitation';
END $$;
