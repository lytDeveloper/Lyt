-- =====================================================
-- 알림 생성 트리거에 profile_type 저장 로직 추가
-- 목적: 프로필별 알림 분리를 위해 sender/receiver의 활성 프로필 타입 저장
-- =====================================================

-- =====================================================
-- 헬퍼 함수: 사용자의 활성 프로필 타입 결정
-- 우선순위: brand > artist > creative > fan > NULL
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_profile_type(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- brand 우선
  IF EXISTS(SELECT 1 FROM profile_brands WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'brand';
  END IF;

  -- artist
  IF EXISTS(SELECT 1 FROM profile_artists WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'artist';
  END IF;

  -- creative
  IF EXISTS(SELECT 1 FROM profile_creatives WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'creative';
  END IF;

  -- fan
  IF EXISTS(SELECT 1 FROM profile_fans WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'fan';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 1. 초대 알림 트리거 업데이트
-- =====================================================

-- 1.1 새 초대 알림
CREATE OR REPLACE FUNCTION handle_new_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_target_title TEXT;
  v_title TEXT;
  v_content TEXT;
  v_sender_profile_type TEXT;
  v_receiver_profile_type TEXT;
BEGIN
  -- 발신자/수신자 프로필 타입 결정
  v_sender_profile_type := get_active_profile_type(NEW.sender_id);
  v_receiver_profile_type := get_active_profile_type(NEW.receiver_id);

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

  -- 알림 생성 (profile_type 추가)
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

-- 1.2 초대 응답 알림
CREATE OR REPLACE FUNCTION handle_invitation_response()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_name TEXT;
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

    -- 응답자 이름 조회
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

    -- 원래 발신자에게 알림 (profile_type 추가)
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
-- 2. 대화 요청 알림 트리거 업데이트
-- =====================================================

-- 2.1 새 대화 요청 알림
CREATE OR REPLACE FUNCTION handle_new_talk_request()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_avatar TEXT;
  v_sender_profile_type TEXT;
  v_receiver_profile_type TEXT;
BEGIN
  -- 프로필 타입 결정
  v_sender_profile_type := get_active_profile_type(NEW.sender_id);
  v_receiver_profile_type := get_active_profile_type(NEW.receiver_id);

  -- 발신자 정보 조회 (활성 프로필 우선)
  SELECT
    COALESCE(
      (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT p.nickname FROM profiles p JOIN profile_fans pf ON pf.profile_id = p.id WHERE pf.profile_id = NEW.sender_id AND pf.is_active = true),
      (SELECT nickname FROM profiles WHERE id = NEW.sender_id)
    ),
    COALESCE(
      (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true),
      (SELECT profile_image_url FROM profile_fans WHERE profile_id = NEW.sender_id AND is_active = true)
    )
  INTO v_sender_name, v_sender_avatar;

  -- 알림 생성 (profile_type 추가)
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
    'talk_request',
    '새로운 대화 요청',
    COALESCE(v_sender_name, '사용자') || '님이 대화를 요청했습니다.',
    NEW.id,
    'talk_request',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(v_sender_name, '사용자'),
      'sender_avatar', v_sender_avatar,
      'sender_profile_type', v_sender_profile_type,
      'template_message', NEW.template_message
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 대화 요청 응답 알림
CREATE OR REPLACE FUNCTION handle_talk_request_response()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_name TEXT;
  v_receiver_avatar TEXT;
  v_notification_type TEXT;
  v_title TEXT;
  v_content TEXT;
  v_sender_profile_type TEXT;
  v_receiver_profile_type TEXT;
BEGIN
  -- 상태가 accepted 또는 rejected로 변경된 경우
  IF (NEW.status IN ('accepted', 'rejected')) AND (OLD.status = 'pending') THEN
    -- 프로필 타입 결정
    v_sender_profile_type := get_active_profile_type(NEW.receiver_id);  -- 응답한 사람
    v_receiver_profile_type := get_active_profile_type(NEW.sender_id);  -- 원래 요청한 사람

    -- 응답자 정보 조회
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

    IF NEW.status = 'accepted' THEN
      v_notification_type := 'talk_request_accepted';
      v_title := '대화 요청이 수락되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 대화 요청을 수락했습니다.';
    ELSE
      v_notification_type := 'talk_request_rejected';
      v_title := '대화 요청이 거절되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 대화 요청을 거절했습니다.';
    END IF;

    -- 원래 요청자에게 알림 (profile_type 추가)
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
      v_notification_type,
      v_title,
      v_content,
      NEW.id,
      'talk_request',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', COALESCE(v_receiver_name, '사용자'),
        'receiver_avatar', v_receiver_avatar,
        'sender_profile_type', v_sender_profile_type,
        'response_status', NEW.status,
        'chat_room_id', NEW.created_chat_room_id
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. 프로젝트 지원 알림 트리거 업데이트
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_project_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_title TEXT;
  v_project_cover_image TEXT;
  v_applicant_name TEXT;
  v_applicant_avatar TEXT;
  v_owner_id UUID;
  v_sender_profile_type TEXT;
  v_receiver_profile_type TEXT;
BEGIN
  -- 프로젝트 정보 조회 (제목, 커버 이미지, 소유자)
  SELECT title, cover_image_url, created_by
  INTO v_project_title, v_project_cover_image, v_owner_id
  FROM projects WHERE id = NEW.project_id;

  -- 프로필 타입 결정
  v_sender_profile_type := get_active_profile_type(NEW.applicant_id);
  v_receiver_profile_type := get_active_profile_type(v_owner_id);

  -- 지원자 이름 조회
  SELECT COALESCE(
    (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profiles WHERE id = NEW.applicant_id)
  ) INTO v_applicant_name;

  -- 지원자 아바타 조회
  SELECT COALESCE(
    (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT pf.profile_image_url FROM profile_fans pf WHERE pf.profile_id = NEW.applicant_id AND pf.is_active = true LIMIT 1)
  ) INTO v_applicant_avatar;

  IF check_notification_enabled(v_owner_id, 'application') THEN
    INSERT INTO user_notifications (
      receiver_id,
      receiver_profile_type,
      sender_profile_type,
      type,
      title,
      content,
      related_id,
      related_type,
      metadata
    ) VALUES (
      v_owner_id,
      v_receiver_profile_type,
      v_sender_profile_type,
      'application',
      '새로운 프로젝트 지원',
      COALESCE(v_applicant_name, '사용자') || '님이 "' || COALESCE(v_project_title, '프로젝트') || '" 프로젝트에 지원했습니다.',
      NEW.project_id,
      'project',
      jsonb_build_object(
        'application_id', NEW.id,
        'sender_id', NEW.applicant_id,
        'sender_name', COALESCE(v_applicant_name, '사용자'),
        'sender_avatar', v_applicant_avatar,
        'sender_profile_type', v_sender_profile_type,
        'cover_image_url', v_project_cover_image,
        'project_title', v_project_title
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. 협업 지원 알림 트리거 업데이트
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_collaboration_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collab_title TEXT;
  v_collab_cover_image TEXT;
  v_applicant_name TEXT;
  v_applicant_avatar TEXT;
  v_owner_id UUID;
  v_sender_profile_type TEXT;
  v_receiver_profile_type TEXT;
BEGIN
  -- 협업 정보 조회 (제목, 커버 이미지, 소유자)
  SELECT title, cover_image_url, created_by
  INTO v_collab_title, v_collab_cover_image, v_owner_id
  FROM collaborations WHERE id = NEW.collaboration_id;

  -- 프로필 타입 결정
  v_sender_profile_type := get_active_profile_type(NEW.applicant_id);
  v_receiver_profile_type := get_active_profile_type(v_owner_id);

  -- 지원자 이름 조회
  SELECT COALESCE(
    (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profiles WHERE id = NEW.applicant_id)
  ) INTO v_applicant_name;

  -- 지원자 아바타 조회
  SELECT COALESCE(
    (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.applicant_id AND is_active = true LIMIT 1),
    (SELECT pf.profile_image_url FROM profile_fans pf WHERE pf.profile_id = NEW.applicant_id AND pf.is_active = true LIMIT 1)
  ) INTO v_applicant_avatar;

  IF check_notification_enabled(v_owner_id, 'application') THEN
    INSERT INTO user_notifications (
      receiver_id,
      receiver_profile_type,
      sender_profile_type,
      type,
      title,
      content,
      related_id,
      related_type,
      metadata
    ) VALUES (
      v_owner_id,
      v_receiver_profile_type,
      v_sender_profile_type,
      'application',
      '새로운 협업 지원',
      COALESCE(v_applicant_name, '사용자') || '님이 "' || COALESCE(v_collab_title, '협업') || '" 협업에 지원했습니다.',
      NEW.collaboration_id,
      'collaboration',
      jsonb_build_object(
        'application_id', NEW.id,
        'sender_id', NEW.applicant_id,
        'sender_name', COALESCE(v_applicant_name, '사용자'),
        'sender_avatar', v_applicant_avatar,
        'sender_profile_type', v_sender_profile_type,
        'cover_image_url', v_collab_cover_image,
        'collaboration_title', v_collab_title
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '알림 트리거에 profile_type 저장 로직 추가 완료 (초대, 대화요청, 지원)';
END $$;
