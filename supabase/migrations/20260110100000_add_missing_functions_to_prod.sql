-- ============================================================================
-- Migration: Add ALL Missing Functions to PROD
-- Date: 2026-01-10
-- Issue: Error 42883 - Multiple functions don't exist in PROD
--
-- 문제: DEV에는 있지만 PROD에 없는 함수들로 인해 다음 기능들이 실패:
-- - 채팅방 생성 (CreateChatModal) → create_chat_room_with_participants
-- - 메시지 전송 (ChatRoom) → handle_new_chat_message 트리거 → get_vfan_display_name
-- - 대화 요청 수락 (talkRequestService) → handle_talk_request_accepted
-- - 초대 수락/발송 (invitationService) → handle_invitation_*, get_active_profile_type
-- - 사용자 정리 (Users.tsx) → system_leave_message
-- - 채팅방 참여자 내보내기 → kick_chat_participant
-- - 좋아요/조회수 → toggle_lounge_like, toggle_lounge_comment_like, track_lounge_view
-- - 매거진 조회수 → increment_magazine_view_count
-- - 프로필 전환 → profile_switch
-- - 알림 설정 확인 → check_notification_enabled
-- ============================================================================

-- ============================================================================
-- 1. 핵심 헬퍼 함수들
-- ============================================================================

-- 1.1 get_vfan_display_name - 비팬 프로필 이름 우선 조회 (9+ 트리거에서 사용)
CREATE OR REPLACE FUNCTION public.get_vfan_display_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    display_name text;
    user_roles text[];
BEGIN
    SELECT roles INTO user_roles FROM profiles WHERE id = user_id;

    IF user_roles IS NOT NULL THEN
        IF 'brand' = ANY(user_roles) THEN
            SELECT brand_name INTO display_name
            FROM profile_brands
            WHERE profile_id = user_id AND is_active = true;
        END IF;

        IF display_name IS NULL AND 'artist' = ANY(user_roles) THEN
            SELECT artist_name INTO display_name
            FROM profile_artists
            WHERE profile_id = user_id AND is_active = true;
        END IF;

        IF display_name IS NULL AND 'creative' = ANY(user_roles) THEN
            SELECT nickname INTO display_name
            FROM profile_creatives
            WHERE profile_id = user_id AND is_active = true;
        END IF;
    END IF;

    IF display_name IS NULL THEN
        SELECT nickname INTO display_name FROM profiles WHERE id = user_id;
    END IF;

    IF display_name IS NULL THEN
        display_name := '사용자';
    END IF;

    RETURN display_name;
END;
$function$;

-- 1.2 get_active_profile_type - 활성 프로필 타입 조회 (초대/대화요청 트리거에서 사용)
CREATE OR REPLACE FUNCTION public.get_active_profile_type(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM profile_brands WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'brand';
  END IF;

  IF EXISTS(SELECT 1 FROM profile_artists WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'artist';
  END IF;

  IF EXISTS(SELECT 1 FROM profile_creatives WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'creative';
  END IF;

  IF EXISTS(SELECT 1 FROM profile_fans WHERE profile_id = p_user_id AND is_active = true) THEN
    RETURN 'fan';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 1.3 check_notification_enabled - 알림 설정 확인
-- user_notification_settings 테이블 사용 (notification_type 컬럼 기반)
CREATE OR REPLACE FUNCTION public.check_notification_enabled(user_uuid uuid, notif_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    ); -- 설정이 없으면 기본값 true
END;
$function$;

-- ============================================================================
-- 2. 채팅 관련 함수들
-- ============================================================================

-- 2.1 create_chat_room_with_participants - 채팅방 생성 (원자적 처리)
CREATE OR REPLACE FUNCTION public.create_chat_room_with_participants(
  p_type TEXT,
  p_title TEXT,
  p_created_by UUID,
  p_participants UUID[],
  p_owner_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_collaboration_id UUID DEFAULT NULL,
  p_include_initial_message BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_owner UUID;
  v_participant UUID;
BEGIN
  v_owner := COALESCE(p_owner_id, p_created_by);

  INSERT INTO chat_rooms (type, title, created_by, project_id, collaboration_id)
  VALUES (p_type, p_title, v_owner, p_project_id, p_collaboration_id)
  RETURNING id INTO v_room_id;

  FOREACH v_participant IN ARRAY p_participants
  LOOP
    INSERT INTO chat_participants (room_id, user_id, role)
    VALUES (
      v_room_id,
      v_participant,
      (CASE WHEN v_participant = v_owner THEN 'owner' ELSE 'member' END)::chat_participant_role
    )
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END LOOP;

  IF p_include_initial_message THEN
    INSERT INTO chat_messages (room_id, sender_id, content, type, attachments)
    VALUES (v_room_id, v_owner, '대화가 시작되었습니다.', 'system', '[]'::jsonb);
  END IF;

  RETURN v_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_chat_room_with_participants(TEXT, TEXT, UUID, UUID[], UUID, UUID, UUID, BOOLEAN) TO authenticated;

-- 2.2 system_leave_message - 퇴장 시스템 메시지 (backoffice에서 사용)
CREATE OR REPLACE FUNCTION public.system_leave_message(
  p_room_id uuid,
  p_user_id uuid,
  p_user_name text DEFAULT '사용자'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.chat_messages (room_id, sender_id, content, type, created_at)
  VALUES (
    p_room_id,
    p_user_id,
    concat(coalesce(nullif(trim(p_user_name), ''), '사용자'), '님이 퇴장했습니다.'),
    'system',
    timezone('utc', now())
  );
END;
$function$;

-- 2.3 kick_chat_participant - 채팅방 참여자 내보내기
CREATE OR REPLACE FUNCTION public.kick_chat_participant(p_room_id uuid, p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actor_role chat_participant_role;
BEGIN
  SELECT role INTO actor_role
  FROM chat_participants
  WHERE room_id = p_room_id AND user_id = auth.uid();

  IF actor_role IS NULL OR actor_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION '권한 없음';
  END IF;

  IF EXISTS(SELECT 1 FROM chat_participants WHERE room_id = p_room_id AND user_id = p_target_user_id AND role = 'owner') THEN
    RAISE EXCEPTION '방장은 내보낼 수 없습니다';
  END IF;

  DELETE FROM chat_participants
  WHERE room_id = p_room_id AND user_id = p_target_user_id;
END;
$function$;

-- ============================================================================
-- 3. 라운지(커뮤니티) 관련 함수들
-- ============================================================================

-- 3.1 toggle_lounge_like - 좋아요 토글 (확장 버전)
CREATE OR REPLACE FUNCTION public.toggle_lounge_like(
  p_user_id uuid,
  p_project_id uuid DEFAULT NULL::uuid,
  p_collaboration_id uuid DEFAULT NULL::uuid,
  p_actor_role text DEFAULT NULL::text,
  p_actor_profile_id uuid DEFAULT NULL::uuid,
  p_actor_name text DEFAULT NULL::text,
  p_actor_avatar_url text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_existing_id uuid;
  v_target_type text;
  v_target_id uuid;
  v_owner_id uuid;
BEGIN
  -- 프로젝트 또는 협업 좋아요 확인
  IF p_project_id IS NOT NULL THEN
    v_target_type := 'project';
    v_target_id := p_project_id;
    SELECT created_by INTO v_owner_id FROM projects WHERE id = p_project_id;
  ELSIF p_collaboration_id IS NOT NULL THEN
    v_target_type := 'collaboration';
    v_target_id := p_collaboration_id;
    SELECT created_by INTO v_owner_id FROM collaborations WHERE id = p_collaboration_id;
  ELSE
    RETURN false;
  END IF;

  -- 기존 좋아요 확인
  SELECT id INTO v_existing_id
  FROM lounge_likes
  WHERE user_id = p_user_id
    AND (project_id = p_project_id OR collaboration_id = p_collaboration_id);

  IF v_existing_id IS NOT NULL THEN
    -- 좋아요 취소
    DELETE FROM lounge_likes WHERE id = v_existing_id;
    RETURN false;
  ELSE
    -- 좋아요 추가
    INSERT INTO lounge_likes (user_id, project_id, collaboration_id)
    VALUES (p_user_id, p_project_id, p_collaboration_id);
    RETURN true;
  END IF;
END;
$function$;

-- 3.2 toggle_lounge_comment_like - 댓글 좋아요 토글
CREATE OR REPLACE FUNCTION public.toggle_lounge_comment_like(p_user_id uuid, p_comment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_existing_id
  FROM lounge_comment_likes
  WHERE user_id = p_user_id AND comment_id = p_comment_id;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM lounge_comment_likes WHERE id = v_existing_id;
    RETURN false;
  ELSE
    INSERT INTO lounge_comment_likes (user_id, comment_id)
    VALUES (p_user_id, p_comment_id);
    RETURN true;
  END IF;
END;
$function$;

-- 3.3 track_lounge_view - 조회수 추적 (코드에서 호출하지만 마이그레이션에 없던 함수)
CREATE OR REPLACE FUNCTION public.track_lounge_view(
  p_user_id uuid,
  p_project_id uuid DEFAULT NULL::uuid,
  p_collaboration_id uuid DEFAULT NULL::uuid,
  p_actor_role text DEFAULT NULL::text,
  p_actor_profile_id uuid DEFAULT NULL::uuid,
  p_actor_name text DEFAULT NULL::text,
  p_actor_avatar_url text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_last_view timestamptz;
  v_cooldown_hours int := 24; -- 24시간 내 중복 조회 방지
BEGIN
  -- 프로젝트 조회
  IF p_project_id IS NOT NULL THEN
    -- 최근 조회 기록 확인
    SELECT viewed_at INTO v_last_view
    FROM lounge_views
    WHERE user_id = p_user_id AND project_id = p_project_id
    ORDER BY viewed_at DESC
    LIMIT 1;

    -- 쿨다운 체크
    IF v_last_view IS NULL OR v_last_view < NOW() - (v_cooldown_hours || ' hours')::interval THEN
      INSERT INTO lounge_views (user_id, project_id, viewed_at)
      VALUES (p_user_id, p_project_id, NOW());

      -- view_count 증가
      UPDATE projects SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_project_id;
      RETURN true;
    END IF;
  END IF;

  -- 협업 조회
  IF p_collaboration_id IS NOT NULL THEN
    SELECT viewed_at INTO v_last_view
    FROM lounge_views
    WHERE user_id = p_user_id AND collaboration_id = p_collaboration_id
    ORDER BY viewed_at DESC
    LIMIT 1;

    IF v_last_view IS NULL OR v_last_view < NOW() - (v_cooldown_hours || ' hours')::interval THEN
      INSERT INTO lounge_views (user_id, collaboration_id, viewed_at)
      VALUES (p_user_id, p_collaboration_id, NOW());

      UPDATE collaborations SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_collaboration_id;
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$function$;

-- ============================================================================
-- 4. 매거진 관련 함수들
-- ============================================================================

-- 4.1 increment_magazine_view_count - 매거진 조회수 증가
CREATE OR REPLACE FUNCTION public.increment_magazine_view_count(magazine_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE magazines
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = magazine_id;
END;
$function$;

-- ============================================================================
-- 5. 프로필 관련 함수들
-- ============================================================================

-- 5.1 profile_switch - 프로필 전환
CREATE OR REPLACE FUNCTION public.profile_switch(p_user uuid, p_target_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- 모든 프로필 비활성화
  UPDATE profile_brands SET is_active = false WHERE profile_id = p_user;
  UPDATE profile_artists SET is_active = false WHERE profile_id = p_user;
  UPDATE profile_creatives SET is_active = false WHERE profile_id = p_user;
  UPDATE profile_fans SET is_active = false WHERE profile_id = p_user;

  -- 대상 프로필 활성화
  CASE p_target_type
    WHEN 'brand' THEN
      UPDATE profile_brands SET is_active = true WHERE profile_id = p_user;
    WHEN 'artist' THEN
      UPDATE profile_artists SET is_active = true WHERE profile_id = p_user;
    WHEN 'creative' THEN
      UPDATE profile_creatives SET is_active = true WHERE profile_id = p_user;
    WHEN 'fan' THEN
      UPDATE profile_fans SET is_active = true WHERE profile_id = p_user;
  END CASE;
END;
$function$;

-- 5.2 get_profile_display_batch - 배치 프로필 조회 (RPC 최적화용)
CREATE OR REPLACE FUNCTION public.get_profile_display_batch(user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar text,
  activity_field text,
  profile_type text,
  source text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(
      pb.brand_name,
      pa.artist_name,
      pc.nickname,
      pf_nickname.nickname,
      p.nickname,
      '사용자'
    ) AS name,
    COALESCE(
      pb.logo_image_url,
      pa.logo_image_url,
      pc.profile_image_url,
      pf.profile_image_url,
      p.avatar_url
    ) AS avatar,
    COALESCE(pb.activity_field, pa.activity_field, pc.activity_field) AS activity_field,
    CASE
      WHEN pb.profile_id IS NOT NULL THEN 'brand'
      WHEN pa.profile_id IS NOT NULL THEN 'artist'
      WHEN pc.profile_id IS NOT NULL THEN 'creative'
      WHEN pf.profile_id IS NOT NULL THEN 'fan'
      ELSE 'customer'
    END AS profile_type,
    CASE
      WHEN pb.profile_id IS NOT NULL THEN 'profile_brands'
      WHEN pa.profile_id IS NOT NULL THEN 'profile_artists'
      WHEN pc.profile_id IS NOT NULL THEN 'profile_creatives'
      WHEN pf.profile_id IS NOT NULL THEN 'profile_fans'
      ELSE 'profiles'
    END AS source,
    COALESCE(pb.is_active, pa.is_active, pc.is_active, pf.is_active, true) AS is_active
  FROM unnest(user_ids) AS uid(id)
  JOIN profiles p ON p.id = uid.id
  LEFT JOIN profile_brands pb ON pb.profile_id = p.id AND pb.is_active = true
  LEFT JOIN profile_artists pa ON pa.profile_id = p.id AND pa.is_active = true
  LEFT JOIN profile_creatives pc ON pc.profile_id = p.id AND pc.is_active = true
  LEFT JOIN profile_fans pf ON pf.profile_id = p.id AND pf.is_active = true
  LEFT JOIN profiles pf_nickname ON pf_nickname.id = p.id;
END;
$function$;

-- ============================================================================
-- 6. 권한 부여
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_vfan_display_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_profile_type(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_notification_enabled(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.system_leave_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_chat_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_lounge_like(uuid, uuid, uuid, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_lounge_comment_like(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_lounge_view(uuid, uuid, uuid, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_magazine_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_switch(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_display_batch(uuid[]) TO authenticated;

-- ============================================================================
-- 완료 메시지
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'PROD에 누락된 함수들이 추가되었습니다:';
  RAISE NOTICE '  - get_vfan_display_name (핵심 헬퍼)';
  RAISE NOTICE '  - get_active_profile_type (프로필 타입)';
  RAISE NOTICE '  - check_notification_enabled (알림 설정)';
  RAISE NOTICE '  - create_chat_room_with_participants (채팅방)';
  RAISE NOTICE '  - system_leave_message (퇴장 메시지)';
  RAISE NOTICE '  - kick_chat_participant (참여자 내보내기)';
  RAISE NOTICE '  - toggle_lounge_like (좋아요)';
  RAISE NOTICE '  - toggle_lounge_comment_like (댓글 좋아요)';
  RAISE NOTICE '  - track_lounge_view (조회수)';
  RAISE NOTICE '  - increment_magazine_view_count (매거진 조회수)';
  RAISE NOTICE '  - profile_switch (프로필 전환)';
  RAISE NOTICE '  - get_profile_display_batch (배치 조회)';
  RAISE NOTICE '==============================================';
END $$;
