-- ============================================================================
-- 프로젝트/협업 알림에 커버 이미지 추가
-- 알림 표시 시 프로젝트/협업 커버 이미지를 함께 표시하기 위함
-- ============================================================================

-- ============================================================================
-- 1. 프로젝트 지원 알림 - 커버 이미지 추가
-- ============================================================================
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
BEGIN
  -- 프로젝트 정보 조회 (제목, 커버 이미지, 소유자)
  SELECT title, cover_image_url, created_by
  INTO v_project_title, v_project_cover_image, v_owner_id
  FROM projects WHERE id = NEW.project_id;

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
      receiver_id, type, title, content, related_id, related_type, metadata
    ) VALUES (
      v_owner_id,
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
        'cover_image_url', v_project_cover_image,
        'project_title', v_project_title
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. 협업 지원 알림 - 커버 이미지 추가
-- ============================================================================
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
BEGIN
  -- 협업 정보 조회 (제목, 커버 이미지, 소유자)
  SELECT title, cover_image_url, created_by
  INTO v_collab_title, v_collab_cover_image, v_owner_id
  FROM collaborations WHERE id = NEW.collaboration_id;

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
      receiver_id, type, title, content, related_id, related_type, metadata
    ) VALUES (
      v_owner_id,
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
        'cover_image_url', v_collab_cover_image,
        'collaboration_title', v_collab_title
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. 초대 알림 - 커버 이미지 및 발신자 아바타 추가
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_avatar TEXT;
  v_target_title TEXT;
  v_cover_image TEXT;
  v_title TEXT;
  v_content TEXT;
BEGIN
  -- 발신자 이름 조회
  SELECT COALESCE(
    (SELECT brand_name FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT artist_name FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT nickname FROM profiles WHERE id = NEW.sender_id)
  ) INTO v_sender_name;

  -- 발신자 아바타 조회
  SELECT COALESCE(
    (SELECT logo_image_url FROM profile_brands WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT logo_image_url FROM profile_artists WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT profile_image_url FROM profile_creatives WHERE profile_id = NEW.sender_id AND is_active = true LIMIT 1),
    (SELECT pf.profile_image_url FROM profile_fans pf WHERE pf.profile_id = NEW.sender_id AND pf.is_active = true LIMIT 1)
  ) INTO v_sender_avatar;

  -- 대상 정보 조회 (제목, 커버 이미지)
  IF NEW.invitation_type = 'project' THEN
    SELECT title, cover_image_url INTO v_target_title, v_cover_image FROM projects WHERE id = NEW.target_id;
    v_title := '새로운 프로젝트 초대';
    v_content := COALESCE(v_sender_name, '사용자') || '님이 "' || COALESCE(v_target_title, '프로젝트') || '"에 초대했습니다.';
  ELSE
    SELECT title, cover_image_url INTO v_target_title, v_cover_image FROM collaborations WHERE id = NEW.target_id;
    v_title := '새로운 협업 초대';
    v_content := COALESCE(v_sender_name, '사용자') || '님이 "' || COALESCE(v_target_title, '협업') || '"에 초대했습니다.';
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
    'invitation',
    v_title,
    v_content,
    NEW.id,
    'invitation',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(v_sender_name, '사용자'),
      'sender_avatar', v_sender_avatar,
      'target_id', NEW.target_id,
      'target_title', v_target_title,
      'cover_image_url', v_cover_image,
      'invitation_type', NEW.invitation_type,
      'action', 'new'
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. 초대 응답 알림 - 커버 이미지 및 응답자 아바타 추가
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_invitation_response()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_name TEXT;
  v_receiver_avatar TEXT;
  v_target_title TEXT;
  v_cover_image TEXT;
  v_title TEXT;
  v_content TEXT;
BEGIN
  -- 상태가 accepted 또는 rejected로 변경된 경우
  IF (NEW.status IN ('accepted', 'rejected')) AND (OLD.status NOT IN ('accepted', 'rejected')) THEN
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

    -- 대상 정보 조회 (제목, 커버 이미지)
    IF NEW.invitation_type = 'project' THEN
      SELECT title, cover_image_url INTO v_target_title, v_cover_image FROM projects WHERE id = NEW.target_id;
    ELSE
      SELECT title, cover_image_url INTO v_target_title, v_cover_image FROM collaborations WHERE id = NEW.target_id;
    END IF;

    IF NEW.status = 'accepted' THEN
      v_title := '초대가 수락되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 "' || COALESCE(v_target_title, '') || '" 초대를 수락했습니다.';
    ELSE
      v_title := '초대가 거절되었습니다';
      v_content := COALESCE(v_receiver_name, '사용자') || '님이 "' || COALESCE(v_target_title, '') || '" 초대를 거절했습니다.';
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
      'invitation',
      v_title,
      v_content,
      NEW.id,
      'invitation',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', COALESCE(v_receiver_name, '사용자'),
        'receiver_avatar', v_receiver_avatar,
        'target_id', NEW.target_id,
        'target_title', v_target_title,
        'cover_image_url', v_cover_image,
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

-- ============================================================================
-- 완료 메시지
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '프로젝트/협업 알림에 커버 이미지 추가 완료';
END $$;
