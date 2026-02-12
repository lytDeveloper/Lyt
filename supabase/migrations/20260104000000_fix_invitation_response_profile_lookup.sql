-- =====================================================
-- 초대 알림 트리거 수정
-- 문제: 발신자/응답자 이름을 profiles.nickname에서만 가져옴
-- 해결: 활성 프로필 테이블에서 이름/아바타 조회하도록 수정
-- 추가: fan 유저는 초대/지원에 관여할 수 없으므로 제외
-- =====================================================

-- 1.1 새 초대 알림 (수정) - 발신자 이름/아바타를 활성 프로필에서 조회
CREATE OR REPLACE FUNCTION handle_new_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_avatar TEXT;
  v_target_title TEXT;
  v_title TEXT;
  v_content TEXT;
  v_sender_profile_type TEXT;
  v_receiver_profile_type TEXT;
BEGIN
  -- 발신자/수신자 프로필 타입 결정
  v_sender_profile_type := get_active_profile_type(NEW.sender_id);
  v_receiver_profile_type := get_active_profile_type(NEW.receiver_id);

  -- fan 유저는 초대를 보낼 수 없으므로 알림 생성 스킵
  IF v_sender_profile_type = 'fan' OR v_sender_profile_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- 발신자 이름/아바타 조회 (활성 프로필 우선)
  SELECT
    COALESCE(
      (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT nickname FROM profiles WHERE id = NEW.sender_id)
    ),
    COALESCE(
      (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true)
    )
  INTO v_sender_name, v_sender_avatar;

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

  -- 알림 생성 (sender_avatar 추가)
  INSERT INTO user_notifications (
    receiver_id,
    receiver_profile_type,
    sender_profile_type,
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
    v_receiver_profile_type,
    v_sender_profile_type,
    'invitation',
    v_title,
    v_content,
    NEW.id,
    'invitation',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(v_sender_name, '사용자'),
      'sender_avatar', v_sender_avatar,
      'sender_profile_type', v_sender_profile_type,
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

-- 1.2 초대 응답 알림 (수정)
CREATE OR REPLACE FUNCTION handle_invitation_response()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_name TEXT;
  v_receiver_avatar TEXT;
  v_target_title TEXT;
  v_title TEXT;
  v_content TEXT;
  v_sender_profile_type TEXT;
  v_receiver_profile_type TEXT;
BEGIN
  -- 상태가 accepted 또는 rejected로 변경된 경우
  IF (NEW.status IN ('accepted', 'rejected')) AND (OLD.status NOT IN ('accepted', 'rejected')) THEN
    -- 프로필 타입 결정 (응답 알림은 원래 sender가 receiver가 됨)
    v_sender_profile_type := get_active_profile_type(NEW.receiver_id);  -- 응답한 사람
    v_receiver_profile_type := get_active_profile_type(NEW.sender_id);  -- 원래 초대한 사람

    -- fan 유저는 초대에 응답할 수 없으므로 알림 생성 스킵
    IF v_sender_profile_type = 'fan' OR v_sender_profile_type IS NULL THEN
      RETURN NEW;
    END IF;

    -- 응답자 정보 조회 (활성 프로필 우선 - talk_request와 동일 방식)
    SELECT
      COALESCE(
        (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.receiver_id AND is_active = true),
        (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.receiver_id AND is_active = true),
        (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.receiver_id AND is_active = true),
        (SELECT p.nickname FROM profiles p JOIN profile_fans pf ON pf.profile_id = p.id WHERE pf.profile_id = NEW.receiver_id AND pf.is_active = true),
        (SELECT nickname FROM profiles WHERE id = NEW.receiver_id)
      ),
      COALESCE(
        (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.receiver_id AND is_active = true),
        (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.receiver_id AND is_active = true),
        (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.receiver_id AND is_active = true),
        (SELECT profile_image_url FROM profile_fans WHERE profile_id = NEW.receiver_id AND is_active = true)
      )
    INTO v_receiver_name, v_receiver_avatar;

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

    -- 원래 발신자에게 알림 (profile_type 추가 + receiver_avatar 추가)
    INSERT INTO user_notifications (
      receiver_id,
      receiver_profile_type,
      sender_profile_type,
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
      v_receiver_profile_type,
      v_sender_profile_type,
      'invitation',
      v_title,
      v_content,
      NEW.id,
      'invitation',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', COALESCE(v_receiver_name, '사용자'),
        'receiver_avatar', v_receiver_avatar,
        'sender_profile_type', v_sender_profile_type,
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

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '초대 알림 트리거 수정 완료:';
  RAISE NOTICE '  - handle_new_invitation: 활성 프로필에서 발신자 이름/아바타 조회, fan 유저 제외';
  RAISE NOTICE '  - handle_invitation_response: 활성 프로필에서 응답자 이름/아바타 조회, fan 유저 제외';
END $$;

