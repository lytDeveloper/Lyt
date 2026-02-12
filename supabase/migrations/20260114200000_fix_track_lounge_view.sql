-- ============================================================================
-- Migration: Fix track_lounge_view function
-- Date: 2026-01-14
-- Issue: ON CONFLICT error when tracking lounge views
--
-- 문제: track_lounge_view 함수가 ON CONFLICT를 사용하려 하지만
--       lounge_views 테이블에 필요한 UNIQUE 제약 조건이 없음
--
-- 해결: INSERT 전에 중복 확인 방식으로 변경 (ON CONFLICT 제거)
-- ============================================================================

-- track_lounge_view 함수 재생성 (ON CONFLICT 없이)
DROP FUNCTION IF EXISTS public.track_lounge_view(uuid, uuid, uuid, text, uuid, text, text);

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
    SELECT created_at INTO v_last_view
    FROM lounge_views
    WHERE user_id = p_user_id AND project_id = p_project_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- 쿨다운 체크
    IF v_last_view IS NULL OR v_last_view < NOW() - (v_cooldown_hours || ' hours')::interval THEN
      INSERT INTO lounge_views (user_id, project_id, actor_role, actor_profile_id, actor_name, actor_avatar_url)
      VALUES (p_user_id, p_project_id, p_actor_role, p_actor_profile_id, p_actor_name, p_actor_avatar_url);

      -- view_count 증가
      UPDATE projects SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_project_id;
      RETURN true;
    END IF;
  END IF;

  -- 협업 조회
  IF p_collaboration_id IS NOT NULL THEN
    SELECT created_at INTO v_last_view
    FROM lounge_views
    WHERE user_id = p_user_id AND collaboration_id = p_collaboration_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_view IS NULL OR v_last_view < NOW() - (v_cooldown_hours || ' hours')::interval THEN
      INSERT INTO lounge_views (user_id, collaboration_id, actor_role, actor_profile_id, actor_name, actor_avatar_url)
      VALUES (p_user_id, p_collaboration_id, p_actor_role, p_actor_profile_id, p_actor_name, p_actor_avatar_url);

      UPDATE collaborations SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_collaboration_id;
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$function$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.track_lounge_view(uuid, uuid, uuid, text, uuid, text, text) TO authenticated;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'track_lounge_view 함수가 수정되었습니다.';
  RAISE NOTICE '  - ON CONFLICT 제거';
  RAISE NOTICE '  - 중복 확인 후 INSERT 방식으로 변경';
  RAISE NOTICE '  - actor 정보 저장 추가';
  RAISE NOTICE '==============================================';
END $$;
