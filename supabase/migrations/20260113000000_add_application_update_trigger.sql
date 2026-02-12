-- =====================================================
-- 지원 재제출 시 알림 트리거 추가
-- withdrawn 상태에서 pending으로 변경될 때 알림 발송
-- =====================================================

-- 프로젝트 지원 UPDATE 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_project_application_updated()
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
  -- withdrawn에서 pending으로 변경된 경우에만 알림 발송
  IF OLD.status = 'withdrawn' AND NEW.status = 'pending' THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- 협업 지원 UPDATE 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_collaboration_application_updated()
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
  -- withdrawn에서 pending으로 변경된 경우에만 알림 발송
  IF OLD.status = 'withdrawn' AND NEW.status = 'pending' THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- 프로젝트 지원 UPDATE 트리거 생성
DROP TRIGGER IF EXISTS on_project_application_updated ON public.project_applications;
CREATE TRIGGER on_project_application_updated
    AFTER UPDATE ON public.project_applications
    FOR EACH ROW
    WHEN (OLD.status = 'withdrawn' AND NEW.status = 'pending')
    EXECUTE FUNCTION public.handle_project_application_updated();

-- 협업 지원 UPDATE 트리거 생성
DROP TRIGGER IF EXISTS on_collaboration_application_updated ON public.collaboration_applications;
CREATE TRIGGER on_collaboration_application_updated
    AFTER UPDATE ON public.collaboration_applications
    FOR EACH ROW
    WHEN (OLD.status = 'withdrawn' AND NEW.status = 'pending')
    EXECUTE FUNCTION public.handle_collaboration_application_updated();
